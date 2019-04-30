- [Introduction to Widgets](#introduction-to-widgets)
	- [Minimizing complexity](#minimizing-complexity)
	- [Basic widget structure](#basic-widget-structure)
		- [Basic widget example](#basic-widget-example)
	- [Scaffolding widgets](#scaffolding-widgets)
- [Rendering in Dojo](#rendering-in-dojo)
	- [TSX Support](#tsx-support)
		- [TSX-enabled applications](#tsx-enabled-applications)
		- [TSX widget example](#tsx-widget-example)
	- [Working with the VDOM](#working-with-the-vdom)
		- [VDOM node types](#vdom-node-types)
		- [Instantiating VDOM nodes](#instantiating-vdom-nodes)
		- [Virtual nodes example](#virtual-nodes-example)
		- [Composition example](#composition-example)
	- [Rendering to the DOM](#rendering-to-the-dom)
		- [`MountOptions` properties](#mountoptions-properties)
	- [Adding external DOM nodes into the VDOM](#adding-external-dom-nodes-into-the-vdom)
- [Managing state](#managing-state)
	- [Basic: widget-encapsulated state](#basic-widget-encapsulated-state)
		- [Invalidating a widget](#invalidating-a-widget)
	- [Intermediate: passing widget properties](#intermediate-passing-widget-properties)
		- [Advanced diffing strategies](#advanced-diffing-strategies)
			- [Property change hooks](#property-change-hooks)
	- [Advanced: abstracting and injecting state](#advanced-abstracting-and-injecting-state)
		- [Creating an application context](#creating-an-application-context)
		- [Injectors](#injectors)
		- [Creating state containers](#creating-state-containers)
		- [Using state containers](#using-state-containers)
- [Effective widget development](#effective-widget-development)
	- [Decomposing widgets](#decomposing-widgets)
	- [Widget development best practices](#widget-development-best-practices)
- [Widget interactivity](#widget-interactivity)
	- [Responding to events](#responding-to-events)
		- [Event listeners](#event-listeners)
		- [Using event handlers](#using-event-handlers)
		- [Final steps](#final-steps)
	- [Handling Focus](#handling-focus)
	- [Working with forms](#working-with-forms)
		- [Forms](#forms)
		- [Form widgets](#form-widgets)
		- [Using forms](#using-forms)
	- [Form validation](#form-validation)
		- [Create a place to store form errors](#create-a-place-to-store-form-errors)
		- [Tie validation to form inputs](#tie-validation-to-form-inputs)
		- [Extending TextInput](#extending-textinput)
		- [Making use of the blur event](#making-use-of-the-blur-event)
		- [Validating on submit](#validating-on-submit)
- [Widget lifecycle hooks](#widget-lifecycle-hooks)
	- [`@beforeProperties` (decorator)](#beforeproperties-decorator)
	- [`@alwaysRender` (decorator)](#alwaysrender-decorator)
	- [`@beforeRender` (decorator)](#beforerender-decorator)
	- [`@afterRender` (decorator)](#afterrender-decorator)
	- [`onAttach` (method override)](#onattach-method-override)
	- [`onDetach` (method override)](#ondetach-method-override)
- [Converting widgets into web components](#converting-widgets-into-web-components)
	- [`@customElement()` properties](#customelement-properties)
	- [Attributes](#attributes)
	- [Properties](#properties)
	- [Events](#events)
	- [Tag Name](#tag-name)
- [Widget metadata](#widget-metadata)
	- [`Dimensions`](#dimensions)
	- [`Intersection`](#intersection)
	- [`WebAnimation`](#webanimation)
		- [Basic Example](#basic-example)
		- [Changing Animation](#changing-animation)
		- [Passing an effects function](#passing-an-effects-function)
		- [Get animation info](#get-animation-info)
	- [Drag](#drag)
	- [Focus](#focus)
	- [Resize](#resize)
	- [Implementing Custom Meta](#implementing-custom-meta)
- [Application composition](#application-composition)
	- [Working with the Registry](#working-with-the-registry)
	- [Registry Decorator](#registry-decorator)
	- [Loading esModules](#loading-esmodules)
	- [Containers & Injectors](#containers--injectors)

# Introduction to Widgets

Widgets are the fundamental building blocks that all Dojo applications are constructed from. They are the primary units of encapsulation, and represent everything from individual elements on a user interface to non-presentational utilities, as well as higher-level containers such as forms, sections, pages, or even complete applications. A Dojo application is effectively a hierarchy of widgets assembled in a way to implement a given set of requirements.

## Minimizing complexity

A single widget typically represents a single responsibility within an application. Complex responsibilities can be decomposed into several collaborating widgets. Ensuring widgets are as simple as possible helps reduce complexity within an application.

Reducing complexity helps in many areas of application development. For a single widget, it means greater isolation of responsibility (reduced scope), simpler comprehensive testing, more targeted bugfixing, as well as a wider potential for component re-use. For complete applications, it allows for easier understanding of all constituent components as well as how they are combined. All these benefits result in simpler ongoing maintenance and an ultimate reduction in the overall cost of building and running an application.

## Basic widget structure

A widget is a TypeScript class that inherits from `WidgetBase` (provided by the `@dojo/framework/widget-core/WidgetBase` module), and is typically housed in its own module file. A widget's TypeScript class contains all application logic required to fulfill the widget's single responsibility.

Widgets are required to implement a `render()` method that should return any VDOM nodes that constitute the widget's structural representation within a web page.

Widgets rarely exist in total isolation so their implementation class will also typically include interactions with other collaborating widgets. This could for example include any child elements that the widget manages, a central data store acting as the authority for the widget's state, or a transport for interacting with any backend services associated with the widget's responsibility.

Widgets are intended to be reusable components, so their implementation class is typically the default export from their TypeScript module. This provides a consistent way of interacting with widgets to their users.

Many widgets include some form of presentation to end users, visual or otherwise. Widget presentation in Dojo is handled via CSS, so widgets that require presentation will typically have an associated CSS module within the application codebase.

### Basic widget example

The following illustrates a trivial yet complete widget within a Dojo application:

> src/widgets/MyWidget.ts

```ts
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';

export default class MyWidget extends WidgetBase {
	protected render() {
		return [];
	}
}
```

This widget does not return anything from its `render()` method, so has no structural representation within an application's output.

Typical widgets will however [return one or more virtual DOM nodes from their `render()` method](#virtual-nodes-example). The process of translating virtual DOM nodes to output on a web page is handled by Dojo's rendering system.

## Scaffolding widgets

Dojo provides the [`dojo create widget`](https://github.com/dojo/cli-create-widget) CLI command to quickly scaffold new widgets. This command helps create:

-   The main TypeScript module for a widget
-   A unit test for the widget
-   A CSS module to style the widget
-   An optional custom element descriptor, if the widget is intended to be used as a Web Component

The command can be installed globally via:

```sh
npm install -g @dojo/cli-create-widget
```

and used as:

```sh
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

Dojo uses a virtual DOM (VDOM) concept to represent elements intended for output. Nodes in the VDOM are simple JavaScript objects, designed to be more efficient to work with than actual DOM elements.

Dojo applications declare their intended output structure as virtual nodes, typically as the return values from their widgets' [`render()` methods](#basic-widget-structure). The framework's [`Renderer`](#rendering-to-the-dom) component then synchronizes the intended output with 'real' elements in the DOM.

Subtree rendering is also supported, meaning that when a change in state occurs, the framework is able to determine specific subsets of nodes affected by the change. Only the required corresponding subtrees within the DOM are updated to reflect the change, increasing rendering performance and resulting in an improved user interactive experience.

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

Widgets with a `.tsx` file extension can output TSX from their render function by simply importing the `tsx` function from the `@dojo/framework/widget-core/tsx` module:

> src/widgets/MyTsxWidget.tsx

```tsx
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import { tsx } from '@dojo/framework/widget-core/tsx';

export default class MyTsxWidget extends WidgetBase {
	protected render() {
		return <div>Hello from a TSX widget!</div>;
	}
}
```

## Working with the VDOM

### VDOM node types

Dojo recognizes two types of nodes within its VDOM:

-   `VNode`s, or _Virtual Nodes_
    -   These correspond to virtual representations of concrete DOM elements, and serve as the lowest-level rendering output for all Dojo applications.
-   `WNode`s, or _Widget Nodes_
    -   These tie Dojo widgets to the virtual DOM, and are used as a way to reactively inject state into a widget.

Both `VNode`s and `WNode`s are considered subtypes of `DNode`s within Dojo's virtual DOM, but applications don't typically deal with `DNode`s in their abstract sense. Using [TSX syntax](#tsx-support) is also preferred as it allows applications to deal with both virtual node types in a single, consistent manner.

### Instantiating VDOM nodes

Dojo widgets that do not use [TSX output](#tsx-support) can import one or both of the `v()` and `w()` utility functions provided by the `@dojo/framework/widget-core/d` module. These create `VNode`s and `WNode`s, respectively, and can be used as part of the return value from a widget's [`render()` method](#basic-widget-structure). Their signatures, in abstract terms, are:

-   `v(tagName | VNode, properties?, children?)`:
    -   `tagName | VNode`:
        -   Typically, components will pass in `tagName` as a string, which identifies the corresponding DOM element tag that will be rendered for the `VNode`.
        -   If another `VNode` is passed instead, the newly created `VNode` will act as a copy of the original. If a `properties` argument is given, the copy will receive a set of merged properties with any duplicates in `properties` overriding those from the original `VNode`. If a `children` argument is passed, it will completely override the original `VNode`'s children in the new copy.
-   `w(Widget | constructor, properties?, children?)`
    -   `Widget | constructor`:
        -   Typically, components will pass in `Widget` as a reference to an imported Widget implementation.
        -   Several types of `constructor`s can also be passed, allowing Dojo to instantiate widgets in a variety of different ways. These allow for features such as deferred/lazy loading. TODO: more on this later
-   _both_ `v()` _and_ `w()`:
    -   `properties` _(optional)_:
        -   The set of properties used to configure the newly created VDOM node. Changes to these also control whether the node is considered 'updated', at which point a render update needs to be made for the node and its children. TODO: more on this later
    -   `children` _(optional)_:
        -   An array of nodes to render as children of the newly created node. This can also include any text node children as literal strings, as required.

### Virtual nodes example

The following sample widget includes a more typical `render()` method that actually returns a `VNode`. This widget has an intended structural representation of a simple `div` DOM element that includes a text child node:

> src/widgets/MyWidget.ts

```ts
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import { v } from '@dojo/framework/widget-core/d';

export default class MyWidget extends WidgetBase {
	protected render() {
		return v('div', ['Hello, Dojo!']);
	}
}
```

### Composition example

Similarly, widgets can compose one another using the `w()` method, and also output several nodes of both types to form a more complex structural hierarchy:

> src/widgets/MyOtherWidget.ts

```ts
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import { v, w } from '@dojo/framework/widget-core/d';

import MyWidget from './MyWidget';

export default class MyOtherWidget extends WidgetBase {
	protected render() {
		return v('div', ['This widget outputs several virtual nodes in a hierarchy', w(MyWidget, {})]);
	}
}
```

## Rendering to the DOM

Dojo's `renderer()` method (provided by the `@dojo/framework/widget-core/vdom` module) is responsible for translating an application's intended virtual output to its concrete representation within a real DOM.

Applications typically call `renderer()` in their main entry point (`main.tsx`/`main.ts`), and are required to pass in a function that returns the root node of the VDOM intended as the application's output. The `Renderer` object returned by `renderer()` can then be mounted to a specific DOM element, or to `document.body` by default if no explicit element is provided.

For example:

> src/main.tsx

```tsx
import renderer from '@dojo/framework/widget-core/vdom';
import { tsx } from '@dojo/framework/widget-core/tsx';

import MyOtherWidget from './widgets/MyOtherWidget';

const r = renderer(() => <MyOtherWidget />);
r.mount();
```

### `MountOptions` properties

The `Renderer.mount()` method accepts an optional `MountOptions` argument that configures how the mount operation is performed.

-   `sync ?: boolean`
    -   Default: `false`. If `true`, relevant [render lifecycle callbacks](#lifecycle-hooks) (specifically, `after` and `deferred` render callbacks) are run synchronously. If `false`, the callbacks are instead scheduled to run asynchronously before the next repaint via [`window.requestAnimationFrame()`](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame). Synchronous render callbacks can be beneficial in instances where specific nodes need to exist in the DOM.
-   `domNode ?: HTMLElement`
    -   A reference to a specific DOM element that the VDOM should be rendered within. Defaults to `document.body` if not specified.
-   `registry ?: Registry`
    -   An optional `Registry` instance to use across the mounted VDOM.

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
import renderer from '@dojo/framework/widget-core/vdom';
import { tsx } from '@dojo/framework/widget-core/tsx';

import MyOtherWidget from './widgets/MyOtherWidget';

const dojoAppRootElement = document.getElementById('my-dojo-app') || undefined;
const r = renderer(() => <MyOtherWidget />);
r.mount({ domNode: dojoAppRootElement });
```

## Adding external DOM nodes into the VDOM

Dojo applications can wrap external DOM elements, effectively bringing them into the VDOM and using them as part of the application's render output.

This is accomplished with the `dom()` utility method from the `@dojo/framework/widget-core/d` module. It works similarly to the [`v()` utility method](#instantiating-vdom-nodes) from the same module, but takes an existing DOM node rather than an element tag string as its primary argument. It will similarly return a `VNode`, which references the DOM node passed into it rather than a newly created element.

The Dojo application effectively takes ownership of the wrapped DOM node once the `VNode` returned by `dom()` has been added to the application's VDOM. Note that this process only works for nodes external to the Dojo application - either siblings of the element containing the mounted application, or newly-created nodes that are disconnected from the main webpage's DOM. Wrapping a node that is an ancestor or descendant of the application mount target element will not work.

Unlike `v()`, `dom()` accepts a `diffType` property that can specify the diffing strategy to use when determining if a property or attribute has changed and needs to be applied to the wrapped DOM node. The default strategy is `none`, meaning Dojo will simply add the wrapped DOM element as-is within the application's output.

-   `none`: This mode will always pass an empty object as the previous `attributes` and `properties` so the `props` and `attrs` passed to `dom()` will always be applied.
-   `dom`: This mode uses the `attributes` and `properties` from the DOM node for the diff.
-   `vdom`: This mode will use the previous `VNode` for the diff, this is the mode used normally during the vdom rendering.

**Note:** All modes use the events from the previous VNode to ensure that they are correctly removed and applied each render.

```ts
const node = document.createElement('div');

const vnode = dom({
	node,
	props: {
		foo: 'foo',
		bar: 1
	},
	attrs: {
		baz: 'baz'
	},
	on: {
		click: () => {
			console.log('clicker');
		}
	},
	diffType: 'none' | 'dom' | 'vdom'
});
```

To execute a function after the node has been appended to the DOM, there is an `onAttach` property that will be executed immediately after the append has occurred.

```ts
const node = document.createElement('div');

const vnode = dom({
	node,
	onAttach: () => {
		// do things after the node has been attached
	}
});
```

# Managing state

For simple applications where data is not required to flow between many components, state management can be straightforward to deal with. Data can be encapsulated within individual widgets that need it as the most [basic form of state management](#basic-internal-widget-state) within a Dojo application.

As applications grow in complexity and start requiring data to be shared and transferred between multiple widgets, a more robust form of state management is required. Here, Dojo begins to prove its value as a reactive framework, allowing applications to define how data should flow between components, then letting the framework manage change detection and re-rendering. This is done by [wiring widgets and properties together](#intermediate-widget-properties) when declaring VDOM output in a widget's `render()` method.

For large applications, state management can be one of the most challenging aspects to deal with, requiring developers to balance between data consistency, availability and fault tolerance. While a lot of this complexity remains outside the scope of the web application layer, Dojo provides further solutions that help ensure data consistency. The Dojo Stores component gives applications a centralized state store with a consistent API for accessing and managing data from multiple locations.

TODO: stores link somewhere? remove below?

## Basic: self-encapsulated widget state

Widgets can maintain their own internal state as private class fields. Data held in these fields may directly affect the widget's render output, or may be passed as properties to any child widgets where they in turn directly affect the children's render output. Widgets may also allow their internal state to be changed, for example in response to a user interaction event.

The following example illustrates these patterns:

> src/widgets/MyEncapsulatedStateWidget.tsx

```tsx
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import { tsx } from '@dojo/framework/widget-core/tsx';

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

However, this example is not complete - clicking on the 'Change State' button in the running application will not have any effect on the widget's render output. This is because the state is fully encapsulated within `MyEncapsulatedStateWidget`, and Dojo is not aware of any changes made to it. Only the widget's initial render will be processed by the framework.

In order to notify Dojo that a re-render is needed, widgets need to invalidate themselves.

### Invalidating a widget

There are two ways a widget can mark itself as invalid:

1.  Explicitly calling `this.invalidate()` in an appropriate location where state is being changed.
    -   In the `MyEncapsulatedStateWidget` example, this could be done in the 'Change State' button's `onclick` handler.
2.  Annotating any relevant fields with the `@watch()` decorator (from the `@dojo/framework/widget-core/decorators/watch` module). When `@watch`ed fields are modified, `this.invalidate()` will implicitly be called - this can be useful for state fields that always need to trigger a re-render when updated.

Note that calling `this.invalidate()` won't immediately re-render the widget - instead it acts as a notification to Dojo that the widget has been dirtied, so should be updated and re-rendered in the next available render cycle. This means invalidating a widget multiple times within the same render frame won't have any negative impact on application performance.

The following is an updated `MyEncapsulatedStateWidget` example that will correctly update its output when its state is changed. Here, both `myState` and `counter` are updated as part of the same application logic operation, so `@watch()` could be added to either or both of the fields, with the same net effect and performance profile in all cases:

> src/widgets/MyEncapsulatedStateWidget.tsx

```tsx
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import watch from '@dojo/framework/widget-core/decorators/watch';
import { tsx } from '@dojo/framework/widget-core/tsx';

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

Virtual nodes serve a second purpose of injecting state into each corresponding widget or DOM element. This process doubles as a way for the framework to determine when a state change has occurred, meaning it can reactively re-render the affected widgets.

This is done by providing a set of **properties** when instantiating `VNode`s and `WNode`s.

Properties are available on the widget instance, defined by an interface and passed as a [`generic`](https://www.TypeScriptlang.org/docs/handbook/generics.html) to the `WidgetBase` class when creating your custom widget.

<!--READMEONLY-->

```ts
interface MyProperties {
	name: string;
}

class Hello extends WidgetBase<MyProperties> {
	protected render() {
		const { name } = this.properties;

		return v('div', [`Hello, ${name}`]);
	}
}
```

**Note:** By default widgets have a `key: string | number` property, when using a custom property interface the default property is still available, there is no need to extend `WidgetProperties`.

<!--widget-core-readme-02-->

[![Edit widget-core-readme-02](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/9ynz3wkqn4)<!--READMEONLY-->

<!--DOCSONLY
<iframe src="https://codesandbox.io/embed/9ynz3wkqn4?autoresize=1&fontsize=12&hidenavigation=1&module=%2Fsrc%2Fmain.ts&view=editor" style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;" sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"></iframe>
DOCSONLY-->

New properties are compared with the previous properties to determine if a widget requires re-rendering. By default Dojo uses the `auto` diffing strategy, that performs a shallow comparison for objects and arrays, ignores functions (except classes that extend `WidgetBase`) and a reference comparison for all other values.

### Advanced diffing strategies

Controlling the diffing strategy can be done at an individual property level using the `diffProperty` decorator on a widget class.

`widget-core` provides a set of diffing strategy functions from `@dojo/framework/widget-core/diff.ts` that can be used. When these functions do not provide the required functionality a custom diffing function can be provided. Properties that have been configured with a specific diffing type will be excluded from the automatic diffing.

| Diff Function | Description                                                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `always`      | Always report a property as changed.                                                                                         |
| `auto`        | Ignore functions (except classes that extend `WidgetBase`), shallow compare objects, and reference compare all other values. |  |
| `ignore`      | Never report a property as changed.                                                                                          |
| `reference`   | Compare values by reference (`old === new`)                                                                                  |
| `shallow`     | Treat the values as objects and compare their immediate values by reference.                                                 |

**Important:** All diffing functions should be pure functions and are called _WITHOUT_ any scope.

```ts
// using a diff function provided by widget-core#diff
@diffProperty('title', reference)
class MyWidget extends WidgetBase<MyProperties> {}

//custom diff function; A pure function with no side effects.
function customDiff(previousProperty: string, newProperty: string): PropertyChangeRecord {
	return {
		changed: previousProperty !== newProperty,
		value: newProperty
	};
}

// using a custom diff function
@diffProperty('title', customDiff)
class MyWidget extends WidgetBase<MyProperties> {}
```

#### Property change hooks

It can be necessary to perform some internal logic when one or more properties change, this can be done by registering a reaction callback.

A reaction function is registered using the `diffProperty` decorator on a widget class method. This method will be called when the specified property has been detected as changed and receives both the old and new property values.

```ts
class MyWidget extends WidgetBase<MyProperties> {
	@diffProperty('title', auto)
	protected onTitleChange(previousProperties: any, newProperties: any): void {
		this._previousTitle = previousProperties.title;
	}
}
```

`diffProperty` decorators can be stacked on a single class method and will be called if any of the specified properties are considered changed.

```ts
class MyWidget extends WidgetBase<MyProperties> {
	@diffProperty('title', auto)
	@diffProperty('subtitle', auto)
	protected onTitleOrSubtitleChange(previousProperties: any, newProperties: any): void {
		this._titlesUpdated = true;
	}
}
```

For non-decorator environments (Either JavaScript/ES6 or a TypeScript project that does not have the experimental decorators configuration set to true in the `tsconfig`), the functions need to be registered in the constructor using the `addDecorator` API with `diffProperty` as the key.

```ts
class MyWidget extends WidgetBase {
	constructor() {
		super();
		diffProperty('foo', auto, this.diffFooReaction)(this);
	}

	diffFooReaction(previousProperty: any, newProperty: any) {
		// do something to reaction to a diff of foo
	}
}
```

## Advanced: abstracting and injecting state

Modern web applications are often required to manage complex state models which can involve fetching data from a remote service or multiple widgets requiring the same slices of state. While Dojo's widgets can manage application state, encapsulation and a clean separation of concerns may be lost if widgets manage their own visual representations, listen for interactions from the user, manage their children, and keep track of state information. Additionally, using widgets to pass state through an application often forces the widgets to be aware of state information for the sole purpose of passing that data down to their children. To allow widgets to remain focused on their primary roles of providing a visual representation of themselves and listening for user interactions, Dojo provides a mechanism using the `Registry` and `Container` classes, that is designed to coordinate an application's external state and connect and map this state to properties.

In this tutorial, we will start with an application that is managing its state in the widgets themselves. We will then extract all of the state-related code out of the widgets and inject external state as properties only into widgets as is needed.

Since Dojo widgets are TypeScript classes, they are capable of filling a large number of roles, including state management. With complex widgets, however, combining the responsibilities to manage the widget's visual representation as well as the state of its children can make them difficult to manage and test. Dojo defines the `Registry` and `Container` classes as a way to externalize state management from the app and centralize that management into mechanisms that are designed specifically to fill that role.

### Creating an application context

{% task 'Create a class to manage application state.' %}

To begin our tutorial, let's review the initial version of `App`:

{% include_codefile 'demo/initial/biz-e-corp/src/widgets/App.ts' %}

Most of this widget is dedicated to holding and managing the `WorkerData` in the application. Notice, however, that it never actually uses that data itself. `App` is only containing the state and passing it to the children as required via properties. Lifting up state to the highest common widget in the tree is a valid pattern, but as an application's state grows in size and complexity, it is often desirable to decouple this from widgets. In larger applications, the `App` class would become complicated and more difficult to maintain due to the additional state information that it would be required to track. Since the state information is not a primary concern of the `App` class, let's refactor it out of `App` and into a new `ApplicationContext` class that extends the base `Injector`.

{% instruction 'Add the following to the existing `ApplicationContext.ts` file in the `src` directory' %}

{% include_codefile 'demo/finished/biz-e-corp/src/ApplicationContext.ts' %}

{% aside 'Invalidations' %}
Dojo Widgets can invoke `invalidate()` directly, however, injector factories receive an `invalidator` that can be called to ensure that all connected widgets are invalidated
{% endaside %}

The code begins by importing some modules, including the `WorkerProperties` and `WorkerFormData` interfaces defined in the `Worker` and `WorkerForm` modules. These two interfaces define the shape of state that the `ApplicationContext` manages.

The `ApplicationContext` contains the application state information. The constructor accepts two parameters, an `invalidator` that is called when the internal state changes and the initial state.

`ApplicationContext` also has two private fields, `_workerData` and `_formData`, which contain the state, and two accessor methods to retrieve these fields.

{% include_codefile 'demo/finished/biz-e-corp/src/ApplicationContext.ts' lines:26-35 %}

The `formInput` method provides the same functionality as the `_onFormInput` method in the `App` class and the `submitForm` method is analogous to the `_addWorker` method from the `App` class. The implementations vary slightly as the `ApplicationContext` has dedicated fields to store the state information. Also, since the `ApplicationContext` is not a widget, it cannot call `invalidate();` to schedule a re-render. Instead the instance needs to call the `invalidator` function passed in and stored on construction.

Notice that the `ApplicationContext` does not contain any code to load state information. Currently its only role is only to manage the application's state provided on initialization via its `constructor`. However as the requirements for the application become more advanced, the `ApplicationContext` could make requests to fetch and modify data from a remote service or local storage mechanism.

Now that we have moved state management to a dedicated module, we need a way to register the state and connect it to sections of our application. We will do this by creating a registry and registering the `ApplicationContext` injector.

{% section %}

### Injectors

{% task 'Register an injector factory that will allow state to be injected into widgets.' %}

Currently, the application's `main` module is only responsible for creating the `Projector`, which provides the bridge between the application code and the DOM.

{% include_codefile 'demo/initial/biz-e-corp/src/main.ts' %}

Now, we need to:

1. Create a `registry` and then define an injector factory that creates the `ApplicationContext` passing the invalidator and initial state. The injector factory returns a function that returns the `ApplicationContext` instance.
2. To make the `registry` available within the widget tree, we need to pass the `registry` as a property to the `projector`

{% instruction 'Import the `ApplicationContext` module and add this code to the `main` module:' %}

{% include_codefile 'demo/finished/biz-e-corp/src/main.ts' lines:5 %}

{% aside 'Loading data' %}
In a real-world application, this data would probably be loaded via a call to a web service or a local data store. To learn more, take a look at the [stores tutorial](../comingsoon.html).
{% endaside %}

The state stored in the `ApplicationContext` is the same data that was used in the previous version of the `App` module to initialize the `WorkerProperties`, but it is now decoupled into an isolated module that helps to understand and maintain the application. In general, the `main` module of an application should be concerned with initializing application-wide state. Also, as previously mentioned, the `App` class only needed to manage the `WorkerProperties` state so that it could coordinate change to its children.

Now we need to create the registry, create the injector factory that creates and returns the `ApplicationContext` instance injector, and finally make the registry available to the widget tree.

{% instruction 'Add the `Registry` import to the `main` module.' %}

{% include_codefile 'demo/finished/biz-e-corp/src/main.ts' line:3 %}

{% instruction 'Now, create an injector factory that creates and returns the application context' %}

{% include_codefile 'demo/finished/biz-e-corp/src/main.ts' lines:8-31 %}

{% aside 'Registry' %}
The registry provides a way to register a widget via a label, making it accessible to other parts of the application. You can learn more in the [registry tutorial](../1020_registries/).
{% endaside %}

The first statement creates a `registry` where the application context can be registered. The second statement registers an injector factory that creates the `ApplicationContext` instance passing in the `invalidator` function passed to the factory. The factory creates an injector function that returns the created `ApplicationContext` instance.

{% instruction 'Pass the registry to the renderer when mounting' %}

We need to pass the `registry` to the `renderer` as an option on the `mount` function. This ensures that the `registry` instance is available for all widget and container instances.

{% include_codefile 'demo/finished/biz-e-corp/src/main.ts' line:34 %}

Now that the `ApplicationContext` injector factory is defined, and the `registry` gets set on the `projector`, it is time to create the components that will use it. In the next section, we will create a non-visual widget called a `Container` that will allow injecting state into the `WorkerForm` and `WorkerContainer` widgets.

{% section %}

### Creating state containers

{% task 'Create `Containers` that will allow state to be injected into widgets' %}

On their own, the injector factories defined on the `registry` are not able to help us very much because widgets expect state to be passed to them via properties. Therefore an `injector` must be connected to interested widgets in order for their state to be mapped to `properties` that widgets can consume by using a `Container`. `Containers` are designed to coordinate the injection - they connect `injectors` to widgets and return `properties` from the `injector`'s state which are passed to the connected widgets.

Normally, a separate `Container` is created for each widget that needs to have `properties` injected. In the demo application, we have two widgets that rely on application state - `WorkerContainer` and `WorkerForm`.

Let's start with the `WorkerContainer`. As a best practice, you should give your containers the same name as their respective widgets, with a `Container` suffix.

E.g. Widget name: `Foo`
container name ‘FooContainer’. To keep things organized, they are also stored in a different directory - `containers`.

{% instruction 'Add the following imports to the `WorkerContainerContainer` in the `containers` directory' %}

{% include_codefile 'demo/finished/biz-e-corp/src/containers/WorkerContainerContainer.ts' lines:1-4 %}

* The first `import` gives the module access to the `Container` factory function which will be used to construct the container.
* The second `import` allows the module to use the `ApplicationContext` to extract state
* The third import enables the `WorkerContainerProperties` to receive properties from its parent, and wrap the `WorkerContainer` class with the `container`.

Next, we need to address the fact that the container has two places to get properties from - its parent widget and the `ApplicationContext`. To tell the container how to manage this, we will create a function called `getProperties`.

{% instruction 'Add the `getProperties` function to the `WorkerContainerContainer` module.' %}

{% include_codefile 'demo/finished/biz-e-corp/src/containers/WorkerContainerContainer.ts' lines:6-8 %}

The `getProperties` function receives two parameters. The first is the `payload` of the `injector` instance returned by the `injector` function returned by the registered factory. The second is the `properties` that have been passed to the container via the normal mechanism, `w(Container, properties)`. The properties will implement the properties interface defined by the wrapped widget (for example `WorkerContainerProperties`). The `getProperties` function must then return an object that holds the properties that will be passed to the widget itself. In this example, we are ignoring the properties provided by the parent and returning the `workerData` stored by the `ApplicationContext`. More advanced use cases where both sources are used to generate the properties are also possible.

{% instruction 'Finish the `WorkerContainerContainer` by adding the following code.' %}

{% include_codefile 'demo/finished/biz-e-corp/src/containers/WorkerContainerContainer.ts' lines:10-12 %}

These final lines define the actual `WorkerContainerContainer` class and exports it. The `Container` function creates the class by accepting three parameters:

* The widget's class definition (alternatively, a widget's registry key can be used)
* The registry key for the `Injector`
* An object literal that provides the mapping functions used to reconcile the two sets of properties and children that the container can receive (one from the `Injector` and one from the parent widget). The returned class is also a widget as it descends from `WidgetBase` and therefore may be used just like any other widget.

The other container that we need is the `WorkerFormContainer`.

{% instruction 'Add the following code to the `WorkerFormContainer` module in the `containers` sub-package.' %}

{% include_codefile 'demo/finished/biz-e-corp/src/containers/WorkerFormContainer.ts' %}

This module is almost identical to the `WorkerContainerContainer` except for additional properties that are required by the `WorkerForm` to allow it to respond to user interactions with the form. The `ApplicationContext` contains two methods for managing these events - `onFormInput` and `onFormSave`. These methods need to be passed into the `WorkerForm` to handle the events, but they need to execute in the context of the `ApplicationContext`. To handle this, `bind` is called on each of the methods to explicitly set their execution contexts.

At this point, we have created the `ApplicationContext` to manage state, an `ApplicationContext` injector factory to inject state into the application's widgets, and `Containers` to manage how properties and children from the injector and parent widgets are combined. In the next section, we will integrate these components into our application.

{% section %}

### Using state containers

{% task 'Integrate containers into an application.' %}

As mentioned in the previous section, `Container` is a higher order component that extends `WidgetBase` and returns the wrapped widget and injected `properties` from the `render`. As such, it can be used just like any other widget. In our demo application, we can take advantage of its extension of `WidgetBase` by simply replacing the `WorkerForm` and `WorkerContainer` with their container equivalents.

{% instruction 'Replace the imports in the `App` module with the following.' %}

{% include_codefile 'demo/finished/biz-e-corp/src/widgets/App.ts' lines:1-5 %}

There are two major changes to the `App` module's imports. First, the widgets (`WorkerForm` and `WorkerContainer`) have been replaced by their container equivalents (`WorkerFormContainer` and `WorkerContainerContainer`). Second, all of the interfaces, `WorkerFormData`, and `WorkerProperties` have been removed. These are no longer needed since the `App` class no longer needs to manage state.

Also, the property and methods within `App` that are setting and managing state can be removed.

{% instruction 'Remove the following code from the `App` class.' %}

{% include_codefile 'demo/initial/biz-e-corp/src/widgets/App.ts' lines:9-44 %}

The final change to `App` is to update the `render` method to use the containers. Since the containers already know how to manage their state and respond to events, no properties need to be passed directly to the `Container` by the `App` widget.

{% instruction 'Replace the `render` method with the following code.' %}

{% include_codefile 'demo/finished/biz-e-corp/src/widgets/App.ts' lines:9-15 %}

With this last change, the `App` class is now only nine lines of code. All of the state management logic is still part of the application, but it has been refactored out of the `App` class to create a more efficient application architecture.

Notice that the `WorkerForm` and `WorkerContainer` widgets were not changed at all! This is an important thing to keep in mind when designing widgets - a widget should never be tightly coupled to the source of its properties. By keeping the containers and widgets separate, we have helped to ensure that each widget or container has a narrowly defined set of responsibilities, creating a cleaner separation of concerns within our widgets and containers.

At this point, you should reload your page and verify the application is working.

{% section %}

# Effective widget development

## Decomposing widgets

Splitting widgets into multiple smaller widgets is easy and helps to add extended functionality and promotes reuse.

Consider the following `List` widget, which has a simple property interface of an array of items consisting of `content: string` and `highlighted: boolean`.

```ts
interface ListProperties {
	items: {
		id: string;
		content: string;
		highlighted: boolean;
	};
}

class List extends WidgetBase<ListProperties> {
	protected render() {
		const { items } = this.properties;

		return v('ul', { classes: 'list' }, items.map((item) => {
			const { id, highlighted, content } = item;
			const classes = [ highlighted ? 'highlighted' : null ];

			return v('li', { key: id, classes }, [ content ]);
		});
	}
}
```

The `List` widget works as expected and displays the list in the browser but is difficult to reuse, modify, and/or extend.

**Note:** When working with children arrays with the same type of widget or Element, it is important to add a unique `key` property or attribute so that Dojo can identify the correct node when updates are made.

To extend the `List` API with an event that needs to be called when an item is clicked with the item's `id`, we first update the properties interface:

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

If we try to use the `onItemClick` function in the current `List` widget, we would need to wrap it in another function in order to pass the item's `id`.

This would mean a new function would be created every render but Dojo does not support changing listener functions after the first render and this would **error**.

To resolve this, the list item can be extracted into a separate widget:

```ts
import { WidgetBase } from '@dojo/framework/widget-core/WidgetBase';
import { v, w } from '@dojo/framework/widget-core/d';

interface ListItemProperties {
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

		return v('li', { key: id, classes, onclick: this.onClick }, [content]);
	}
}
```

Using the `ListItem` we can simplify the `List` slightly and also add the `onclick` functionality that we required:

<!--READMEONLY-->

```ts
interface Item {
	id: string;
	content: string;
	highlighted: boolean;
}

interface ListProperties {
	items: Item[];
	onItemClick(id: string): void;
}

export default class List extends WidgetBase<ListProperties> {
	protected render() {
		const { onItemClick, items } = this.properties;

		return v(
			'ul',
			{ classes: 'list' },
			items.map(({ id, content, highlighted }) => {
				return w(ListItem, { key: id, id, content, highlighted, onItemClick });
			})
		);
	}
}
```

[![Edit widget-core-readme-3](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/s/13korpwzyj)<!--READMEONLY-->

<!--DOCSONLY
<iframe src="https://codesandbox.io/embed/13korpwzyj?autoresize=1&fontsize=12&hidenavigation=1&module=%2Fsrc%2Fwidgets%2FList.ts&view=editor" style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;" sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"></iframe>
DOCSONLY-->

Additionally, the `ListItem` is now reusable in other areas of our application(s).

## Widget development best practices

When working with widgets, a few important principles should be kept in mind to avoid introducing anti-patterns into application code:

-   A widget's _`__render__`_, _`__setProperties__`_, and _`__setChildren__`_ functions are internal framework implementation details, and should never be called nor overridden in application code.
-   Dojo fully manages the lifecycle of widget instances, including instantiation, caching and destruction. Applications only need to provide widgets to the framework as generic type parameters when calling [the `w()` method](#instantiating-vdom-nodes), or implicitly via [TSX tags](#tsx-widget-example), as VDOM render output.
    -   Direct use of widget instances can cause unexpected behavior and introduce bugs into an application.
-   Widgets should treat the properties passed to them as read-only.
    -   Changing properties can cause unexpected behavior and introduce bugs into an application.

# Widget interactivity

## Responding to events

### Event listeners

{% task 'Create an event listener.' %}

In [Creating widgets](../003_creating_widgets/), we created an application that contains several widgets that render worker information. In this tutorial, you will add event listeners to these widgets to show additional information about an employee when clicking on the widget.

The first step is to add the listener itself. In Dojo, event listeners get assigned like any other property passed to the rendering function, `v`. Look at the `Worker` widget that is in `src/widgets`. Currently, the top level `DNode` has one property assigned: `classes`.

{% instruction 'Update the object containing that property as follows.' %}

```typescript
{
	classes: this.theme(css.worker),
	onclick: this.flip
}
```

The `onclick` property registers a function to call when clicking on the node to which it is attached. In this case, the registered function is a method called `flip`.

{% instruction 'Add a basic implementation for that method within the Worker class.' %}

```typescript
flip(): void {
	console.log('the flip method has been fired!');
}
```

Now, run the app (using `dojo build -m dev -w -s`) and navigate to [localhost:9999](http://localhost:9999). Once there,

{% instruction 'Open the console window and click on any of the worker widgets to confirm that the `flip` method gets called as expected.' %}

{% aside 'Automatic Binding of Handlers' %}
The context for event handlers and function properties are automatically bound to the `this` context of the widget that defined the `v()` or `w()` call. If you are just passing on a property that has already been bound, then this will _not_ be bound again.
{% endaside %}

{% section %}

### Using event handlers

{% task 'Add a second visual state.' %}

Now that we have an event handler, it is time to extend the `render` method to show detailed information about a worker in addition to the current overview. For the sake of this tutorial, we will call the current view the front and the detailed view the back.

We could add the additional rendering logic in the current `render` method, but that method could become difficult to maintain as it would have to contain all of the rendering code for both the front and back of the card. Instead, we will generate the two views using two private methods and then call them from the `render` method.

{% instruction 'Create a new private method called `_renderFront` and move the existing render code inside it.' %}

{% include_codefile 'demo/finished/biz-e-corp/src/widgets/Worker.ts' lines:27-45 %}

{% instruction 'Create another private method called `_renderBack` to render the back view.' %}

{% include_codefile 'demo/finished/biz-e-corp/src/widgets/Worker.ts' lines:47-88 %}

This code is not doing anything new. We are composing together multiple virtual nodes to generate the elements required to render the detailed view. This method does, however, refer to some properties and CSS selectors that do not exist yet.

We need to add three new properties to the `WorkerProperties` interface. These properties are the email address of the worker, the average number of hours they take to complete a task, and the active tasks for the worker.

{% instruction 'Update the `WorkerProperties` interface.' %}

{% include_codefile 'demo/finished/biz-e-corp/src/widgets/Worker.ts' lines:6-12 %}

Now, we need to add the CSS selectors that will provide the rules for rendering this view's elements.

{% instruction 'Open `worker.m.css` and replace the existing classes with the following.' %}

{% include_codefile 'demo/finished/biz-e-corp/src/styles/worker.m.css' lang:css %}

We also need to update the CSS selector for the front view by changing the selector from `css.worker` to `css.workerFront`.

Finally, we need to update the `render` method to choose between the two rendering methods.

{% instruction 'Add a private field to the class.' %}

{% include_codefile 'demo/finished/biz-e-corp/src/widgets/Worker.ts' line:16 %}

In general, the use of private state is discouraged. Dojo encourages the use of a form of the [inversion of control](https://en.wikipedia.org/wiki/Inversion_of_control) pattern, where the properties passed to the component by its parent control the behavior of the component. This pattern helps make components more modular and reusable since the parent component is in complete control of the child component's behavior and does not need to make any assumptions about its internal state. For widgets that have state, the use of a field to store this kind of data is standard practice in Dojo. Properties are used to allow other components to view and modify a widget's published state, and private fields are used to enable widgets to encapsulate state information that should not be exposed publicly.

{% instruction 'Use that field\'s value to determine which side to show.' %}

{% include_codefile 'demo/finished/biz-e-corp/src/widgets/Worker.ts' lines:18-25 %}

Confirm that everything is working by viewing the application in a browser. All three cards should be showing their front faces. Now change the value of the `_isFlipped` field to `true` and, after the application re-compiles, all three widgets should be showing their back faces.

To re-render our widget, we need to update the `flip` method to toggle the `_isFlipped` field and invalidate the widget

{% instruction 'Replace the `flip` method with this one.' %}

{% include_codefile 'demo/finished/biz-e-corp/src/widgets/Worker.ts' lines:90-93 %}

Now, the widget may flip between its front and back sides by clicking on it.

{% section %}

### Final steps

{% task 'Provide additional properties.' %}

Currently, several of the properties are missing for the widgets. As an exercise, try to update the first widget to contain the following properties:

```ts
{
	firstName: 'Tim',
	lastName: 'Jones',
	email: 'tim.jones@bizecorp.org',
	tasks: [
		'6267 - Untangle paperclips',
		'4384 - Shred documents',
		'9663 - Digitize 1985 archive'
	]
}
```

This change will pass the specified properties to the first worker. The widget's parent
is responsible for passing properties to the widget. In this application, `Worker`
widgets are receiving data from the `App` class via the `WorkerContainer`.

## Handling Focus

Handling focus is an important aspect in any application and can be tricky to do correctly. To help with this issue, `@dojo/framework/widget-core` provides a primitive mechanism built into the Virtual DOM system that enables users to focus a Virtual DOM node once it has been appended to the DOM. This uses a special property called `focus` on the `VNodeProperties` interface that can be passed when using `v()`. The `focus` property is either a `boolean` or a function that returns a `boolean`.

When passing a function, focus will be called when `true` is returned without comparing the value of the previous result. However, when passing a `boolean`, focus will only be applied if the property is `true` and the previous property value was not.

```ts
// Call focus for the node on the only first render
v('input', { type: 'text', focus: true });
```

```ts
// Call focus for the node on every render
v('input', { type: 'text', focus: () => true) })
```

This primitive is a base that enables further abstractions to be built to handle more complex behaviors. One of these is handling focus across the boundaries of encapsulated widgets. The `FocusMixin` should be used by widgets to provide `focus` to their children or to accept `focus` from a parent widget.

The `FocusMixin` adds `focus` and `shouldFocus` to a widget's API. `shouldFocus` checks if the widget is in a state to perform a focus action and will only return `true` once, until the widget's `focus` method has been called again. This `shouldFocus` method is designed to be passed to child widgets or nodes as the value of their `focus` property.

When `shouldFocus` is passed to a widget, it will be called as the properties are set on the child widget, meaning that any other usages of the parent's `shouldFocus` method will result in a return value of `false`.

An example usage controlling focus across child VNodes (DOM) and WNodes (widgets):

<!--READMEONLY-->

```ts
interface FocusInputChildProperties {
	onFocus: () => void;
}

class FocusInputChild extends Focus(WidgetBase)<FocusInputChildProperties> {
	protected render() {
		// the child widget's `this.shouldFocus` is passed directly to the input node's focus property
		return v('input', { onfocus: this.properties.onFocus, focus: this.shouldFocus });
	}
}

class FocusParent extends Focus(WidgetBase) {
	private _focusedInputKey = 0;

	private _onFocus(key: number) {
		this._focusedInputKey = key;
		this.invalidate();
	}

	private _previous() {
		if (this._focusedInputKey === 0) {
			this._focusedInputKey = 4;
		} else {
			this._focusedInputKey--;
		}
		// calling focus resets the widget so that `this.shouldFocus`
		// will return true on its next use
		this.focus();
	}

	private _next() {
		if (this._focusedInputKey === 4) {
			this._focusedInputKey = 0;
		} else {
			this._focusedInputKey++;
		}
		// calling focus resets the widget so that `this.shouldFocus`
		// will return true on its next use
		this.focus();
	}

	protected render() {
		return v('div', [
			v('button', { onclick: this._previous }, ['Previous']),
			v('button', { onclick: this._next }, ['Next']),
			// `this.shouldFocus` is passed to the child that requires focus based on
			// some widget logic. If the child is a widget it can then deal with that
			// in whatever manner is necessary. The widget may also have internal
			// logic and pass its own `this.shouldFocus` down further or it could apply
			// directly to a VNode child.
			w(FocusInputChild, {
				key: 0,
				focus: this._focusedInputKey === 0 ? this.shouldFocus : undefined,
				onFocus: () => this._onFocus(0)
			}),
			w(FocusInputChild, {
				key: 1,
				focus: this._focusedInputKey === 1 ? this.shouldFocus : undefined,
				onFocus: () => this._onFocus(1)
			}),
			w(FocusInputChild, {
				key: 2,
				focus: this._focusedInputKey === 2 ? this.shouldFocus : undefined,
				onFocus: () => this._onFocus(2)
			}),
			w(FocusInputChild, {
				key: 3,
				focus: this._focusedInputKey === 3 ? this.shouldFocus : undefined,
				onFocus: () => this._onFocus(3)
			}),
			v('input', {
				key: 4,
				focus: this._focusedInputKey === 4 ? this.shouldFocus : undefined,
				onfocus: () => this._onFocus(4)
			})
		]);
	}
}
```

## Working with forms

This tutorial will extend on [Responding to events](../004_user_interactions/), where we allowed the user to interact with the application by listening for click events. In this tutorial, we will add a form to the Biz-E-Worker page so that a user can add new workers to the application. This will be done by using some of Dojo's form widgets to allow the feature to be developed more rapidly.

### Forms

{% task 'Create a form.' %}

The first step to allowing the user to create new workers is to create a form. This form will contain the input elements that will accept the new worker's initial settings.

{% instruction 'Add the following to `WorkerForm.ts`.' %}

```typescript
import { WidgetBase } from '@dojo/framework/widget-core/WidgetBase';
import { v } from '@dojo/framework/widget-core/d';
import { ThemedMixin, theme } from '@dojo/framework/widget-core/mixins/Themed';
import * as css from '../styles/workerForm.m.css';

export interface WorkerFormProperties {
}

@theme(css)
export default class WorkerForm extends ThemedMixin(WidgetBase)<WorkerFormProperties> {

	private _onSubmit(event: Event) {
		event.preventDefault();
	}

	protected render() {
		return v('form', {
			classes: this.theme(css.workerForm),
			onsubmit: this._onSubmit
		});
	}
}
```

{% aside 'Reminder' %}
If you cannot see the application, remember to run `dojo build -m dev -w -s` to build the application and start the development server.
{% endaside %}

This widget will render an empty form with a `submit` handler that prevents the form from being submitted to the server. Before we continue to expand on this starting point though, let's integrate the form into the application so we can observe the form as we add more features.

{% instruction 'Add the following widget CSS rules to `workerForm.m.css`.' %}

{% include_codefile 'demo/finished/biz-e-corp/src/styles/workerForm.m.css' lang:css %}

{% instruction 'Now, add the `WorkerForm` to the `App` class.' %}

Import the `WorkerForm` class and the `WorkerFormData` interface and update the `render` method to draw the `WorkerForm`. It should be included after the `Banner` and before the `WorkerContainer` so the `render` method should look like this:

{% include_codefile 'demo/finished/biz-e-corp/src/widgets/App.ts' lines:46-49,53-58 %}

Now, open the application in a browser and inspect it via the browser's developer tools. Notice that the empty form element is being rendered onto the page as expected.

Next, we'll add the visual elements of the form.

{% section %}

### Form widgets

{% task 'Populate the form.' %}

Our form will contain fields allowing the user to create a new worker:

* A first name field for the worker
* A last name field for the worker
* An e-mail address field
* A save button that will use the form's data to create a new worker

We could create these fields and buttons using the `v` function to create simple virtual DOM elements. If we did this, however, we would have to handle details such as theming, internationalization ([i18n](https://en.wikipedia.org/wiki/Internationalization_and_localization)) and accessibility ([a11y](https://en.wikipedia.org/wiki/Accessibility)) ourselves. Instead, we are going to leverage some of Dojo's built-in widgets that have been designed with these considerations in mind.

{% instruction 'Add `w` to the imports from `@dojo/framework/widget-core/d` and add imports for the `Button` and `TextInput` classes to `WorkerForm.ts`.' %}

{% include_codefile 'demo/finished/biz-e-corp/src/widgets/WorkerForm.ts' lines:3-5 %}

These imports are for [built-in Dojo Widgets](https://github.com/dojo/widgets). You can explore other widgets in the [Dojo Widget Showcase](https://dojo.github.io/examples/widget-showcase/).

The `Button` class will be used to provide the form's submit button and the `TextInput` class will provide the data entry fields for the worker data.

{% instruction 'Replace your `render()` method with the definition below. The code below adds the necessary visual elements to the form' %}

```ts
	protected render() {
		return v('form', {
			classes: this.theme(css.workerForm),
			onsubmit: this._onSubmit
		}, [
			v('fieldset', { classes: this.theme(css.nameField) }, [
				v('legend', { classes: this.theme(css.nameLabel) }, [ 'Name' ]),
				w(TextInput, {
					key: 'firstNameInput',
					label: 'First Name',
					labelHidden: true,
					placeholder: 'Given name',
					required: true
				}),
				w(TextInput, {
					key: 'lastNameInput',
					label: 'Last Name',
					labelHidden: true,
					placeholder: 'Surname name',
					required: true
				})
			]),
			w(TextInput, {
				label: 'Email address',
				type: 'email',
				required: true
			}),
			w(Button, {}, [ 'Save!' ])
		]);
	}
```

At this point, the user interface for the form is available, but it does not do anything since we have not specified any event handlers. In the [last tutorial](../004_user_interactions/), we learned how to add event handlers to custom widgets by assigning a method to an event. When using pre-built widgets, however, we pass the handlers as properties. For example, we are going to need a way to handle each text field's `input` event. To do that, we provide the desired handler function as the `onInput` property that is passed to the widget.

{% instruction 'Update the `render` method once again.' %}

{% include_codefile 'demo/finished/biz-e-corp/src/widgets/WorkerForm.ts' lines:40-79 %}

This form of the `render` method now does everything that we need: it creates the user interface and registers event handlers that will update the application as the user enters information. However, we need to add a few more methods to the `WorkerForm` to define the event handlers.

{% instruction 'Add these methods:' %}

{% include_codefile 'demo/finished/biz-e-corp/src/widgets/WorkerForm.ts' lines:28-38 %}

The `render` method starts by decomposing the properties into local constants. We still need to define those properties.

{% instruction 'Update the `WorkerFormProperties` interface to include them, and add a `WorkerFormData` interface.' %}

{% include_codefile 'demo/finished/biz-e-corp/src/widgets/WorkerForm.ts' lines:8-18 %}

Most of these properties should be familiar by now, but notice the type signature for the `formData` property and the argument of the `onFormInput` property. They're both objects of type `Partial<WorkerFormData>`. The `Partial` type will convert all of the properties of the provided type (`WorkerFormData` in this case) to be optional. This will inform the consumer that it is not guaranteed to receive all of the `WorkerFormData` properties every time - it should be prepared to receive only part of the data and process only those values that it receives.

There are two types of properties that we are using in this form. The `firstName`, `lastName` and `email` properties are grouped together in the `WorkerFormData` interface and are going to set the values that are displayed in the form fields. The `onFormInput` and `onFormSave` properties expose the events that the `WorkerForm` widget can emit. To see how these different property types are used, let's examine the properties that are being passed into the first `TextInput` widget:

{% include_codefile 'demo/finished/biz-e-corp/src/widgets/WorkerForm.ts' lines:51-59 %}

The first thing that we see is a `key` property. As mentioned before, a key is necessary whenever more than one of the same type of widget or virtual DOM element will be rendered by a widget. The `label`, `placeholder`, and `required` fields map to their expected properties.

The `value` property renders the value of the field that is passed into the widget via its properties. Notice that there is no code that manipulates this value within the widget. As parts of a [reactive framework](https://en.wikipedia.org/wiki/Reactive_programming), Dojo widgets do not normally update their own state. Rather, they inform their parent that a change has occurred via events or some other mechanism. The parent will then pass updated properties back into the widget after all of the changes have been processed. This allows Dojo applications to centralize data and keep the entire application synchronized.

The final property assigns the `onFirstNameInput` method to the `onInput` property. The `onFirstNameInput` method, in turn, calls the `onFormInput` property, informing the `WorkerForm`'s parent that a change has occurred. This is another common pattern within Dojo applications - the `WorkerForm` does not expose any of the components that it is using to build the form. Rather, the `WorkerForm` manages its children internally and, if necessary, calls its event properties to inform its parent of any changes. This decouples the consumers of the `WorkerForm` widget and frees them from having to understand the internal structure of the widget. Additionally, it allows the `WorkerForm` to change its implementation without affecting its parent as long as it continues to fulfill the `WorkerFormProperties` interface.

The last change that needs to be made in the `WorkerForm` is to update the `_onSubmit` method to delegate to the `onFormSave` property when it is called.

{% instruction 'Replace the `_onSubmit` method with.' %}

{% include_codefile 'demo/finished/biz-e-corp/src/widgets/WorkerForm.ts' lines:23-26 %}

The form is now ready to be integrated into the application. We will do that in the next step.

{% section %}

### Using forms

{% task 'Integrate the form into the application.' %}

Now that the `WorkerForm` widget is complete, we will update the `App` class to use it. First, we need to address how to store the user-completed form data. Recall that the `WorkerForm` will accept an `onFormInput` property that will allow the `App` class to be informed when a field value changes. However, the `App` class does not currently have a place to store those changes. We will add a private property to the `App` to store this state, and a method to update the state and re-render the parts of the application that have changed. As the application grows and needs to store more data, using private properties on a widget class can become difficult to maintain. Dojo uses containers and injectors to help manage the complexities of dealing with state in a large application. For more information, refer to the [Containers and Injecting State](../1010_containers_and_injecting_state/) article.

{% instruction 'Import the `WorkerFormData` interface into `App.ts`.' %}

{% include_codefile 'demo/finished/biz-e-corp/src/widgets/App.ts' line:4 %}

{% instruction 'Add `_newWorker` as a private property.' %}

{% include_codefile 'demo/finished/biz-e-corp/src/widgets/App.ts' line:9 %}

Notice that `_newWorker` is a `Partial<WorkerFormData>`, since it may include only some, or none, of the `WorkerFormData` interface properties.

{% instruction 'Update the `render` method to populate the `WorkerForm`\'s properties.' %}

{% include_codefile 'demo/finished/biz-e-corp/src/widgets/App.ts' lines:46-58 %}

The `onFormInput` handler is calling the `App`'s `_onFormInput` method.

{% instruction 'Add the `_onFormInput` method.' %}

{% include_codefile 'demo/finished/biz-e-corp/src/widgets/App.ts' lines:38-44 %}

The `_onFormInput` method updates the `_newWorker` object with the latest form data and then invalidates the app so that the form field will be re-rendered with the new data.

The `onFormSave` handler calls the `_addWorker` method.

{% instruction 'Add the `_addWorker` method to the `App` class.' %}

{% include_codefile 'demo/finished/biz-e-corp/src/widgets/App.ts' lines:32-36 %}

The `_addWorker` method sets `_workerData` to a new array that includes the `_newWorker` object (which is the current `WorkerFormData`), sets `_newWorker` to a new empty object, and then invalidates the `App` widget. The reason that `_workerData` is not updated in place is because Dojo decides whether a new render is needed by comparing the previous value of a property to the current value. If we are modifying the existing value then any comparison performed would report that the previous and current values are identical.

With the `WidgetForm` in place and the `App` configured to handle it, let's try it. For now let's test the [happy path](https://en.wikipedia.org/wiki/Happy_path) by providing the expected values to the form. Provide values for the fields, for example: "Suzette McNamara (smcnamara359@email.com)" and click the `Save` button. As expected, the form is cleared and a new `Worker` widget is added to the page. Clicking on the new `Worker` widget shows the detailed information of the card where we find that the first name, last name, and email values have been properly rendered.

## Form validation

This tutorial will cover how to handle basic form validation within the context of the demo app. Handling form data has already been covered in the tutorial on [injecting state](../1010_containers_and_injecting_state); here we will build on those concepts to add a validation state and errors to the existing form. Over the course of the tutorial we will build an example pattern for creating both dynamic client-side validation and mock server-side validation.

### Create a place to store form errors

{% task 'Add form errors to the application context.' %}

Right now the error object should mirror `WorkerFormData` in both `WorkerForm.ts` and `ApplicationContext.ts`. In the wild this error configuration could be handled in a number of ways; one might be to provide an option for multiple validation steps with individual error messages for a single input. Here we will go for the simplest solution with a boolean valid/invalid state for each input.

{% instruction 'Create an interface for `WorkerFormErrors` in `WorkerForm.ts`' %}

{% include_codefile 'demo/finished/biz-e-corp/src/widgets/WorkerForm.ts' lines:15-19 %}

Defining the properties in the `WorkerFormErrors` interface as optional allows us to effectively create three possible states for form fields: unvalidated, valid, and invalid.

{% instruction 'Next add a `formErrors` method to the `ApplicationContext` class' %}

As an exercise, complete the following three steps:

1. Create a private field for `_formErrors` in the ApplicationContext class
2. Define a public getter for the `_formErrors` field within the `ApplicationContext`
3. Update the `getProperties` function in the `WorkerFormContainer.ts` file to pass through the new error object

Hint: Follow the existing `_formData` private field in the `ApplicationContext` class to see how it's used. The `_formErrors` variable you need to add can follow the same flow.

Make sure the following lines are present somewhere in `ApplicationContext.ts`:
```typescript
// modify import to include WorkerFormErrors
import { WorkerFormData, WorkerFormErrors } from './widgets/WorkerForm';

// private field
private _formErrors: WorkerFormErrors = {};

// public getter
get formErrors(): WorkerFormErrors {
	return this._formErrors;
}
```

The modified `getProperties` function in `WorkerFormContainer.ts`:
```typescript
function getProperties(inject: ApplicationContext, properties: any) {
	const {
		formData,
		formErrors,
		formInput: onFormInput,
		submitForm: onFormSave
	} = inject;

	return {
		formData,
		formErrors,
		onFormInput: onFormInput.bind(inject),
		onFormSave: onFormSave.bind(inject)
	};
}
```

{% instruction 'Finally, modify `WorkerFormProperties` in `WorkerForm.ts` to accept the `formErrors` object passed in by the application context:' %}

```ts
export interface WorkerFormProperties {
	formData: WorkerFormData;
	formErrors: WorkerFormErrors;
	onFormInput: (data: Partial<WorkerFormData>) => void;
	onFormSave: () => void;
}
```

{% section %}

### Tie validation to form inputs

{% task 'Perform validation on `onInput`' %}

We now have a place to store form errors in the application state, and those errors are passed into the form widget. The form still lacks any actual validation of the user input; for that, we need to dust off our regular expressions and write a basic validation function.

{% instruction 'Create a private `_validateInput` method in `ApplicationContext.ts`' %}

Like the existing `formInput` function, `_validateInput` should take a partial `WorkerFormData` input object. The validation function should return a `WorkerFormErrors` object. The example app shows only the most basic validation checks -- the email regex pattern for example is concise but somewhat lax. You are free to substitute a more robust email test, or add other modifications like a minimum character count for the first and last names.

{% include_codefile 'demo/finished/biz-e-corp/src/ApplicationContext.ts' lines:32-50 %}

For now, we will test our validation by calling it directly in every `onInput` event. Add the following line to `formInput` in `ApplicationContext.ts`:

```ts
this._formErrors = deepAssign({}, this._formErrors, this._validateInput(input));
```

{% instruction 'Update the render method of the `WorkerForm` class to display validation state' %}

At this point in our progress, the `WorkerForm` widget holds the validation state of each form field in its `formErrors` property, updated every time an `onInput` handler is called. All that remains is to pass the valid/invalid property to the inputs themselves. Luckily the Dojo `TextInput` widget contains an `invalid` property that sets the `aria-invalid` attribute on a DOM node, and toggles classes used for visual styling.

The updated render function in `WorkerForm.ts` should set the `invalid` property on all form field widgets to reflect `formErrors`. We also add a `novalidate` attribute to the form element to prevent native browser validation.

```ts
protected render() {
	const {
		formData: { firstName, lastName, email },
		formErrors
	} = this.properties;

	return v('form', {
		classes: this.theme(css.workerForm),
		novalidate: 'true',
		onsubmit: this._onSubmit
	}, [
		v('fieldset', { classes: this.theme(css.nameField) }, [
			v('legend', { classes: this.theme(css.nameLabel) }, [ 'Name' ]),
			w(TextInput, {
				key: 'firstNameInput',
				label:'First Name',
				labelHidden: true,
				placeholder: 'Given name',
				value: firstName,
				required: true,
				invalid: this.properties.formErrors.firstName,
				onInput: this.onFirstNameInput
			}),
			w(TextInput, {
				key: 'lastNameInput',
				label: 'Last Name',
				labelHidden: true,
				placeholder: 'Surname name',
				value: lastName,
				required: true,
				invalid: this.properties.formErrors.lastName,
				onInput: this.onLastNameInput
			})
		]),
		w(TextInput, {
			label: 'Email address',
			type: 'email',
			value: email,
			required: true,
			invalid: this.properties.formErrors.email,
			onInput: this.onEmailInput
		}),
		w(Button, {}, [ 'Save' ])
	]);
}
```

Now when you view the app in the browser, the border color of each form field changes as you type. Next we'll add error messages and update `onInput` validation to only occur after the first blur event.

{% section %}

### Extending TextInput

{% task 'Create an error message' %}

Simply changing the border color of form fields to be red or green doesn't impart much information to the user -- we need to add some error message text along with invalid state. On a basic level, our error text must be associated with a form input, styleable, and accessible. A single form field with an error message might look something like this:

```ts
v('div', { classes: this.theme(css.inputWrapper) }, [
	w(TextInput, {
		...
		aria: {
			describedBy: this._errorId
		},
		onInput: this._onInput
	}),
	invalid === true ? v('span', {
		id: this._errorId,
		classes: this.theme(css.error),
		'aria-live': 'polite'
	}, [ 'Please enter valid text for this field' ]) : null
])
```

The error message is associated with the text input through `aria-describedby`, and the `aria-live` attribute ensures it will be read if it is added to the DOM or changed. Wrapping both the input and the error message in a containing `<div>` allows us to position the error message relative to the input if desired.

{% instruction 'Extend `TextInput` to create a `ValidatedTextInput` widget with an error message and `onValidate` method' %}

Re-creating the same error message boilerplate for multiple text inputs seems overly repetitive, so we're going to extend `TextInput` instead. This will also allow us to have better control over when validation occurs, e.g. by adding it to blur events as well. For now, just create a `ValidatedTextInput` widget that accepts the same properties interface as `TextInput` but with an `errorMessage` string and `onValidate` method. It should return the same node structure modeled above.

You will also need to create `validatedTextInput.m.css` with `error` and `inputWrapper` classes, although we will forgo adding specific styles in this tutorial:

```css
.inputWrapper {}

.error {}
```

```ts
import { WidgetBase } from '@dojo/framework/widget-core/WidgetBase';
import { TypedTargetEvent } from '@dojo/framework/widget-core/interfaces';
import { v, w } from '@dojo/framework/widget-core/d';
import uuid from '@dojo/framework/core/uuid';
import { ThemedMixin, theme } from '@dojo/framework/widget-core/mixins/Themed';
import TextInput, { TextInputProperties } from '@dojo/widgets/text-input';
import * as css from '../styles/validatedTextInput.m.css';

export interface ValidatedTextInputProperties extends TextInputProperties {
	errorMessage?: string;
	onValidate?: (value: string) => void;
}

export const ValidatedTextInputBase = ThemedMixin(WidgetBase);

@theme(css)
export default class ValidatedTextInput extends ValidatedTextInputBase<ValidatedTextInputProperties> {
	private _errorId = uuid();

	protected render() {
		const {
			disabled,
			label,
			maxLength,
			minLength,
			name,
			placeholder,
			readOnly,
			required,
			type = 'text',
			value,
			invalid,
			errorMessage,
			onBlur,
			onInput
		} = this.properties;

		return v('div', { classes: this.theme(css.inputWrapper) }, [
			w(TextInput, {
				aria: {
					describedBy: this._errorId
				},
				disabled,
				invalid,
				label,
				maxLength,
				minLength,
				name,
				placeholder,
				readOnly,
				required,
				type,
				value,
				onBlur,
				onInput
			}),
			invalid === true ? v('span', {
				id: this._errorId,
				classes: this.theme(css.error),
				'aria-live': 'polite'
			}, [ errorMessage ]) : null
		]);
	}
}
```

You may have noticed that we created `ValidatedTextInput` with an `onValidate` property, but we have yet to use it. This will become important in the next few steps by allowing us to have greater control over when validation occurs. For now, just treat it as a placeholder.

{% instruction 'Use `ValidatedTextInput` within `WorkerForm`' %}

Now that `ValidatedTextInput` exists, let's import it and swap it with `TextInput` in `WorkerForm`, and write some error message text while we're at it:

**Import block**
{% include_codefile 'demo/finished/biz-e-corp/src/widgets/WorkerForm.ts' lines:1-7 %}

**Inside render()**
{% include_codefile 'demo/finished/biz-e-corp/src/widgets/WorkerForm.ts' lines:72-108 %}

{% task 'Create `onFormValidate` method separate from `onFormInput`' %}

{% instruction 'Update the context to pass in an `onFormValidate` method' %}

Currently the validation logic is unceremoniously dumped in `formInput` within `ApplicationContext.ts`. Now let's break that out into its own `formValidate` function, and borrow the `onFormInput` pattern to pass `onFormValidate` to `WorkerForm`. There are three steps to this:

1. Add a `formValidate` method to `ApplicationContext.ts` and update `_formErrors` there instead of in `formInput`:
	{% include_codefile 'demo/finished/biz-e-corp/src/ApplicationContext.ts' lines:72-80 %}
2. Update `WorkerFormContainer` to pass `formValidate` as `onFormValidate`:
	{% include_codefile 'demo/finished/biz-e-corp/src/containers/WorkerFormContainer.ts' lines:6-22 %}
3. Within `WorkerForm` first add `onFormValidate` to the `WorkerFormProperties` interface:
	{% include_codefile 'demo/finished/biz-e-corp/src/widgets/WorkerForm.ts' lines:21-27 %}
	Then create internal methods for each form field's validation and pass those methods (e.g. `onFirstNameValidate`) to each `ValidatedTextInput` widget. This should follow the same pattern as `onFormInput` and `onFirstNameInput`, `onLastNameInput`, and `onEmailInput`:
	{% include_codefile 'demo/finished/biz-e-corp/src/widgets/WorkerForm.ts' lines:49-59 %}

{% instruction 'Handle calling `onValidate` within `ValidatedTextInput`' %}

You might have noticed that the form no longer validates on user input events. This is because we no longer handle validation within `formInput` in `ApplicationContext.ts`, but we also haven't added it anywhere else. To do that, add the following private method to `ValidatedTextInput`:

```ts
private _onInput(value: string) {
	const { onInput, onValidate } = this.properties;
	onInput && onInput(value);
	onValidate && onValidate(value);
}
```

Now pass it to `TextInput` in place of `this.properties.onInput`:
```ts
w(TextInput, {
	aria: {
		describedBy: this._errorId
	},
	disabled,
	invalid,
	label,
	maxLength,
	minLength,
	name,
	placeholder,
	readOnly,
	required,
	type,
	value,
	onBlur,
	onInput: this._onInput
})
```

Form errors should be back now, along with error messages for invalid fields.

{% section %}

### Making use of the blur event

{% task 'Only begin validation after the first blur event' %}

Right now the form displays validation as soon as the user begins typing in a field, which can be a poor user experience. Seeing "invalid email address" types of errors at the beginning of typing an email is both unnecessary and distracting. A better pattern would be to hold off on validation until the first blur event, and then begin updating the validation on input events.

{% aside 'Blur events' %}
The [blur](https://developer.mozilla.org/en-US/docs/Web/Events/blur) event fires when an element loses focus.
{% endaside %}

Now that calling `onValidate` is handled within the `ValidatedTextInput` widget, this is possible.

{% instruction 'Create a private `_onBlur` function that calls `onValidate`' %}

In `ValidatedTextInput.ts`:
```ts
private _onBlur(value: string) {
	const { onBlur, onValidate } = this.properties;
	onValidate && onValidate(value);
	onBlur && onBlur();
}
```

We only need to use this function on the first blur event, since subsequent validation can be handled by `onInput`. The following code will use either `this._onBlur` or `this.properties.onBlur` depending on whether the input has been previously validated:

{% include_codefile 'demo/finished/biz-e-corp/src/widgets/ValidatedTextInput.ts' lines:50-67 %}

Now all that remains is to modify `_onInput` to only call `onValidate` if the field already has a validation state:

{% include_codefile 'demo/finished/biz-e-corp/src/widgets/ValidatedTextInput.ts' lines:24-31 %}

Try inputting an email address with these changes; it should only show an error message (or green border) after leaving the form field, while subsequent edits immediately trigger changes in validation.

{% section %}

### Validating on submit

{% task 'Create mock server-side validation when the form is submitted' %}

Thus far our code provides nice hints to the user, but does nothing to prevent bad data being submitted to our worker array. We need to add two separate checks to the `submitForm` action:

1. Immediately fail to submit if the existing validation function catches any errors.
2. Perform some additional checks (in this case we'll look for email uniqueness). This is where we would insert server-side validation in a real app.

{% instruction 'Create a private `_validateOnSubmit` method in `ApplicationContext.ts`' %}

The new `_validateOnSubmit` should start by running the existing input validation against all `_formData`, and returning false if there are any errors:

```ts
private _validateOnSubmit(): boolean {
	const errors = this._validateInput(this._formData);
	this._formErrors = deepAssign({ firstName: true, lastName: true, email: true }, errors);

	if (this._formErrors.firstName || this._formErrors.lastName || this._formErrors.email) {
		console.error('Form contains errors');
		return false;
	}

	return true;
}
```

Next let's add an extra check: let's say each worker's email must be unique, so we'll test the input email value against the `_workerData` array. Realistically this check would be performed server-side for security:

{% include_codefile 'demo/finished/biz-e-corp/src/ApplicationContext.ts' lines:53-70 %}

After modifying the `submitForm` function in `ApplicationContext.ts`, only valid worker entries should successfully submit. We also need to clear `_formErrors` along with `_formData` on a successful submission:

{% include_codefile 'demo/finished/biz-e-corp/src/ApplicationContext.ts' lines:82-92 %}

# Widget lifecycle hooks

In some circumstances, additional logic needs to be executed when Dojo is diffing node properties.

Several  `beforeProperties`, either side of a widget's `render` call using `beforeRender` & `afterRender` or after a constructor using `afterContructor`.

This functionality is provided by the `beforeProperties`, `beforeRender`, `afterRender` and `afterConstructor` decorators that can be found in the `decorators` directory.

**_Note:_** All lifecycle functions are executed in the order that they are specified from the superclass up to the final class.

## `@beforeProperties` (decorator)

The `beforeProperties` lifecycle hook is called immediately before property diffing is executed. Functions registered for `beforeProperties` receive `properties` and are required to return any updated, changed `properties` that are mixed over (merged) the existing properties.

As the lifecycle is executed before the property diffing is completed, any new or updated properties will be included in the diffing phase.

An example that demonstrates adding an extra property based on the widgets current properties, using a function declared on the widget class `myBeforeProperties`:

```ts
class MyClass extends WidgetBase<MyClassProperties> {
	@beforeProperties()
	protected myBeforeProperties(properties: MyClassProperties): MyClassProperties {
		if (properties.type === 'myType') {
			return { extraProperty: 'foo' };
		}
		return {};
	}
}
```

## `@alwaysRender` (decorator)

The `alwaysRender` decorator is used to force a widget to always render regardless of whether the widget's properties are considered different.

```ts
@alwaysRender()
class MyClass extends WidgetBase {}
```

## `@beforeRender` (decorator)

The `beforeRender` lifecycle hook receives the widget's `render` function, `properties`, and `children` and is expected to return a function that satisfies the `render` API. The `properties` and `children` are passed to enable them to be manipulated or decorated prior to `render` being called.

**Note:** When `properties` are changed during the `beforeRender` lifecycle, they do not go through the standard property diffing provided by `WidgetBase`. If the changes to the `properties` need to go through diffing, consider using the `beforeProperties` lifecycle hook.

```ts
class MyClass extends WidgetBase {
	@beforeRender()
	protected myBeforeRender(renderFunc: () => DNode, properties: any, children: DNode[]): () => DNode {
		// decorate/manipulate properties or children.
		properties.extraAttribute = 'foo';
		// Return or replace the `render` function
		return () => {
			return v('my-replaced-attribute');
		};
	}
}
```

## `@afterRender` (decorator)

The `afterRender` lifecycle hook receives the returned `DNode`s from a widget's `render` call so that the nodes can be decorated, manipulated or swapped completely.

```ts
class MyBaseClass extends WidgetBase {
	@afterRender()
	myAfterRender(result: DNode): DNode {
		// do something with the result
		return result;
	}
}
```

## `onAttach` (method override)

`onAttach` is called once when a widget is first rendered and attached to the DOM.

```ts
class MyClass extends WidgetBase {
	onAttach() {
		// do things when attached to the DOM
	}
}
```

## `onDetach` (method override)

`onDetach` is called when a widget is removed from the widget tree and therefore the DOM. `onDetach` is called recursively down the tree to ensure that even if a widget at the top of the tree is removed all the child widgets `onDetach` callbacks are fired.

```ts
class MyClass extends WidgetBase {
	onDetach() {
		// do things when removed from the DOM
	}
}
```

# Converting widgets into web components

Widgets can easily be configured as [Custom Elements](https://www.w3.org/TR/2016/WD-custom-elements-20161013/) by adding the `@customElement()` decorator (from the `@dojo/framework/widget-core/decorators/customElement` module) to their class. Doing so allows widgets to be used as generic web components in non-Dojo applications.

For example:

```ts
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';

import customElement from '@dojo/framework/widget-core/decorators/customElement';

export interface MyWebComponentWidgetProperties {
	onClick: (event: Event) => void;
	foo: string;
	bar: string;
}

@customElement<MyWebComponentWidgetProperties>({
	tag: 'my-widget',
	attributes: ['foo', 'bar'],
	properties: [],
	events: ['onClick']
})
export default class MyWebComponentWidget extends WidgetBase<MyWebComponentWidgetProperties> {
	protected render() {
		return null;
	}
}
```

## `@customElement()` properties

The `@customElement<WidgetProperties>()` decorator accepts the following properties to help define the widget's web component interface:

-	`tag?: string`
	-   The tag name representing the custom element widget within an HTML document
-   `properties?: CustomElementPropertyNames<P>`
	-	The list of widget properties (from the `WidgetProperties` generic type argument) that should be exposed as properties on the custom element.
-   `attributes?: CustomElementPropertyNames<P>`
    -   The list of attributes on the custom element that should be mapped back to widget properties.
-   `events?: CustomElementPropertyNames<P>`;
	-   The list of widget events to expose on the custom element

**Note**: The Custom Elements API is not available in all browsers. To use
Custom Elements in all browsers supported by Dojo, a polyfill needs to be
included such as webcomponents/custom-elements/master/custom-elements.min.js.
Dojo does not include the polyfill by default, so will need to be
added as a script tag in your index.html. Note that this polyfill cannot
currently be ponyfilled like other polyfills used in Dojo, so it cannot
be added with @dojo/framework/shim/browser or imported using ES modules.

## Attributes

An array of attribute names that should be set as properties on the widget.
The attribute name should be the same as the corresponding property on the widget.

## Properties

An array of property names that will be accessible programmatically on the
custom element but not as attributes. The property name must match
the corresponding widget property.

## Events

Some widgets have function properties, like events, that need to be exposed to your element. You can use the
`events` array to specify widget properties to map to DOM events.

```ts
{
	events: ['onChange'];
}
```

This will add a property to `onChange` that will emit the `change` custom event. You can listen like any other
DOM event,

```ts
textWidget.addEventListener('change', function(event) {
	// do something
});
```

The name of the event is determined by removing the `'on'` prefix from the name
and lower-casing the resulting name.

## Tag Name

Your widget will be registered with the browser using the provided tag name. The tag name **must** have a `-` in it.

# Widget metadata

Dojo provides a 'metadata' (or simply `meta`) concept to expose additional information about a widget, accessible reactively from within the widget itself. Widgets can access and respond to specific metadata from within their `render()` method, by calling `this.meta()`:

```ts
const metadata = this.meta(<MetaCollectionType>).get(<DOMElementKey);
```

Typically, this metadata is related to one or more of a widget's rendered DOM elements (often the widget's root node). The `meta` system provides widgets more advanced control over their representation and interaction within a browser, and also allows them to make use of several upcoming web standards in a consistent manner.

Sensible defaults will be returned if a widget's corresponding DOM node does not yet exist when attempting to access its metadata. Dojo will automatically re-render the affected widget, providing it more accurate metadata, once the concrete DOM node becomes available.

Related metadata properties are contained within an appropriately named collection object. Widgets access particular metadata by specifying the appropriate `meta` collection object name in calls to `this.meta()`. For example:

> src/widgets/WidgetMetadataExample.tsx

```tsx
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import { tsx } from '@dojo/framework/widget-core/tsx';
import Dimensions from '@dojo/framework/widget-core/meta/Dimensions';

export default class WidgetMetadataExample extends WidgetBase {
	protected render() {
		const myDimensions = this.meta(Dimensions).get('widgetMetaExample');
		const myWidth = `My display width is: ${myDimensions.size.width}px`;

		return <div key="widgetMetaExample">{myWidth}</div>;
	}
}
```

## Base meta

All meta classes inherit from `Base`, giving widgets access to a common `has` method for any metadata that they may fetch. The `has` method can be used to determine if the widget's specified DOM node has been rendered yet.

Finding out if a concrete DOM node is available or not can be useful when specific metadata needs to be available for a computation to be sensible. While the node remains unavailable, rendering can be short-circuited to avoid any unnecessary computation.

For example:

```ts
const hasRootBeenRendered = this.meta(<AnyMeta>).has('root');
```

## `Dimensions`

The `Dimensions` meta provides size and position information about a node.

```ts
import Dimensions from '@dojo/framework/widget-core/meta/Dimensions';
```

The object returned contains the following properties mapped from the specified DOM element's sources:

| Property          | Source                                |
| ----------------- | ------------------------------------- |
| `client.left`     | `node.clientLeft`                     |
| `client.top`      | `node.clientTop`                      |
| `client.width`    | `node.clientWidth`                    |
| `client.height`   | `node.clientHeight`                   |
| `position.bottom` | `node.getBoundingClientRect().bottom` |
| `position.left`   | `node.getBoundingClientRect().left`   |
| `position.right`  | `node.getBoundingClientRect().right`  |
| `position.top`    | `node.getBoundingClientRect().top`    |
| `size.width`      | `node.getBoundingClientRect().width`  |
| `size.height`     | `node.getBoundingClientRect().height` |
| `scroll.left`     | `node.scrollLeft`                     |
| `scroll.top`      | `node.scrollTop`                      |
| `scroll.height`   | `node.scrollHeight`                   |
| `scroll.width`    | `node.scrollWidth`                    |
| `offset.left`     | `node.offsetLeft`                     |
| `offset.top`      | `node.offsetTop`                      |
| `offset.width`    | `node.offsetWidth`                    |
| `offset.height`   | `node.offsetHeight`                   |

If the node has not yet been rendered, all returned values will be `0`.

## `Intersection`

The `Intersection` meta provides information on whether a node is visible in the application's viewport using the [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API).

```ts
import Intersection from '@dojo/framework/widget-core/meta/Intersection';
```

**Note:** To use the Intersection Observer API consistently in all browsers supported by Dojo, a polyfill needs to be included. Dojo does not include one by default, so it needs to be manually added to a project. This can be done via one of the following ways:

-   A script tag in your `index.html`, referencing an appropriate external script file
-   Added as an application dependency, then imported in the application’s `main.ts` entry point, for example via `import 'intersection-observer';`
-   By importing `@dojo/framework/shim/browser`

The following example renders a list of images, where each image `src` is only added as the item intersects with the viewport. This allows for lazy-loading of images, with the user only downloading images that they scroll to.

> src/widgets/LazyLoadingImageListWidget.ts

```ts
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import { v, w } from '@dojo/framework/widget-core/d';
import { DNode } from '@dojo/framework/widget-core/interfaces';
import Intersection from '@dojo/framework/widget-core/meta/Intersection';

// Add image URLs to load here
const images = [];

class ImageItem extends WidgetBase<{ imageSrc: string }> {
	protected render() {
		const { imageSrc } = this.properties;
		const { isIntersecting } = this.meta(Intersection).get('root');
		let imageProperties: any = {
			key: 'root',
			// Lazy-loading will only work if the image element's bounding box is known
			// before the image is fetched and its actual dimensions can be obtained
			styles: {
				height: '300px',
				width: '400px'
			}
		};

		// Only add the image source attribute if the node is in the viewport
		if (isIntersecting) {
			imageProperties = { ...imageProperties, src: imageSrc };
		}

		return v('img', imageProperties);
	}
}

export default class LazyLoadingImageListWidget extends WidgetBase {
	protected render() {
		let items: DNode[] = [];
		for (let i = 0; i < images.length; i++) {
			items.push(v('ul', { key: i }, [w(ImageItem, { key: i, imageSrc: images[i] })]));
		}

		return v('div', items);
	}
}
```

## `WebAnimation`

Dojo widget-core provides a `WebAnimation` meta to apply web animations to VNodes.

To specify the web animations pass an `AnimationProperties` object to the `WebAnimation` meta along with the key of the node you wish to animate. This can be a single animation or an array or animations.

**Note**: The Web Animations API is not currently available even in the latest browsers. To use the Web Animations API, a polyfill needs to be included. Dojo does not include the polyfill by default, so will need to be added as a script tag in your index.html or alternatively imported in the application’s main.ts using `import 'web-animations-js/web-animations-next-lite.min';` after including the dependency in your source tree, or by importing `@dojo/framework/shim/browser`.

### Basic Example

```ts
export default class AnimatedWidget extends WidgetBase {
	protected render() {
		const animate = {
			id: 'rootAnimation',
			effects: [{ height: '10px' }, { height: '100px' }],
			controls: {
				play: true
			}
		};

		this.meta(WebAnimation).animate('root', animate);

		return v('div', {
			key: 'root'
		});
	}
}
```

`controls` and `timing` are optional properties and are used to setup and control the animation. The `timing` property can only be set once, but the `controls` can be changed to apply stop, start, reverse, and other actions on the web animation.

### Changing Animation

Animations can be changed on each widget render in a reactive pattern, for example changing the animation from `slideUp` to `slideDown` on a title pane depending on the titlepane being open or not.

```ts
export default class AnimatedWidget extends WidgetBase {
	private _open = false;

	protected render() {
		const animate = this._open
			? {
					id: 'upAnimation',
					effects: [{ height: '100px' }, { height: '0px' }],
					controls: {
						play: true
					}
			  }
			: {
					id: 'downAnimation',
					effects: [{ height: '0px' }, { height: '100px' }],
					controls: {
						play: true
					}
			  };

		this.meta(WebAnimation).animate('root', animate);

		return v('div', {
			key: 'root'
		});
	}
}
```

### Passing an effects function

An `effects` function can be passed to the animation and evaluated at render time. This allows you to create programmatic effects such as those depending on measurements from the `Dimensions` `Meta`.

```ts
export default class AnimatedWidget extends WidgetBase {
	private _getEffect() {
		const { scroll } = this.meta(Dimensions).get('content');

		return [{ height: '0px' }, { height: `${scroll.height}px` }];
	}

	protected render() {
		const animate = {
			id: 'upAnimation',
			effects: this._getEffect(),
			controls: {
				play: true
			}
		};

		this.meta(WebAnimation).animate('root', animate);

		return v('div', {
			key: 'root'
		});
	}
}
```

### Get animation info

The `WebAnimation` meta provides a `get` function that can be used to retrieve information about an animation via its `id`.
This info contains the currentTime, playState, playbackRate and startTime of the animation. If no animation is found or the animation has been cleared this will return undefined.

```ts
export default class AnimatedWidget extends WidgetBase {
	protected render() {
		const animate = {
			id: 'rootAnimation',
			effects: [{ height: '10px' }, { height: '100px' }],
			controls: {
				play: true
			}
		};

		this.meta(WebAnimation).animate('root', animate);

		const info = this.meta(WebAnimation).get('rootAnimation');

		return v('div', {
			key: 'root'
		});
	}
}
```

## Drag

The `Drag` meta allows a consuming widget to determine if its nodes are being dragged and by how much. The meta provider abstracts away the need for dealing with modeling specific mouse, pointer, and touch events to create a drag state.

```ts
const dragResult = this.meta(Drag).get('root');
```

The drag information returned contains the following properties:

| Property     | Description                                                                                                                                                                                                                                                                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `delta`      | An `x`/`y` position that contains the number of pixels the pointer has moved since the last read of the drag state.                                                                                                                                                                                                                                |
| `isDragging` | If the pointer is currently _active_ in dragging the identified node.                                                                                                                                                                                                                                                                              |
| `start`      | A position object that contains `x`/`y` positions for `client`, `offset`, `page`, and `screen` that provides the start positions that the `delta` movement refers to. _Note_ that `offset` and `page` are not supported by all browsers and the meta provider does nothing to normalize this data, it simply copies it from the underlying events. |

One common use case is to create a draggable node within a container:

```ts
interface ExampleWidget extends WidgetBaseProperties {
	height: number;
	top: number;
	onScroll?(delta: number): void;
}

class VerticalScrollBar extends WidgetBase {
	protected render() {
		const { height, top, onScroll } = this.properties;
		const dragResult = this.meta(Drag).get('slider');
		onScroll && onScroll(dragResult.delta.y);
		return v(
			'div',
			{
				classes: [css.root, dragResult.isDragging ? css.dragging : null],
				key: 'root'
			},
			[
				v('div', {
					classes: [css.slider],
					key: 'slider',
					styles: {
						height: `${height}px`,
						top: `${top}px`
					}
				})
			]
		);
	}
}

class VerticalScrollBarController extends WidgetBase {
	private _top: 0;
	private _onScroll(delta: number) {
		this._top += delta;
		if (this._top < 0) {
			this._top = 0;
		}
		this.invalidate();
	}

	protected render() {
		return w(VerticalScrollBar, {
			top: this._top,
			width: 10,
			onScroll: this._onScroll
		});
	}
}
```

As can be seen in the above code, the meta provider simply provides information which the widgets can react to. The implementation
needs to react to these changes.

## `Focus`

The `Focus` meta determines whether a given node is focused or contains document focus. Calling `this.meta(Focus).get(key)` returns the following results object:

| Property        | Description                                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `active`        | A boolean indicating whether the specified node itself is focused.                                                                         |
| `containsFocus` | A boolean indicating whether one of the descendants of the specified node is currently focused. This will return true if `active` is true. |

An example usage that opens a tooltip if the trigger is focused might look like this:

```ts
class MyWidget extends WidgetBase {
	// ...
	render() {
		// run your meta
		const buttonFocus = this.meta(FocusMeta).get('button');
		return v('div', {
			w(Button, {
			key: 'button'
			}, [ 'Open Tooltip' ]),
			w(Tooltip, {
			content: 'Foo',
			open: buttonFocus.active
			}, [ 'modal content' ])
		});
	}
	// ...
}
```

The `Focus` meta also provides a `set` method to call focus on a given node. This is most relevant when it is necessary to shift focus in response to a user action, e.g. when opening a modal or navigating to a new page. You can use it like this:

```ts
class MyWidget extends WidgetBase {
	// ...
	render() {
		// run your meta
		return v('div', {
		w(Button, {
			onClick: () => {
			this.meta(Focus).set('modal');
			}
		}, [ 'Open Modal' ]),
		v('div', {
			key: 'modal',
			tabIndex: -1
		}, [ 'modal content' ])
		});
	}
	// ...
}
```

## Resize

The resize observer meta uses the latest [`ResizeObserver`](https://wicg.github.io/ResizeObserver/) within Dojo based widgets.

**Note**: The Resize Observer API is not available in all browsers. [Native browser support](https://caniuse.com/#feat=resizeobserver) is currently provided by `Chrome 64+`, other Dojo supported browsers work via [polyfill](https://github.com/WICG/ResizeObserver/issues/3). To use the Resize Observer API in all browsers supported by Dojo, either added as a script tag in your index.html pointing to the polyfill, or alternatively import the polyfill in the application’s main.ts after including the dependency in your source tree.

This allows you to observe resize events at the component level. The `meta` accepts an object of `predicate` functions which receive `ContentRect` dimensions and will be executed when a resize event has occured. The results are made available in a widget's `render` function. This is an incredibly powerful tool for creating responsive components and layouts.

```ts
function isMediumWidthPredicate(contentRect: ContentRect) {
	return contentRect.width < 500;
}

function isSmallHeightPredicate(contentRect: ContentRect) {
	return contentRect.height < 300;
}

class TestWidget extends WidgetBase {
	render() {
		const { isMediumWidth, isSmallHeight } = this.meta(Resize).get('root', {
			isMediumWidth: isMediumWidthPredicate,
			isSmallHeight: isSmallHeightPredicate
		});

		return v('div', {
			key: 'root'
			classes: [
				isMediumWidth ? css.medium : css.large,
				isSmallHeight ? css.scroll : null
			]
		}, [
			v('div', {
				innerHTML: 'Hello World'
			})
		]);
	}
}
```

## Implementing custom meta

Widget implementors can create their own meta if they require access to any additional details about the widget's DOM nodes.

```ts
import MetaBase from '@dojo/framework/widget-core/meta/Base';

class HtmlMeta extends MetaBase {
	get(key: string): string {
		const node = this.getNode(key);
		return node ? node.innerHTML : '';
	}
}
```

And you can use it like:

```ts
class MyWidget extends WidgetBase {
	// ...
	render() {
		// run your meta
		const html = this.meta(HtmlMeta).get('comment');

		return v('div', { key: 'comment', innerHTML: html });
	}
	// ...
}
```

Extending the base class found in `meta/Base` will provide the following functionality:

-   `has` - A method that accepts a `key` and returns a `boolean` to denote if the corresponding node exists in the rendered DOM.
-   `getNode` - A method that accepts a `key` string to inform the widget it needs a rendered DOM element corresponding to that key. If one is available, it will be returned immediately. If not, a callback is created which will invalidate the widget when the node becomes available. This uses the underlying `nodeHandler` event system.
-   `invalidate` - A method that will invalidate the widget.
-   `afterRender` - This provides a hook into the widget `afterRender` lifecycle that can be used to clear up any resources that the meta has created. This is used, for instance, in the `WebAnimation` meta to clear down unused animations.

Meta classes that require extra options should accept them in their methods.

```ts
import MetaBase from '@dojo/framework/widget-core/meta/Base';

interface IsTallMetaOptions {
	minHeight: number;
}

class IsTallMeta extends MetaBase {
	isTall(key: string, { minHeight }: IsTallMetaOptions = { minHeight: 300 }): boolean {
		const node = this.getNode(key);
		if (node) {
			return node.offsetHeight >= minHeight;
		}
		return false;
	}
}
```

# Application composition

## Working with the Registry

The `Registry` provides a mechanism to define widgets and injectors (see the [`Containers & Injectors`](#containers--injectors) section), that can be dynamically/lazily loaded on request. Once the registry widget is loaded all widgets that need the newly loaded widget will be invalidated and re-rendered automatically.

A main registry can be provided to the `renderer`, which will be automatically passed to all widgets within the tree (referred to as `baseRegistry`). Each widget also gets access to a private `Registry` instance that can be used to define registry items that are scoped to the widget. The locally defined registry items are considered a higher precedence than an item registered in the `baseRegistry`.

```ts
import { Registry } from '@dojo/framework/widget-core/Registry';
import { w } from '@dojo/framework/widget-core/d';

import MyWidget from './MyWidget';
import MyAppContext from './MyAppContext';
import App from './App';

const registry = new Registry();

registry.define('my-widget', MyWidget);

registry.defineInjector('my-injector', (invalidator) => {
	const appContext = new MyAppContext(invalidator);
	return () => appContext;
});

const r = renderer(() => w(App, {}));
r.registry = registry;
```

In some scenarios, it might be desirable to allow the `baseRegistry` to override an item defined in the local `registry`. Use true as the second argument of the registry.get function to override the local item.

The Registry will automatically detect and handle widget constructors as default exports for imported esModules for you.

## Registry Decorator

A registry decorator is provided to make adding widgets to a local registry easier. The decorator can be stacked to register multiple entries.

```ts
// single entry
@registry('loading', LoadingWidget)
class MyWidget extends WidgetBase {
	render() {
		if (this.properties) {
			const LoadingWidget = this.registry.get('loading', true);
			return w(LoadingWidget, {});
		}
		return w(MyActualChildWidget, {});
	}
}

// multiple entries
@registry('loading', LoadingWidget)
@registry('heading', () => import('./HeadingWidget'))
class MyWidget extends WidgetBase {
	render() {
		if (this.properties) {
			const LoadingWidget = this.registry.get('loading', true);
			return w(LoadingWidget, {});
		}
		return w(MyActualChildWidget, {}, [w('heading', {})]);
	}
}
```

## Loading esModules

The registry can handle the detection of imported esModules for you that have the widget constructor as the default export. This means that your callback function can simply return the `import` call. If the widget constructor is not the default export you will need to pass it manually.

```ts
@registry('Button', () => import('./Button')) // default export
@registry('Table', async () => {
	const module = await import('./HeadingWidget');
	return module.table;
})
class MyWidget extends WidgetBase {}
```

## Containers & Injectors

There is built-in support for side-loading/injecting values into sections of the widget tree and mapping them to a widget's properties. This is achieved by registering an injector factory with a `registry` and setting the registry on the application's `renderer` to ensure the registry instance is available to your application.

Create a factory function for a function that returns the required `payload`.

```ts
registry.defineInjector('my-injector', () => {
	return () => ({ foo: 'bar' });
});
```

The injector factory gets passed an `invalidator` function that can get called when something has changed that requires connected widgets to `invalidate`.

```ts
registry.defineInjector('my-injector', (invalidator) => {
	// This could be a store, but for this example it is simply an instance
	// that accepts the `invalidator` and calls it when any of its internal
	// state has changed.
	const appContext = new AppContext(invalidator);
	return () => appContext;
});
```

To connect the registered `payload` to a widget, we can use the `Container` HOC (higher order component) provided by `widget-core`. The `Container` accepts a widget `constructor`, `injector` label, and `getProperties` mapping function as arguments and returns a new class that returns the passed widget from its `render` function.

`getProperties` receives the `payload` returned from the injector function and the `properties` passed to the container HOC component. These are used to map into the wrapped widget's properties.

```ts
import { Container } from '@dojo/framework/widget-core/Container';
import { MyWidget } from './MyWidget';

function getProperties(payload: any, properties: any) {
	return {
		foo: payload.foo
	};
}

export const MyWidgetContainer = Container(MyWidget, 'my-injector', getProperties);
```

The returned class from `Container` HOC is then used in place of the widget it wraps, the container assumes the properties type of the wrapped widget, however, they all considered optional.

```ts
// import { MyWidget } from './MyWidget';
import { MyWidgetContainer } from './MyWidgetContainer';

interface AppProperties {
	foo: string;
}

class App extends WidgetBase<AppProperties> {
	render() {
		return v('div', {}, [
			// w(MyWidget, { foo: 'bar' })
			w(MyWidgetContainer, {})
		]);
	}
}
```
