# Widget fundamentals

Widgets are the fundamental building blocks from which all Dojo applications get constructed. Widgets are the primary units of encapsulation and represent everything from individual elements on a user interface to higher-level containers such as forms, sections, pages, or even complete applications.

## Preamble: minimizing complexity

A single widget typically represents a single responsibility within an application. Trivial responsibilities naturally translate into individual widgets, whereas complex responsibilities need to get separated into several interdependent areas. Each sub-area can then be implemented as its own widget, with one or more parent container widget(s) coordinating interactions between all the decomposed widgets. In this sort of hierarchy, the root widget can be seen to implement the larger responsibility as a whole, but in reality it does so via a composition of many other simpler widgets.

The set of all requirements for a complete application can be considered such a single, complex responsibility. Implementing the complete set within Dojo results in a hierarchy of widgets, typically starting from a root 'Application' widget which then branches out through several layers of functionality, eventually reaching leaf nodes that represent individual elements within an HTML page.

### Benefits of simplicity

Keeping widgets as simple as possible is desirable for several reasons. For single widgets, reduced complexity means greater isolation of responsibility (reduced scope); simpler comprehensive testing; reduced chance of bugs; more targeted bug fixing; as well as a wider potential for component re-use.

For complete applications, simple widgets also allows for easier understanding of all constituent components, as well as how they get combined.

Together these benefits lead to simpler ongoing maintenance and an ultimate reduction in the overall cost of building and running an application.

## Basic widget structure

At their heart, widgets are simply render functions which return VDOM nodes that form the widget's structural representation within a web page. However, applications typically require more logic than a simple list of HTML elements, so meaningful widgets are usually comprised of more than just a simple render function.

Widgets are typically housed within their own self-named TypeScript modules, with the widget definition as the default export from each module.

The simplest way of representing widgets is based on plain functions, starting from a render function factory definition. Dojo provides a `create()` primitive in the `@dojo/framework/core/vdom` module that allows authors to define their widget render function factories. Named render functions are preferred as they can help with debugging, but this is not a requirement; widgets can also by identified via an exported variable holding their factory definition.

Dojo optionally supports class-based widgets for applications that prefer the structure of classes over functions. Such widgets inherit from `WidgetBase`, provided by the `@dojo/framework/core/WidgetBase` module, and are required to implement a `render()` method.

The following example shows a trivial yet complete widget within a Dojo application:

> src/widgets/MyWidget.ts

**Function-based Dojo widget variant:**

```ts
import { create } from '@dojo/framework/core/vdom';

const factory = create();

export default factory(function MyWidget() {
	return [];
});
```

**Class-based Dojo widget variant:**

```ts
import WidgetBase from '@dojo/framework/core/WidgetBase';

export default class MyWidget extends WidgetBase {
	protected render() {
		return [];
	}
}
```

Because this widget returns an empty array from its render function, it has no structural representation within an application's output. Widgets typically [return one or more virtual DOM nodes](/learn/creating-widgets/rendering-widgets#virtual-nodes-example) in order to provide meaningful structure within the application's HTML output.

