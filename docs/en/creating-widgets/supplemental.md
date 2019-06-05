# Introduction to Widgets

Widgets are the fundamental building blocks that all Dojo applications are constructed from. They are the primary units of encapsulation, and represent everything from individual elements on a user interface to higher-level containers such as forms, sections, pages, or even complete applications.

## Preamble: minimizing complexity

A single widget typically represents a single responsibility within an application. Trivial responsibilities naturally translate into individual widgets, whereas complex responsibilities need to be broken down into several interdependent areas. Each sub-area can then be implemented as its own widget, with one or more parent container widgets coordinating interactions between all the decomposed widgets. In this sort of hierarchy, the root widget can be seen to implement the larger responsibility as a whole, but in reality it does so via a composition of many other simpler widgets.

The set of all requirements for a complete application can be considered such a single, complex responsibility. Implementing the complete set within Dojo results in a hierarchy of widgets, typically starting from a root 'Application' widget which then branches out through several layers of functionality, eventually reaching leaf nodes that represent individual elements within an HTML page.

### Benefits of simplicity

Keeping widgets as simple as possible is desireable for several reasons. For single widgets, reduced complexity means greater isolation of responsibility (reduced scope); simpler comprehensive testing; reduced chance of bugs; more targeted bugfixing; as well as a wider potential for component re-use.

For complete applications, it also allows for easier understanding of all constituent components, as well as how they are combined.

All these benefits give rise to simpler ongoing maintenance and an ultimate reduction in the overall cost of building and running an application.

## Basic widget structure

### Functional widgets

TODO

### Class-based widgets

A class-based widget is a TypeScript class that inherits from `WidgetBase` (provided by the `@dojo/framework/core/WidgetBase` module), and is typically represented as the default export within its own module file.

