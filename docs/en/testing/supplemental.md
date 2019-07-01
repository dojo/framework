# Testing Dojo Applications

## Running Tests

Dojo uses `@dojo/cli-test-intern` for running unit and functional tests in your `tests` folder.

You can quickly run your tests in node.

> Command Line

```bash
npm test
```

Dojo supports two types of testing approaches unit and functional. Unit tests are tests run via node and the local
[Selenium] tunnel and test isolated blocks of code. Functional tests are run using [Selenium] in the browser and test
the overall functionality of the software as a user would interact with it.

This command will execute only your unit tests.

> Command Line

```bash
npm run test:unit
```

This command will execute your functional tests locally in a headless Chrome instance using [Selenium].

> Command Line

```bash
npm run test:functional
```

Dojo comes with support for running tests remotely on [BrowserStack], [SauceLabs], and [TestingBot]. You may use one
of these services by signing up for an account and providing your credentials to cli-test-intern. By default, all of
the testing services will run tests against IE11, Firefox, and Chrome. You can use the `dojo` command of the [Dojo CLI].

### BrowserStack

[BrowserStack] requires an access key and username to use its services. These may be provided on the command line or as
environment variables as described in [Intern's documentation](https://theintern.io/docs.html#Intern/4/docs/docs%2Frunning.md/cloud-service).

> Command Line

```bash
dojo test -a -c browserstack -k <accesskey> --userName <username>
```

or with environment variables

> Command Line

```bash
BROWSERSTACK_USERNAME=<username> BROWSERSTACK_ACCESS_KEY=<key> dojo test -a -c browserstack
```

### SauceLabs

[SauceLabs] requires an access key and username to use its services. These may be provided on the command line or as
environment variables as described in [Intern's documentation](https://theintern.io/docs.html#Intern/4/docs/docs%2Frunning.md/cloud-service).

> Command Line

```bash
dojo test -a -c saucelabs -k <accesskey> --userName <username>
```

or with environment variables

> Command Line

```bash
SAUCE_USERNAME=<username> SAUCE_ACCESS_KEY=<key> dojo test -a -c saucelabs
```

### TestingBot

[TestingBot] requires an key and a secret to use its services. These may be provided on the command line or as
environment variables as described in [Intern's documentation](https://theintern.io/docs.html#Intern/4/docs/docs%2Frunning.md/cloud-service).

> Command Line

```bash
dojo test -a -c testingbot -k <key> -s <secret>
```

or with environment variables

> Command Line

```bash
TESTINGBOT_SECRET=<secret> TESTINGBOT_KEY=<key> dojo test -a -c saucelabs
```

## harness

`harness()` is the primary API when working with `@dojo/framework/testing`, essentially setting up each test and providing a context to perform virtual DOM assertions and interactions. Designed to mirror the core behavior for widgets when updating `properties` or `children` and widget invalidation, with no special or custom logic required.

### API

```ts
harness(renderFunction: () => WNode, customComparators?: CustomComparator[]): Harness;
```

-   `renderFunction`: A function that returns a WNode for the widget under test
-   [`customComparators`](custom-comparators): Array of custom comparator descriptors. Each provides a comparator function to be used during the comparison for `properties` located using a `selector` and `property` name

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

### Custom Comparators

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

## selectors

The `harness` APIs commonly support a concept of CSS style selectors to target nodes within the virtual DOM for assertions and operations. Review the [full list of supported selectors](https://github.com/fb55/css-select#supported-selectors) for more information.

In addition to the standard API:

-   The `@` symbol is supported as shorthand for targeting a node's `key` property
-   The `classes` property is used instead of `class` when using the standard shorthand `.` for targeting classes

## `harness.expect`

The most common requirement for testing is to assert the structural output from a widget's `render` function. `expect` accepts a render function that returns the expected render output from the widget under test.

API

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

### `harness.expectPartial`

`expectPartial` asserts against a section of the widget's render output based on a [`selector`](#selectors).

API

```ts
expectPartial(selector: string, expectedRenderFunction: () => DNode | DNode[]);
```

-   `selector`: The selector query to find the node to target
-   `expectedRenderFunction`: A function that returns the expected `DNode` structure of the queried node
-   `actualRenderFunction`: An optional function that returns the actual `DNode` structure to be asserted

Example usage:

> HelloWorld.tsx

```ts
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';

export interface HelloWorldProperties {
	foo?: boolean;
	bar?: boolean;
}

export default class HelloWorld extends WidgetBase<HelloWorldProperties> {
	render() {
		const { foo, bar } = this.properties;
		return (
			<div>
				{foo && <span key="foo">Foo</span>}
				<ul>
					<li>Hello</li>
					<li>World</li>
				</ul>
				{bar && <span key="bar">Bar</span>}
			</div>
		);
	}
}
```

```ts
it('should render foo', () => {
	const h = harness(() => <HelloWorld foo={true} />);
	h.expectPartial('~foo', () => <span>Foo</span>);
});
```

#### `harness.trigger`

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

Example Usage:

Given a VDOM tree like,

```typescript
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

And you want to trigger the save toolbar button's `onClick` function.

```typescript
h.trigger('@buttons', (renderResult: DNode<Toolbar>) => {
	return renderResult.properties.buttons[0].onClick;
});
```

#### `harness.getRender`

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

## Assertion Templates

Assertion Templates allow you to build expected render functions to pass to `h.expect()`. The idea behind Assertion Templates is to always assert against the entire render output, and modify portions of the assertion itslef has needed.

To use Assertion Templates first import the module:

```ts
import assertionTemplate from '@dojo/framework/testing/assertionTemplate';
```

In your tests you can then write a base assertion which would be the default render state of your widget:

Given the following widget:

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

now lets see how we'd test the output when the `username` property is passed to the `Profile`:

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

Here we're using the `setChildren()` api on the baseAssertion, and we're using the special `~` selector to find a node with a key of `~message`. The `~key` property (or when using tsx in a template, `assertion-key`) is a special property on Assertion Templates that will be erased at assertion time so it doesn't show up when matching the renders. This allows you to decorate the AssertionTemplates to easily select nodes, without having to augment the actual widgets render function. Once we have the `message` node we then set the children to the expected `the number 5`, and use the resulting template in `h.expect`. It's important to note that Assertion Templates always return a new Assertion Template when setting a value, this ensures that you do not accidentally mutate an existing template (causing other tests to potentially fail), and allows you to build layered Templates that incrementally build on each other.

Assertion Template has the following api's:

```
insertBefore(selector: string, children: DNode[]): AssertionTemplateResult;
insertAfter(selector: string, children: DNode[]): AssertionTemplateResult;
insertSiblings(selector: string, children: DNode[], type?: 'before' | 'after'): AssertionTemplateResult;
append(selector: string, children: DNode[]): AssertionTemplateResult;
prepend(selector: string, children: DNode[]): AssertionTemplateResult;
replace(selector: string, children: DNode[]): AssertionTemplateResult;
setChildren(selector: string, children: DNode[], type?: 'prepend' | 'replace' | 'append'): AssertionTemplateResult;
setProperty(selector: string, property: string, value: any): AssertionTemplateResult;
getChildren(selector: string): DNode[];
getProperty(selector: string, property: string): any;
```

## Mocking

You may have noticed that when testing widgets, we are testing that the user interface is rendered correctly given various updates to its properties. There is no real business logic to them, but you may want to test that something like a button click does call a property method. This test is not concerned as to what the method does, just that the interface calls it as expected. You can use a library like [Sinon] to help you in these cases.

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

You would want to test that the button will call the `this.properties.fetchItems` method when it is clicked.

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

In this case, you can provide a mock of the `fetchItems` method to the Action widget that it will use to try and fetch items. Then you can target the `@button` key to trigger the `onClick` of that button and validate that the `fetchItems` method was called once.

For more details on mocking, please read the [Sinon] documentation.

## Functional Tests

Unlike unit tests that load and execute your code, functional tests load a page in the browser and test the interaction of your application.

If you want to validate the content of your page for a certain route, you can update the links to make this easier to test.

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

During application use, you would expect to click on the `profile` link and be directed to a page welcoming the user. You can write a functional test to verify this behavior.

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

When running a functional test, Dojo will provide a `remote` object to interact with the page. Because loading and interacting with the page is an asynchronous action, be sure to return the `remote` object in your test.

Functional tests can be executed in the command line.

> Command Line

```bash
npm run test:functional
```

This will load the html page into a remote instance of Chrome on your machine to test interactivity.

Functional tests are very useful to to make sure that your application code works as intended when it is actually used inside a browser.

You can read more details in the [Intern Function tests](https://theintern.io/docs.html#Intern/4/docs/docs%2Fwriting_tests.md/functional-tests) guide.

[browserstack]: https://www.browserstack.com/
[dojo cli]: https://github.com/dojo/cli
[intern]: https://theintern.io/
[saucelabs]: https://saucelabs.com/
[selenium]: http://www.seleniumhq.org/
[sinon]: https://sinonjs.org/
[testingbot]: https://testingbot.com/