The process of translating virtual DOM nodes to output on a web page is handled by [Dojo's rendering system](/learn/creating-widgets/rendering-widgets).

## Widget styling

Styling of a widget's DOM output is handled via CSS, with relevant style classes stored in a CSS module file parallel to the widget's TypeScript module. Styling is identical for both function- and class-based widget variants. This topic is described in detail within the [Styling and Theming reference guide](/learn/styling/introduction).

# Rendering widgets

Dojo is a reactive framework, handling responsibilities of data change propagation and associated rendering updates behind the scenes. Dojo leverages a virtual DOM (VDOM) concept to represent elements intended for output, with nodes in the VDOM being simple JavaScript objects that are designed to be more efficient for developers to work with than actual DOM elements.

Applications only need to concern themselves with declaring their intended output structure as a hierarchy of virtual DOM nodes, typically done as the return values from their [widgets' render functions](/learn/creating-widgets/widget-fundamentals#basic-widget-structure). The framework's [`Renderer`](/learn/creating-widgets/rendering-widgets#rendering-to-the-dom) component then synchronizes the intended output with concrete elements in the DOM. Virtual DOM nodes also serve to configure and provide state to widgets and elements by passing in properties.

Dojo supports subtree rendering, meaning that when a change in state occurs, the framework is able to determine specific subsets of VDOM nodes affected by the change. Only the required corresponding subtrees within the DOM tree are then updated to reflect the change, increasing rendering performance and improving user interactivity and experience.

> **Note:** Returning virtual nodes from widget render functions is the only concern applications have around rendering. Attempting to use any other practice [is considered an anti-pattern in Dojo application development](/learn/creating-widgets/best-practice-development), and should be avoided.

## TSX support

Dojo supports use of the `jsx` syntax extension known as [`tsx` in TypeScript](https://www.TypeScriptlang.org/docs/handbook/jsx.html). This syntax allows for a more convenient representation of a widget's VDOM output that is closer to the resulting HTML within a built application.

### TSX-enabled applications

TSX-enabled projects can easily get scaffolded via the [`dojo create app --tsx` CLI command](https://github.com/dojo/cli-create-app).

For Dojo projects that were not scaffolded in this way, TSX can be enabled with the following additions to the project's TypeScript config:

> `./tsconfig.json`

```json
{
	"compilerOptions": {
		"jsx": "react",
		"jsxFactory": "tsx"
	},
	"include": ["./src/**/*.ts", "./src/**/*.tsx", "./tests/**/*.ts", "./tests/**/*.tsx"]
}
```

### TSX widget example

Widgets with a `.tsx` file extension can output TSX from their render function by simply importing the `tsx` function from the `@dojo/framework/core/vdom` module:

> src/widgets/MyTsxWidget.tsx

**Function-based variant:**

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';

const factory = create();

export default factory(function MyTsxWidget() {
	return <div>Hello from a TSX widget!</div>;
});
```

**Class-based variant:**

```tsx
import WidgetBase from '@dojo/framework/core/WidgetBase';
import { tsx } from '@dojo/framework/core/vdom';

export default class MyTsxWidget extends WidgetBase {
	protected render() {
		return <div>Hello from a TSX widget!</div>;
	}
}
```

Widgets that need to return multiple top-level TSX nodes can wrap them in a `<virtual>` container element. This is a clearer option than returning an array of nodes as it allows for more natural automated code formatting within TSX blocks. For example:

> src/widgets/MyTsxWidget.tsx

**Function-based variant:**

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';

const factory = create();

export default factory(function MyTsxWidget() {
	return (
		<virtual>
			<div>First top-level widget element</div>
			<div>Second top-level widget element</div>
		</virtual>
	);
});
```

## Working with the VDOM

### VDOM node types

Dojo recognizes two types of nodes within its VDOM:

-   `VNode`s, or _Virtual Nodes_, which are virtual representations of concrete DOM elements, and serve as the lowest-level rendering output for all Dojo applications.
-   `WNode`s, or _Widget Nodes_, which tie Dojo widgets into the VDOM hierarchy.

Both `VNode`s and `WNode`s are considered subtypes of `DNode`s within Dojo's virtual DOM, but applications don't typically deal with `DNode`s in their abstract sense. Using [TSX syntax](/learn/creating-widgets/rendering-widgets#tsx-support) is also preferred as it allows applications to render both virtual node types with uniform syntax.

### Instantiating VDOM nodes

If TSX output is not desired, widgets can import one or both of the `v()` and `w()` primitives provided by the `@dojo/framework/core/vdom` module. These create `VNode`s and `WNode`s, respectively, and can be used as part of the return value from a [widget's render function](/learn/creating-widgets/widget-fundamentals#basic-widget-structure). Their signatures, in abstract terms, are:

-   `v(tagName | VNode, properties?, children?)`:
-   `w(Widget | constructor, properties, children?)`

| Argument               | Optional          | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tagName | VNode`      | No                | Typically, components will pass in `tagName` as a string, which identifies the corresponding DOM element tag that will be rendered for the `VNode`. If another `VNode` is passed instead, the newly created `VNode` will act as a copy of the original. If a `properties` argument is given, the copy will receive a set of merged properties with any duplicates in `properties` overriding those from the original `VNode`. If a `children` argument is passed, it will completely override the original `VNode`'s children in the new copy. |
| `Widget | constructor` | No                | Typically, components will pass in `Widget` as a generic type reference to an imported widget. Several types of `constructor`s can also be passed, allowing Dojo to instantiate widgets in a variety of different ways. These allow for advanced features such as deferred or lazy loading.                                                                                                                                                                                                                                                    |
| `properties`           | `v`: Yes, `w`: No | The [set of properties used to configure the newly created VDOM node](/learn/creating-widgets/configuring-widgets-through-properties). These also allow the framework to determine whether the node has been updated and should therefore be re-rendered.                                                                                                                                                                                                                                                                                      |
| `children`             | Yes               | An array of nodes to render as children of the newly created node. This can also include any text node children as literal strings, if required. Widgets typically encapsulate their own children, so this argument is more likely to be used with `v()` than `w()`.                                                                                                                                                                                                                                                                           |

### Virtual nodes example

The following sample widget includes a more typical render function that returns a `VNode`. It has an intended structural representation of a simple `div` DOM element which includes a text child node:

> src/widgets/MyWidget.ts

**Function-based variant:**

```ts
import { create, v } from '@dojo/framework/core/vdom';

const factory = create();

export default factory(function MyWidget() {
	return v('div', ['Hello, Dojo!']);
});
```

**Class-based variant:**

```ts
import WidgetBase from '@dojo/framework/core/WidgetBase';
import { v } from '@dojo/framework/core/vdom';

export default class MyWidget extends WidgetBase {
	protected render() {
		return v('div', ['Hello, Dojo!']);
	}
}
```

### Composition example

Similarly, widgets can compose one another using the `w()` method, and also output several nodes of both types to form a more complex structural hierarchy:

> src/widgets/MyComposingWidget.ts

**Function-based variant:**

```ts
import { create, v, w } from '@dojo/framework/core/vdom';

const factory = create();

import MyWidget from './MyWidget';

export default factory(function MyComposingWidget() {
	return v('div', ['This widget outputs several virtual nodes in a hierarchy', w(MyWidget, {})]);
});
```

**Class-based variant:**

```ts
import WidgetBase from '@dojo/framework/core/WidgetBase';
import { v, w } from '@dojo/framework/core/vdom';

import MyWidget from './MyWidget';

export default class MyComposingWidget extends WidgetBase {
	protected render() {
		return v('div', ['This widget outputs several virtual nodes in a hierarchy', w(MyWidget, {})]);
	}
}
```

## Rendering to the DOM

Applications provide a render factory function to Dojo's `renderer()` primitive, available as the default export from the `@dojo/framework/core/vdom` module. The provided factory defines the root of an application's intended VDOM structural output.

Applications typically call `renderer()` in their main entry point (`main.tsx`/`main.ts`), then mount the returned `Renderer` object to a specific DOM element within the application's HTML container. If no element is specified when mounting an application, `document.body` is used by default.

For example:

> src/main.tsx

```tsx
import renderer, { tsx } from '@dojo/framework/core/vdom';

import MyComposingWidget from './widgets/MyComposingWidget';

const r = renderer(() => <MyComposingWidget />);
r.mount();
```

### `MountOptions` properties

The `Renderer.mount()` method accepts an optional `MountOptions` argument that configures how the mount operation gets performed.

| Property   | Type          | Optional | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------- | ------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sync`     | `boolean`     | Yes      | Default: `false`. If `true`, relevant render lifecycle callbacks (specifically, `after` and `deferred` render callbacks) are run synchronously. If `false`, the callbacks are instead scheduled to run asynchronously before the next repaint via [`window.requestAnimationFrame()`](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame). Synchronous render callbacks can be beneficial in rare scenarios where specific nodes need to exist in the DOM, but this pattern is not recommended for most applications. |
| `domNode`  | `HTMLElement` | Yes      | A reference to a specific DOM element that the VDOM should be rendered within. Defaults to `document.body` if not specified.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `registry` | `Registry`    | Yes      | An optional `Registry` instance to use across the mounted VDOM.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

For example, to mount a Dojo application within a specific DOM element other than `document.body`:

> src/index.html

```html
<!DOCTYPE html>
<html lang="en-us">
	<body>
		<div>This div is outside the mounted Dojo application.</div>
		<div id="my-dojo-app">This div contains the mounted Dojo application.</div>
	</body>
</html>
```

> src/main.tsx

```tsx
import renderer, { tsx } from '@dojo/framework/core/vdom';

import MyComposingWidget from './widgets/MyComposingWidget';

const dojoAppRootElement = document.getElementById('my-dojo-app') || undefined;
const r = renderer(() => <MyComposingWidget />);
r.mount({ domNode: dojoAppRootElement });
```

## Unmounting an application

To fully unmount a Dojo application the `renderer` provides an `unmount` API which will remove the DOM nodes and perform any registered destroy operations for all widgets that are current rendered.

```tsx
const r = renderer(() => <App />);
r.mount();

// To unmount the dojo application
r.unmount();
```

## Adding external DOM nodes into the VDOM

Dojo can wrap external DOM elements, effectively bringing them into the application's VDOM and using them as part of the render output. This is accomplished with the `dom()` utility method from the `@dojo/framework/core/vdom` module. It works similarly to [`v()`](/learn/creating-widgets/rendering-widgets#instantiating-vdom-nodes), but takes an existing DOM node rather than an element tag string as its primary argument. It returns a `VNode` which references the DOM node passed into it, rather than a newly created element when using `v()`.

The Dojo application effectively takes ownership of the wrapped DOM node once the `VNode` returned by `dom()` has been added to the application's VDOM. Note that this process only works for nodes external to the Dojo application - either siblings of the element containing the mounted application, or newly-created nodes that are disconnected from the main webpage's DOM. Wrapping a node that is an ancestor or descendant of the application mount target element will not work.

### `dom()` API

-   `dom({ node, attrs = {}, props = {}, on = {}, diffType = 'none', onAttach })`

| Argument   | Optional | Description                                                                                                                                                                                                                        |
| ---------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node`     | No       | The external DOM node that should be added to Dojo's VDOM                                                                                                                                                                          |
| `attrs`    | Yes      | The HTML attributes that should be applied to the external DOM node                                                                                                                                                                |
| `props`    | Yes      | The properties that should be attached to the DOM node                                                                                                                                                                             |
| `on`       | Yes      | The set of events to apply to the external DOM node                                                                                                                                                                                |
| `diffType` | Yes      | Default: `none`. The [change detection strategy](/learn/creating-widgets/rendering-widgets#external-dom-node-change-detection) to use when determining if the external DOM node requires updating from within the Dojo application |
| `onAttach` | Yes      | An optional callback that is executed after the node has been appended to the DOM                                                                                                                                                  |

### External DOM node change detection

External nodes added through `dom()` are a step removed from regular virtual DOM nodes as it is possible for them get managed outside of the Dojo application. This means Dojo cannot use the `VNode`'s properties as the master state for the element, but instead must rely on the underlying JavaScript properties and HTML attributes on the DOM node itself.

`dom()` accepts a `diffType` property that allows users to specify a property change detection strategy for the wrapped node. A particular strategy given the wrapped node's intended usage can help Dojo to determine if a property or attribute has changed, and therefore needs to be applied to the wrapped DOM node. The default strategy is `none`, meaning Dojo will simply add the wrapped DOM element as-is within the application's output on every render cycle.

**Note:** All strategies use the events from the previous `VNode` to ensure that they are correctly removed and applied upon each render.

Available `dom()` change detection strategies:

| `diffType` | Description                                                                                                                                                                                                                       |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `none`     | This mode passes an empty object as the previous `attributes` and `properties` within the wrapping `VNode`, meaning the `props` and `attrs` passed to `dom()` will always be reapplied to the wrapped node in every render cycle. |
| `dom`      | This mode uses the `attributes` and `properties` from the DOM node as the base to calculate if there is a difference from the `props` and `attrs` passed to `dom()` that then need to get applied.                                |
| `vdom`     | This mode will use the previous `VNode` for the diff, which is effectively Dojo's default VDOM diff strategy. Any changes made directly to the wrapped node will get ignored in terms of change detection and rendering updates.  |

# Configuring widgets through properties

The concept of properties passed to nodes in the VDOM is a central pillar of Dojo. Node properties serve as the main conduit for propagating state through an application, passing it down from parent to child widgets, as well as back up through the hierarchy via event handlers. They also serve as the main API for consumers to interact with a widget, where parent widgets pass properties to configure both their own DOM representation (when returning `VNode`s) as well as any child widgets they may manage (when returning `WNode`s).

`VNode`s accept properties of type `VNodeProperties`, and `WNode`s accept a minimum of `WidgetProperties`. Widget authors usually define their own properties interface that clients are then required to pass in.

## VDOM node `key`s

`WidgetProperties` is very simple, containing a single optional property of `key` - which is also common across `VNodeProperties`.

Specifying a `key` is required when widgets begin to output several elements of the same type at the same level in the VDOM. For example, a list widget managing several list items would need to specify a `key` for each individual item in the list.

Dojo uses a virtual node's key to uniquely identify a specific instance when re-rendering affected portions of the VDOM. Without a key to differentiate multiple nodes of the same type at the same level in the VDOM, Dojo cannot accurately determine which subset of nodes may be affected by an invalidating change.

> **Note:** Virtual node `keys` should be consistent across multiple render function invocations. Generating different keys for what should be the same output node within every render call [is considered an anti-pattern in Dojo application development](/learn/creating-widgets/best-practice-development#the-virtual-dom), and should be avoided.

## Defining widget `key`s

Traditionally the widget's `key` property is used by the Dojo rendering engine to uniquely identify and track widgets across renders. However, updating the `key` property is also an effective way to guarantee that during the next render Dojo's rendering engine will recreate the widget instead of reusing the previous instance. When recreating the widget all previous state will get reset. This behavior is useful when working with widgets that manage logic based on the value of a widget property.

Dojo provides a mechanism for widget authors to associate a widget property to the widget's identity by using the `.key()` chained method from the `create()` factory.

```tsx
import { create } from '@dojo/framework/core/vdom';

interface MyWidgetProperties {
	id: string;
}

const factory = create()
	.properties<MyWidgetProperties>()
	.key('id');
```

Using this factory Dojo will recreate the widget instance if the `id` property changes. This powerful feature provides widget authors assurance their widget will get recreated when the defined property changes, therefore not having to deal with complicated logic to refresh data based on the property.

```tsx
import { create } from '@dojo/framework/core/vdom';
import icache from '@dojo/framework/core/middleware/icache';

interface MyWidgetProperties {
	id: string;
}

const factory = create({ icache })
	.properties<MyWidgetProperties>()
	.key('id');

const MyWidget = factory(function MyWidget({ properties, middleware: { icache } }) {
	const { id } = properties();
	const data = icache.getOrSet('data', async () => {
		const response = await fetch(`https://my-api/items/${id}`);
		const json = await response.json();
		return json.data;
	});

	if (!data) {
		return <div>Loading Data...</div>;
	}

	return (
		<div>
			<ul>{data.map((item) => <li>{item}</li>)}</ul>
		</div>
	);
});
```

This example demonstrates fetching data based on the `id` property. Without using `.key('id)`, the widget would need to manage scenarios where the `id` property changes. This would include logic to determine if the property has actually changed, re-fetch the relevant data and also show the loading message. Using `.key('id')` guarantees that when the `id` property changes the widget will get recreated and the state reset, and the widget shows the "Loading Data..." message and fetches data based on the updated `id`.

## Configuring `VNode`s

`VNodeProperties` contains many fields that act as the primary API to interact with concrete elements in the DOM. Many of these properties mirror those available on [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement), including specifying various `oneventname` event handlers.

Application of these properties is considered unidirectional, in that Dojo applies the given set to concrete DOM elements but does not synchronize any further changes made to the corresponding DOM attributes back into the given `VNodeProperties`. Any such changes should instead be propagated back into the Dojo application via event handlers. When an event handler is invoked, the application can process any change in state required for the event, update its view of the corresponding `VNodeProperties` when outputting its VDOM structure for rendering, and then let Dojo's [`Renderer` synchronize any relevant updates with the DOM](/learn/creating-widgets/rendering-widgets#rendering-to-the-dom).

## Changing properties and diff detection

Dojo uses virtual node properties to determine if a given node has been updated and therefore requires re-rendering. Specifically, it uses a difference detection strategy to compare sets of properties from the previous and current render frames. If a difference is detected in the latest set of properties that a node receives, that node is invalidated and gets re-rendered in the next paint cycle.

Note that function properties are ignored during property diff detection as it is a common pattern to instantiate a new function on every render. Consider the following example in which the child widget, `ChildWidget`, receives a new `onClick` function on every render.

```tsx
export const ParentWidget(function ParentWidget() {
  return <ChildWidget onClick={() => {
      console.log('child widget clicked.');
  }} />
});
```

If functions were checked during diff detection, this would cause `ChildWidget` to re-render every time `ParentWidget` rendered.

> **Be aware:** Property change detection is managed internally by the framework, and is dependent on the declarative structure of widgets' VDOM output from their render functions. Attempting to keep references to properties and modifying them outside of the usual widget render cycle [is considered an anti-pattern in Dojo application development](/learn/creating-widgets/best-practice-development), and should be avoided.

# Enabling interactivity

## Event listeners

Event listener functions can be assigned to virtual nodes in the same way as specifying [any other property](/learn/creating-widgets/configuring-widgets-through-properties) when instantiating the node. When outputting `VNode`s, naming of event listeners in `VNodeProperties` mirrors [the equivalent events on `HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement). Authors of custom widgets can name their events however they choose, but typically also follow a similar `onEventName` naming convention.

Function properties such as event handlers are automatically bound to the `this` context of the widget that instantiated the virtual node. However, if an already-bound function is given as a property value, `this` will not be bound again.

## Handling focus

When outputting `VNode`s, widgets can use `VNodeProperties`'s `focus` property to control whether the resulting DOM element should receive focus when rendering. This is a special property that accepts either a `boolean` or a function that returns a `boolean`.

When passing `true` directly, the element will only receive focus when the previous value was something other than `true` (similar to [regular property change detection](/learn/creating-widgets/configuring-widgets-through-properties#changing-properties-and-diff-detection)). When passing a function, the element will receive focus when `true` is returned, regardless of what the previous return value was.

For example:

Given element ordering, the following 'firstFocus' input will receive focus on the initial render, whereas the 'subsequentFocus' input will receive focus for all future renders as it uses a function for its `focus` property.

> src/widgets/FocusExample.tsx

**Function-based variant:**

```tsx
import { create, tsx, invalidator } from '@dojo/framework/core/vdom';

const factory = create({ invalidator });

export default factory(function FocusExample({ middleware: { invalidator } }) {
	return (
		<div>
			<input key="subsequentFocus" type="text" focus={() => true} />
			<input key="firstFocus" type="text" focus={true} />
			<button onclick={() => invalidator()}>Re-render</button>
		</div>
	);
});
```

**Class-based variant:**

```tsx
import WidgetBase from '@dojo/framework/core/WidgetBase';
import { tsx } from '@dojo/framework/core/vdom';

export default class FocusExample extends WidgetBase {
	protected render() {
		return (
			<div>
				<input key="subsequentFocus" type="text" focus={() => true} />
				<input key="firstFocus" type="text" focus={true} />
				<button onclick={() => this.invalidate()}>Re-render</button>
			</div>
		);
	}
}
```

### Delegating focus

Function-based widgets can use the [`focus` middleware](/learn/middleware/available-middleware#focus) to provide focus to their children or to accept focus from a parent widget. Class-based widgets can use the `FocusMixin` (from `@dojo/framework/core/mixins/Focus`) to delegate focus in a similar way.

`FocusMixin` adds a `this.shouldFocus()` method to a widget's class, whereas function-based widgets use the `focus.shouldFocus()` middleware method for the same purpose. This method checks if the widget is in a state to perform a focus action and will only return `true` for a single invocation, until the widget's `this.focus()` method has been called again (function-based widgets use the `focus.focus()` middleware equivalent).

`FocusMixin` or the `focus` middleware also add a `focus` function property to a widget's API. The framework uses the boolean result from this property to determine if the widget (or one of its children) should receive focus when rendering. Typically, widgets pass the `shouldFocus` method to a specific child widget or an output node via their `focus` property, allowing parent widgets to delegate focus to their children.

See the [`focus` middleware delegation example](/learn/middleware/available-middleware#focus-delegation-example) in the Dojo middleware reference guide for an example for function-based widgets.

The following shows an example of delegating and controlling focus across a class-based widget hierarchy and output VNodes:

> src/widgets/FocusableWidget.tsx

```tsx
import WidgetBase from '@dojo/framework/core/WidgetBase';
import { tsx } from '@dojo/framework/core/vdom';
import Focus from '@dojo/framework/core/mixins/Focus';

interface FocusInputChildProperties {
	onFocus: () => void;
}

class FocusInputChild extends Focus(WidgetBase)<FocusInputChildProperties> {
	protected render() {
		/*
			The child widget's `this.shouldFocus()` method is assigned directly to the
			input node's `focus` property, allowing focus to be delegated from a higher
			level containing parent widget.

			The input's `onfocus()` event handler is also assigned to a method passed
			in from a parent widget, allowing user-driven focus changes to propagate back
			into the application.
		*/
		return <input onfocus={this.properties.onFocus} focus={this.shouldFocus} />;
	}
}

export default class FocusableWidget extends Focus(WidgetBase) {
	private currentlyFocusedKey = 0;
	private childCount = 5;

	private onFocus(key: number) {
		this.currentlyFocusedKey = key;
		this.invalidate();
	}

	/*
		Calling `this.focus()` resets the widget so that `this.shouldFocus()` will return true when it is next invoked.
	*/
	private focusPreviousChild() {
		--this.currentlyFocusedKey;
		if (this.currentlyFocusedKey < 0) {
			this.currentlyFocusedKey = this.childCount - 1;
		}
		this.focus();
	}

	private focusNextChild() {
		++this.currentlyFocusedKey;
		if (this.currentlyFocusedKey === this.childCount) {
			this.currentlyFocusedKey = 0;
		}
		this.focus();
	}

	protected render() {
		/*
			The parent widget's `this.shouldFocus()` method is passed to the relevant child element
			that requires focus, based on the simple previous/next widget selection logic.

			This allows focus to be delegated to a specific child node based on higher-level logic in
			a container/parent widget.
		*/
		return (
			<div>
				<button onclick={this.focusPreviousChild}>Previous</button>
				<button onclick={this.focusNextChild}>Next</button>
				<FocusInputChild
					key={0}
					focus={this.currentlyFocusedKey === 0 ? this.shouldFocus : undefined}
					onFocus={() => this.onFocus(0)}
				/>
				<FocusInputChild
					key={1}
					focus={this.currentlyFocusedKey === 1 ? this.shouldFocus : undefined}
					onFocus={() => this.onFocus(1)}
				/>
				<FocusInputChild
					key={2}
					focus={this.currentlyFocusedKey === 2 ? this.shouldFocus : undefined}
					onFocus={() => this.onFocus(2)}
				/>
				<FocusInputChild
					key={3}
					focus={this.currentlyFocusedKey === 3 ? this.shouldFocus : undefined}
					onFocus={() => this.onFocus(3)}
				/>
				<FocusInputChild
					key={4}
					focus={this.currentlyFocusedKey === 4 ? this.shouldFocus : undefined}
					onFocus={() => this.onFocus(4)}
				/>
			</div>
		);
	}
}
```

# Managing state

For simple applications where data is not required to flow between many components, state management can be very straightforward. Data can be encapsulated within individual widgets that need it as the most [basic form of state management](/learn/creating-widgets/managing-state#basic-self-encapsulated-widget-state) within a Dojo application.

As applications grow in complexity and start requiring data to be shared and transferred between multiple widgets, a more robust form of state management is required. Here, Dojo begins to prove its value as a reactive framework, allowing applications to define how data should flow between components, then letting the framework manage change detection and re-rendering. This is done by [wiring widgets and properties together](/learn/creating-widgets/managing-state#intermediate-passing-widget-properties) when declaring VDOM output in a widget's render function.

For large applications, state management can be one of the most challenging aspects to deal with, requiring developers to balance between data consistency, availability and fault tolerance. While a lot of this complexity remains outside the scope of the web application layer, Dojo provides further solutions that help ensure data consistency. The [Dojo Stores](/learn/stores/introduction) component provides a centralized state store with a consistent API for accessing and managing data from multiple locations within the application.

## Basic: self-encapsulated widget state

Widgets can maintain their own internal state in a variety of ways. Function-based widgets can use the [`icache`](/learn/middleware/available-middleware#icache) middleware to store widget-local state, and class-based widgets can use internal class fields.

Internal state data may directly affect the widget's render output, or may be passed as properties to any child widgets where they in turn directly affect the children's render output. Widgets may also allow their internal state to be changed, for example in response to a user interaction event.

The following example illustrates these patterns:

> src/widgets/MyEncapsulatedStateWidget.tsx

**Function-based variant:**

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import icache from '@dojo/framework/core/middleware/icache';

const factory = create({ icache });

export default factory(function MyEncapsulatedStateWidget({ middleware: { icache } }) {
	return (
		<div>
			Current widget state: {icache.get<string>('myState') || 'Hello from a stateful widget!'}
			<br />
			<button
				onclick={() => {
					let counter = icache.get<number>('counter') || 0;
					let myState = 'State change iteration #' + ++counter;
					icache.set('myState', myState);
					icache.set('counter', counter);
				}}
			>
				Change State
			</button>
		</div>
	);
});
```

**Class-based variant:**

```tsx
import WidgetBase from '@dojo/framework/core/WidgetBase';
import { tsx } from '@dojo/framework/core/vdom';

export default class MyEncapsulatedStateWidget extends WidgetBase {
	private myState = 'Hello from a stateful widget!';
	private counter = 0;

	protected render() {
		return (
			<div>
				Current widget state: {this.myState}
				<br />
				<button
					onclick={() => {
						this.myState = 'State change iteration #' + ++this.counter;
					}}
				>
					Change State
				</button>
			</div>
		);
	}
}
```

Note that this example is not complete - clicking on the 'Change State' button in the running application will not have any effect on the widget's render output. This is because the state is fully encapsulated within `MyEncapsulatedStateWidget`, and Dojo [is not aware of any changes made to it](/learn/creating-widgets/best-practice-development#widget-properties). Only the widget's initial render will be processed by the framework.

In order to notify Dojo that a re-render is needed, widgets that encapsulate render state need to invalidate themselves.

### Invalidating a widget

Function-based widgets can use the [`icache` middleware](/learn/middleware/available-middleware#icache) to deal with local state management that automatically invalidates the widget when state is updated. `icache` composes [`cache`](/learn/middleware/available-middleware#cache) and [`invalidator` ](/learn/middleware/available-middleware#invalidator) middleware, with `cache` handling widget state management and `invalidator` handling widget invalidation on state change. Function-based widgets can also use `invalidator` directly, if desired.

For class-based widgets, there are two ways to invalidate:

1.  Explicitly calling `this.invalidate()` in an appropriate location where state is being changed.
    -   In the `MyEncapsulatedStateWidget` example, this could be done in the 'Change State' button's `onclick` handler.
2.  Annotating any relevant fields with the `@watch()` decorator (from the `@dojo/framework/core/vdomecorators/watch` module). When `@watch`ed fields are modified, `this.invalidate()` will implicitly be called - this can be useful for state fields that always need to trigger a re-render when updated.

**Note:** marking a widget as invalid won't immediately re-render the widget - instead it acts as a notification to Dojo that the widget is in a dirty state and should be updated and re-rendered in the next render cycle. This means invalidating a widget multiple times within the same render frame won't have a negative impact on application performance, although excessive invalidation should be avoided to ensure optimal performance.

The following is an updated `MyEncapsulatedStateWidget` example that will correctly update its output when its state is changed.

**Function-based variant:**

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import icache from '@dojo/framework/core/middleware/icache';

const factory = create({ icache });

export default factory(function MyEncapsulatedStateWidget({ middleware: { icache } }) {
	return (
		<div>
			Current widget state: {icache.getOrSet<string>('myState', 'Hello from a stateful widget!')}
			<br />
			<button
				onclick={() => {
					let counter = icache.get<number>('counter') || 0;
					let myState = 'State change iteration #' + ++counter;
					icache.set('myState', myState);
					icache.set('counter', counter);
				}}
			>
				Change State
			</button>
		</div>
	);
});
```

**Class-based variant:**

Here, both `myState` and `counter` are updated as part of the same application logic operation, so `@watch()` could be added to either or both of the fields, with the same net effect and performance profile in all cases:

> src/widgets/MyEncapsulatedStateWidget.tsx

```tsx
import WidgetBase from '@dojo/framework/core/WidgetBase';
import watch from '@dojo/framework/core/decorators/watch';
import { tsx } from '@dojo/framework/core/vdom';

export default class MyEncapsulatedStateWidget extends WidgetBase {
	private myState: string = 'Hello from a stateful widget!';

	@watch() private counter: number = 0;

	protected render() {
		return (
			<div>
				Current widget state: {this.myState}
				<br />
				<button
					onclick={() => {
						this.myState = 'State change iteration #' + ++this.counter;
					}}
				>
					Change State
				</button>
			</div>
		);
	}
}
```

## Intermediate: passing widget properties

Passing state into a widget via virtual node [`properties`](/learn/creating-widgets/configuring-widgets-through-properties) is the most effective way of wiring up reactive data flows within a Dojo application.

Widgets specify their own properties [interface](https://www.typescriptlang.org/docs/handbook/interfaces.html) which can include any fields the widget wants to publicly advertise to consumers, including configuration options, fields representing injectable state, as well as any event handler functions.

Function-based widgets pass their properties interface as a generic type argument to the `create().properties<MyPropertiesInterface>()` call. The factory returned from this call chain then makes property values available via a `properties` function argument in the render function definition.

Class-based widgets can define their properties interface as a generic type argument to `WidgetBase` in their class definition, and then access their properties through the `this.properties` object.

For example, a widget supporting state and event handler properties:

> src/widgets/MyWidget.tsx

**Function-based variant:**

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import icache from '@dojo/framework/core/middleware/icache';

const factory = create().properties<{
	name: string;
	onNameChange?(newName: string): void;
}>();

export default factory(function MyWidget({ middleware: { icache }, properties }) {
	const { name, onNameChange } = properties();
	let newName = icache.get<string>('new-name') || '';
	return (
		<div>
			<span>Hello, {name}! Not you? Set your name:</span>
			<input
				type="text"
				value={newName}
				oninput={(e: Event) => {
					icache.set('new-name', (e.target as HTMLInputElement).value);
				}}
			/>
			<button
				onclick={() => {
					icache.set('new-name', undefined);
					onNameChange && onNameChange(newName);
				}}
			>
				Set new name
			</button>
		</div>
	);
});
```

**Class-based variant:**

```tsx
import WidgetBase from '@dojo/framework/core/WidgetBase';
import { tsx } from '@dojo/framework/core/vdom';

export interface MyWidgetProperties {
	name: string;
	onNameChange?(newName: string): void;
}

export default class MyWidget extends WidgetBase<MyWidgetProperties> {
	private newName = '';
	protected render() {
		const { name, onNameChange } = this.properties;
		return (
			<div>
				<span>Hello, {name}! Not you? Set your name:</span>
				<input
					type="text"
					value={this.newName}
					oninput={(e: Event) => {
						this.newName = (e.target as HTMLInputElement).value;
						this.invalidate();
					}}
				/>
				<button
					onclick={() => {
						this.newName = '';
						onNameChange && onNameChange(newName);
					}}
				>
					Set new name
				</button>
			</div>
		);
	}
}
```

A consumer of this example widget can interact with it by passing in appropriate properties:

> src/widgets/NameHandler.tsx

**Function-based variant:**

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import icache from '@dojo/framework/core/middleware/icache';

import MyWidget from './MyWidget';

const factory = create({ icache });

export default factory(function NameHandler({ middleware: { icache } }) {
	let currentName = icache.get<string>('current-name') || 'Alice';
	return (
		<MyWidget
			name={currentName}
			onNameChange={(newName) => {
				icache.set('current-name', newName);
			}}
		/>
	);
});
```

**Class-based variant:**

```tsx
import WidgetBase from '@dojo/framework/core/WidgetBase';
import { tsx } from '@dojo/framework/core/vdom';
import watch from '@dojo/framework/core/decorators/watch';
import MyWidget from './MyWidget';

export default class NameHandler extends WidgetBase {
	@watch() private currentName: string = 'Alice';

	protected render() {
		return (
			<MyWidget
				name={this.currentName}
				onNameChange={(newName) => {
					this.currentName = newName;
				}}
			/>
		);
	}
}
```

## Advanced: abstracting and injecting state

When implementing complex responsibilities, following a pattern of state encapsulation within widgets can result in bloated, unmanageable components. Another problem can arise in large applications with hundreds of widgets structured across tens of layers of structural hierarchy. State is usually required in the leaf widgets, but not in intermediate containers within the VDOM hierarchy. Passing state through all layers of such a complex widget hierarchy adds brittle, unnecessary code.

Dojo provides the [Stores component](/learn/stores/introduction) to solve these issues by abstracting state management into its own dedicated context, then injecting relevant portions of the application's state into specific widgets that require it.

# Best practice development

When working with Dojo widgets, a few important principles should be kept in mind to avoid introducing anti-patterns into application code. Attempting to use the framework in an unsupported way can cause unexpected behavior and introduce difficult to find bugs into an application.

## Widget properties

-   Widgets should treat the properties passed to them as read-only.
    -   Changes made to received properties within a widget cannot be propagated back to the framework, and result in a divergence between the widget and the framework.
-   Widgets should avoid deriving further render state from their properties, and instead rely on their complete render state being provided to them.
    -   Deriving render state can cause similar divergences between the widget and the framework as modifying received properties; the framework is not aware of the derived state, so cannot properly determine when a widget has been updated and requires invalidation and re-rendering.
-   Internal or private state can be fully encapsulated within a widget, if required.
    -   It is a valid and often desirable pattern to implement 'pure' widgets that incur no side effects and receive their entire state as properties, but this is not the only pattern in Dojo widget development.

## Using class-based widgets

-   The _`__render__`_, _`__setProperties__`_, and _`__setChildren__`_ functions are internal framework implementation details and should never be called nor overridden in application code.
-   Applications should not instantiate widgets directly - Dojo fully manages the lifecycle of widget instances, including instantiation, caching and destruction.

## The virtual DOM

-   Virtual node [`key`s](/learn/creating-widgets/configuring-widgets-through-properties#vdom-node-keys) should be consistent across multiple render calls.
    -   If a different `key` is specified on every render invocation, Dojo cannot efficiently associate nodes across previous and current renders. Dojo treats new `key`s that it has not seen in the previous render as new elements, which results in the previous nodes being removed from the DOM and an entirely new set being added - even when there are no other property changes that would actually warrant a DOM update.
    -   A common anti-pattern is assigning a randomly-generated ID (such as a GUID or UUID) as a node's `key` within a widget's render function. Node `key`s should not be generated within a render function unless the generation strategy is idempotent.
-   Applications should not store references to virtual nodes for later manipulation outside of returning them from a widget's render function, nor as an attempt to optimize memory allocation by using a single instance across multiple render calls.
    -   Virtual nodes are designed to be lightweight and cost very little to instantiate new versions of within every widget render cycle.
    -   The framework relies on having two separate virtual node instances across two widget render function calls to perform accurate change detection. If no changes are detected, no further cost is incurred, rendering or otherwise.

## Rendering and the DOM

-   Applications should have no need to use imperative DOM manipulation calls.
    -   The framework handles all concrete rendering responsibilities, and provides alternative mechanisms to widget authors for using a variety of DOM functionality in a more simplified, type-safe, and reactive manner.
