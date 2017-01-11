# dojo-widgets

[![Build Status](https://travis-ci.org/dojo/widgets.svg?branch=master)](https://travis-ci.org/dojo/widgets)
[![codecov](https://codecov.io/gh/dojo/widgets/branch/master/graph/badge.svg)](https://codecov.io/gh/dojo/widgets)
[![npm version](https://badge.fury.io/js/dojo-widgets.svg)](http://badge.fury.io/js/dojo-widgets)

A core widget library for Dojo.

**WARNING** This is *alpha* software. It is not yet production ready, so you should use at your own risk.

For more background on dojo-widgets, there is a document describing the [widgeting system](https://github.com/dojo/meta/blob/master/documents/Widget-System.md).

- [Usage](#usage)
- [Features](#features)
    - [Widget Principles](#principles)
    - [Base Widget](#base-widget)
    	- [Simple Widgets](#simple-widgets)
    	- [d](#d)
    	- [Widgets with Children](#widgets-with-children)
    - [Authoring Widgets](#authoring-widgets)
    - [Event Handlers](#event-handlers)
    - [Projector](#projector)
    - [Internationalization](#internationalization)
    - [Dojo Widget Components](#dojo-widget-components)
- [How Do I Contribute?](#how-do-i-contribute)
    - [Installation](#installation)
    - [Testing](#testing)
- [Licensing Information](#licensing-information)

## Usage

To use dojo-widgets in a project install the package along with the required peer dependencies.

```shell
npm install dojo-widgets

# peer dependencies
npm install dojo-has
npm install dojo-shim
npm install dojo-core
npm install dojo-compose
```

To use dojo-widgets, import the module in the project. For more details see [features](#features) below.

```ts
import createButton from 'dojo-widgets/components/button/createButton';
```

or use the [dojo cli](https://github.com/dojo/cli-create-app) to create a complete Dojo skeleton application.

## Features

dojo-widgets are based on a virtual DOM implementation named [Maquette](http://maquettejs.org/) as well as some foundational classes
provided in [dojo-compose](https://github.com/dojo/compose).

The smallest `dojo-widgets` example looks like this:

```ts
const projector = createProjector();
projector.children = [ v('h1', [ 'Hello, Dojo!' ]) ];
projector.append();
```

It renders a `h1` element saying "Hello, Dojo!" on the page. See the following sections for more details.

### Principles

These are some of the **important** principles to keep in mind when developing widgets:
 
1. the widget *render* function should **never** be overridden
2. with the exception of the top level projector you should **never** have to deal with widget instances.
3. hyperscript should **always** be written using the dojo-widgets `v` helper function.
4. `state` should **never** be set outside of the widget instance.

### Base Widget

The class `createWidgetBase` provides all base dojo-widgets functionality including caching and widget lifecycle management. It can be used directly or extended to create custom widgets.

#### Widget API

A subset of the `Widget` API are intended to be overridden in scenarios where the default implemented behviour does not suffice.

|Function|Description|Default Behaviour|
|---|---|---|
|getNode|Returns the top level node of a widget|Returns a `DNode` with the widgets `tagName`, the result of `this.getNodeAttributes` and `this.children`|
|getChildrenNodes|Returns the child node structure of a widget|Returns the widgets children `DNode` array|
|nodeAttributes|An array of functions that return VNodeProperties to be applied to the top level node|Returns attributes for `data-widget-id`, `classes` and `styles` using the widget's specified `state` (`id`, `classes`, `styles`) at the time of render|
|diffProperties|Diffs the current properties against the previous properties and returns the updated/new keys in an array|Performs a shallow comparison using `===` of previous and current properties and returns an array of the keys.|
|applyChangedProperties|Gets called to apply updated/new properties|If there are updated properties they are directly set onto the widgets `state` using `setState`.|

To customise the widget an optional `options` argument can be provided with the following interface.

**Type**: `WidgetOptions<WidgetState, WidgetProperties>` - All properties are optional.

|Property|Type|Description|
|---|---|---|
|id|string|identifier for the widget|
|stateFrom|StoreObservablePatchable|Observable that provides state for the widget|
|listeners|EventedListenersMap|Map of listeners for to attach to the widget|
|tagName|string|Override the widgets tagname|
|properties|WidgetProperties|Props to be passed to the widget. These can be used to determine state internally|
|nodeAttributes|Function[]|An array of functions that return VNodeProperties to be applied to the VNode|

A widgets' `state` should **never** be directly set outside of the instance. In order to manipulate widget `state`, `properties` should be updated such as `widget.properties = { 'foo': 'bar' }` and then during the next render the new or updated properties are passed to `instance#applyChangedProperties`.

As a convenience, all event handlers are automatically bound to the widget instance, so state and other items on the instance can be easily accessed.

#### Simple Widgets

To create a basic widget `createWidgetBase` can be used directly by importing the class.

```ts
import createWidgetBase from 'dojo-widgets/createWidgetBase';

const myBasicWidget = createWidgetBase();
```

The widget creates the following DOM element:

```html
<div></div>
```
The following example demonstrates how `id`, `classes` and `styles` are applied to the generated DOM.

```ts
import createWidgetBase from 'dojo-widgets/createWidgetBase';

const myBasicWidget = createWidgetBase({
    properties: {
        id: 'my-widget',
        classes: [ 'class-a', 'class-b' ],
        styles: [ 'width:20px' ]
    }
});
```

The widget creates the following DOM element:

```html
<div data-widget-id="my-widget" class="class-a class-b" styles="width:20px"></div>
```
Alternatively state can be derived directly from an observable store passed via `stateFrom`. The following code will create the same DOM element as the above example.

```ts
const widgetStore = createObservableStore({
    data: [
        {
            id: 'my-widget',
            classes: [ 'class-a', 'class-b' ],
            styles: [ 'width:20px' ]
        }
    ]
});

const myBasicWidget = createWidgetBase({
    id: 'my-widget',
    stateFrom: widgetStore
});
```

#### `d`

`d` is the module that provides the functions and helper utilities that can be used to express widget structures within Dojo 2. This structure constructed of `DNode`s (`DNode` is the intersection type of `HNode` and `WNode`).

When creating custom widgets, you use the `v` and `w` functions from the `d` module.

It is imported by:

```ts
import { v, w } from 'dojo-widgets/d';
```

The argument and return types are available from `dojo-widgets/interfaces` as follows:

```ts
import { DNode, HNode, WNode } from 'dojo-widgets/interfaces';
```

##### `v`

`v` is an abstraction of Hyperscript that allows dojo 2 to manage caching and lazy creation.

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

`classNames` must be period (.) delimited if more than 1 class is specified.
Please note, both the `classes` and `id` portions of the `tag` are optional.

The results of the invocations above are:

```
h2                  (<h2></h2>)
h2.foo              (<h2 class="foo"></h2>)
h2.foo.bar          (<h2 class="foo bar"></h2>)
h2.foo.bar#baz      (<h2 class="foo bar" id="baz"></h2>)
h2#baz              (<h2 id="baz"></h2>)
```

Creates an element with the `tag` with the children specified by the array of `DNode`, `VNode`, `string` or `null` items.

```ts
v(tag: string, children: (DNode | null)[]): HNode[];
```
Creates an element with the `tagName` with `VNodeProperties` options and optional children specified by the array of `DNode`, `VNode`, `string` or `null` items.

```ts
v(tag: string, properties: VNodeProperties, children?: (DNode | null)[]): HNode[];
```

##### `registry`

The d module exports a global `registry` to be used to define a factory label against a `WidgetFactory`, `Promise<WidgetFactory>` or `() => Promise<WidgetFactory`.

This enables consumers to specify a `string` label when authoring widgets using the `w` function (see below) and allows the factory to resolve asyncronously (for example if the module had not been loaded).

```ts
import { registry } from 'dojo-widgets/d';
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

It is recommmended to use the factory registry when defining widgets using `w` in order to support lazy factory resolution when required. Example of registering a function that returns a `Promise` that resolves to a `Factory`.

```ts
import load from 'dojo-core/load';

registry.define('my-widget', () => {
	return load(require, './createMyWidget')
		.then(([ createMyWidget ]) => createMyWidget.default);
});
```

##### `w`

`w` is an abstraction layer for dojo-widgets that enables dojo 2's lazy instantiation, instance management and caching.

Creates a dojo-widget using the `factory` and `options`.

```ts
w(factory: string | ComposeFactory<W, O>, options: O): WNode[];
```

Creates a dojo-widget using the `factory`, `options` and `children`

```ts
w(factory: string | ComposeFactory<W, O>, options: O, children: (DNode | null)[]): WNode[];
```
Example `w` constucts:

```ts
w(createFactory, options, children);
w('my-factory', options, children);
```

### Authoring Widgets

To create custom reusable widgets you can extend `createWidgetBase`.

A simple widget with no children such as a `label` widget can be created like this:

```ts
import { ComposeFactory } from 'dojo-compose/compose';
import { VNodeProperties } from 'dojo-interfaces/vdom';
import { Widget, WidgetOptions, WidgetState } from 'dojo-widgets/interfaces';
import createWidgetBase from 'dojo-widgets/createWidgetBase';

interface LabelState extends WidgetState {
    label?: string;
}

interface LabelOptions extends WidgetOptions<LabelState> { }

type Label = Widget<LabelState>;

interface LabelFactory extends ComposeFactory<Label, LabelOptions> { }

const createLabelWidget: LabelFactory = createWidgetBase.mixin({
    mixin: {
        tagName: 'label',
        nodeAttributes: [
            function(this: Label): VNodeProperties {
                return { innerHTML: this.state.label };
            }
        ]
    }
});

export default createLabelWidget;
```
With its usages as follows:

```ts
import createLabelWidget from './widgets/createLabelWidget';

const label = createLabelWidget({ state: { label: 'I am a label' }});
```

To create structured widgets override the `getChildrenNodes` function.

```ts
import { ComposeFactory } from 'dojo-compose/compose';
import { DNode, Widget, WidgetOptions, WidgetState } from 'dojo-widgets/interfaces';
import createWidgetBase from 'dojo-widgets/createWidgetBase';
import { v } from 'dojo-widgets/d';

interface ListItem {
    name: string;
}

interface ListState extends WidgetState {
    items?: ListItem[];
};

interface ListOptions extends WidgetOptions<ListState> { };

type List = Widget<ListState>;

interface ListFactory extends ComposeFactory<List, ListOptions> { };

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
			const { items = [] } = this.state;
			const listItems = items.map(listItem);

			return [ v('ul', {}, listItems) ];
		}
	}
});

export default createListWidget;
```

### Event Handlers

The recommended pattern for event handlers is to declare them on the widget class, referencing the function using `this` most commonly within `getChildrenNodes` or a `nodeAttributes` function.

Event handlers can be internal logic encapsulated within a widget as shown in the first example or they can delegate to a function that is passed via `properties` as shown in the second example.

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

### Projector

To render widgets they must be appended to a `projector`. It is possible to create many projectors and attach them to `Elements` in the `DOM`, however `projectors` must not be nested.

The projector works in the same way as any widget overridding `getChildrenNodes` when `createProjector` class is used as the base for a custom widget (usually the root of the application).

In addition when working with a `projector` you can also set the `children` directly.

The standard `WidgetOptions` are available and also `createProjector` adds two additional optional properties `root` and `cssTransitions`.

 * `root` - The `Element` that the projector attaches to. The default value is `document.body`
 * `cssTransitions` - Set to `true` to support css transitions and animations. The default value is `false`.

**Note**: If `cssTransitions` is set to `true` then the projector expects Maquette's `css-transitions.js` to be loaded.

In order to attach the `createProjector` to the page call either `.append`, `.merge` or `.replace` depending on the type of attachment required and it returns a promise.

Instantiating `createProjector` directly:

```ts
import { DNode } from 'dojo-widgets/interfaces';
import { w } from 'dojo-widgets/d';
import createProjector, { Projector } from 'dojo-widgets/createProjector';
import createButton from 'dojo-widgets/components/button/createButton';
import createTextInput from 'dojo-widgets/components/textinput/createTextInput';

const projector = createProjector();

projector.children = [
	w(createTextInput, { id: 'textinput' }),
	w(createButton, { id: 'button', properties: { label: 'Button' } })
];

projector.append().then(() => {
	console.log('projector is attached');
});
```

Using the `createProjector` as a base for a root widget:

```ts
import { DNode } from 'dojo-widgets/interfaces';
import { w } from 'dojo-widgets/d';
import createProjector, { Projector } from 'dojo-widgets/createProjector';
import createButton from 'dojo-widgets/components/button/createButton';
import createTextInput from 'dojo-widgets/components/textinput/createTextInput';

const createApp = createProjector.mixin({
	mixin: {
		getChildrenNodes: function(this: Projector): DNode[] {
			return [
				w(createTextInput, { id: 'textinput' }),
				w(createButton, { id: 'button', properties: { label: 'Button' } })
			];
		},
		classes: [ 'main-app' ],
		tagName: 'main'
	}
});

export default createApp;
```
Using the custom widget assuming a class called `createApp.ts` relative to its usages:

```ts
import createApp from './createApp';

const app = createApp();

app.append().then(() => {
	console.log('projector is attached');
});
```

### Internationalization

Widgets can be internationalized by mixing in `dojo-widgets/mixins/createI18nMixin`. [Message bundles](https://github.com/dojo/i18n) are localized by passing them to `localizeBundle`. If the bundle supports the widget's current locale, but those locale-specific messages have not yet been loaded, then the default messages are returned and the widget will be invalidated once the locale-specific messages have been loaded. Each widget can have its own locale by setting its `state.locale`; if no locale is set, then the default locale as set by [`dojo-i18n`](https://github.com/dojo/i18n) is assumed.

```typescript
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
					d(createLabel, {
						state: {
							// Passing a message string to a child widget.
							label: messages.purchaseItems
						}
					}),
					d(createButton, {
						state: {
							// Passing a formatted message string to a child widget.
							label: messages.format('itemCount', { count: 2 })
						}
					})
				];
			}
		}
	});

const widget = createI18nWidget({
	state: {
		// Set the locale for the widget and all of its children. Any child can still
		// set its own locale.
		locale: 'fr'
	}
});
```

### Dojo Widget Components

A selection of core reusable widgets are provided for convenience that are fully accessible and open to internationalization.

// TODO - list core components here.

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
