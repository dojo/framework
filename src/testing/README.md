# testing

Simple API for testing and asserting Dojo widget's expected virtual DOM and behavior.

-   [Features](#features)
-   [`harness`](#harness)
    -   [Custom Comparators](#custom-comparators)
-   [selectors](#selectors)
-   [`harness.expect`](#harnessexpect)
-   [`harness.expectPartial`](#harnessexpectpartial)
-   [`harness.trigger`](#harnesstrigger)
-   [Assertion Templates](#assertion-templates)

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

Setting up a widget for testing is simple and familiar using the `w()` function from `@dojo/framework/core`:

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

```ts
class NumberWidget extends WidgetBase<{ num?: number }> {
	protected render() {
		const { num } = this.properties;
		const message = num === undefined ? 'no number passed' : `the number ${num}`;
		return v('div', [v('span', [message])]);
	}
}
```

The base assertion might look like:

```ts
const baseAssertion = assertionTemplate(() => {
	return v('div', [
		v('span', { '~key': 'message' }, [ 'no number passed' ]);
	]);
});
```

and in a test would look like:

```ts
it('should render no number passed when no number is passed as a property', () => {
	const h = harness(() => w(NumberWidget, {}));
	h.expect(baseAssertion);
});
```

now lets see how we'd test the output when the `num` property is passed to the `NumberWidget`:

```ts
it('should render the number when a number is passed as a property', () => {
	const numberAssertion = baseAssertion.setChildren('~message', ['the number 5']);
	const h = harness(() => w(NumberWidget, { num: 5 }));
	h.expect(numberAssertion);
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
replaceChildren(selector: string, children: DNode[]): AssertionTemplateResult;
setChildren(selector: string, children: DNode[], type?: 'prepend' | 'replace' | 'append'): AssertionTemplateResult;
setProperty(selector: string, property: string, value: any): AssertionTemplateResult;
setProperties(selector: string, value: any | PropertiesComparatorFunction): AssertionTemplateResult;
getChildren(selector: string): DNode[];
getProperty(selector: string, property: string): any;
getProperties(selector: string): any;
replace(selector: string, node: DNode): AssertionTemplateResult;
remove(selector: string): AssertionTemplateResult;
```
