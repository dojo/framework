# @dojo/widget-core

[![Build Status](https://travis-ci.org/dojo/widget-core.svg?branch=master)](https://travis-ci.org/dojo/widget-core)
[![codecov](https://codecov.io/gh/dojo/widget-core/branch/master/graph/badge.svg)](https://codecov.io/gh/dojo/widget-core)
[![npm version](https://badge.fury.io/js/%40dojo%2Fwidget-core.svg)](https://badge.fury.io/js/%40dojo%2Fwidget-core)

This repo provides users with the ability to write their own Dojo 2 widgets.

We also provide a suite of pre-built widgets to use in your applications: [(@dojo/widgets)](https://github.com/dojo/widgets).

**WARNING** This is *alpha* software. It is not yet production ready, so you should use at your own risk.

- [Usage](#usage)
- [Features](#features)
    - [Overview](#overview)
    - [`v` & `w`](#v--w)
        - [`v`](#v)
        - [`w`](#w)
    - [Writing custom widgets](#writing-custom-widgets)
        - [Public API](#public-api)
        - [The 'properties' lifecycle](#the-properties-lifecycle)
            - [Custom property diff control](#custom-property-diff-control)
            - [The `properties:changed` event](#the-propertieschanged-event)
        - [Projector](#projector)
        - [Event Handling](#event-handling)
        - [Widget Registry](#widget-registry)
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
npm install @dojo/compose
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
       return v('h1', { innerHTML: 'Hello, Dojo!' });
	}
}

const Projector = ProjectorMixin(MyWidget);
const projector = new Projector({});

projector.append(root);
```

This code renders a `h1` element onto the page, that says "Hello, Dojo!".

### Overview

All widgets in Dojo 2 are designed using key reactive architecture concepts.
These concepts include unidirectional data flow, inversion of control and property passing.

Dojo 2's widget-core is built with Typescript, leveraging Class mixins to construct and manipulate traits and mixins.

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

where `tag` is in the form: element.className(s)#id, e.g.

```
h2                  (produces <h2></h2>)
h2.foo              (produces <h2 class="foo"></h2>)
h2.foo.bar          (produces <h2 class="foo bar"></h2>)
h2.foo.bar#baz      (produces <h2 class="foo bar" id="baz"></h2>)
h2#baz              (produces <h2 id="baz"></h2>)
```

`classNames` should be delimited by a period (`.`).

**Please note**, both the `classes` and `id` portions of the `tag` are optional.


The following code renders an element with the `tag` and `children`.

```ts
v(tag: string, children: (DNode | null)[]): HNode[];
```

The following code renders an element with the `tag`, `properties` and `children`.

```ts
v(tag: string, properties: VirtualDomProperties, children?: (DNode | null)[]): HNode[];
```

As well as interacting with the VDOM by passing it HyperScript, you can also pass it Dojo 2 Widgets or Custom Widgets using the `w` function.

#### `w`

The following code creates a widget using the `widgetConstructor` and `properties`.

```ts
w<P extends WidgetProperties>(widgetConstructor: string | WidgetBaseConstructor<P>, properties: P): WNode[];
```

The following code creates a widget using the `widgetConstructor`, `properties` and `children`

```ts
w<P extends WidgetProperties>(widgetConstructor: string | WidgetBaseConstructor<P>, properties: P, children: (DNode | null)[]): WNode[];
```
Example `w` constructs:

```ts
w(WidgetClass, properties);
w(WidgetClass, properties, children);

w('my-widget', properties);
w('my-widget', properties, children);
```

The example above that uses a string for the `widgetConstructor `, is taking advantage of our [widget registry](#widget-registry) functionality.
The widget registry allows you to lazy instantiate widgets.

### Writing Custom Widgets

The `WidgetBase` class provides the functionality needed to create Custom Widgets.
This functionality includes caching and widget lifecycle management.

The `WidgetBase` class is available from the `@dojo/widget-core/WidgetBase ` package.

```ts
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
```

**All** widgets should extend from this class.

#### Public API

|Function|Description|Default Behaviour|
|---|---|---|
|render|Returns the DNode structure of the widget|Returns a `div` HNode with children of `this.children`.
|diffProperties|Diffs the current properties against the previous properties and returns an object with the changed keys and new properties|Performs a shallow comparison previous and current properties, copies the properties using `Object.assign` and returns the resulting `PropertiesChangeRecord`.|

#### The 'properties' lifecycle

The widget's properties lifecycle occurs before its render lifecycle.

Properties passed to the `w` function represent the public API for a widget.

The properties lifecycle starts when properties are passed to the widget.
The properties lifecycle is performed in the widgets `setProperties` function.
This function uses the widget instance's `diffProperties` function to determine whether any of the properties have changed since the last render cycle.
By default `diffProperties` provides a shallow comparison of the previous properties and new properties.

The `diffProperties` function is also responsible for creating a copy (the default implementation uses`Object.assign({}, newProperties)` of all changed properties.
The depth of the returned diff is equal to the depth used during the equality comparison.

<!-- add example of 'depth' -->

**Note** If a widget's properties contain complex data structures that you need to diff, then the `diffProperties` function will need to be overridden.

##### Custom property diff control

Included in `WidgetBase` is functionality to support targeting a specific property with a custom comparison function using a decorator `diffProperty`. For non-decorator environments the functions need to be registered in the constructor using the `addDecorator` API with `diffProperty` as the key.

e.g. for a property `foo` you would add a function to the widget class and either use the decorator function or register the decorator in the `constructor`.

*using the `diffProperty` decorator*

```ts
class MyWidget extends WidgetBase<WidgetProperties> {

	@diffProperty('foo')
	myComplexDiffFunction(previousProperty: MyComplexObject, newProperty: MyComplexObject) {
			// can perfom complex comparison logic here between the two property values
			// or even use externally stored state to assist the comparison
	}
}
```

*registering the `diffProperty` function in the constructor*

```ts
class MyWidget extends WidgetBase<WidgetProperties> {

	constructor() {
		super();
		this.addDecorator('diffProperty', { propertyName: 'foo', diffFunction: this.customFooDiff });
	}

	customFooDiff(previousProperty: MyComplexObject, newProperty: MyComplexObject) {
	}
}
```

If a property has a custom diff function then that property is excluded from those passed to the `diffProperties` function.

##### The 'properties:changed' event

When `diffProperties` has completed, the results are used to update the properties on the widget instance.
If any properties were changed, then the `properties:changed` event is emitted.

Attaching a listener to the event is exposed via a decorator `@onPropertiesChanged`.

*using the `onPropertiesChanged ` decorator*

```ts
class MyWidget extends WidgetBase<WidgetProperties> {

	@onPropertiesChanged
	myPropChangedListener(evt: PropertiesChangeEvent<this, WidgetProperties>) {
		// do something
	}
}
```

*registering the `onPropertiesChanged ` function in the constructor*

```ts
class MyWidget extends WidgetBase<WidgetProperties> {

	constructor() {
		super();
		this.addDecorator('onPropertiesChanged', this.myPropChangedListener)
	}

	myPropChangedListener(evt: PropertiesChangeEvent<this, WidgetProperties>) {
		// do something
	}
}
```

*Example event payload*

```ts
{
	type: 'properties:changed',
	target: this,
	properties: { foo: 'bar', baz: 'qux' },
	changedKeyValues: [ 'foo' ]
}
```

Finally once all the attached events have been processed, the properties lifecycle is complete and the finalized widget properties are available during the render cycle functions.

<!-- render lifecycle goes here -->

##### AfterRender

Occassionally in a mixin or base widget class it my be required to provide logic that needs to be executed using the result of a widgets `render`. `WidgetBase` supports registering functions that opererate as an after aspect to the `render` function using a provided decorator `afterRender` or in non decorator environments using the `addDecorator` API with `afterRender` as the key.

*Using the `afterRender` decorator*

```ts
class MyBaseClass extends WidgetBase<WidgetProperties> {
	@afterRender
	myAfterRender(result: DNode): DNode {
		// do something with the result
		return result;
	}
}
```

*Using the `addDecorator` API*

```ts
class MyBaseClass extends WidgetBase<WidgetProperties> {
	constructor() {
		super();
		this.addDecorator('afterRender', this.myOtherAfterRender);
	}

	myOtherAfterRender(result: DNode): DNode {
		// do something with the result
		return result;
	}
}
```

***Note:*** `afterRender` functions are executed in the order that they are specified from the super class up to the final class. Usage of the `afterRender` decorator and `addDecorator` API should not be mixed.

#### Projector

Projector is a term used to describe a widget that will be attached to a DOM element, also known as a root widget.
Any widget can be converted into a projector simply by mixing in the `ProjectMixin` mixin.

```ts
const MyProjector = ProjectorMixin(MyWidget);
```

Projectors behave in the same way as any other widget **except** that they need to be manually instantiated and managed outside of the standard widget lifecycle.

There are 3 ways that a projector widget can be added to the DOM - `.append`, `.merge` or `.replace`, depending on the type of attachment required.

 - append  - Creates the widget as a child to the projector's `root` node
 - merge   - Merges the widget with the projector's `root` node
 - replace - Replace the projector's `root` node with the widget

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
	onClick: function (): void {
		this.properties.mySpecialFunction();
	}
}
```

*Binding a function passed to child widget*

```ts
import { specialClick } from './mySpecialFunctions';

class MyWidget extends WidgetBase<WidgetProperties> {
	render() {
		return	w(createChildWidget, { onClick: specialClick });
	}
}
```

#### Widget Registry

The registry provides the ability to define a label against a `WidgetRegistryItem`. A `WidgetRegistryItem` is either a `WidgetConstructor` a `Promise<WidgetConstructor>` or a function that when executed returns a `Promise<WidgetConstructor>`.

A global widget registry is exported from the `d.ts` class.

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

#### Theming

##### Overview

Widgets are themed using `css-modules` and the `Themeable` mixin. Each widget must implement a .css file that contains all the css classes that will be used to style it. The baseClasses object is the css API for the Widget: baseClasses css classes can be overridden by external themes. Further customisation of specific Custom Widget classes can be achieved by passing overrideClasses into the widget.
The `Themeable` mixin provides a `classes` function that controls the classes to be applied to each node. Classes from the base `css` object passed to the `classes` function can be themed and overridden. To create fixed classes that cannot be changed the chained `fixed` function can be used.

##### Authoring a baseTheme

A base theme is authored using `css-modules` and `cssnext`. The baseTheme `css` file should be located in a `styles` folder within the Widget's package directory.
The `typed-css-modules` [cli](https://github.com/Quramy/typed-css-modules#cli) should be used in `watch` mode in order to generate typings for typescript usage.

```
tabPanel
├── createTabPanel.ts
└── styles
    └── tabPanel.css
```

The `baseClasses` css must contain a complete set of all of the classes you wish to apply to a widget as all theme and override classes are limited by the classnames made available here.
Classnames are locally scoped as part of the build. A theme `key` is generated at build time to located each classes themes when a theme is set.

```  css
/* tabpanel.css */
.root {
	background: red;
}

.tab {
	background: blue;
}
```

##### Registering baseClasses

To apply baseClasses a widget must use `ThemeableMixin` and the `theme` decorator from `mixins/Themeable` to register the base classes.

```typescript
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

``` typescript
import { WidgetProperties } from '@dojo/widget-core/interfaces';
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { ThemeableMixin, ThemeableMixinProperties, theme } from '@dojo/widget-core/mixins/Themeable';
import * as baseClasses from './styles/tabpanel.css';

interface MyThemeableWidgetProperties extends WidgetProperties, ThemeableMixinProperties;

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

##### Applying a theme

Themeable widgets include an optional `theme` property which can be set to pass in a theme. Theme classes will override `baseClasses`. When a `theme` property is set or changed, the widgets `theme` classes will be regenerated and the widget invalidated such that it is redrawn. Themes are used to apply consistent styling across the widget code base.

Usage Extending on the previous `tabPanel` example.

``` css
/* customTheme/tabPanel.css */
.tabs {
	background: green;
}
```

Import the theme and pass it to the widget via it's `properties`. The theme classes will be automatically mixed into the widget and available via `this.classes`.

```typescript
import * as customTheme from './themes/customTheme.css';

interface MyThemeableWidgetProperties extends WidgetProperties, ThemeableMixinProperties;

class MyThemeableWidget extends ThemeableMixin(WidgetBase)<MyThemeableWidgetProperties> {
	render: function () {
		// Resulting widget will have green tabs instead of baseTheme red.
		return w(createTabPanel, { theme: customTheme });
	}
}
```

The theme can be applied to individual widgets or to a project and prop passed down to it's children.

##### Overriding theme classes

As we are using `css-modules` to scope widget css classes, the generated class names cannot be used to target specific nodes and apply custom styling to them. Instead you must use the `overrideClasses` property to pass your generated classes to the widget. This will only effect one instance of a widget and will be applied on top of, rather than instead of theme classes.

``` css
/* tabPanelOverrides.css */
.tabs {
	font-weight: bold;
}
```

```typescript
import * as myOverrides from './overrides/myOverrides.css';

interface MyThemeableWidgetProperties extends WidgetProperties, ThemeableMixinProperties;

class MyThemeableWidget extends ThemeableMixin(WidgetBase)<MyThemeableWidgetProperties> {
	render: function () {
		// Resulting widget will still have baseTheme red tabs,
		// but will have font-weight: bold; applied also
		return w(createTabPanel, { overrideClasses: myOverrides });
	}
}
```

##### Applying fixed classes

The `this.classes` function returns a chained `fixed` function that can be used to set non-themeable classes on a node. This allows a widget author to apply classes to a widget that cannot be overridden.

``` typescript
import { WidgetProperties } from '@dojo/widget-core/interfaces';
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { ThemeableMixin, ThemeableMixinProperties, theme } from '@dojo/widget-core/mixins/Themeable';
import * as baseClasses from './styles/tabpanel.css';

interface MyThemeableWidgetProperties extends WidgetProperties, ThemeableMixinProperties;

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

In the above example, the `root` class is still themeable, but the `tab` class is applied using `.fixed()` so it will not be themeable. The classes passed to `.fixed()` can be any string and do not need to originate from `baseClasses` like the `.classes()` parameters must do.

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
				// Passing a message string to a child widget.				label: messages.purchaseItems
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

Just create a `CustomElementDescriptor` factory and use the build tooling to do the rest of the work,

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

To build your custom element, use [dojo cli](https://github.com/dojo/cli),

```bash
$ dojo build --element=/path/to/createMyWidget.ts
```

This will generate the following files,

* `dist/my-widget/my-widget.html` - HTML import file that includes all widget dependencies. This is the only file you need to import into your HTML page to use your widget.
* `dist/my-widget/my-widget.js` - A compiled version of your widget.
* `dist/my-widget/my-widget.css` - The CSS for your widget
* `dist/my-widget/widget-core.js` - A shared base widget library. Keeping this separate means that you can include multiple HTML imports and the browser will not re-request this shared file.

Using your widget would be a simple matter of importing the HTML import,

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

* `attributeName` refers to the attribute that will set on the DOM element, so, `<text-widget label="test" />`.
* `propertyName` refers to the property on the widget to set, and if not set, defaults to the `attributeName`.
* `value` lets you specify a transformation function on the attribute value. This function should return the value that
will be set on the widget's property.

Adding an attribute to the element will automatically add a corresponding property to the element as well.

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

* `propertyName` is the name of the property on the DOM element
* `widgetPropertyName` is the name of the property on the widget. If unspecified, `propertyName` is used instead.
* `getValue`, if specified, will be called with the widget's property value as an argument. The returned value is returned as the DOM element property value.
* `setValue`, if specified, is called with the DOM elements property value. The returned value is used for the widget property's value.

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

It should be noted that children nodes are removed from the DOM when widget instantiation happens, and added as children
to the widget instance.

### Key Principles

These are some of the **important** principles to keep in mind when creating and using widgets:

1. the widget *`__render__`* function should **never** be overridden
2. except for projectors you should **never** need to deal directly with widget instances.
3. hyperscript should **always** be written using the @dojo/widget-core `v` helper function.
4. **never** set state outside of a widget instance.
5. **never** update `properties` within a widget instance.

### API

// add link to generated API docs.

## How Do I Contribute?

We appreciate your interest!  Please see the [Dojo Meta Repository](https://github.com/dojo/meta#readme) for the
Contributing Guidelines and Style Guide.

### Installation

To start working with this package, clone the repository and run `npm install`.

In order to build the project run `grunt dev` or `grunt dist`.

### Testing

Test cases MUST be written using [Intern](https://theintern.github.io) using the Object test interface and Assert assertion interface.

90% branch coverage MUST be provided for all code submitted to this repository, as reported by istanbul’s combined coverage results for all supported platforms.

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
