# testing

Simple API for testing and asserting Dojo widget's expected virtual DOM and behavior.

-   [Features](#features)
-   [`harness`](#harness)
    -   [Custom Comparators](#custom-comparators)
-   [selectors](#selectors)
-   [`harness.expect`](#harnessexpect)
-   [`harness.expectPartial`](#harnessexpectpartial)
-   [`harness.trigger`](#harnesstrigger)

## Features

-   Simple, familiar and minimal API
-   Focused on testing Dojo virtual DOM structures
-   No DOM requirement by default
-   Full functional and tsx support

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

Setting up a widget for testing is simple and familiar using the `w()` function from `@dojo/framework/widget-core`:

```ts
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
let foo = 'bar';

const h = harness(() => {
	return w(MyWidget, { foo }, [ 'child' ]));
};

h.expect(/** assertion that includes bar **/);
// update the property that is passed to the widget
foo = 'foo';
h.expect(/** assertion that includes foo **/)
```

### Custom Comparators

There are circumstances where the exact value of a property is unknown during testing, so will require the use of a custom compare descriptor.

The descriptors have a [`selector`](./path/to/selector) to locate the virtual nodes to check, a property name for the custom compare and a comparator function that receives the actual value and returns a boolean result for the assertion.

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

Optionally `expect` can accepts a second parameter of function that returns a render result to assert against.

```ts
h.expect(() => v('div', { key: 'foo' }), () => v('div', { key: 'foo' }));
```

If the actual render output and expected render output are different, an exception is thrown with a structured visualization indicating all differences with `(A)` (the actual value) and `(E)` (the expected value).

Example assertion failure output:

```ts
v("div", {
	"classes": [
		"root",
(A)		"other"
(E)		"another"
	],
	"onclick": "function"
}, [
	v("span", {
		"classes": "span",
		"id": "random-id",
		"key": "label",
		"onclick": "function",
		"style": "width: 100px"
	}, [
		"hello 0"
	])
	w(ChildWidget, {
		"id": "random-id",
		"key": "widget"
	})
	w("registry-item", {
		"id": true,
		"key": "registry"
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

```ts
h.expectPartial('@child-widget', () => w(Widget, { key: 'child-widget' }));
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
