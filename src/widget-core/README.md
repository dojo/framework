# dojo-widgets

[![Build Status](https://travis-ci.org/dojo/widgets.svg?branch=master)](https://travis-ci.org/dojo/widgets)
[![codecov](https://codecov.io/gh/dojo/widgets/branch/master/graph/badge.svg)](https://codecov.io/gh/dojo/widgets)
[![npm version](https://badge.fury.io/js/dojo-widgets.svg)](http://badge.fury.io/js/dojo-widgets)

A core widget library for Dojo.

**WARNING** This is *alpha* software. It is not yet production ready, so you should use at your own risk.

For more background on dojo-widgets, there is a document describing the [widgeting system](https://github.com/dojo/meta/blob/master/documents/Widget-System.md).

- [Usage](#usage)
- [Features](#features)
    - [Base Widget](#base-widget)
    	- [Simple Widgets](#simple-widgets)
    	- [d](#d)
    	- [Widgets with Children](#widgets-with-children)
    - [Extending Base Widget](#extending-base-widget)
    - [Projector](#projector)
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
npm install dojo-store
```

To use dojo-widgets import the module in the project. For more details see [features](#features) below.

```ts
import createButton from 'dojo-widgets/components/createButton';
```

or use the [dojo cli](https://github.com/dojo/cli-create-app) to create a complete Dojo skeleton application.

## Features

dojo-widgets are based on a virtual DOM implementation named [Maquette](http://maquettejs.org/) as well as some foundational classes
provided in [dojo-compose](https://github.com/dojo/compose).

### Base Widget

The class `createWidgetBase` provides all base dojo-widgets functionality including caching and widget lifecycle management. It can be used directly or extended to create custom widgets.

To customise the widget an optional `options` argument can be provided with the following interface.

**Type**: `WidgetOptions<WidgetState>` - All properties are optional.

|Property|Type|Description|
|---|---|---|
|id|string|identifier for the widget|
|state|WidgetState|Initial state of the widget|
|stateFrom|StoreObservablePatchable|Observable that provides state for the widget|
|listeners|EventedListenersMap|Map of listeners for to attach to the widget|
|tagName|string|Override the widgets tagname|
|getChildrenNodes|Function|Function that returns an array of children DNodes|
|nodeAttributes|Function[]|An array of functions that return VNodeProperties to be applied to the VNode|

By default the base widget class applies `id`, `classes` and `styles` from the widget's specified `state` (either by direct state injection or via an observable store).

#### Simple Widgets
To create a basic widget `createWidgetBase` can be used directly by importing the class.

```ts
import createWidgetBase from 'dojo-widgets/bases/createWidgetBase';

const myBasicWidget = createWidgetBase();
```

The widget creates the following DOM element:

```html
<div></div>
```
The following example demonstrates how `id`, `classes` and `styles` are applied to the generated DOM.

```ts
import createWidgetBase from 'dojo-widgets/bases/createWidgetBase';

const myBasicWidget = createWidgetBase({
    state: {
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

`d` is a function that is used within Dojo to express widget hierarchical structure using both Dojo widget factories or Hyperscript, it is imported via

```ts
import d from 'dojo-widgets/util/d';
```

The argument and return types are available from the `dojo-interfaces` package as they are shared across Dojo packages.

```ts
import { DNode, HNode, WNode } from 'dojo-interfaces/widgetBases';
```

The API for using Hyperscript provides multiple signatures for convenience, **tagName** is the only mandatory argument, **options** defaults to `{}` when not provided and **children** is completely optional

```ts
d(tagName: string): HNode[];
```
```ts
d(tagName: string, children: (DNode | VNode | null)[]): HNode[];
```
```ts
d(tagName: string, options: VNodeProperties, children?: (DNode | VNode | null)[]): HNode[];
```
There is a single API when using dojo-widget factories, with **options** being defaulted to `{}` if not supplied.

```ts
d(factory: ComposeFactory<W, O>, options: O): WNode[];
```

#### Widgets with Children

Children are nested within a widget by providing a `getChildrenNodes` function to the options.

```ts
const widgetStore = createObservableStore({
    data: [
        {
            id: 'my-list-widget',
            items: [
                { id: '1', name: 'name-1' },
                { id: '2', name: 'name-2' },
                { id: '3', name: 'name-3' },
                { id: '4', name: 'name-4' }
            ]
        }
    ]
});

const getChildrenNodes = function(this: Widget<WidgetState>) {
    const listItems = this.state.items.map((item) => {
        return d('li', { innnerHTML: item.name });
    });
    
    return listItems;
};

const myBasicListWidget = createWidgetBase({
    id: 'my-list-widget',
    stateFrom: widgetStore,
    tagName: 'ul',
    getChildrenNodes
});
```
The widget creates the following DOM element:

```html
<ul data-widget-id="my-list-widget">
    <li>name-1</li>
    <li>name-2</li>
    <li>name-3</li>
    <li>name-4</li>
</ul>
``` 

### Extending Base Widget

To create custom reusable widgets you can extend `createWidgetBase`. 

A simple widget with no children such as a `label` widget can be created like this:

```ts
import { ComposeFactory } from 'dojo-compose/compose';
import { VNodeProperties } from 'dojo-interfaces/vdom';
import { Widget, WidgetOptions, WidgetState } from 'dojo-interfaces/widgetBases';
import createWidgetBase from 'dojo-widgets/bases/createWidgetBase';

interface LabelState extends WidgetState {
    label?: string;
}

interface LabelOptions extends WidgetOptions<LabelState> { }

type Label = Widget<LabelState>;

interface LabelFactory extends ComposeFactory<Label, LabelOptions> { }

const createLabelWidget: LabelFactory = createWidgetBase.mixin(
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
import { DNode, Widget, WidgetOptions, WidgetState } from 'dojo-interfaces/widgetBases';
import createWidgetBase from 'dojo-widgets/bases/createWidgetBase';
import d from 'dojo-widgets/util/d';

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
    return d('li', { innerHTML: item.name, classes });
}

const createListWidget: ListFactory = createWidgetBase.mixin({
    mixin: {
        getChildrenNodes: function (this: List): DNode[] {
            const listItems = this.state.items.map(listItem);

            return [ d('ul', {}, listItems) ];
        }
    }
});

export default createListWidget;
```

### Projector

To render widgets they must be appended to a `projector`. It is possible to create many projectors and attach them to `Elements` in the `DOM`, however `projectors` must not be nested.

### Dojo Widget Components

A selection of core reusable widgets are provided for convenience that are fully accessible and internationalizable.

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