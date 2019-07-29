# Dojo test harness

`harness()` is the primary API when working with `@dojo/framework/testing`, essentially setting up each test and providing a context to perform virtual DOM assertions and interactions. The harness is designed to mirror the core behavior for widgets when updating `properties` or `children` and widget invalidation, with no special or custom logic required.

## Harness API

```ts
interface HarnessOptions {
	customComparators?: CustomComparator[];
	middleware?: [MiddlewareResultFactory<any, any, any>, MiddlewareResultFactory<any, any, any>][];
}

harness(renderFunction: () => WNode, customComparators?: CustomComparator[]): Harness;
harness(renderFunction: () => WNode, options?: HarnessOptions): Harness;
```

-   `renderFunction`: A function that returns a WNode for the widget under test
-   [`customComparators`](custom-comparators): Array of custom comparator descriptors. Each provides a comparator function to be used during the comparison for `properties` located using a `selector` and `property` name
-   `options`: Expanded options for the harness which includes `customComparators` and an array of middleware/mocks tuples.

The harness returns a `Harness` object that provides a small API for interacting with the widget under test:

`Harness`

-   [`expect`](#harnessexpect): Performs an assertion against the full render output from the widget under test.
-   [`expectPartial`](#harnessexpectpartial): Performs an assertion against a section of the render output from the widget under test.
-   [`trigger`](#harnesstrigger): Used to trigger a function from a node on the widget under test's API
-   [`getRender`](#harnessgetRender): Returns a render from the harness based on the index provided

Setting up a widget for testing is simple and familiar using the `w()` function from `@dojo/framework/core`:

```ts
const { describe, it } = intern.getInterface('bdd');
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import harness from '@dojo/framework/testing/harness';
import { w, v } from '@dojo/framework/widget-core/d';

class MyWidget extends WidgetBase<{ foo: string }> {
	protected render() {
		const { foo } = this.properties;
		return v('div', { foo }, this.children);
	}
}

const h = harness(() => w(MyWidget, { foo: 'bar' }, ['child']));
```

The harness also supports `tsx` usage as show below. For the rest of the README the examples will be using the programmatic `w()` API, there are more examples of `tsx` in the [unit tests](./blob/master/tests/unit/harnessWithTsx.tsx).

```ts
const h = harness(() => <MyWidget foo="bar">child</MyWidget>);
```

The `renderFunction` is lazily executed so it can include additional logic to manipulate the widget's `properties` and `children` between assertions.

```ts
describe('MyWidget', () => {
  it('renders with foo correctly', () => {
		let foo = 'bar';

		const h = harness(() => {
			return w(MyWidget, { foo }, [ 'child' ]));
		};

		h.expect(/** assertion that includes bar **/);
		// update the property that is passed to the widget
		foo = 'foo';
		h.expect(/** assertion that includes foo **/)
  });
});
```

## Mocking middleware

When initializing the harness, mock middleware can be specified as part of the `HarnessOptions`. The mock middleware is defined as a tuple of the original middleware and the mock middleware implementation. Mock middleware is created in the same way as any other middleware.

```ts
import myMiddleware from './myMiddleware';
import myMockMiddleware from './myMockMiddleware';
import harness from '@dojo/framework/testing/harness';

import MyWidget from './MyWidget';

describe('MyWidget', () => {
	it('renders', () => {
		const h = harness(() => <MyWidget />, { middleware: [[myMiddleware, myMockMiddleware]] });
		h.expect(/** assertion that executes the mock middleware instead of the normal middleware **/);
	});
});
```

The harness automatically mocks a number of core middlewares that will be injected into any middleware that requires them:

-   invalidator
-   setProperty
-   destroy

### Dojo mock middleware

There are a number of mock middleware available to support testing widgets that use the corresponding Dojo middleware. The mocks export a factory used to create the scoped mock middleware to be used in each test.

#### Mock `node` middleware

Using `createNodeMock` from `@dojo/framework/testing/mocks/middleware/node` creates a mock for the node middleware. To set the expected return from the node mock, call the created mock node middleware with a `key` and expected DOM node.

```ts
import createNodeMock from '@dojo/framework/testing/mocks/middleware/node';

// create the mock node middleware
const mockNode = createNodeMock();

// create a mock DOM node
const domNode = {};

// call the mock middleware with a key and the DOM
// to return.
mockNode('key', domNode);
```

#### Mock `intersection` middleware

Using `createIntersectionMock` from `@dojo/framework/testing/mocks/middleware/intersection` creates a mock intersection middleware. To set the expected return from the intersection mock, call the created mock intersection middleware with a `key` and expected intersection details.

Consider the following widget:

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import intersection from '@dojo/framework/core/middleware/intersection';

const factory = create({ intersection });

const App = factory(({ middleware: { intersection } }) => {
	const details = intersection.get('root');
	return <div key="root">{JSON.stringify(details)}</div>;
});
```

Using the mock intersection middleware:

```tsx
import { tsx } from '@dojo/framework/core/vdom';
import createIntersectionMock from '@dojo/framework/testing/mocks/middleware/intersection';
import intersection from '@dojo/framework/core/middleware/intersection';
import harness from '@dojo/framework/testing/harness';

import MyWidget from './MyWidget';

describe('MyWidget', () => {
	it('test', () => {
		// create the intersection mock
		const intersectionMock = createIntersectionMock();
		// pass the intersection mock to the harness so it knows to
		// replace the original middleware
		const h = harness(() => <App key="app" />, { middleware: [[intersection, intersectionMock]] });

		// call harness.expect as usual, asserting the default response
		h.expect(() => <div key="root">{`{"intersectionRatio":0,"isIntersecting":false}`}</div>);

		// use the intersection mock to set the expected return
		// of the intersection middleware by key
		intersectionMock('root', { isIntersecting: true });

		// assert again with the updated expectation
		h.expect(() => <div key="root">{`{"isIntersecting": true }`}</div>);
	});
});
```

#### Mock `resize` middleware

Using `createResizeMock` from `@dojo/framework/testing/mocks/middleware/resize` creates a mock resize middleware. To set the expected return from the resize mock, call the created mock resize middleware with a `key` and expected content rects.

```ts
const mockResize = createResizeMock();
mockResize('key', { width: 100 });
```

Consider the following widget:

```tsx
import { create, tsx } from '@dojo/framework/core/vdom'
import resize from '@dojo/framework/core/middleware/resize'

const factory = create({ resize });

export const MyWidget = factory(function MyWidget({ middleware }) => {
	const  { resize } = middleware;
	const contentRects = resize.get('root');
	return <div key="root">{JSON.stringify(contentRects)}</div>;
});
```

Using the mock resize middleware:

```tsx
import { tsx } from '@dojo/framework/core/vdom';
import createResizeMock from '@dojo/framework/testing/mocks/middleware/resize';
import resize from '@dojo/framework/core/middleware/resize';
import harness from '@dojo/framework/testing/harness';

import MyWidget from './MyWidget';

describe('MyWidget', () => {
	it('test', () => {
		// create the resize mock
		const resizeMock = createResizeMock();
		// pass the resize mock to the harness so it knows to replace the original
		// middleware
		const h = harness(() => <App key="app" />, { middleware: [[resize, resizeMock]] });

		// call harness.expect as usual
		h.expect(() => <div key="root">null</div>);

		// use the resize mock to set the expected return of the resize middleware
		// by key
		resizeMock('root', { width: 100 });

		// assert again with the updated expectation
		h.expect(() => <div key="root">{`{"width":100}`}</div>);
	});
});
```

#### Mock `Store` middleware

Using `createMockStoreMiddleware` from `@dojo/framework/testing/mocks/middleware/store` creates a typed mock store middleware, which optionally supports mocking processes. To mock a store process pass a tuple of the original store process and the stub process. The middleware will swap out the call to the original process for the passed stub. If no stubs are passed, the middleware will simply no-op all process calls.

To make changes to the mock store, call the `mockStore` with a function that returns an array of store operations. This is injected with the stores `path` function to create the pointer to the state that needs changing.

```tsx
mockStore((path) => [replace(path('details', { id: 'id' })]);
```

Consider the following widget:

> src/MyWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom'
import { myProcess } from './processes';
import MyState from './interfaces';
// application store middleware typed with the state interface
// Example: `const store = createStoreMiddleware<MyState>();`
import store from './store';

const factory = create({ store }).properties<{ id: string }>();

export default factory(function MyWidget({ properties, middleware: store }) {
	const { id } = properties();
    const { path, get, executor } = store;
    const details = get(path('details');
    let isLoading = get(path('isLoading'));

    if ((!details || details.id !== id) && !isLoading) {
        executor(myProcess)({ id });
        isLoading = true;
    }

    if (isLoading) {
        return <Loading />;
    }

    return <ShowDetails {...details} />;
});
```

Using the mock store middleware:

> tests/unit/MyWidget.tsx

```tsx
import { tsx } from '@dojo/framework/core/vdom'
import createMockStoreMiddleware from '@dojo/framework/testing/mocks/middleware/store';
import harness from '@dojo/framework/testing/harness';

import { myProcess } from './processes';
import MyWidget from './MyWidget';
import MyState from './interfaces';
import store from './store';

// import a stub/mock lib, doesn't have to be sinon
import { stub } from 'sinon';

describe('MyWidget', () => {
     it('test', () => {
          const properties = {
               id: 'id'
          };
         const myProcessStub = stub();
         // type safe mock store middleware
         // pass through an array of tuples `[originalProcess, stub]` for mocked processes
         // calls to processes not stubbed/mocked get ignored
         const mockStore = createMockStoreMiddleware<MyState>([[myProcess, myProcessStub]]);
         const h = harness(() => <MyWidget {...properties} />, {
             middleware: [store, mockStore]
         });
         h.expect(/* assertion template for `Loading`*/);

         // assert again the stubbed process
         expect(myProcessStub.calledWith({ id: 'id' })).toBeTruthy();

         mockStore((path) => [replace(path('isLoading', true)]);
         h.expect(/* assertion template for `Loading`*/);
         expect(myProcessStub.calledOnce()).toBeTruthy();

         // use the mock store to apply operations to the store
         mockStore((path) => [replace(path('details', { id: 'id' })]);
         mockStore((path) => [replace(path('isLoading', true)]);

         h.expect(/* assertion template for `ShowDetails`*/);

         properties.id = 'other';
         h.expect(/* assertion template for `Loading`*/);
         expect(myProcessStub.calledTwice()).toBeTruthy();
         expect(myProcessStub.secondCall.calledWith({ id: 'other' })).toBeTruthy();
         mockStore((path) => [replace(path('details', { id: 'other' })]);
         h.expect(/* assertion template for `ShowDetails`*/);
     });
});
```

## Custom comparators

There are circumstances where the exact value of a property is unknown during testing, so will require the use of a custom compare descriptor.

The descriptors have a [`selector`](#selectors) to locate the virtual nodes to check, a property name for the custom compare and a comparator function that receives the actual value and returns a boolean result for the assertion.

```ts
const compareId = {
	selector: '*', // all nodes
	property: 'id',
	comparator: (value: any) => typeof value === 'string' // checks the property value is a string
};

const h = harness(() => w(MyWidget, {}), [compareId]);
```

For all assertions, using the returned `harness` API will now only test identified `id` properties using the `comparator` instead of the standard equality.

## Selectors

The `harness` APIs commonly support a concept of CSS style selectors to target nodes within the virtual DOM for assertions and operations. Review the [full list of supported selectors](https://github.com/fb55/css-select#supported-selectors) for more information.

In addition to the standard API:

-   The `@` symbol is supported as shorthand for targeting a node's `key` property
-   The `classes` property is used instead of `class` when using the standard shorthand `.` for targeting classes

## `harness.expect`

The most common requirement for testing is to assert the structural output from a widget's `render` function. `expect` accepts a render function that returns the expected render output from the widget under test.

```ts
expect(expectedRenderFunction: () => DNode | DNode[], actualRenderFunction?: () => DNode | DNode[]);
```

-   `expectedRenderFunction`: A function that returns the expected `DNode` structure of the queried node
-   `actualRenderFunction`: An optional function that returns the actual `DNode` structure to be asserted

```ts
h.expect(() =>
	v('div', { key: 'foo' }, [w(Widget, { key: 'child-widget' }), 'text node', v('span', { classes: ['class'] })])
);
```

Optionally `expect` can accept a second parameter of a function that returns a render result to assert against.

```ts
h.expect(() => v('div', { key: 'foo' }), () => v('div', { key: 'foo' }));
```

If the actual render output and expected render output are different, an exception is thrown with a structured visualization indicating all differences with `(A)` (the actual value) and `(E)` (the expected value).

Example assertion failure output:

```ts
v('div', {
	'classes': [
		'root',
(A)		'other'
(E)		'another'
	],
	'onclick': 'function'
}, [
	v('span', {
		'classes': 'span',
		'id': 'random-id',
		'key': 'label',
		'onclick': 'function',
		'style': 'width: 100px'
	}, [
		'hello 0'
	])
	w(ChildWidget, {
		'id': 'random-id',
		'key': 'widget'
	})
	w('registry-item', {
		'id': true,
		'key': 'registry'
	})
])
```

## `harness.trigger`

`harness.trigger()` calls a function with the `name` on the node targeted by the `selector`.

```ts
interface FunctionalSelector {
	(node: VNode | WNode): undefined | Function;
}

trigger(selector: string, functionSelector: string | FunctionalSelector, ...args: any[]): any;
```

-   `selector`: The selector query to find the node to target
-   `functionSelector`: Either the name of the function to call from found node's properties or a functional selector that returns a function from a nodes properties.
-   `args`: The arguments to call the located function with

Returns the result of the function triggered if one is returned.

Example Usage(s):

```ts
// calls the `onclick` function on the first node with a key of `foo`
h.trigger('@foo', 'onclick');
```

```ts
// calls the `customFunction` function on the first node with a key of `bar` with an argument of `100`
// and receives the result of the triggered function
const result = h.trigger('@bar', 'customFunction', 100);
```

A `functionalSelector` can be used return a function that is nested in a widget's properties. The function will be triggered, in the same way that using a plain string `functionSelector`.

### Trigger example

Given the following VDOM structure:

```ts
v(Toolbar, {
	key: 'toolbar',
	buttons: [
		{
			icon: 'save',
			onClick: () => this._onSave()
		},
		{
			icon: 'cancel',
			onClick: () => this._onCancel()
		}
	]
});
```

The save toolbar button's `onClick` function can be triggered by:

```typescript
h.trigger('@buttons', (renderResult: DNode<Toolbar>) => {
	return renderResult.properties.buttons[0].onClick;
});
```

**Note:** If the specified selector cannot be found, `trigger` will throw an error.

## `harness.getRender`

`harness.getRender()` returns the render with the index provided, when no index is provided it returns the last render.

```ts
getRender(index?: number);
```

-   `index`: The index of the render result to return

Example Usage(s):

```ts
// Returns the result of the last render
const render = h.getRender();
```

```ts
// Returns the result of the render for the index provided
h.getRender(1);
```

# Assertion templates

Assertion templates provide a reusable base to assert against a widget's entire render output, but allow portions to be modified as needed between several test executions. This means common elements that do not change across multiple tests can be abstracted and defined once and reused in multiple locations.

To use assertion templates first import the module:

```ts
import assertionTemplate from '@dojo/framework/testing/assertionTemplate';
```

A base assertion should be created which defines the widget's default render state. Given the following widget:

> src/widgets/Profile.ts

```ts
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import { v } from '@dojo/framework/widget-core/d';

import * as css from './styles/Profile.m.css';

export interface ProfileProperties {
	username?: string;
}

export default class Profile extends WidgetBase<ProfileProperties> {
	protected render() {
		const { username } = this.properties;
		return v('h1', { classes: [css.root] }, [`Welcome ${username || 'Stranger'}!`]);
	}
}
```

The base assertion might look like:

> tests/unit/widgets/Profile.ts

```ts
const { describe, it } = intern.getInterface('bdd');
import harness from '@dojo/framework/testing/harness';
import assertionTemplate from '@dojo/framework/testing/assertionTemplate';
import { w, v } from '@dojo/framework/widget-core/d';

import Profile from '../../../src/widgets/Profile';
import * as css from '../../../src/widgets/styles/Profile.m.css';

const profileAssertion = assertionTemplate(() =>
	v('h1', { classes: [css.root], '~key': 'welcome' }, ['Welcome Stranger!'])
);
```

and in a test would look like:

> tests/unit/widgets/Profile.ts

```ts
const profileAssertion = assertionTemplate(() =>
	v('h1', { classes: [css.root], '~key': 'welcome' }, ['Welcome Stranger!'])
);

describe('Profile', () => {
	it('default renders correctly', () => {
		const h = harness(() => w(Profile, {}));
		h.expect(profileAssertion);
	});
});
it('default renders correctly', () => {
	const h = harness(() => w(Profile, {}));
	h.expect(profileAssertion);
});
```

To test the scenario of a `username` property being passed to the `Profile`, the assertion template can be parameterized such as:

> tests/unit/widgets/Profile.ts

```ts
describe('Profile', () => {
	...

  it('renders given username correctly', () => {
    // update the expected result with a given username
    const namedAssertion = profileAssertion.setChildren('~welcome', [
      'Welcome Kel Varnsen!'
    ]);
    const h = harness(() => w(Profile, { username: 'Kel Varnsen' }));
    h.expect(namedAssertion);
  });
});
```

Here the `setChildren()` api is used on the baseAssertion, and the special `~` selector allows finding a node with a key of `~message`. The `~key` property (or when using tsx in a template, `assertion-key`) is a special property on assertion templates that will be erased at assertion time so it doesn't show up when matching the renders. This allows the assertion templates to easily select nodes without having to augment the actual widget render function. Once the `welcome` node is found, its children are overridden to a new value of `['Welcome Kel Varnsen!']`, and the resulting template is then used in `h.expect`. It's important to note that assertion templates always return a new assertion template when setting a value. This ensures that an existing template is not accidentally mutated, which would cause other tests to potentially fail, and allows construction of layered templates that incrementally build on each other.

Assertion template has the following API:

```ts
insertBefore(selector: string, children: () => DNode[]): AssertionTemplateResult;
insertAfter(selector: string, children: () => DNode[]): AssertionTemplateResult;
insertSiblings(selector: string, children: () => DNode[], type?: 'before' | 'after'): AssertionTemplateResult;
append(selector: string, children: () => DNode[]): AssertionTemplateResult;
prepend(selector: string, children: () => DNode[]): AssertionTemplateResult;
replaceChildren(selector: string, children: () => DNode[]): AssertionTemplateResult;
setChildren(selector: string, children: () => DNode[], type?: 'prepend' | 'replace' | 'append'): AssertionTemplateResult;
setProperty(selector: string, property: string, value: any): AssertionTemplateResult;
setProperties(selector: string, value: any | PropertiesComparatorFunction): AssertionTemplateResult;
getChildren(selector: string): DNode[];
getProperty(selector: string, property: string): any;
getProperties(selector: string): any;
replace(selector: string, node: DNode): AssertionTemplateResult;
remove(selector: string): AssertionTemplateResult;
```

# Mocking

A common type of test is validating a widget's user interface renders as expected without necessarily being concerned with the widget's underlying business logic. These tests may want to assert scenarios such as button clicks calling widget property methods, without concern as to what the property method implementations are, only that the interface is called as expected. A mocking library such as [Sinon] can be used to help in these cases.

> src/widgets/Action.ts

```ts
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import { v, w } from '@dojo/framework/widget-core/d';
import Button from '@dojo/widgets/button';

import * as css from './styles/Action.m.css';

export default class Action extends WidgetBase<{ fetchItems: () => void }> {
	protected render() {
		return v('div', { classes: [css.root] }, [w(Button, { onClick: this.handleClick, key: 'button' }, ['Fetch'])]);
	}
	private handleClick() {
		this.properties.fetchItems();
	}
}
```

To test that the `this.properties.fetchItems` method is called when the button is clicked:

> tests/unit/widgets/Action.ts

```ts
const { describe, it } = intern.getInterface('bdd');
import harness from '@dojo/framework/testing/harness';
import { w, v } from '@dojo/framework/widget-core/d';

import { stub } from 'sinon';

describe('Action', () => {
	const fetchItems = stub();
	it('can fetch data on button click', () => {
		const h = harness(() => w(Home, { fetchItems }));
		h.expect(() => v('div', { classes: [css.root] }, [w(Button, { onClick: () => {}, key: 'button' }, ['Fetch'])]));
		h.trigger('@button', 'onClick');
		assert.isTrue(fetchItems.calledOnce);
	});
});
```

In this case, a mock of the `fetchItems` method is provided to the Action widget that requires items to be fetched. The `@button` key is then targeted to trigger the button's `onClick`, after which an assertion is validated that the `fetchItems` mock was called only once.

See the [Sinon] documentation for more details on mocking.

# Functional tests

Unlike unit tests that load and execute code, functional tests load a page in the browser and test how users interact with the running application.

When validating application output for a certain route, an `id` should be added to the corresponding route link to allow for easier targeting.

> src/widgets/Menu.ts

```ts
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import { w } from '@dojo/framework/widget-core/d';
import Link from '@dojo/framework/routing/ActiveLink';
import Toolbar from '@dojo/widgets/toolbar';

import * as css from './styles/Menu.m.css';

export default class Menu extends WidgetBase {
	protected render() {
		return w(Toolbar, { heading: 'My Dojo App!', collapseWidth: 600 }, [
			w(
				Link,
				{
					id: 'home', // add id attribute
					to: 'home',
					classes: [css.link],
					activeClasses: [css.selected]
				},
				['Home']
			),
			w(
				Link,
				{
					id: 'about', // add id attribute
					to: 'about',
					classes: [css.link],
					activeClasses: [css.selected]
				},
				['About']
			),
			w(
				Link,
				{
					id: 'profile', // add id attribute
					to: 'profile',
					classes: [css.link],
					activeClasses: [css.selected]
				},
				['Profile']
			)
		]);
	}
}
```

During application use, a user would expect to click on the `profile` link and be directed to a page welcoming them. A functional test can be created to verify this behavior.

> tests/functional/main.ts

```ts
const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

describe('routing', () => {
	it('profile page correctly loads', ({ remote }) => {
		return (
			remote
				// loads the HTML file in local node server
				.get('../../output/dev/index.html')
				// find the id of the anchor tag
				.findById('profile')
				// click on the link
				.click()
				// end this action
				.end()
				// find the h1 tag
				.findByTagName('h1')
				// get the text in the h1 tag
				.getVisibleText()
				.then((text) => {
					// verify the content of the h1 tag on the profile page
					assert.equal(text, 'Welcome Dojo User!');
				})
		);
	});
});
```

When running a functional test, Dojo provides a `remote` object that is used to interact with the page. Because loading and interacting with the page is an asynchronous action, the `remote` interaction object should be returned from the test.

Functional tests can be executed in the command line via:

```bash
npm run test:functional
```

This will load the html page into a remote instance of Chrome on the build machine to test interactivity.

Functional tests are very useful to to make sure that application code works as intended when it is actually used inside a browser.

See the [Intern functional tests guide](https://theintern.io/docs.html#Intern/4/docs/docs%2Fwriting_tests.md/functional-tests) for more details.

# Using remote testing services

Intern comes with support for running tests remotely on [BrowserStack], [SauceLabs], and [TestingBot]. These services can be used by signing up for an account and providing access credentials to cli-test-intern. By default, all of
the testing services will run tests against IE11, Firefox, and Chrome.

## BrowserStack

[BrowserStack] requires an access key and username to use its services. These may be provided on the command line or as
environment variables as described in [Intern's documentation](https://theintern.io/docs.html#Intern/4/docs/docs%2Frunning.md/cloud-service).

```bash
dojo test -a -c browserstack -k <accesskey> --userName <username>
```

or with environment variables

```bash
BROWSERSTACK_USERNAME=<username> BROWSERSTACK_ACCESS_KEY=<key> dojo test -a -c browserstack
```

## SauceLabs

[SauceLabs] requires an access key and username to use its services. These may be provided on the command line or as
environment variables as described in [Intern's documentation](https://theintern.io/docs.html#Intern/4/docs/docs%2Frunning.md/cloud-service).

```bash
dojo test -a -c saucelabs -k <accesskey> --userName <username>
```

or with environment variables

```bash
SAUCE_USERNAME=<username> SAUCE_ACCESS_KEY=<key> dojo test -a -c saucelabs
```

## TestingBot

[TestingBot] requires an key and a secret to use its services. These may be provided on the command line or as
environment variables as described in [Intern's documentation](https://theintern.io/docs.html#Intern/4/docs/docs%2Frunning.md/cloud-service).

```bash
dojo test -a -c testingbot -k <key> -s <secret>
```

or with environment variables

```bash
TESTINGBOT_SECRET=<secret> TESTINGBOT_KEY=<key> dojo test -a -c saucelabs
```

[browserstack]: https://www.browserstack.com/
[dojo cli]: https://github.com/dojo/cli
[intern]: https://theintern.io/
[saucelabs]: https://saucelabs.com/
[selenium]: http://www.seleniumhq.org/
[sinon]: https://sinonjs.org/
[testingbot]: https://testingbot.com/
