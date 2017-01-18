# @dojo/widgets

[![Build Status](https://travis-ci.org/dojo/widgets.svg?branch=master)](https://travis-ci.org/dojo/widgets)
[![codecov](https://codecov.io/gh/dojo/widgets/branch/master/graph/badge.svg)](https://codecov.io/gh/dojo/widgets)
[![npm version](https://badge.fury.io/js/%40dojo%2Fwidgets.svg)](https://badge.fury.io/js/%40dojo%2Fwidgets)

Provides Dojo 2 core widget and mixin functionality for creating custom widgets. For Dojo 2 widgets please see [@dojo/widgets](https://github.com/dojo/widgets).

**WARNING** This is *alpha* software. It is not yet production ready, so you should use at your own risk.

- [Usage](#usage)
- [Features](#features)
    - [Overview](#overview)
    	- [`v` & `w`](#v--w)
    	- [createWidgetBase](#createwidgetbase)
    	- [Properties Lifecycle](#properties-lifecycle)
    	- [Projector](#projector)
    	- [Event Handling](#event-handling)
    	- [Widget Registry](#widget-registry)
    	- [Theming](#theming)
    	- [Internationalization](#internationalization)
    - [Key Principles](#key-principles)
    - [Examples](#examples)
    	- [Sample Label Widget](sample-label-widget)
    	- [Sample List Widget](sample-list-widget)
    - [API](#api)
- [How Do I Contribute?](#how-do-i-contribute)
    - [Installation](#installation)
    - [Testing](#testing)
- [Licensing Information](#licensing-information)

## Usage

To use @dojo/widgets install the package along with the required peer dependencies.

```shell
npm install @dojo/widgets

# peer dependencies
npm install @dojo/has
npm install @dojo/shim
npm install @dojo/core
npm install @dojo/compose
npm install @dojo/i18n
npm install maquette
```

Use the [@dojo/cli](https://github.com/dojo/cli) to create a complete Dojo 2 skeleton application with the [@dojo/cli-create-app](https://github.com/dojo/cli-create-app) command.

## Features

Dojo 2 widgets are built using the [@dojo/compose](https://github.com/dojo/compose) composition library that promotes traits and mixins over inheritence.

The smallest `@dojo/widgets` example looks like this:

```ts
const createMyWidget = createWidgetBase.extend({
	tagName: 'h1',
	nodeAttributes: [
		function() {
			return { innerHTML: 'Hello, Dojo!' };
		}
	]
});

createMyWidget.mixin(createProjectorMixin)().append();
```

It renders a `h1` element saying "Hello, Dojo!" on the page.

### Overview

Dojo 2 widgets is designed using key reactive architecture concepts. These include unidirectional data flow, inversion of control and property passing.

<!-- needs more details-->

#### `v` & `w`

`v` & `w` are abstractions used to express structures that will be reflected in the DOM. `v` is used to create nodes that represent DOM tags, for example `div`, `header` etc. and allows Dojo 2 to manage lazy hyperscript creation and element caching. `w` is used to create Dojo or custom widget nodes enabling support for lazy widget instantiation, instance management and caching.

```ts
import { v, w } from '@dojo/widgets/d';
```

The argument and return types are available from `@dojo/widgets/interfaces` as follows:

```ts
import { DNode, HNode, WNode } from '@dojo/widgets/interfaces';
```

##### `v`

Creates an element with the specified `tag`

```ts
v(tag: string): HNode[];
```

where `tag` is in the form: element.className(s)#id, e.g.

h2
h2.foo
h2.foo.bar
h2.foo.bar#baz
h2#baz

`classNames` should be delimited by a period (`.`). **Please note**, both the `classes` and `id` portions of the `tag` are optional.

The results of the invocations above are:

```
h2                  (<h2></h2>)
h2.foo              (<h2 class="foo"></h2>)
h2.foo.bar          (<h2 class="foo bar"></h2>)
h2.foo.bar#baz      (<h2 class="foo bar" id="baz"></h2>)
h2#baz              (<h2 id="baz"></h2>)
```

Renders an element with the `tag` and `children`.

```ts
v(tag: string, children: (DNode | null)[]): HNode[];
```

Renders an element with the `tag`, `properties` and `children`.

```ts
v(tag: string, properties: VNodeProperties, children?: (DNode | null)[]): HNode[];
```

##### `w`

Creates a widget using the `factory` and `properties`.

```ts
w<P extends WidgetProperties>(factory: string | WidgetFactory<Widget<P>, P>, properties: P): WNode[];
```

Creates a widget using the `factory`, `properties` and `children`

```ts
w<P extends WidgetProperties>(factory: string | WidgetFactory<Widget<P>, P>, properties: P, children: (DNode | null)[]): WNode[];
```
Example `w` constructs:

```ts
w(createFactory, properties);
w(createFactory, properties, children);

w('my-factory', properties);
w('my-factory', properties, children);
```

#### `createWidgetBase`

The class `createWidgetBase` provides key base functionality including caching and widget lifecycle management which **all** widgets should extend from.

##### Pubic API

|Function|Description|Default Behaviour|
|---|---|---|
|getNode|Returns the top level node of a widget|Returns a `HNode` with the widgets `tagName`, the result of `this.getNodeAttributes` and `this.children`|
|getChildrenNodes|Returns the child node structure of a widget|Returns the widgets children `DNode` array|
|nodeAttributes|An array of functions that return VNodeProperties to be applied to the top level node|Returns attributes for `data-widget-id`, `classes` and `styles` using the widget's specified `properties` (`id`, `classes`, `styles`) at the time of render|
|diffProperties|Diffs the current properties against the previous properties and returns an object with the changed keys and new properties|Performs a shallow comparison previous and current properties, copies the properties using `Object.assign` and returns the resulting `PropertiesChangeRecord`.|

##### Events

`properties:changed` - The event is emitted when `dffProperties` detected changed keys. The event can be attached to by any extending widget.

*Attaching*

```ts
this.on('properties:changed', (evt: PropertiesChangedEvent<MyWidget, MyProperties>) {
	// do something
});
```

*Example Payload*

```ts
{
	type: 'properties:changed',
	target: this,
	properties: { foo: 'bar', baz: 'qux' },
	changedKeyValues: [ 'foo' ]
}
```

#### Properties Lifecycle

Properties are passed to the `w` function and represent the public API for a widget. The properties lifecycle occurs as the properties that are passed are `set` onto a widget, this is prior to the widgets render cycle.

The property lifecyle is performed in the widgets `setProperties` function and uses the instances' `diffProperties` function to determine whether any of the properties have changed since the last render. By default `diffProperties` provides a shallow comparison of the previous properties and new properties. 

**Note** If a widgets properties contain complex data structures, the `diffProperties` function will need to be overridden to prevent returning incorrect changed properties.

The `diffProperties` function is also responsible for creating a copy (the default implementation uses`Object.assign({}, newProperties)` of all changed properties to the depth that is considered during the equality comparison.

When `diffProperties` has completed the results are used to update the properties on the widget instance and if changed properties were returned then the `properties:changed` event is emitted. Finally once all the attached events have been processed the lifecycle is complete and the finalized widget properties are available during the render cycle functions.

##### Finer property diff control

Included in `createWidgetBase` is functionality to support targetting a specific property with a custom comparison function. This is done by adding a function to the widget class with `diffProperty` prefixed to the property name e.g. `diffPropertyFoo`.

```ts

const createMyWidget = createWidgetBase.mixin({
	mixin: {
		diffPropertyFoo(this: MyWidget, previousProperty: MyComplexObject, newProperty: MyComplexObject) {
			// can perfom complex comparison logic here between the two property values
			// or even use externally stored state to assist the comparison.
		}
	}
});
```

If a property has a custom diff function then it is excluded from the normal catch all `diffProperties` implementation.

#### Projector

Projector is a term used to describe a widget that will be attached to a DOM element, also known as a root widget. Any widget can be converted into a projector simply by mixing in the `createProjectorMixin` mixin.

```ts
createMyWidget.mixin(createProjectorMixin)
```

Projectors operate as any widget **except** that they need to be manually instantiated and managed outside of the standard widget lifecycle. 

There are 3 ways that a projector widget can be added to the DOM - `.append`, `.merge` or `.replace` depending on the type of attachment required.

 - append  - Creates the widget as a child to the projector's `root` node
 - merge   - Merges the widget with the projector's `root` node
 - replace - Replace the projector's `root` node with the widget

```ts
const createWidgetProjector = createMyWidget.mixin(createProjectorMixin);

createWidgetProjector().append(() => {
	// appended
});
```

#### Event Handling

The recommended pattern for event listeners is to declare them on the widget class, referencing the function using `this`, most commonly within `getChildrenNodes` or a `nodeAttributes` function.

Event listeners can be internal logic encapsulated within a widget or delegate to a function passed via `properties`. For convenience event listeners are automatically bound to the scope of their enclosing widget.

*internally defined handler*

```ts
const createMyWidget: MyWidgetFactory = createWidgetBase.mixin({
	mixin: {
		onClick: function (this: MyWidget): void {
			this.setState(!this.state.selected);
		},
		getChildrenNodes(this: MyWidget): DNode[] {
			const { state: { selected } } = this;
			
			return [
				v('input', { type: 'checkbox', onclick: this.onClick }),
				v('input', { type: 'text', disabled: this.state.selected })
			];
		}
	}
});
```

*Handler passed via properties*

```ts
const createMyWidget: MyWidgetFactory = createWidgetBase.mixin({
	mixin: {
		onClick: function (this: MyWidget): void {
			this.properties.mySpecialFunction();
		}
		...
	}
});
```

*Binding a function passed to child widget*

```ts
import { specialClick } from './mySpecialFunctions';

const createMyWidget: MyWidgetFactory = createWidgetBase.mixin({
	mixin: {
		getChildrenNodes(this: MyWidget): DNode[] {
			const { properties: { specialClick } } = this;
			return [
				w(createChildWidget, { onClick: specialClick.bind(this) })
			]
		}
	}
});
```

#### Widget Registry

The registry provides the ability to define a label against a `WidgetFactory`, a `Promise<WidgetFactory>` or a function that when executed returns a `Promise<WidgetFactory>`.

A global widget registry is exported from the `d.ts` class.

```ts
import { registry } from '@dojo/widgets/d';
import createMyWidget from './createMyWidget';

// registers the widget factory that will be available immediately
registry.define('my-widget-1', createMyWidget);

// registers a promise that is resolving to a widget factory and will be
// available as soon as the promise resolves.
registry.define('my-widget-2', Promise.resolve(createMyWidget));

// registers a function that will be lazily executed the first time the factory
// label is used within a widget render pipeline. The widget will be available
// as soon as the promise is resolved after the initial get.
registry.define('my-widget-3', () => Promise.resolve(createMyWidget));
```

It's recommended to use the factory registry when defining widgets with [`w`](#w--d) to support lazy factory resolution. 

Example of registering a function that returns a `Promise` that resolves to a `Factory`.

```ts
import load from '@dojo/core/load';

registry.define('my-widget', () => {
	return load(require, './createMyWidget')
		.then(([ createMyWidget ]) => createMyWidget.default);
});
```

#### Theming

// talk about the css and theming support

#### Internationalization

Widgets can be internationalized by mixing in `@dojo/widgets/mixins/createI18nMixin`. [Message bundles](https://github.com/dojo/i18n) are localized by passing them to `localizeBundle`. If the bundle supports the widget's current locale, but those locale-specific messages have not yet been loaded, then the default messages are returned and the widget will be invalidated once the locale-specific messages have been loaded. Each widget can have its own locale by setting its `state.locale`; if no locale is set, then the default locale as set by [`@dojo/i18n`](https://github.com/dojo/i18n) is assumed.

```ts
const createI18nWidget = createWidgetBase
	.mixin(createI18nMixin)
	.mixin({
		mixin: {
			nodeAttributes: [
				function (attributes: VNodeProperties): VNodeProperties {
					// Load the `greetings` messages for the current locale.
					const messages = this.localizeBundle(greetings);
					return { title: messages.hello };
				}
			],

			getChildrenNodes: function () {
				// Load the "greetings" messages for the current locale. If the locale-specific
				// messages have not been loaded yet, then the default messages are returned,
				// and the widget will be invalidated once the locale-specific messages have
				// loaded.
				const messages = this.localizeBundle(greetingsBundle);

				return [
					w(createLabel, {
						// Passing a message string to a child widget.						label: messages.purchaseItems
					}),
					w(createButton, {
						// Passing a formatted message string to a child widget.
						label: messages.format('itemCount', { count: 2 })
					})
				];
			}
		}
	});

const widget = createI18nWidget({
	// Set the locale for the widget and all of its children. Any child can
	// still set its own locale.
	locale: 'fr'
});
```

### Key Principles

These are some of the **important** principles to keep in mind when creating and using widgets:
 
1. the widget *`__render__`* function should **never** be overridden
2. except for projectors you should **never** need to deal directly with widget instances.
3. hyperscript should **always** be written using the @dojo/widgets `v` helper function.
4. **never** set state outside of a widget instance.
5. **never** update `properties` within a widget instance.

### Examples

#### Sample Label Widget

A simple widget with no children such as a `label` widget can be created like this:

```ts
import { VNodeProperties } from '@dojo/interfaces/vdom';
import { Widget, WidgetFactory, WidgetProperties } from '@dojo/widgets/interfaces';
import createWidgetBase from '@dojo/widgets/createWidgetBase';

export interface LabelProperties extends WidgetProperties {
    content: string;
}

export type Label = Widget<LabelProperties>

export interface LabelFactory extends WidgetFactory<Label, LabelProperties> {}

const createLabelWidget: LabelFactory = createWidgetBase.mixin({
    mixin: {
        tagName: 'label',
        nodeAttributes: [
            function(this: Label): VNodeProperties {
                return { innerHTML: this.properties.content };
            }
        ]
    }
});

export default createLabelWidget;
```

#### Sample List Widget

To create structured widgets override the `getChildrenNodes` function.

```ts
import { DNode, Widget, WidgetFactory, WidgetProperties } from '@dojo/widgets/interfaces';
import createWidgetBase from '@dojo/widgets/createWidgetBase';
import { v } from '@dojo/widgets/d';

export interface ListItem {
    name: string;
}

export interface ListProperties extends WidgetProperties {
    items?: ListItem[];
}

export type List = Widget<ListProperties>;

export interface ListFactory extends WidgetFactory<List, ListProperties> {}

function isEven(value: number) {
    return value % 2 === 0;
}

function listItem(item: ListItem, itemNumber: number): DNode {
    const classes = isEven(itemNumber) ? {} : { 'odd-row': true };
    return v('li', { innerHTML: item.name, classes });
}

const createListWidget: ListFactory = createWidgetBase.mixin({
	mixin: {
		getChildrenNodes: function (this: List): DNode[] {
			const { properties: { items = [] } } = this;
			const listItems = items.map(listItem);

			return [ v('ul', listItems) ];
		}
	}
});

export default createListWidget;
```

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

© 2016 [JS Foundation](https://js.foundation/). [New BSD](http://opensource.org/licenses/BSD-3-Clause) license.