These widgets are required to implement a `render()` method that should [return any VDOM nodes](#rendering-in-dojo) that constitute the widget's structural representation within a web page.

### Basic widget example

The following illustrates a trivial yet complete widget within a Dojo application:

> src/widgets/MyWidget.ts

```ts
import WidgetBase from '@dojo/framework/core/WidgetBase';

export default class MyWidget extends WidgetBase {
	protected render() {
		return [];
	}
}
```

This widget does not return anything from its `render()` method, so has no structural representation within an application's output.

Typical widgets will however [return one or more virtual DOM nodes from their `render()` method](#virtual-nodes-example). The process of translating virtual DOM nodes to output on a web page is handled by Dojo's rendering system.

### Widget styling

Styling of a widget's DOM output is handled via CSS, with relevant style classes stored in a CSS module file parallel to the widget's TypeScript module. Styling is identical for both functional and class-based widget types. This topic is described in detail within the [Styling and Theming reference guide](../styling-and-theming/supplemental.md).

## Scaffolding widgets

Dojo provides the [`dojo create widget`](https://github.com/dojo/cli-create-widget) CLI command to quickly scaffold new widgets. This command helps create:

-   The main TypeScript module for a widget
-   A unit test for the widget
-   A CSS module to style the widget
-   An optional custom element descriptor, if the widget is intended to be used as a Web Component

The command can be installed globally via:

```shell
npm install -g @dojo/cli-create-widget
```

and used as:

```shell
dojo create widget --name <widget name> [--styles <CSS module path>] [--tests <test path>] [--component]
```

By default, running the command for a given `dojo create widget --name MyScaffoldedWidget` will create the following structure:

    myscaffoldedwidget/
    ├── MyScaffoldedWidget.ts
    ├── styles/
    │   ├── myscaffoldedwidget.m.css
    │   └── myscaffoldedwidget.m.css.d.ts
    └── tests/
        └── unit
            └── MyScaffoldedWidget.ts

The location where styles and tests are created can be customized using the `--styles` and `--tests` arguments respectively.

A [Custom Element](https://www.w3.org/TR/2016/WD-custom-elements-20161013/) descriptor will be generated if the `--component` argument is passed. When doing so, the scaffolded widget will also include an appropriate `@customElement` decorator with an empty template object, ready for further configuration.

# Rendering in Dojo

Dojo is a reactive framework, handling responsibilities of data change propagation and associated rendering updates behind the scenes. It uses a virtual DOM (VDOM) concept to represent elements intended for output, with nodes in the VDOM being simple JavaScript objects that are designed to be more efficient to work with than actual DOM elements.

Applications only need to concern themselves with declaring their intended output structure as a hierarchy of virtual DOM nodes. This is typically done as the return values from individual widgets' [`render()` methods](#basic-widget-structure). The framework's [`Renderer`](#rendering-to-the-dom) component then synchronizes the intended output with concrete elements in the DOM. Virtual DOM nodes also serve to configure and provide state to widgets and elements, by passing in properties.

Dojo supports subtree rendering, meaning that when a change in state occurs, the framework is able to determine specific subsets of VDOM nodes affected by the change. Only the required corresponding subtrees within are then updated to reflect the change, increasing rendering performance and resulting in an improved user interactive experience.

> **Be aware:** Returning virtual nodes from `render()` is the only concern applications have around rendering. Attempting to use any other practice [is considered an anti-pattern in Dojo application development](#widget-development-best-practices), and should be avoided.

## TSX Support

Dojo supports use of the `jsx` syntax extension known as [`tsx` in TypeScript](https://www.TypeScriptlang.org/docs/handbook/jsx.html). This syntax allows for a more convenient representation of a widget's VDOM output that is closer to the resulting HTML within a built application.

### TSX-enabled applications

TSX-enabled projects can easily be scaffolded via the [`dojo create app --tsx` CLI command](https://github.com/dojo/cli-create-app).

For Dojo projects that were not scaffolded in this way, TSX can be enabled with the following additions to the project's TypeScript config:

> `./tsconfig.json`

```json
{
	"compilerOptions": {
		"jsx": "react",
		"jsxFactory": "tsx"
	},
	"include": ["./src/**/*.ts", "./src/**/*.tsx"]
}
```

### TSX widget example

Widgets with a `.tsx` file extension can output TSX from their render function by simply importing the `tsx` function from the `@dojo/framework/core/tsx` module:

> src/widgets/MyTsxWidget.tsx

```tsx
import WidgetBase from '@dojo/framework/core/WidgetBase';
import { tsx } from '@dojo/framework/core/tsx';

export default class MyTsxWidget extends WidgetBase {
	protected render() {
		return <div>Hello from a TSX widget!</div>;
	}
}
```

## Working with the VDOM

### VDOM node types

Dojo recognizes two types of nodes within its VDOM:

-   `VNode`s, or _Virtual Nodes_, which are virtual representations of concrete DOM elements, and serve as the lowest-level rendering output for all Dojo applications.
-   `WNode`s, or _Widget Nodes_, which tie Dojo widgets into the VDOM hierarchy.

Both `VNode`s and `WNode`s are considered subtypes of `DNode`s within Dojo's virtual DOM, but applications don't typically deal with `DNode`s in their abstract sense. Using [TSX syntax](#tsx-support) is also preferred as it allows applications to render both virtual node types with a uniform syntax.

### Instantiating VDOM nodes

If [TSX output](#tsx-support) is not desired, widgets can import one or both of the `v()` and `w()` utility functions provided by the `@dojo/framework/core/vdom` module. These create `VNode`s and `WNode`s, respectively, and can be used as part of the return value from a widget's [`render()` method](#basic-widget-structure). Their signatures, in abstract terms, are:

-   `v(tagName | VNode, properties?, children?)`:
-   `w(Widget | constructor, properties?, children?)`

| Argument               | Optional | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tagName | VNode`      | No       | Typically, components will pass in `tagName` as a string, which identifies the corresponding DOM element tag that will be rendered for the `VNode`. If another `VNode` is passed instead, the newly created `VNode` will act as a copy of the original. If a `properties` argument is given, the copy will receive a set of merged properties with any duplicates in `properties` overriding those from the original `VNode`. If a `children` argument is passed, it will completely override the original `VNode`'s children in the new copy. |
| `Widget | constructor` | No       | Typically, components will pass in `Widget` as a generic type reference to an imported widget. Several types of `constructor`s can also be passed, allowing Dojo to instantiate widgets in a variety of different ways. These allow for advanced features such as deferred or lazy loading.                                                                                                                                                                                                                                                    |
| `properties`           | Yes      | The [set of properties used to configure the newly created VDOM node](#virtual-node-properties). These also allow the framework to determine whether the node has been updated and should therefore be re-rendered.                                                                                                                                                                                                                                                                                                                            |
| `children`             | Yes      | An array of nodes to render as children of the newly created node. This can also include any text node children as literal strings, if required. Widgets typically encapsulate their own children, so this argument is more likely to be used with `v()` than `w()`.                                                                                                                                                                                                                                                                           |

### Virtual nodes example

The following sample widget includes a more typical `render()` method that returns a `VNode`. It has an intended structural representation of a simple `div` DOM element, that includes a text child node:

> src/widgets/MyWidget.ts

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

Dojo's `renderer()` method (provided by the `@dojo/framework/core/vdom` module) is responsible for translating an application's intended virtual output to its concrete representation within a real DOM.

Applications typically call `renderer()` in their main entry point (`main.tsx`/`main.ts`), and are required to pass in a function that returns the root node of the VDOM intended as the application's output. The `Renderer` object returned by the `renderer()` method can then be mounted to a specific DOM element within a concrete page. If no element is specified when mounting an application, `document.body` is used by default.

For example:

> src/main.tsx

```tsx
import renderer from '@dojo/framework/core/vdom';
import { tsx } from '@dojo/framework/core/tsx';

import MyComposingWidget from './widgets/MyComposingWidget';

const r = renderer(() => <MyComposingWidget />);
r.mount();
```

### `MountOptions` properties

The `Renderer.mount()` method accepts an optional `MountOptions` argument that configures how the mount operation is performed.

| Property   | Type          | Optional | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------- | ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sync`     | `boolean`     | Yes      | Default: `false`. If `true`, relevant render lifecycle callbacks (specifically, `after` and `deferred` render callbacks) are run synchronously. If `false`, the callbacks are instead scheduled to run asynchronously before the next repaint via [`window.requestAnimationFrame()`](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame). Synchronous render callbacks can be beneficial in scenarios where specific nodes need to exist in the DOM. |
| `domNode`  | `HTMLElement` | Yes      | A reference to a specific DOM element that the VDOM should be rendered within. Defaults to `document.body` if not specified.                                                                                                                                                                                                                                                                                                                                                    |
| `registry` | `Registry`    | Yes      | An optional `Registry` instance to use across the mounted VDOM.                                                                                                                                                                                                                                                                                                                                                                                                                 |

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
import renderer from '@dojo/framework/core/vdom';
import { tsx } from '@dojo/framework/core/tsx';

import MyComposingWidget from './widgets/MyComposingWidget';

const dojoAppRootElement = document.getElementById('my-dojo-app') || undefined;
const r = renderer(() => <MyComposingWidget />);
r.mount({ domNode: dojoAppRootElement });
```

## Adding external DOM nodes into the VDOM

Dojo can wrap external DOM elements, effectively bringing them into the application's VDOM and using them as part of the render output. This is accomplished with the `dom()` utility method from the `@dojo/framework/core/vdom` module. It works similarly to [`v()`](#instantiating-vdom-nodes), but takes an existing DOM node rather than an element tag string as its primary argument. It returns a `VNode` which references the DOM node passed into it, rather than a newly created element when using `v()`.

The Dojo application effectively takes ownership of the wrapped DOM node once the `VNode` returned by `dom()` has been added to the application's VDOM. Note that this process only works for nodes external to the Dojo application - either siblings of the element containing the mounted application, or newly-created nodes that are disconnected from the main webpage's DOM. Wrapping a node that is an ancestor or descendant of the application mount target element will not work.

### `dom()` API

-   `dom({ node, attrs = {}, props = {}, on = {}, diffType = 'none', onAttach })`

| Argument   | Optional | Description                                                                                                                                                                               |
| ---------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node`     | No       | The external DOM node that should be added to Dojo's VDOM                                                                                                                                 |
| `attrs`    | Yes      | The HTML attributes that should be applied to the external DOM node                                                                                                                       |
| `props`    | Yes      | The properties that should be attached to the DOM node                                                                                                                                    |
| `on`       | Yes      | The set of events to apply to the external DOM node                                                                                                                                       |
| `diffType` | Yes      | Default: `none`. The [change detection strategy](#external-dom-node-change-detection) to use when determining if the external DOM node requires updating from within the Dojo application |
| `onAttach` | Yes      | An optional callback that is executed after the node has been appended to the DOM                                                                                                         |

### External DOM node change detection

External nodes added through `dom()` are a step removed from regular virtual nodes as its possible for them be managed outside of the Dojo application. This means Dojo can't use the `VNode`'s properties as the master state for the element, but instead has to rely on the underlying javascript properties and HTML attributes on the DOM node itself.

`dom()` accepts a `diffType` property that allows users to specify a property change detection strategy for the wrapped node. A particular strategy given the wrapped node's intended usage can help Dojo to determine if a property or attribute has changed, and therefore needs to be applied to the wrapped DOM node. The default strategy is `none`, meaning Dojo will simply add the wrapped DOM element as-is within the application's output on every render cycle.

**Note:** All strategies use the events from the previous `VNode` to ensure that they are correctly removed and applied each render.

Available `dom()` change detection strategies:

| `diffType` | Description                                                                                                                                                                                                                       |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `none`     | This mode passes an empty object as the previous `attributes` and `properties` within the wrapping `VNode`, meaning the `props` and `attrs` passed to `dom()` will always be reapplied to the wrapped node in every render cycle. |
| `dom`      | This mode uses the `attributes` and `properties` from the DOM node as the base to calculate if there is a difference from the `props` and `attrs` passed to `dom()` that then need to get applied.                                |
| `vdom`     | This mode will use the previous `VNode` for the diff, which is effectively Dojo's default VDOM diff strategy. Any changes made directly to the wrapped node will be ignored in terms of change detection and rendering updates.   |

# Node properties

The concept of properties passed to nodes in the VDOM is a central pillar of Dojo. Node properties serve as the main conduit for propagating state through an application, passing it down from parent to child widgets, as well as back up through the hierarchy via event handlers. They also serve as the main API for consumers to interact with a widget, where parent widgets pass properties to configure both their own DOM representation (when returning `VNode`s) as well as any child widgets they may manage (when returning `WNode`s).

`VNode`s accept properties of type `VNodeProperties`, and `WNode`s accept a minimum of `WidgetProperties`. Widget authors usually define their own properties interface that clients are then required to pass in.

## VDOM node `key`s

`WidgetProperties` is very simple, containing a single optional property of `key` - which is also common across `VNodeProperties`.

Specifying a `key` is required when widgets begin to output several elements of the same type at the same level in the VDOM. For example, a list widget managing several list items would need to specify a `key` for each individual item in the list.

Dojo uses a virtual node's key to uniquely identify a specific instance when re-rendering affected portions of the VDOM. Without a key to differentiate multiple nodes of the same type at the same level in the VDOM, Dojo cannot accurately determine which subset of nodes may be affected by an invalidating change.

## Configuring `VNode`s

`VNodeProperties` contains many fields that act as the primary API to interact with concrete elements in the DOM. Many of these properties mirror those available on [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement), including specifying various `oneventname` event handlers.

Application of these properties is considered unidirectional, in that Dojo applies the given set to concrete DOM elements but does not synchronize any further changes made to the corresponding DOM attributes back into the given `VNodeProperties`. Any such changes should instead be propagated back into the Dojo application via event handlers. When an event handler is invoked, the application can process any change in state required for the event, update its view of the corresponding `VNodeProperties` when outputting its VDOM structure for rendering, then let Dojo's [`Renderer` synchronize any relevant updates with the DOM](#rendering-to-the-dom).

## Changing properties and diff detection

Dojo uses virtual node properties to determine if a given node has been updated and therefore requires re-rendering. Specifically, it uses a difference detection strategy to compare sets of properties from the previous and current render frames. If a difference is detected in the latest set of properties that a node receives, that node is invalidated and will be re-rendered in the next paint cycle.

> **Be aware:** Property change detection is managed internally by the framework, and is dependent on the declarative structure of widgets' VDOM output from their `render()` methods. Attempting to keep references to properties and modifying them outside of the usual `render()` cycle [is considered an anti-pattern in Dojo application development](#widget-development-best-practices), and should be avoided.

# Interactivity

## Event listeners

Event listener functions can be assigned to virtual nodes in the same way as specifying [any other property](#node-properties) when instantiating the node. When outputting `VNode`s, naming of event listeners in `VNodeProperties` mirrors [the equivalent events on `HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement). Authors of custom widgets can name their events however they choose, but typically also follow a similar `onEventName` naming convention.

Function properties such as event handlers are automatically bound to the `this` context of the widget that instantiated the virtual node. However, if an already-bound function is given as a property value, `this` will not be bound again.

## Handling Focus

When outputting `VNode`s, widgets can use `VNodeProperties`'s `focus` property to control whether the resulting DOM element should receive focus when rendering. This is a special property that accepts either a `boolean` or a function that returns a `boolean`.

When passing `true` directly, the element will only receive focus when the previous value was something other than `true` (similar to [regular property change detection](#changing-properties-and-diff-detection)). When passing a function, the element will receive focus when `true` is returned, regardless of what the previous return value was.

For example:

> src/widgets/FocusExample.tsx

```tsx
import WidgetBase from '@dojo/framework/core/WidgetBase';
import { tsx } from '@dojo/framework/core/tsx';

export default class FocusExample extends WidgetBase {
	protected render() {
		/*
			Given element order, the 'firstFocus' input will receive focus on the
			initial render, whereas the 'subsequentFocus' input will receive focus
			for all subsequent renders as it uses a function for its `focus` property.
		*/
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

### Delegating focus across widgets

Widgets can use the `FocusMixin` (from) should be used by widgets to provide `focus` to their children or to accept `focus` from a parent widget.

The `FocusMixin` adds `focus` and `shouldFocus` to a widget's API. `shouldFocus` checks if the widget is in a state to perform a focus action and will only return `true` once, until the widget's `focus` method has been called again. This `shouldFocus` method is designed to be passed to child widgets or nodes as the value of their `focus` property.

When `shouldFocus` is passed to a widget, it will be called as the properties are set on the child widget, meaning that any other usages of the parent's `shouldFocus` method will result in a return value of `false`.

An example usage controlling focus across child VNodes (DOM) and WNodes (widgets):

> src/widgets/FocusableWidget.tsx

```tsx
import WidgetBase from '@dojo/framework/core/WidgetBase';
import { tsx } from '@dojo/framework/core/tsx';
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
		Calling `this.focus()` resets the widget so that `this.shouldFocus()` will return true 
		when it is next invoked.
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

For simple applications where data is not required to flow between many components, state management can be straightforward to deal with. Data can be encapsulated within individual widgets that need it as the most [basic form of state management](#basic-internal-widget-state) within a Dojo application.

As applications grow in complexity and start requiring data to be shared and transferred between multiple widgets, a more robust form of state management is required. Here, Dojo begins to prove its value as a reactive framework, allowing applications to define how data should flow between components, then letting the framework manage change detection and re-rendering. This is done by [wiring widgets and properties together](#intermediate-widget-properties) when declaring VDOM output in a widget's `render()` method.

For large applications, state management can be one of the most challenging aspects to deal with, requiring developers to balance between data consistency, availability and fault tolerance. While a lot of this complexity remains outside the scope of the web application layer, Dojo provides further solutions that help ensure data consistency. The [Dojo Stores](../dojo-stores/supplemental.md) component provides a centralized state store with a consistent API for accessing and managing data from multiple locations within the application.

## Basic: self-encapsulated widget state

Widgets can maintain their own internal state as private class fields. Data held in these fields may directly affect the widget's render output, or may be passed as properties to any child widgets where they in turn directly affect the children's render output. Widgets may also allow their internal state to be changed, for example in response to a user interaction event.

The following example illustrates these patterns:

> src/widgets/MyEncapsulatedStateWidget.tsx

```tsx
import WidgetBase from '@dojo/framework/core/WidgetBase';
import { tsx } from '@dojo/framework/core/tsx';

export default class MyEncapsulatedStateWidget extends WidgetBase {
	private myState: string = 'Hello from a stateful widget!';
	private counter: number = 0;

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

However, this example is not complete - clicking on the 'Change State' button in the running application will not have any effect on the widget's render output. This is because the state is fully encapsulated within `MyEncapsulatedStateWidget`, and Dojo [is not aware of any changes made to it](#widget-properties). Only the widget's initial render will be processed by the framework.

In order to notify Dojo that a re-render is needed, widgets that encapsulate render state need to invalidate themselves.

### Invalidating a widget

There are two ways a widget can mark itself as invalid:

1.  Explicitly calling `this.invalidate()` in an appropriate location where state is being changed.
    -   In the `MyEncapsulatedStateWidget` example, this could be done in the 'Change State' button's `onclick` handler.
2.  Annotating any relevant fields with the `@watch()` decorator (from the `@dojo/framework/core/vdomecorators/watch` module). When `@watch`ed fields are modified, `this.invalidate()` will implicitly be called - this can be useful for state fields that always need to trigger a re-render when updated.

Note that calling `this.invalidate()` won't immediately re-render the widget - instead it acts as a notification to Dojo that the widget has been dirtied, so should be updated and re-rendered in the next available render cycle. This means invalidating a widget multiple times within the same render frame won't have any negative impact on application performance.

The following is an updated `MyEncapsulatedStateWidget` example that will correctly update its output when its state is changed. Here, both `myState` and `counter` are updated as part of the same application logic operation, so `@watch()` could be added to either or both of the fields, with the same net effect and performance profile in all cases:

> src/widgets/MyEncapsulatedStateWidget.tsx

```tsx
import WidgetBase from '@dojo/framework/core/WidgetBase';
import watch from '@dojo/framework/core/vdomecorators/watch';
import { tsx } from '@dojo/framework/core/tsx';

export default class MyEncapsulatedStateWidget extends WidgetBase {
	private myState: string = 'Hello from a stateful widget!';

	@watch()
	private counter: number = 0;

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

Passing state into a widget via virtual node [`properties`](#node-properties) is the most effective way of wiring up reactive data flows within a Dojo application.

Widgets can define their own properties interface and pass it as a generic type argument to `WidgetBase` in their class definition. The interface can include any fields the widget wants to publicly advertise to consumers, including configuration options, fields representing widget state to be injected, as well as any event handler functions.

For example, a widget supporting state and event handler properties:

> src/widgets/MyWidget.tsx

```tsx
import WidgetBase from '@dojo/framework/core/WidgetBase';
import { tsx } from '@dojo/framework/core/tsx';

export interface MyWidgetProperties {
	name: string;
	onNameChange?(newName: string): void;
}

export default class MyWidget extends WidgetBase<MyWidgetProperties> {
	protected render() {
		const { name, onNameChange } = this.properties;
		let newName: string = '';

		return (
			<div>
				<span>Hello, {name}! Not you? Set your name:</span>
				<input
					type="text"
					oninput={(e: Event) => {
						newName = (e.target as HTMLInputElement).value;
					}}
				/>
				<button
					onclick={() => {
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

```tsx
import WidgetBase from '@dojo/framework/core/WidgetBase';
import { tsx } from '@dojo/framework/core/tsx';
import watch from '@dojo/framework/core/vdomecorators/watch';
import MyWidget from './MyWidget';

export default class NameHandler extends WidgetBase {
	@watch()
	private currentName: string = 'Alice';

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

When implementing complex responsibilities, following a pattern of state encapsulation within widgets can result in bloated, unmanageable components. Another problem can arise in large applications where state is required in leaf widgets, but not in intermediate containers within the VDOM hierarchy. Passing state down such a complex widget hierarchy adds brittle, unnecessary code.

Dojo's solution to these issues is abstracting state management into its own dedicated context, then injecting relevant portions of the application's state into specific widgets that require it. This solution is available as the [Dojo stores module](../stores/supplemental.md).

# Effective widget development

## Decomposing widgets

Splitting a large component into several smaller widgets [provides several benefits](#benefits-of-simplicity) to an application.

Consider the following `List` widget, which has a simple property interface of an array of items, each consisting of an identifier (used as [the key](#vdom-node-keys) for each rendered list item), a simple string representing the item's content, and boolean toggle indicating if the item is highlighted.

> src/widgets/List.tsx

```tsx
import WidgetBase from '@dojo/framework/core/WidgetBase';
import { tsx } from '@dojo/framework/core/tsx';

export interface ListProperties {
	items: {
		id: string;
		content: string;
		highlighted: boolean;
	}[];
}

export default class List extends WidgetBase<ListProperties> {
	protected render() {
		const { items } = this.properties;

		return (
			<ul classes="list">
				{items.map((item) => {
					return (
						<li key={item.id} classes={item.highlighted ? 'highlighted' : null}>
							{item.content}
						</li>
					);
				})}
			</ul>
		);
	}
}
```

The widget works as expected, but is difficult to extend and reuse. These problems become evident when trying to add an event handler to the widget's API. For example, adding a handler that is called with the `id` of a specific list item when the item is clicked:

```ts
interface ListProperties {
	items: {
		id: string;
		content: string;
		highlighted: boolean;
	};
	onItemClick: (id: string) => void;
}
```

Attempting to implement `onItemClick` in the above `List` implementation requires wrapping it in another function in order to pass the clicked item's `id`. Doing so would mean a new function would be created every render, however Dojo does not support changing listener functions after the first render. Therefore, this implementation is not workable.

To resolve the problem, the list item can be extracted into its own dedicated widget:

> src/widgets/ListItem.tsx

```tsx
import { WidgetBase } from '@dojo/framework/core/WidgetBase';
import { tsx } from '@dojo/framework/core/tsx';

export interface ListItemProperties {
	id: string;
	content: string;
	highlighted: boolean;
	onItemClick(id: string): void;
}

export default class ListItem extends WidgetBase<ListItemProperties> {
	protected onClick(event: MouseEvent) {
		const { id } = this.properties;

		this.properties.onItemClick(id);
	}

	protected render() {
		const { id, content, highlighted } = this.properties;
		const classes = [highlighted ? 'highlighted' : null];

		return (
			<li key={id} classes={classes} onclick={this.onClick}>
				{content}
			</li>
		);
	}
}
```

The new `ListItem` widget can now be reused in other areas of the application. Composing it into `List` simplifies the original widget, and allows for a valid `onItemClick` implementation to be added:

> src/widgets/List.tsx

```tsx
import WidgetBase from '@dojo/framework/core/WidgetBase';
import { tsx } from '@dojo/framework/core/tsx';
import ListItem from './ListItem';

interface Item {
	id: string;
	content: string;
	highlighted: boolean;
}

export interface ListProperties {
	items: Item[];
	onItemClick(id: string): void;
}

export default class List extends WidgetBase<ListProperties> {
	protected render() {
		const { items, onItemClick } = this.properties;

		return (
			<ul classes="list">
				{items.map((item) => {
					return <ListItem {...item} onItemClick={onItemClick} />;
				})}
			</ul>
		);
	}
}
```

## Widget development best practices

When working with Dojo widgets, a few important principles should be kept in mind to avoid introducing anti-patterns into application code. Attempting to use the framework in an unsupported way can cause unexpected behavior and introduce difficult to find bugs into an application.

### Widget properties

-   Widgets should treat the properties passed to them as read-only.
    -   Changes made to received properties within a widget cannot be propagated back to the framework, and result in a divergence between the widget and the framework.
-   Widgets should avoid deriving further render state from their properties, and instead rely on their complete render state being provided to them.
    -   Deriving render state can cause similar divergences between the widget and the framework as modifying received properties; the framework is not aware of the derived state, so cannot properly determine when a widget has been updated and requires invalidation and re-rendering.
-   Internal or private state can be fully encapsulated within a widget, if required.
    -   It is a valid and often desireable pattern to implement 'pure' widgets that incur no side effects and receive their entire state as properties, but this is not the only pattern in Dojo widget development.

### Using class-based widgets

-   The _`__render__`_, _`__setProperties__`_, and _`__setChildren__`_ functions are internal framework implementation details and should never be called nor overridden in application code.
-   Applications should not instantiate widgets directly - Dojo fully manages the lifecycle of widget instances, including instantiation, caching and destruction.
    -   Applications only need to provide widgets to the framework as generic type parameters when calling [the `w()` method](#instantiating-vdom-nodes), or implicitly via [TSX tags](#tsx-widget-example), as VDOM output from widgets' `render()` method.

### The Virtual DOM

-   Applications should not store references to virtual nodes for later manipulation outside of returning them from a widget's `render()` call, nor as an attempt to optimize memory allocation by using a single instance across multiple `render()` calls.
    -   Virtual nodes are designed to be lightweight and cost very little to instantiate new versions of within every `render()` cycle.
    -   The framework relies on having two separate virtual node instances across two `render()` calls to perform accurate change detection. If no changes are detected, no further cost is incurred, rendering or otherwise.

### Rendering and the DOM

-   Applications should have no need to use imperative DOM manipulation calls.
    -   The framework handles all concrete rendering responsibilities, and provides alternative mechanisms to widget authors for using a variety of DOM functionality in a more simplified, type-safe, and reactive manner.
