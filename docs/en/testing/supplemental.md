# Test Renderer

Dojo provides a simple and type safe test renderer for shallowly asserting the expected output and behavior from a widget. The test renderer's API has been designed to encourage unit testing best practices from the outset to ensure high confidence in your Dojo application.

Working with [assertions](/learn/testing/test-renderer#assertion) and the test renderer is done using [wrapped test nodes](/learn/testing/test-renderer#wrapped-test-nodes) that are defined in the assertion structure, ensuring type safety throughout the testing life-cycle.

The expected structure of a widget is defined using an assertion and passed to the test renderer's `.expect()` function which executes the assertion.

> src/MyWidget.spec.tsx

```tsx
import { tsx } from '@dojo/framework/core/vdom';
import renderer, { assertion } from '@dojo/framework/testing/renderer';

import MyWidget from './MyWidget';

const baseAssertion = assertion(() => (
	<div>
		<h1>Heading</h1>
		<h2>Sub Heading</h2>
		<div>Content</div>
	</div>
));

const r = renderer(() => <MyWidget />);

r.expect(baseAssertion);
```

## Wrapped Test Nodes

In order for the test renderer and assertions to be able to identify nodes within the expected and actual node structure a special wrapping node must be used. The wrapped nodes can get used in place of the real node in the expected assertion structure, maintaining all the correct property and children typings.

To create a wrapped test node use the `wrap` function from `@dojo/framework/testing/renderer`:

> src/MyWidget.spec.tsx

```tsx
import { wrap } from '@dojo/framework/testing/renderer';

import MyWidget from './MyWidget';

// Create a wrapped node for a widget
const WrappedMyWidget = wrap(MyWidget);

// Create a wrapped node for a vnode
const WrappedDiv = wrap('div');
```

The test renderer uses the location of a wrapped test node in the expected tree to attempt to perform any requested actions (either `r.property()` or `r.child()`) on the actual output of the widget under test. If the wrapped test node does not match the corresponding node in the actual output tree then no action will be performed and the assertion will report a failure.

**Note:** Wrapped test nodes should only be used once within an assertion, if the same test node is detected more than once during an assertion an error will be thrown and the test fail.

## Assertion

Assertions get used to build the expected widget output structure to use with `renderer.expect()`. The assertion expose a wide range of APIs that enable the expected output to vary between tests.

Given a widget that renders output differently based on property values:

> src/Profile.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';

import * as css from './Profile.m.css';

export interface ProfileProperties {
	username?: string;
}

const factory = create().properties<ProfileProperties>();

const Profile = factory(function Profile({ properties }) {
	const { username = 'Stranger' } = properties();
	return <h1 classes={[css.root]}>{`Welcome ${username}!`}</h1>;
});

export default Profile;
```

Create an assertion using `@dojo/framework/testing/renderer#assertion`:

> src/Profile.spec.tsx

```tsx
const { describe, it } = intern.getInterface('bdd');
import { tsx } from '@dojo/framework/core/vdom';
import renderer, { assertion, wrap } from '@dojo/framework/testing/renderer';

import Profile from '../../../src/widgets/Profile';
import * as css from '../../../src/widgets/Profile.m.css';

// Create a wrapped node
const WrappedHeader = wrap('h1');

// Create an assertion using the `WrappedHeader` in place of the `h1`
const baseAssertion = assertion(() => <WrappedHeader classes={[css.root]}>Welcome Stranger!</WrappedHeader>);

describe('Profile', () => {
	it('Should render using the default username', () => {
		const r = renderer(() => <Profile />);

		// Test against the base assertion
		r.expect(baseAssertion);
	});
});
```

To test when a `username` property gets passed to the `Profile` widget, we could create a new assertion with the updated expected username. However, as a widget increases its functionality, recreating the entire assertion for each scenario becomes verbose and unmaintainable, as any changes to the common widget structure would require updating every assertion.

To help avoid the maintenance overhead and reduce duplication, assertions offer a comprehensive API for creating variations from a base assertion. The assertion API uses wrapped test nodes to identify the node in the expected structure to update.

> src/Profile.spec.tsx

```tsx
const { describe, it } = intern.getInterface('bdd');
import { tsx } from '@dojo/framework/core/vdom';
import renderer, { assertion, wrap } from '@dojo/framework/testing/renderer';

import Profile from '../../../src/widgets/Profile';
import * as css from '../../../src/widgets/Profile.m.css';

// Create a wrapped node
const WrappedHeader = wrap('h1');

// Create an assertion using the `WrappedHeader` in place of the `h1`
const baseAssertion = assertion(() => <WrappedHeader classes={[css.root]}>Welcome Stranger!</WrappedHeader>);

describe('Profile', () => {
	it('Should render using the default username', () => {
		const r = renderer(() => <Profile />);

		// Test against the base assertion
		r.expect(baseAssertion);
	});

	it('Should render using the passed username', () => {
		const r = renderer(() => <Profile username="Dojo" />);

		// Create a variation of the base assertion
		const usernameAssertion = baseAssertion.setChildren(WrappedHeader, () => ['Dojo']);

		// Test against the username assertion
		r.expect(usernameAssertion);
	});
});
```

Creating assertions from a base assertion means that if there is a change to the default widget output, only a change to the baseAssertion is required to update all the widget's tests.

### Assertion API

#### `assertion.setChildren()`

Returns a new assertion with the new children either pre-pended, appended or replaced depending on the `type` passed.

```tsx
.setChildren(
  wrapped: Wrapped,
  children: () => RenderResult,
  type: 'prepend' | 'replace' | 'append' = 'replace'
): AssertionResult;
```

#### `assertion.append()`

Returns a new assertion with the new children appended to the node's existing children.

```tsx
.append(wrapped: Wrapped, children: () => RenderResult): AssertionResult;
```

#### `assertion.prepend()`

Returns a new assertion with the new children pre-pended to the node's existing children.

```tsx
.prepend(wrapped: Wrapped, children: () => RenderResult): AssertionResult;
```

#### `assertion.replaceChildren()`

Returns a new assertion with the new children replacing the node's existing children.

```tsx
.replaceChildren(wrapped: Wrapped, children: () => RenderResult): AssertionResult;
```

#### `assertion.insertSiblings()`

Returns a new assertion with the passed children inserted either `before` or `after` depending on the `type` passed.

```tsx
.insertSiblings(
  wrapped: Wrapped,
  children: () => RenderResult,
  type: 'before' | 'after' = 'before'
): AssertionResult;
```

#### `assertion.insertBefore()`

Returns a new assertion with the passed children inserted before the existing node's children.

```tsx
.insertBefore(wrapped: Wrapped, children: () => RenderResult): AssertionResult;
```

#### `assertion.insertAfter()`

Returns a new assertion with the passed children inserted after the existing node's children.

```tsx
.insertAfter(wrapped: Wrapped, children: () => RenderResult): AssertionResult;
```

#### `assertion.replace()`

Returns a new assertion replacing the existing node with the node that is passed. Note that if you need to interact with the new node in either assertions or the test renderer, it should be a wrapped test node.

```tsx
.replace(wrapped: Wrapped, node: DNode): AssertionResult;
```

#### `assertion.remove()`

Returns a new assertion removing the target wrapped node completely.

```tsx
.remove(wrapped: Wrapped): AssertionResult;
```

#### `assertion.setProperty()`

Returns a new assertion with the updated property for the target wrapped node.

```tsx
.setProperty<T, K extends keyof T['properties']>(
  wrapped: Wrapped<T>,
  property: K,
  value: T['properties'][K]
): AssertionResult;
```

#### `assertion.setProperties()`

Returns a new assertion with the updated properties for the target wrapped node.

```tsx
.setProperties<T>(
  wrapped: Wrapped<T>,
  value: T['properties'] | PropertiesComparatorFunction<T['properties']>
): AssertionResult;
```

A function can be set in place of the properties object to return the expected properties based off the actual properties.

## Triggering Properties

In addition to asserting the output from a widget, widget behavior can be tested by using the `renderer.property()` function. The `property()` function takes a [wrapped test node]() and the key of a property to call before the next call to `expect()`.

> src/MyWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import icache from '@dojo/framework/core/middleware/icache';
import { RenderResult } from '@dojo/framework/core/interfaces';

import MyWidgetWithChildren from './MyWidgetWithChildren';

const factory = create({ icache }).properties<{ onClick: () => void }>();

export const MyWidget = factory(function MyWidget({ properties, middleware: { icache } }) {
	const count = icache.getOrSet('count', 0);
	return (
		<div>
			<h1>Header</h1>
			<span>{`${count}`}</span>
			<button
				onclick={() => {
					icache.set('count', icache.getOrSet('count', 0) + 1);
					properties().onClick();
				}}
			>
				Increase Counter!
			</button>
		</div>
	);
});
```

> src/MyWidget.spec.tsx

```tsx
const { describe, it } = intern.getInterface('bdd');
import { tsx } from '@dojo/framework/core/vdom';
import renderer, { assertion, wrap } from '@dojo/framework/testing/renderer';
import * as sinon from 'sinon';

import MyWidget from './MyWidget';

// Create a wrapped node for the button
const WrappedButton = wrap('button');

const WrappedSpan = wrap('span');

const baseAssertion = assertion(() => (
    <div>
      <h1>Header</h1>
      <WrappedSpan>0</WrappedSpan>
      <WrappedButton onclick={() => {
        icache.set('count', icache.getOrSet('count', 0) + 1);
        properties().onClick();
      }}>Increase Counter!</button>
    </WrappedButton>
));

describe('MyWidget', () => {
    it('render', () => {
        const onClickStub = sinon.stub();
        const r = renderer(() => <MyWidget onClick={onClickStub} />);

        // assert against the base assertion
        r.expect(baseAssertion);

        // register a call to the button's onclick property
        r.property(WrappedButton, 'onclick');

        // create a new assertion with the updated count
        const counterAssertion = baseAssertion.setChildren(WrappedSpan, () => ['1']);

        // expect against the new assertion, the property will be called before the test render
        r.expect(counterAssertion);

        // once the assertion is complete, check that the stub property was called
        assert.isTrue(onClickStub.calledOnce);
    });
});
```

Arguments for the function can be passed after the function name, for example `r.property(WrappedButton, 'onclick', { target: { value: 'value' }})`. When there are multiple parameters for the function they are passed one after the other `r.property(WrappedButton, 'onclick', 'first-arg', 'second-arg', 'third-arg')`

## Asserting Functional Children

To assert the output from functional children the test renderer needs to understand how to resolve the child render functions. This includes passing in any expected injected values.

The test renderer `renderer.child()` function enables children to get resolved in order to include them in the assertion. Using the `.child()` function requires the widget with functional children to be wrapped when included in the assertion, and the wrapped node gets passed to the `.child` function.

> src/MyWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { RenderResult } from '@dojo/framework/core/interfaces';

import MyWidgetWithChildren from './MyWidgetWithChildren';

const factory = create().children<(value: string) => RenderResult>();

export const MyWidget = factory(function MyWidget() {
	return (
		<div>
			<h1>Header</h1>
			<MyWidgetWithChildren>{(value) => <div>{value}</div>}</MyWidgetWithChildren>
		</div>
	);
});
```

> src/MyWidget.spec.tsx

```tsx
const { describe, it } = intern.getInterface('bdd');
import { tsx } from '@dojo/framework/core/vdom';
import renderer, { assertion, wrap } from '@dojo/framework/testing/renderer';

import MyWidgetWithChildren from './MyWidgetWithChildren';
import MyWidget from './MyWidget';

// Create a wrapped node for the widget with functional children
const WrappedMyWidgetWithChildren = wrap(MyWidgetWithChildren);

const baseAssertion = assertion(() => (
    <div>
      <h1>Header</h1>
      <WrappedMyWidgetWithChildren>{() => <div>Hello!</div>}</MyWidgetWithChildren>
    </div>
));

describe('MyWidget', () => {
    it('render', () => {
        const r = renderer(() => <MyWidget />);

        // instruct the test renderer to resolve the children
        // with the provided params
        r.child(WrappedMyWidgetWithChildren, ['Hello!']);

        r.expect(baseAssertion);
    });
});
```

## Custom Property Comparators

There are circumstances where the exact value of a property is unknown during testing, so will require the use of a custom comparator. Custom comparators get used for any wrapped widget along with the `@dojo/framework/testing/renderer#compare` function in place of the usual widget or node property.

```tsx
compare(comparator: (actual) => boolean)
```

```tsx
import { assertion, wrap, compare } from '@dojo/framework/testing/renderer';

// create a wrapped node the `h1`
const WrappedHeader = wrap('h1');

const baseAssertion = assertion(() => (
	<div>
		<WrappedHeader id={compare((actual) => typeof actual === 'string')}>Header!</WrappedHeader>
	</div>
));
```

## Ignoring Nodes during Assertion

When dealing with widgets that render multiple items, for example a list it can be desirable to be able to instruct the test renderer to ignore sections of the output. For example asserting that the first and last items are valid and then ignoring the detail of the items in-between, simply asserting that they are the expected type. To do this with the test renderer the `ignore` function can be used that instructs the test renderer to ignore the node, as long as it is the same type, i.e. matching tag name or matching widget factory/constructor.

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import renderer, { assertion, ignore } from '@dojo/framework/testing/renderer';

const factory = create().properties<{ items: string[] }>();

const ListWidget = create(function ListWidget({ properties }) {
	const { items } = properties();
	return (
		<div>
			<ul>{items.map((item) => <li>{item}</li>)}</ul>
		</div>
	);
});

const r = renderer(() => <ListWidget items={['a', 'b', 'c', 'd']} />);
const IgnoredItem = ignore('li');
const listAssertion = assertion(() => (
	<div>
		<ul>
			<li>a</li>
			<IgnoredItem />
			<IgnoredItem />
			<li>d</li>
		</ul>
	</div>
));
r.expect(listAssertion);
```

## Mocking Middleware

When initializing the test renderer, mock middleware can get specified as part of the `RendererOptions`. The mock middleware gets defined as a tuple of the original middleware and the mock middleware implementation. Mock middleware gets created in the same way as any other middleware.

```tsx
import myMiddleware from './myMiddleware';
import myMockMiddleware from './myMockMiddleware';
import renderer from '@dojo/framework/testing/renderer';

import MyWidget from './MyWidget';

describe('MyWidget', () => {
	it('renders', () => {
		const r = renderer(() => <MyWidget />, { middleware: [[myMiddleware, myMockMiddleware]] });

		h
			.expect
			/** assertion that executes the mock middleware instead of the normal middleware **/
			();
	});
});
```

The test renderer automatically mocks a number of core middlewares that will get injected into any middleware that requires them:

-   `invalidator`
-   `setProperty`
-   `destroy`

Additionally, there are a number of mock middleware available to support widgets that use the corresponding provided Dojo middleware. See the [mocking](/learn/testing/mocking#provided-middleware-mocks) section for more information on provided mock middleware.

# Mocking

A common type of test is validating a widget's user interface renders as expected without necessarily being concerned with the widget's underlying business logic. These tests may want to assert scenarios such as button clicks calling widget property methods, without concern as to what the property method implementations are, only that the interface is called as expected. A mocking library such as [Sinon] can be used to help in these cases.

> src/widgets/Action.tsx

```ts
import { create, tsx } from '@dojo/framework/core/vdom';
import Button from '@dojo/widgets/button';

import * as css from './Action.m.css';

const factory = create().properties<{ fetchItems: () => void }>();

const Action = factory(function Action({ properties }) {
	return (
		<div classes={[css.root]}>
			<Button key="button" onClick={() => properties().fetchItems()}>
				Fetch
			</Button>
		</div>
	);
});

export default Action;
```

To test that the `properties().fetchItems` method is called when the button is clicked:

> tests/unit/widgets/Action.tsx

```ts
const { describe, it } = intern.getInterface('bdd');
import { tsx } from '@dojo/framework/core/vdom';
import renderer, { assertion, wrap } from '@dojo/framework/testing/renderer';

import Action from '../../../src/widgets/Action';
import * as css from '../../../src/widgets/Action.m.css';

import Button from '@dojo/widgets/button';

import { stub } from 'sinon';
import { assert } from 'chai';

describe('Action', () => {
	const fetchItems = stub();
	it('can fetch data on button click', () => {
		const WrappedButton = wrap(Button);
		const baseAssertion = assertion(() => (
			<div classes={[css.root]}>
				<WrappedButton key="button" onClick={() => {}}>
					Fetch
				</WrappedButton>
			</div>
		));
		const r = renderer(() => <Action fetchItems={fetchItems} />);
		r.expect(baseAssertion);
		r.property(WrappedButton, 'onClick');
		r.expect(baseAssertion);
		assert.isTrue(fetchItems.calledOnce);
	});
});
```

In this case, a mock of the `fetchItems` method is provided to the Action widget that requires items to be fetched. The `@button` key is then targeted to trigger the button's `onClick`, after which an assertion is validated that the `fetchItems` mock was called only once.

See the [Sinon] documentation for more details on mocking.

## Provided middleware mocks

There are a number of mock middleware available to support testing widgets that use the corresponding Dojo middleware. The mocks export a factory used to create the scoped mock middleware to be used in each test.

### Mock `breakpoint` middleware

Using `createBreakpointMock` from `@dojo/framework/testing/mocks/middleware/breakpoint` offers tests manual control over resizing events to trigger breakpoint tests.

Consider the following widget which displays an additional `h2` when the `LG` breakpoint is activated:

> src/Breakpoint.tsx

```tsx
import { tsx, create } from '@dojo/framework/core/vdom';
import breakpoint from '@dojo/framework/core/middleware/breakpoint';

const factory = create({ breakpoint });

export default factory(function Breakpoint({ middleware: { breakpoint } }) {
	const bp = breakpoint.get('root');
	const isLarge = bp && bp.breakpoint === 'LG';

	return (
		<div key="root">
			<h1>Header</h1>
			{isLarge && <h2>Subtitle</h2>}
			<div>Longer description</div>
		</div>
	);
});
```

By using the `mockBreakpoint(key: string, contentRect: Partial<DOMRectReadOnly>)` method on the `breakpoint` middleware mock, the test can explicitly trigger a given resize:

> tests/unit/Breakpoint.tsx

```tsx
const { describe, it } = intern.getInterface('bdd');
import { tsx } from '@dojo/framework/core/vdom';
import renderer, { assertion, wrap } from '@dojo/framework/testing/renderer';
import breakpoint from '@dojo/framework/core/middleware/breakpoint';
import createBreakpointMock from '@dojo/framework/testing/mocks/middleware/breakpoint';
import Breakpoint from '../../src/Breakpoint';

describe('Breakpoint', () => {
	it('resizes correctly', () => {
		const WrappedHeader = wrap('h1');
		const mockBreakpoint = createBreakpointMock();
		const baseAssertion = assertion(() => (
			<div key="root">
				<WrappedHeader>Header</WrappedHeader>
				<div>Longer description</div>
			</div>
		));
		const r = renderer(() => <Breakpoint />, {
			middleware: [[breakpoint, mockBreakpoint]]
		});
		r.expect(baseAssertion);

		mockBreakpoint('root', { breakpoint: 'LG', contentRect: { width: 800 } });

		r.expect(baseAssertion.insertAfter(WrappedHeader, () => [<h2>Subtitle</h2>]);
	});
});
```

### Mock `focus` middleware

Using `createFocusMock` from `@dojo/framework/testing/middleware/focus` provides tests with manual control over when the `focus` middleware reports that a node with a specified key gets focused.

Consider the following widget:

> src/FormWidget.tsx

```tsx
import { tsx, create } from '@dojo/framework/core/vdom';
import focus, { FocusProperties } from '@dojo/framework/core/middleware/focus';
import * as css from './FormWidget.m.css';

export interface FormWidgetProperties extends FocusProperties {}

const factory = create({ focus }).properties<FormWidgetProperties>();

export const FormWidget = factory(function FormWidget({ middleware: { focus } }) {
	return (
		<div key="wrapper" classes={[css.root, focus.isFocused('text') ? css.focused : null]}>
			<input type="text" key="text" value="focus me" />
		</div>
	);
});
```

By calling `focusMock(key: string | number, value: boolean)` the result of the `focus` middleware's `isFocused` method can get controlled during a test.

> tests/unit/FormWidget.tsx

```tsx
const { describe, it } = intern.getInterface('bdd');
import { tsx } from '@dojo/framework/core/vdom';
import renderer, { assertion, wrap } from '@dojo/framework/testing/renderer';
import focus from '@dojo/framework/core/middleware/focus';
import createFocusMock from '@dojo/framework/testing/mocks/middleware/focus';
import * as css from './FormWidget.m.css';

describe('Focus', () => {
	it('adds a "focused" class to the wrapper when the input is focused', () => {
		const focusMock = createFocusMock();
		const WrappedRoot = wrap('div');
		const baseAssertion = assertion(() => (
			<WrappedRoot key="wrapper" classes={[css.root, null]}>
				<input type="text" key="text" value="focus me" />
			</WrappedRoot>
		));
		const r = renderer(() => <FormWidget />, {
			middleware: [[focus, focusMock]]
		});

		r.expect(baseAssertion);

		focusMock('text', true);

		r.expect(baseAssertion.setProperty(WrappedRoot, 'classes', [css.root, css.focused]));
	});
});
```

### Mock `icache` middleware

Using `createICacheMiddleware` from `@dojo/framework/testing/mocks/middleware/icache` allows tests to access cache items directly while the mock provides a sufficient `icache` experience for the widget under test. This is particularly useful when `icache` is used to asynchronously retrieve data. Direct cache access enables the test to `await` the same promise as the widget.

Consider the following widget which retrieves data from an API:

> src/MyWidget.tsx

```tsx
import { tsx, create } from '@dojo/framework/core/vdom';
import { icache } from '@dojo/framework/core/middleware/icache';
import fetch from '@dojo/framework/shim/fetch';

const factory = create({ icache });

export default factory(function MyWidget({ middleware: { icache } }) {
	const value = icache.getOrSet('users', async () => {
		const response = await fetch('url');
		return await response.json();
	});

	return value ? <div>{value}</div> : <div>Loading</div>;
});
```

Testing the asynchronous result using the mock `icache` middleware is simple:

> tests/unit/MyWidget.tsx

```tsx
const { describe, it, afterEach } = intern.getInterface('bdd');
import renderer, { assertion, wrap } from '@dojo/framework/testing/renderer';
import { tsx } from '@dojo/framework/core/vdom';
import * as sinon from 'sinon';
import global from '@dojo/framework/shim/global';
import icache from '@dojo/framework/core/middleware/icache';
import createICacheMock from '@dojo/framework/testing/mocks/middleware/icache';
import MyWidget from '../../src/MyWidget';

describe('MyWidget', () => {
	afterEach(() => {
		sinon.restore();
	});

	it('test', async () => {
		// stub the fetch call to return a known value
		global.fetch = sinon.stub().returns(Promise.resolve({ json: () => Promise.resolve('api data') }));

		const WrappedRoot = wrap('div');
		const baseAssertion = assertion(() => <WrappedRoot>Loading</WrappedRoot>);
		const mockICache = createICacheMock();
		const r = renderer(() => <Home />, { middleware: [[icache, mockICache]] });
		r.expect(baseAssertion);

		// await the async method passed to the mock cache
		await mockICache('users');
		r.expect(baseAssertion.setChildren(WrappedRoot, () => ['api data']));
	});
});
```

### Mock `intersection` middleware

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

Using the mock `intersection` middleware:

```tsx
import { tsx } from '@dojo/framework/core/vdom';
import createIntersectionMock from '@dojo/framework/testing/mocks/middleware/intersection';
import intersection from '@dojo/framework/core/middleware/intersection';
import renderer, { assertion, wrap } from '@dojo/framework/testing/renderer';

import MyWidget from './MyWidget';

describe('MyWidget', () => {
	it('test', () => {
		// create the intersection mock
		const intersectionMock = createIntersectionMock();
		// pass the intersection mock to the renderer so it knows to
		// replace the original middleware
		const r = renderer(() => <App key="app" />, { middleware: [[intersection, intersectionMock]] });
		const WrappedRoot = wrap('div');
		const assertion = assertion(() => (
			<WrappedRoot key="root">{`{"intersectionRatio":0,"isIntersecting":false}`}</WrappedRoot>
		));
		// call renderer.expect as usual, asserting the default response
		r.expect(assertion);

		// use the intersection mock to set the expected return
		// of the intersection middleware by key
		intersectionMock('root', { isIntersecting: true });

		// assert again with the updated expectation
		r.expect(assertion.setChildren(WrappedRoot, () => [`{"isIntersecting": true }`]));
	});
});
```

### Mock `node` middleware

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

### Mock `resize` middleware

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

Using the mock `resize` middleware:

```tsx
import { tsx } from '@dojo/framework/core/vdom';
import createResizeMock from '@dojo/framework/testing/mocks/middleware/resize';
import resize from '@dojo/framework/core/middleware/resize';
import renderer, { assertion, wrap } from '@dojo/framework/testing/renderer';

import MyWidget from './MyWidget';

describe('MyWidget', () => {
	it('test', () => {
		// create the resize mock
		const resizeMock = createResizeMock();
		// pass the resize mock to the test renderer so it knows to replace the original
		// middleware
		const r = renderer(() => <App key="app" />, { middleware: [[resize, resizeMock]] });

		const WrappedRoot = wrap('div');
		const baseAssertion = assertion(() => <div key="root">null</div>);

		// call renderer.expect as usual
		r.expect(baseAssertion);

		// use the resize mock to set the expected return of the resize middleware
		// by key
		resizeMock('root', { width: 100 });

		// assert again with the updated expectation
		r.expect(baseAssertion.setChildren(WrappedRoot, () [`{"width":100}`]);)
	});
});
```

### Mock `store` middleware

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

Using the mock `store` middleware:

> tests/unit/MyWidget.tsx

```tsx
import { tsx } from '@dojo/framework/core/vdom'
import createMockStoreMiddleware from '@dojo/framework/testing/mocks/middleware/store';
import renderer from '@dojo/framework/testing/renderer';

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
         const r = renderer(() => <MyWidget {...properties} />, {
             middleware: [[store, mockStore]]
         });
         r.expect(/* assertion for `Loading`*/);

         // assert again the stubbed process
         expect(myProcessStub.calledWith({ id: 'id' })).toBeTruthy();

         mockStore((path) => [replace(path('isLoading', true)]);
         r.expect(/* assertion for `Loading`*/);
         expect(myProcessStub.calledOnce()).toBeTruthy();

         // use the mock store to apply operations to the store
         mockStore((path) => [replace(path('details', { id: 'id' })]);
         mockStore((path) => [replace(path('isLoading', true)]);

         r.expect(/* assertion for `ShowDetails`*/);

         properties.id = 'other';
         r.expect(/* assertion for `Loading`*/);
         expect(myProcessStub.calledTwice()).toBeTruthy();
         expect(myProcessStub.secondCall.calledWith({ id: 'other' })).toBeTruthy();
         mockStore((path) => [replace(path('details', { id: 'other' })]);
         r.expect(/* assertion for `ShowDetails`*/);
     });
});
```

### Mock `validity` middleware

Using `createValidityMock` from `@dojo/framework/testing/mocks/middleware/validity` creates a mock validity middleware where the return value of the `get` method can get controlled in a test.

Consider the following example:

> src/FormWidget.tsx

```tsx
import { tsx, create } from '@dojo/framework/core/vdom';
import validity from '@dojo/framework/core/middleware/validity';
import icache from '@dojo/framework/core/middleware/icache';
import * as css from './FormWidget.m.css';

const factory = create({ validity, icache });

export const FormWidget = factory(function FormWidget({ middleware: { validity, icache } }) {
	const value = icache.getOrSet('value', '');
	const { valid, message } = validity.get('input', value);

	return (
		<div key="root" classes={[css.root, valid === false ? css.invalid : null]}>
			<input type="email" key="input" value={value} onchange={(value) => icache.set('value', value)} />
			{message ? <p key="validityMessage">{message}</p> : null}
		</div>
	);
});
```

Using `validityMock(key: string, value: { valid?: boolean, message?: string; })`, the results of the `validity` mock's `get` method can get controlled in a test.

> tests/unit/FormWidget.tsx

```tsx
const { describe, it } = intern.getInterface('bdd');
import { tsx } from '@dojo/framework/core/vdom';
import renderer, { assertion } from '@dojo/framework/testing/renderer';
import validity from '@dojo/framework/core/middleware/validity';
import createValidityMock from '@dojo/framework/testing/mocks/middleware/validity';
import * as css from './FormWidget.m.css';

describe('Validity', () => {
	it('adds the "invalid" class to the wrapper when the input is invalid and displays a message', () => {
		const validityMock = createValidityMock();

		const r = renderer(() => <FormWidget />, {
			middleware: [[validity, validityMock]]
		});

		const WrappedRoot = wrap('div');
		const baseAssertion = assertion(() => (
			<WrappedRoot key="root" classes={[css.root, null]}>
				<input type="email" key="input" value="" onchange={() => {}} />
			</WrappedRoot>
		));

		r.expect(baseAssertion);

		validityMock('input', { valid: false, message: 'invalid message' });

		const invalidAssertion = baseAssertion
			.append(WrappedRoot, () => [<p key="validityMessage">invalid message</p>])
			.setProperty(WrappedRoot, 'classes', [css.root, css.invalid]);

		r.expect(invalidAssertion);
	});
});
```

### Custom middleware mocks

Not all testing scenarios will be covered by the provided mocks. Custom middleware mocks can also be created. A middleware mock should provide an overloaded interface. The parameterless overload should return the middleware implementation; this is what will be injected into the widget under test. Other overloads are created as needed to provide an interface for the tests.

As an example, consider the framework's `icache` mock. The mock provides these overloads:

```ts
function mockCache(): MiddlewareResult<any, any, any>;
function mockCache(key: string): Promise<any>;
function mockCache(key?: string): Promise<any> | MiddlewareResult<any, any, any>;
```

The overload which accepts a `key` provides the test direct access to cache items. This abbreviated example demonstrates how the mock contains both the middleware implementation and the test interface; this enabled the mock to bridge the gap between the widget and the test.

```ts
export function createMockMiddleware() {
	const sharedData = new Map<string, any>();

	const mockFactory = factory(() => {
		// actual middleware implementation; uses `sharedData` to bridge the gap
		return {
			get(id: string): any {},
			set(id: string, value: any): void {}
		};
	});

	function mockMiddleware(): MiddlewareResult<any, any, any>;
	function mockMiddleware(id: string): any;
	function mockMiddleware(id?: string): any | Middleware<any, any, any> {
		if (id) {
			// expose access to `sharedData` directly to
			return sharedData.get(id);
		} else {
			// provides the middleware implementation to the widget
			return mockFactory();
		}
	}
}
```

There are plenty of full mock examples in [`framework/src/testing/mocks/middleware`](https://github.com/dojo/framework/tree/master/src/testing/mocks/middleware) which can be used for reference.

# Functional tests

Unlike unit tests that load and execute code, functional tests load a page in the browser and test how users interact with the running application.

When validating application output for a certain route, an `id` should be added to the corresponding route link to allow for easier targeting.

> src/widgets/Menu.tsx

```ts
import { create, tsx } from '@dojo/framework/core/vdom';
import Link from '@dojo/framework/routing/ActiveLink';
import Toolbar from '@dojo/widgets/toolbar';

import * as css from './Menu.m.css';

const factory = create();

const Menu = factory(function Menu() {
	return (
		<Toolbar heading="My Dojo App!" collapseWidth={600}>
			<Link id="home" to="home" classes={[css.link]} activeClasses={[css.selected]}>
				Home
			</Link>
			<Link id="about" to="about" classes={[css.link]} activeClasses={[css.selected]}>
				About
			</Link>
			<Link id="profile" to="profile" classes={[css.link]} activeClasses={[css.selected]}>
				Profile
			</Link>
		</Toolbar>
	);
});

export default Menu;
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
dojo test --functional
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
