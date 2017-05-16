# @dojo/widget-core

[![Build Status](https://travis-ci.org/dojo/widget-core.svg?branch=master)](https://travis-ci.org/dojo/widget-core)
[![codecov](https://codecov.io/gh/dojo/widget-core/branch/master/graph/badge.svg)](https://codecov.io/gh/dojo/widget-core)
[![npm version](https://badge.fury.io/js/%40dojo%2Fwidget-core.svg)](https://badge.fury.io/js/%40dojo%2Fwidget-core)

This repo provides users with the ability to write their own Dojo 2 widgets.

We also provide a suite of pre-built widgets to use in your applications: [(@dojo/widgets)](https://github.com/dojo/widgets).

**WARNING** This is _beta_ software. While we do not anticipate significant changes to the API at this stage, we may feel the need to do so. This is not yet production ready, so you should use at your own risk.

- [Usage](#usage)
- [Features](#features)
    - [Overview](#overview)
    - [`v` & `w`](#v--w)
        - [`v`](#v)
        - [`w`](#w)
    - [tsx](#tsx)
    - [Writing custom widgets](#writing-custom-widgets)
        - [Public API](#public-api)
        - [The 'properties' lifecycle](#the-properties-lifecycle)
            - [Custom property diff control](#custom-property-diff-control)
            - [The `properties:changed` event](#the-propertieschanged-event)
        - [Projector](#projector)
        - [Event Handling](#event-handling)
        - [Widget Registry](#widget-registry)
        - [Injecting State](#injecting-state)
        - [Theming](#theming)
        - [Internationalization](#internationalization-i18n)
        - [Web Components](#web-components)
        	- [Attributes](#attributes)
        	- [Properties](#properties)
        	- [Events](#events)
        	- [Initialization](#initialization)
    - [Key Principles](#key-principles)
    - [API](#api)
- [How Do I Contribute?](#how-do-i-contribute)
    - [Installation](#installation)
    - [Testing](#testing)
- [Licensing Information](#licensing-information)

## Usage

To use @dojo/widget-core, install the package along with its required peer dependencies:

```shell
npm install @dojo/widget-core

# peer dependencies
npm install @dojo/has
npm install @dojo/shim
npm install @dojo/core
npm install @dojo/i18n
npm install maquette
```

You can also use the [dojo cli](https://github.com/dojo/cli) to create a complete Dojo 2 skeleton application.

## Features

Constructing your own widgets (Custom widgets) is simple and straightforward.
The smallest `@dojo/widget-core` example looks like this:

```ts
class MyWidget extends WidgetBase<WidgetProperties> {
	render() {
       return v('h1', [ 'Hello, Dojo!' ]);
	}
}

const Projector = ProjectorMixin(MyWidget);
const projector = new Projector();

projector.append(root);
```

This code renders a `h1` element onto the page, that says "Hello, Dojo!".

### Overview

All widgets in Dojo 2 are designed using key reactive architecture concepts.
These concepts include unidirectional data flow, inversion of control and property passing.

Dojo 2's widget-core is built with TypeScript, leveraging Class mixins to construct and manipulate traits and mixins.

We also make use of a VirtualDOM (VDOM) in Dojo 2.
In order to interact with our VDOM, you need to pass it [HyperScript](https://github.com/dominictarr/hyperscript).
In Dojo 2 we provide 2 functions that make interacting with the VDOM, easy and intuitive: `v` and `w`.

### `v` & `w`

These functions express structures that will be passed to the VDOM.

`v` creates nodes that represent DOM tags, e.g. `div`, `header` etc.
This function allows Dojo 2 to manage lazy hyperscript creation and element caching.

 `w` creates Dojo 2 widgets or custom widget.
This function provides support for lazy widget instantiation, instance management and caching.

The `v` & `w` functions are available from the `@dojo/widget-core/d` package.

```ts
import { v, w } from '@dojo/widget-core/d';
```

The argument and return types for `v` and `w` are available from `@dojo/widget-core/interfaces`, and are as follows:

```ts
import { DNode, HNode, WNode } from '@dojo/widget-core/interfaces';
```

#### `v`

The following code creates an element with the specified `tag`

```ts
v(tag: string): HNode[];
```

The following code renders an element with the `tag` and `children`.

```ts
v(tag: string, children: DNode[]): HNode[];
```

The following code renders an element with the `tag`, `properties` and `children`.

```ts
v(tag: string, properties: VirtualDomProperties, children?: DNode[]): HNode[];
```

As well as interacting with the VDOM by passing it HyperScript, you can also pass it Dojo 2 Widgets or Custom Widgets using the `w` function.

#### `w`

The following code creates a widget using the `widgetConstructor`.

```ts
w<P extends WidgetProperties>(widgetConstructor: string | WidgetBaseConstructor<P>): WNode[];
```

The following code creates a widget using the `widgetConstructor` and `properties`.

```ts
w<P extends WidgetProperties>(widgetConstructor: string | WidgetBaseConstructor<P>, properties: P): WNode[];
```

The following code creates a widget using the `widgetConstructor` and `children`.

```ts
w<P extends WidgetProperties>(widgetConstructor: string | WidgetBaseConstructor<P>, children: DNode[]): WNode[];
```

The following code creates a widget using the `widgetConstructor`, `properties` and `children`

```ts
w<P extends WidgetProperties>(widgetConstructor: string | WidgetBaseConstructor<P>, properties: P, children: DNode[]): WNode[];
```
Example `w` constructs:

```ts
w(WidgetClass);
w(WidgetClass, properties);
w(WidgetClass, children);
w(WidgetClass, properties, children);

w('my-widget');
w('my-widget', properties);
w('my-widget', children);
w('my-widget', properties, children);
```

The example above that uses a string for the `widgetConstructor `, is taking advantage of the [widget registry](#widget-registry) functionality.
The widget registry allows for the lazy loading of widgets.

### tsx

In additional to the programatic functions `v` and `w`, widget-core optionally supports the use of the `jsx` syntax known as [`tsx`](https://www.typescriptlang.org/docs/handbook/jsx.html) in TypeScript.

To start to use `jsx` in your project the widgets need to be named with a `.tsx` extension and some configuration is required in the project's `tsconfig.json`:

Add the configuration options for `jsx`:

```
"jsx": "react",
"jsxFactory": "tsx",
```

Include `.tsx` files in the project:

```
 "include": [
 	"./src/**/*.ts",
 	"./src/**/*.tsx"
 ]
```

Once the project is configured, `tsx` can be used in a widget's `render` function simply by importing the `tsx` function as `import { tsx } from '@dojo/widget-core/tsx';`

```tsx
class MyWidgetWithTsx extends WidgetBase<MyProperties> {
	protected render(): DNode {
		const { clear, properties: { completed, count, activeCount, activeFilter } } = this;
	
		return (
			<footer classes={this.classes(css.footer)}>
				<span classes={this.classes(css.count)}>
					<strong>{`${activeCount}`}</strong>
					<span>{`${count}`}</span>
				</span>
				<TodoFilter activeFilter={activeFilter} />
				{ completed ? ( <button onclick={clear} /> ) : ( null ) }
			</footer>
		);
	}
}
```

**Note:** Unfortunately `tsx` is not directly used within the module so will report as an unused import so would be needed to be ignored by linters.

### Writing Custom Widgets

The `WidgetBase` class provides the functionality needed to create Custom Widgets.
This functionality includes caching and widget lifecycle management.

The `WidgetBase` class is available from the `@dojo/widget-core/WidgetBase ` package.

```ts
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
```

**All** widgets should extend from this class.

#### The 'properties' lifecycle

The widget's properties lifecycle occurs before its render lifecycle.

Properties passed to the `w` function represent the public API for a widget.

The properties lifecycle starts when properties are passed to the widget.
The properties lifecycle is performed in the widgets `setProperties` function.
Properties are differenced using `DiffType.AUTO`.

**Note:** If a widget's properties contain complex data structures that you need to diff, then individual control is required using the `diffProperty` decorator.

##### Custom property diff control

You can control individual property differencing by using the `@diffProperty` decorator. Properties with a `diffProperty` decorator **will be excluded from automatic differencing**.

###### At the class level

`@diffProperty(propertyName, diffType)` can be applied at the class level if you want to use a pre-defined diff function.

```typescript
@diffProperty('title', DiffType.REFERENCE)
class MyWidget extends WidgetBase<MyProperties> {
}
```

The following diff functions are provided:

| Type                 | Description                                                                       |
| -------------------- | ----------------------------------------------------------------------------------|
| `DiffType.ALWAYS`    | Always report a property as changed.                                              |
| `DiffType.AUTO`      | Ignore functions, shallow compare objects, and reference compare all other values.|
| `DiffType.CUSTOM`    | Provide a custom diffing function.                                                |
| `DiffType.IGNORE`    | Never report a property as changed.                                               |
| `DiffType.REFERENCE` | Compare values by reference (`old === new`)                                       |
| `DiffType.SHALLOW`   | Treat the values as objects and compare their immediate values by reference.      |

`DiffType.CUSTOM` is unique in that it takes a third parameter, the diff function. This function has the following signature:

```
(previousValue: any, newValue: any) => {
  changed: boolean;
  value: any;
}
```

###### At the method level

You can also provide `DiffType.CUSTOM` diff functions by applying a decorator at the method level.

```typescript
class MyWidget extends WidgetBase<WidgetProperties> {
	@diffProperty('foo')
	myComplexDiffFunction(previousValue: MyComplexObject, newValue: MyComplexObject) {
		return {
		  changed: true,
		  value: newValue
		};
	}
}
```

For non-decorator environments (Either JavaScript/ES6 or a TypeScript project that does not have the experimental decorators configuration set to true in the `tsconfig`), the functions need to be registered in the constructor using the `addDecorator` API with `diffProperty` as the key.

```ts
class MyWidget extends WidgetBase<WidgetProperties> {

	constructor() {
		super();
		diffProperty('foo', DiffType.CUSTOM, this.customFooDiff)(this);
	}

	customFooDiff(previousProperty: MyComplexObject, newProperty: MyComplexObject) {
	}
}
```

If a property has a custom diff function then that property is excluded from the default property diff.

##### The 'properties:changed' event

When `diffProperties` has completed, the results are used to update the properties on the widget instance.
If any properties were changed, then the `properties:changed` event is emitted. If the new properties do **not** contain keys from the previous properties, the properties are marked as changed.

```typescript
// set the initial properties
$widget->setProperties({
	foo: true,
	bar: true
});

// properties:changed will include the "bar" property
$widget->setProperties({
	foo: true
});
```

Attaching a listener to the event is exposed via a decorator `@onPropertiesChanged`.

```ts
class MyWidget extends WidgetBase<WidgetProperties> {

	@onPropertiesChanged
	myPropChangedListener(evt: PropertiesChangeEvent<this, WidgetProperties>) {
		// do something
	}
}
```

For non decorator environments the listener can be registered using the `onPropertiesChanged ` function in the constructor.

```ts
class MyWidget extends WidgetBase<WidgetProperties> {

	constructor() {
		super();
		onPropertiesChanged(this.myPropChangedListener)(this);
	}

	myPropChangedListener(evt: PropertiesChangeEvent<this, WidgetProperties>) {
		// do something
	}
}
```

Example event payload

```ts
{
	type: 'properties:changed',
	target: this,
	properties: { foo: 'bar', baz: 'qux' },
	changedKeyValues: [ 'foo' ]
}
```

`changedKeyValues` represents a list of keys in the `properties` key/value pairs where the values have changed.

Finally once all the attached events have been processed, the properties lifecycle is complete and the finalized widget properties are available during the render cycle functions.

<!-- TODO: render lifecycle goes here -->

Occasionally, in a mixin or base widget class, it my be required to provide logic that needs to be executed before or after a widget's `render` call. These lifecycle hooks are supported in `WidgetBase` and operate as before and after aspects.

The functionality is provided by the `beforeRender` and `afterRender` decorators.

***Note:*** Both the `beforeRender` and `afterRender` functions are executed in the order that they are specified from the super class up to the final class.

##### BeforeRender

The `beforeRender` call receives the widget's `render` function, `properties` and `children` and is expected to return a function that satisfies the `render` API. The `properties` and `children` are passed to enable them to be manipulated or decorated prior to the `render` being called.

This is the only time in the widget lifecycle that exposes either of these attributes to be manipulated outside of the property system.

```ts
class MyBaseClass extends WidgetBase<WidgetProperties> {
	@beforeRender
	myBeforeRender(renderFunc: () => DNode, properties: any, children: DNode[]): () => DNode {
		// decorate/manipulate properties or children.
		properties.extraAttribute = 'foo';
		// Return or replace the `render` function
		return () => {
			return v('my-replaced-attribute');
		};
	}
}
```

And using the `beforeRender` function for non decorator environments:

```ts
class MyBaseClass extends WidgetBase<WidgetProperties> {
	constructor() {
		super();
		beforeRender(this.myOtherBeforeRender)(this);
	}

	myOtherBeforeRender(renderFunc: () => DNode, properties: any, children: DNode[]): () => DNode {
		// do something with the result
		return renderFunc;
	}
}
```

##### AfterRender

The `afterRender` call receives the returned `DNode`s from a widget's `render` call, so that the nodes can decorated, manipulated or even swapped.

```ts
class MyBaseClass extends WidgetBase<WidgetProperties> {
	@afterRender
	myAfterRender(result: DNode): DNode {
		// do something with the result
		return result;
	}
}
```

And using the `afterRender` function for non decorator environments:

```ts
class MyBaseClass extends WidgetBase<WidgetProperties> {
	constructor() {
		super();
		afterRender(this.myOtherAfterRender)(this);
	}

	myOtherAfterRender(result: DNode): DNode {
		// do something with the result
		return result;
	}
}
```

#### Projector

Projector is a term used to describe a widget that will be attached to a DOM element, also known as a root widget.
Any widget can be converted into a projector simply by mixing in the `ProjectMixin` mixin.

```ts
const MyProjector = ProjectorMixin(MyWidget);
```

Projectors behave in the same way as any other widget **except** that they need to be manually instantiated and managed outside of the standard widget lifecycle.

There are 3 ways that a projector widget can be added to the DOM - `.append`, `.merge` or `.replace`, depending on the type of attachment required.

 - `append`  - Creates the widget as a child to the projector's `root` node
 - `merge`   - Merges the widget with the projector's `root` node
 - `replace` - Replace the projector's `root` node with the widget

```ts
const MyProjector = ProjectorMixin(MyWidget);

const myProjector = new MyProjector({})
myProjector.append(root);
```

#### Event Handling

The recommended pattern for custom event handlers is to declare them on the widget class and reference the function using `this`.
Event handlers are most commonly called from `render`.

Event handlers can be internal logic encapsulated within a widget or delegate to a function passed into the widget via `properties`.
For convenience event handlers are automatically bound to the scope of their enclosing widget.

*internally defined handler*

```ts
class MyWidget extends WidgetBase<WidgetProperties> {
	private selected: boolean;

	onClick() {
		this.selected = !this.selected;
	}

	render(this: MyWidget): DNode {
		return v('div', [
			v('input', { type: 'checkbox', onclick: this.onClick }),
			v('input', { type: 'text', disabled: this.selected })
		]);
	}
}
```

*Handler passed via properties*

```ts
class MyWidget extends WidgetBase<WidgetProperties> {
	onClick(): void {
		this.properties.mySpecialFunction();
	}
}
```

*Binding a function passed to a child widget*

```ts
import { specialClick } from './mySpecialFunctions';

class MyWidget extends WidgetBase<WidgetProperties> {
	render() {
		return	w(createChildWidget, { onClick: specialClick });
	}
}
```

#### Widget Registry

The widget registry provides the ability to define a label against a `WidgetRegistryItem`. A `WidgetRegistryItem` is either a `WidgetConstructor` a `Promise<WidgetConstructor>` or a function that when executed returns a `Promise<WidgetConstructor>`.

A global widget registry is exported from the `d` module.

```ts
import { registry } from '@dojo/widget-core/d';
import MyWidget from './MyWidget';

// registers the widget that will be available immediately
registry.define('my-widget-1', MyWidget);

// registers a promise that is resolving to a widget and will be
// available as soon as the promise resolves.
registry.define('my-widget-2', Promise.resolve(MyWidget));

// registers a function that will be lazily executed the first time the
// label is used within a widget render pipeline. The widget will be available
// as soon as the promise is resolved after the initial get.
registry.define('my-widget-3', () => Promise.resolve(MyWidget));
```

It is recommended to use the widget registry when defining widgets with [`w`](#w--d), to support lazy widget resolution.

Example of registering a function that returns a `Promise` that resolves to a `widget`.

```ts
import load from '@dojo/core/load';

registry.define('my-widget', () => {
	return load(require, './MyWidget')
		.then(([ MyWidget ]) => MyWidget.default);
});
```

#### Injecting State

Working with larger widget structures, it can quickly become tiresome and complex to pass all the required properties down the tree. Needing to pass all required properties also means widgets often need to be aware of properties that are only needed for ensuring their propagation to child widgets.

Dojo 2 provides a mechanism to inject state directly to parts of the widget tree; this is done by defining an `Injector` in the `registry` and passing a context object that will source the state that is to be injected.

```ts
import { Injector, BaseInjector } from '@dojo/widget-core/Injector';

const myStateContext = {
	theme: 'solid'
};

registry.define('state', Injector(BaseInjector, myStateContext));
```

To use the injected state, create a `beforeRender` method that returns a render function which creates a `w` reference to the registry item like any other widget and pass the properties required by the `InjectorProperties` interface.

```ts
beforeRender(renderFunc: () => DNode, properties: any, children: any): DNode {
	return () => {
		return w('state', {
			render: renderFunc,
			getProperties(context: any, properties: any): any {
				return context;
			},
			properties,
			getChildren(context: any, children: DNode[]): DNode[] {
				return [];
			},
			children
		});
	};
}
```

This will inject the values of `myState` as properties to the widget, as the returned object from `getProperties` is mixed over the widget's existing properties.

For convenience, Dojo 2 provides a mixin called `Container` that will decorate a widget with the above `beforeRender` implementation. Using the `Container` mixin enables any view widget to have state injected without coupling the widget to always have state injected. This means the widget can also be used as a normal widget with properties being passed from its parent.


```ts
import { MyViewWidget } from './MyViewWidget';
import { Container } from '@dojo/widget-core/Container';

function getProperties(context: any, properties: any): any {
	return context;
}

const MyViewWidgetContainer = Container(MyViewWidget, 'state', { getProperties });
```

**Note:** that both the `getProperties` and `getChildren` functions do not need to be provided, if the functions are not defined the default mappers will be used that return an empty object and an empty array respectively.

There may be times when the default `BaseInjector` doesn't fully meet your needs. For example if the context contains a reference to an eventable instance, you may want to add an event listener in the `Injector` to perform some logic, perhaps invalidate the widget.

To do this the `BaseInjector` can be extended easily to add the extra logic required.

```ts
interface MyContext {
	eventeableInstance: Evented;
	bar: number;
}

class MyInjector extends BaseInjector<MyContext> {
	constructor(context: MyContext) {
		super(context);
		const { eventeableInstance } = context;
		eventeableInstance.on('change', () => {
			this.invalidate();
		});
	}

	protected toInject(): any {
		const { eventeableInstance, bar } = this.context;
		return {
			eventeableInstance,
			bar
		};
	}
}
```

#### Theming

##### Overview

Widgets are themed using `css-modules` and the `Themeable` mixin. Each widget must implement a .css file that contains all the css classes that will be used to style it. The `baseClasses` object is the css API for the Widget: `baseClasses` css classes can be overridden by external themes. Further customization of specific Custom Widget classes can be achieved by passing `extraClasses` into the widget.
The `Themeable` mixin provides a `classes` function that controls the classes to be applied to each node. Classes from the base `css` object passed to the `classes` function can be themed and overridden. To create fixed classes that cannot be changed, the chained `fixed` function can be used.

##### Authoring a Base Theme

A base theme is authored using `css-modules` and `cssnext`. The base theme `css` file should be located in a `styles` folder within the Widget's package directory.
The `typed-css-modules` [cli](https://github.com/Quramy/typed-css-modules#cli) should be used in `watch` mode in order to generate typings for TypeScript usage. This is automatically included within the `dojo build -w` command from `dojo-cli`.

```
tabPanel
├── createTabPanel.ts
└── styles
    └── tabPanel.css
```

The `baseClasses` css must contain a complete set of all of the classes you wish to apply to a widget as all theme and extra classes are limited by the classnames made available here.
Classnames are locally scoped as part of building a Dojo application. A theme `key` is generated at build time to locate the themes for each class where a theme is set.

```css
/* tabpanel.css */
.root {
	background: red;
}

.tab {
	background: blue;
}
```

##### Registering `baseClasses`

To apply `baseClasses` a widget must use `ThemeableMixin` and the `theme` decorator from `mixins/Themeable` to register the `baseClasses`.

```ts
import { WidgetProperties } from '@dojo/widget-core/interfaces';
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { ThemeableMixin, theme } from '@dojo/widget-core/mixins/Themeable';
import * as baseClasses from './styles/tabpanel.css';

@theme(baseClasses)
class MyThemeableWidget extends ThemeableMixin(WidgetBase)<WidgetProperties> {
	// ...
}
```

Basic usage:

```ts
import { WidgetProperties } from '@dojo/widget-core/interfaces';
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { ThemeableMixin, ThemeableProperties, theme } from '@dojo/widget-core/mixins/Themeable';
import * as baseClasses from './styles/tabpanel.css';

interface MyThemeableWidgetProperties extends WidgetProperties, ThemeableProperties;

@theme(baseClasses)
class MyThemeableWidget extends ThemeableMixin(WidgetBase)<MyThemeableWidgetProperties> {
	render: function () {
		const { root, tab } = baseClasses;
		return
			v(`ul`, { classes: this.classes(root) }, [
				v('li', { classes: this.classes(tab) }, [ 'tab1' ])
				// ...
			]);
	}
}
```

##### Applying a Theme

Themeable widgets include an optional `theme` property which can be set to pass in a theme. Theme classes will override `baseClasses`. When a `theme` property is set or changed, the widgets `theme` classes will be regenerated and the widget invalidated such that it is redrawn. Themes are used to apply consistent styling across the widget codebase.

Usage Extending on the previous `tabPanel` example.

``` css
/* customTheme/tabPanel.css */
.tabs {
	background: green;
}
```

Import the theme and pass it to the widget via its `properties`. The theme classes will be automatically mixed into the widget and available via `this.classes`.

```ts
import * as customTheme from './themes/customTheme.css';

interface MyThemeableWidgetProperties extends WidgetProperties, ThemeableProperties;

class MyThemeableWidget extends ThemeableMixin(WidgetBase)<MyThemeableWidgetProperties> {
	render: function () {
		// Resulting widget will have green tabs instead of baseTheme red.
		return w(createTabPanel, { theme: customTheme });
	}
}
```

The theme can be applied to individual widgets or to a project and property passed down to its children.

##### Injecting a theme

The theming system supports injecting a theme that is configured externally to the usual mechanism of passing properties down the widget tree.

This is done using a `ThemeInjectorContext` instance that is passed to the `Injector` mixin along with the `ThemeInjector` class. Once the theme injector is defined in the registry, the `theme` can be changed by calling the `ThemeInjectorContext#set(theme: any)` API on the instance of the injector context.

```ts
// Create the singleton injector context
const themeInjectorContext = new ThemeInjectorContext(myTheme);

// Create the base ThemeInjector using the singleton context and the Injector mixin
const ThemeInjectorBase = Injector<ThemeInjectorContext, Constructor<ThemeInjector>>(ThemeInjector, themeInjectorContext);

// Define the created ThemeInjector against the static key exported from `Themeable`
registry.define(INJECTED_THEME_KEY, ThemeInjectorBase);
```

Once this theme injector is defined, any themeable widgets without an explicit `theme` property will be controlled via the theme set within the `themeInjectorContext`. To change the theme simply call `themeInjectorContext.set(myNewTheme);` and all widgets that are using the injected theme will be updated to the new theme.

To make this even easier, `Themeable` exports a helper function wraps the behavior defined above and returns the context, with a parameter for the `theme` and an optional `registry` for the injector to be defined. If a `registry` is not provided then the global `registry` is used.

```ts
// Uses global registry
const context = registerThemeInjector(myTheme);

// Setting the theme
context.set(myNewTheme);

// Uses the user defined registry
const context = registryThemeInjector(myTheme, myRegistry);
```

##### Overriding Theme Classes

As we are using `css-modules` to scope widget css classes, the generated class names cannot be used to target specific nodes and apply custom styling to them. Instead you must use the `extraClasses` property to pass your generated classes to the widget. This will only effect one instance of a widget and will be applied on top of, rather than instead of, theme classes.

```css
/* tabPaneExtras.css */
.tabs {
	font-weight: bold;
}
```

```ts
import * as myExtras from './extras/myExtras.css';

interface MyThemeableWidgetProperties extends WidgetProperties, ThemeableProperties;

class MyThemeableWidget extends ThemeableMixin(WidgetBase)<MyThemeableWidgetProperties> {
	render: function () {
		// Resulting widget will still have baseTheme red tabs,
		// but will have font-weight: bold; applied also
		return w(createTabPanel, { extraClasses: myExtras });
	}
}
```

##### Applying Fixed Classes

The `this.classes` function returns a chained `fixed` function that can be used to set non-themeable classes on a node. This allows a widget author to apply classes to a widget that cannot be overridden.

``` ts
import { WidgetProperties } from '@dojo/widget-core/interfaces';
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { ThemeableMixin, ThemeableProperties, theme } from '@dojo/widget-core/mixins/Themeable';
import * as baseClasses from './styles/tabpanel.css';

interface MyThemeableWidgetProperties extends WidgetProperties, ThemeableProperties;

@theme(baseClasses)
class MyThemeableWidget extends ThemeableMixin(WidgetBase)<MyThemeableWidgetProperties> {
	render: function () {
		const { root, tab } = baseClasses;
		return
			v(`ul`, { classes: this.classes(root) }, [
				v('li', { classes: this.classes().fixed(tab) }, [ 'tab1' ])
				// ...
			]);
	}
}
```

In the above example, the `root` class is still themeable, but the `tab` class is applied using `.fixed()` so it will not be themeable. The classes passed to `.fixed()` can be any string, and unlike the `.classes()` parameters, `fixed()` css classes do not need to originate from `baseClasses`.

#### Internationalization (i18n)

Widgets can be internationalized by mixing in `@dojo/widget-core/mixins/I18n`.
[Message bundles](https://github.com/dojo/i18n) are localized by passing them to `localizeBundle`.

If the bundle supports the widget's current locale, but those locale-specific messages have not yet been loaded, then the default messages are returned.
The widget will be invalidated once the locale-specific messages have been loaded.

Each widget can have its own locale by passing a property - `properties.locale`.
If no locale is set, then the default locale, as set by [`@dojo/i18n`](https://github.com/dojo/i18n), is assumed.

```ts
class I18nWidget extends I18nMixin(WidgetBase)<I18nWidgetProperties> {
	render: function () {
		// Load the "greetings" messages for the current locale. If the locale-specific
		// messages have not been loaded yet, then the default messages are returned,
		// and the widget will be invalidated once the locale-specific messages have
		// loaded.
		const messages = this.localizeBundle(greetingsBundle);

		return v('div', { title: messages.hello }, [
			w(createLabel, {
				// Passing a message string to a child widget.
				label: messages.purchaseItems
			}),
			w(createButton, {
				// Passing a formatted message string to a child widget.
				label: messages.format('itemCount', { count: 2 })
			})
		]);
	}
}
```

#### Web Components

Widgets can be turned into [Custom Elements](https://www.w3.org/TR/2016/WD-custom-elements-20161013/) with
minimal extra effort.

Just create a `CustomElementDescriptor` factory and use the `@dojo/cli` build tooling to do the rest of the work,

```ts
import { CustomElementDescriptor } from '@dojo/widget-core/customElements';
import MyWidget from './path/to/MyWidget';

export default function createCustomElement(): CustomElementDescriptor {
	return {
		tagName: 'my-widget',
		widgetConstructor: MyWidget,
	   	attributes: [
		   	{
			   	attributeName: 'label'
		   	}
	   	],
	   	events: [
		   	{
			   	propertyName: 'onChange',
			   	name: 'change'
		   	}
	   	]
   };
};
```

By convention, this file should be named `createMyWidgetElement.ts`.

To build your custom element, use [@dojo/cli](https://github.com/dojo/cli),

```bash
$ dojo build --element=/path/to/createMyWidget.ts
```

This will generate the following files:

* `dist/my-widget/my-widget.html` - HTML import file that includes all widget dependencies. This is the only file you need to import into your HTML page to use your widget.
* `dist/my-widget/my-widget.js` - A compiled version of your widget.
* `dist/my-widget/my-widget.css` - The CSS for your widget
* `dist/my-widget/widget-core.js` - A shared base widget library. Keeping this separate means that you can include HTML imports for multiple Dojo widgets and the applicartion environment will not re-request this shared file for each widget.

Using your widget would be a simple matter of importing the HTML import:

```html
<!DOCTYPE html>
<html>
	<head>
		<!-- this will include all JS and CSS used by your widget -->
		<link rel="import" href="/path/to/my-widget.html" />
	</head>
	<body>
		<!-- this will actually create your widget -->
		<my-widget></my-widget>
	</body>
</html>
```

##### Tag Name

Your widget will be registered with the browser using the provided tag name. The tag name **must** have a `-` in it.

##### Widget Constructor

A widget class that you want wrapped as a custom element.

##### Attributes

You can explicitly map widget properties to DOM node attributes with the `attributes` array.

```ts
{
    attributes: [
        {
            attributeName: 'label'
        },
        {
            attributeName: 'placeholder',
            propertyName: 'placeHolder'
        },
        {
            attributeName: 'delete-on-focus',
            propertyName: 'deleteOnFocus',
            value: value => Boolean(value || 0)
        }
    ]
}
```

* `attributeName` - the attribute that will set on the DOM element, e.g. `<text-widget label="test" />`.
* `propertyName` - the property on the widget to set; if not set, it defaults to the `attributeName`.
* `value` - specify a transformation function on the attribute value. This function should return the value that
will be set on the widget's property.

Adding an attribute to the element will also automatically add a corresponding property to the element.

```ts
// as an attribute
textWidget.setAttribute('label', 'First Name');

// as a property
textWidget.label = 'First Name';
```

##### Properties

You can map DOM element properties to widget properties,

```ts
{
    properties: [
        {
            propertyName: 'placeholder',
            widgetPropertyName: 'placeHolder'
        }
    ]
}

// ...

textWidget.placeholder = 'Enter first name';
```

* `propertyName` - name of the property on the DOM element
* `widgetPropertyName` - name of the property on the widget; if unspecified, `propertyName` is used instead
* `getValue` - if specified, will be called with the widget's property value as an argument. The returned value is returned as the DOM element property value.
* `setValue` - if specified, is called with the DOM elements property value. The returned value is used for the widget property's value.

##### Events

Some widgets have function properties, like events, that need to be exposed to your element. You can use the
`events` array to map widget properties to DOM events.

```ts
{
    events: [
        {
            propertyName: 'onChange',
            eventName: 'change'
        }
    ]
}
```

This will add a property to `onChange` that will emit the `change` custom event. You can listen like any other
DOM event,

```ts
textWidget.addEventListener('change', function (event) {
    // do something
});
```

##### Initialization

Custom logic can be performed after properties/attributes have been defined but before the projector is created. This
allows you full control over your widget, allowing you to add custom properties, event handlers, work with child nodes, etc.
The initialization function is run from the context of the HTML element.

```ts
{
    initialization(properties) {
        const footer = this.getElementsByTagName('footer');
        if (footer) {
            properties.footer = footer;
        }

        const header = this.getElementsByTagName('header');
        if (header) {
            properties.header = header;
        }
    }
}
```

It should be noted that children nodes are removed from the DOM when widget instantiation occurs, and added as children
to the widget instance.

### Key Principles

These are some of the **important** principles to keep in mind when creating and using widgets:

1. The widget's *`__render__`*, *`__setProperties__`*, *`__setChildren__`* functions should **never** be called or overridden
2. Except for projectors, you should **never** need to deal directly with widget instances
3. Hyperscript should **always** be written using the @dojo/widget-core `v` helper function
4. **Never** set state outside of a widget instance
5. **Never** update `properties` within a widget instance

### API

[API Documentation](http://dojo.io/api/widget-core/v2.0.0-alpha.28/)

## How Do I Contribute?

We appreciate your interest!  Please see the [Dojo Meta Repository](https://github.com/dojo/meta#readme) for the
Contributing Guidelines and Style Guide.

### Installation

To start working with this package, clone the repository and run `npm install`.

In order to build the project, run `grunt dev` or `grunt dist`.

### Testing

Test cases MUST be written using [Intern](https://theintern.github.io) using the Object test interface and Assert assertion interface.

90% branch coverage MUST be provided for all code submitted to this repository, as reported by Istanbul’s combined coverage results for all supported platforms.

To test locally in node run:

`grunt test`

To test against browsers with a local selenium server run:

`grunt test:local`

To test against BrowserStack or Sauce Labs run:

`grunt test:browserstack`

or

`grunt test:saucelabs`

## Licensing Information

© 2017 [JS Foundation](https://js.foundation/). [New BSD](http://opensource.org/licenses/BSD-3-Clause) license.
