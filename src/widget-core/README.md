# @dojo/widget-core

[![Build Status](https://travis-ci.org/dojo/widget-core.svg?branch=master)](https://travis-ci.org/dojo/widget-core)
[![codecov](https://codecov.io/gh/dojo/widget-core/branch/master/graph/badge.svg)](https://codecov.io/gh/dojo/widget-core)
[![npm version](https://badge.fury.io/js/%40dojo%2Fwidget-core.svg)](https://badge.fury.io/js/%40dojo%2Fwidget-core)

widget-core is a library to create powerful, composable user interface widgets.

* **Reactive & unidirectional:** widget-core follows core reactive principles to ensure predictable, consistent behavior.
* **Encapsulated Widgets:** Create independent encapsulated widgets that can be wired together to create complex and beautiful user interfaces.
* **DOM Abstractions:** widget-core provides API abstractions to avoid needing to access or manipulate the DOM outside of the reactive render life-cycle.
* **I18n & Themes:** widget-core provides core mixins to enable internationalization and theming support for your widgets.

-----

 - [Installation](#installation)
 - [Features](#features)
     - [Basic Widgets](#basic-widgets)
        - [Rendering a Widget in the DOM](#rendering-a-widget-in-the-dom)
        - [Widgets and Properties](#widgets-and-properties)
        - [Composing Widgets](#composing-widgets)
        - [Decomposing Widgets](#decomposing-widgets)
    - [Mixins](#mixins)
    - [Animation](#animation)
    - [Styling & Theming](#styling--theming)
    - [Internationalization](#internationalization)
- [Key Principles](#key-principles)
- [Advanced Concepts](#advanced-concepts)
    - [Advanced Properties](#advanced-properties)
    - [Registry](#registry)
    - [Decorator Lifecycle Hooks](#decorator-lifecycle-hooks)
    - [Method Lifecycle Hooks](#method-lifecycle-hooks)
    - [Containers](#containers--injectors)
    - [Decorators](#decorators)
    - [Meta Configuration](#meta-configuration)
    - [Inserting DOM Nodes Into The VDom Tree](#inserting-dom-nodes-into-the-vdom-tree)
    - [JSX Support](#jsx-support)
    - [Web Components](#web-components)
- [How Do I Contribute?](#how-do-i-contribute)
    - [Setup Installation](#setup-installation)
    - [Testing](#testing)
- [Licensing Information](#licensing-information)

## Installation

To use @dojo/widget-core, install the package along with its required peer dependencies:

```shell
npm install @dojo/widget-core

# peer dependencies
npm install @dojo/has
npm install @dojo/shim
npm install @dojo/core
npm install @dojo/i18n
```

You can also use the [dojo cli](https://github.com/dojo/cli) to create a complete Dojo 2 skeleton application.

## Features

### Basic Widgets

Dojo 2 applications use the Virtual DOM (vdom) paradigm to represent what should be shown on the view. These vdom nodes are plain JavaScript objects that are more efficient to create from a performance perspective than browser DOM elements. Dojo 2 uses these vdom elements to synchronize and update the browser DOM so that the application shows the expected view.

There are two types of vdom within Dojo 2. The first type provides a pure representation of DOM elements, the fundamental building blocks of all Dojo 2 applications. These are called `VNode`s and are created using the `v()` function available from the `@dojo/widget-core/d` module.

The following will create a `VNode` that represents a simple `div` DOM element, with a text node child: `Hello, Dojo 2!`:

```ts
v('div', [ 'Hello, Dojo 2!' ])
```

The second vdom type, `WNode`, represent widgets. A widget is a class that extends `WidgetBase` from `@dojo/widget-core/WidgetBase` and implements a `render` function that returns one of the Dojo 2 vdom types (known as a `DNode`). Widgets are used to represent reusable, independent sections of a Dojo 2 application.

The following returns the `VNode` example from above from the `render` function:

```ts
class HelloDojo extends WidgetBase {
    protected render() {
        return v('div', [ 'Hello, Dojo 2!' ]);
    }
}
```

#### Rendering a Widget in the DOM

To display your new component in the view you will need to decorate it with some functionality needed to "project" the widget into the browser. This is done using the `ProjectorMixin` from `@dojo/widget-core/mixins/Projector`.

```ts
const Projector = ProjectorMixin(HelloDojo);
const projector = new Projector();

projector.append();
```

By default, the projector will attach the widget to the `document.body` in the DOM, but this can be overridden by passing a reference to the preferred parent DOM Element.

Consider the following in your HTML file:

```html
<div id="my-app"></div>
```

You can target this Element:

```ts
const root = document.getElementById('my-app');
const Projector = ProjectorMixin(HelloDojo);
const projector = new Projector();

projector.append(root);
```

#### Widgets and Properties

We have created a widget used to project our `VNode`s into the DOM, however, widgets can be composed of other widgets and `properties` which are used to determine if a widget needs to be re-rendered.

Properties are available on the widget instance, defined by an interface and passed as a [`generic`](https://www.typescriptlang.org/docs/handbook/generics.html) to the `WidgetBase` class when creating your custom widget. The properties interface should extend the base `WidgetProperties` provided from `@dojo/widget-core/interfaces`:

```ts
interface MyProperties extends WidgetProperties {
    name: string;
}

class Hello extends WidgetBase<MyProperties> {
    protected render() {
        const { name } = this.properties;

        return v('div', [ `Hello, ${name}` ]);
    }
}
```

New properties are compared with the previous properties to determine if a widget requires re-rendering. By default Dojo 2 uses the `auto` diffing strategy, that performs a shallow comparison for objects and arrays, ignores functions (except classes that extend `WidgetBase`) and a reference comparison for all other values.

#### Composing Widgets

As mentioned, often widgets are composed of other widgets in their `render` output. This promotes widget reuse across an application (or multiple applications) and promotes widget best practices.

To compose widgets, we need to create `WNode`s and we can do this using the `w()` function from `@dojo/widget-core/d`.

Consider the previous `Hello` widget that we created:

```ts
class App extends WidgetBase {
    protected render() {
        return v('div', [
            w(Hello, { name: 'Bill' }),
            w(Hello, { name: 'Bob' }),
            w(Hello, { name: 'Flower pot men' })
        ]);
    }
}
```

We can now use `App` with the `ProjectorMixin` to render the `Hello` widgets.

```ts
const Projector = ProjectorMixin(App);
const projector = new Projector();

projector.append();
```

**Note:** Widgets must return a single top-level `DNode` from the `render` method, which is why the `Hello` widgets were wrapped in a `div` element.

#### Decomposing Widgets

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

**Note:** When working with children arrays with the same type of widget or Element, it is important to add a unique `key` property or attribute so that Dojo 2 can identify the correct node when updates are made.

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

This would mean a new function would be created every render but Dojo 2 does not support changing listener functions after the first render and this would **error**.

To resolve this, the list item can be extracted into a separate widget:

```ts
interface ListItemProperties {
    id: string;
    content: string;
    highlighted: boolean;
    onItemClick: (id: string) => void;
}

class ListItem extends WidgetBase<ListItemProperties> {

    protected onClick(event: MouseEvent) {
        const { id } = this.properties;

        this.properties.onItemClick(id);
    }

    protected render() {
        const { id, content, highlighted } = this.properties;
        const classes = [ highlighted ? 'highlighted' : null ];

        return v('li', { key: id, classes, onclick: this.onClick }, [ content ]);
    }
}
```

Using the `ListItem` we can simplify the `List` slightly and also add the `onclick` functionality that we required:

```ts
interface ListProperties {
    items: {
        id: string;
        content: string;
        highlighted: boolean;
    };
    onItemClick: (id: string) => void;
}

class List extends WidgetBase<ListProperties> {
    protected render() {
        const { onItemClick, items } = this.properties;

        return v('ul', { classes: 'list' }, items.map(({ id, content, highlighted }) => {
            return w(ListItem, { key:id, content, highlighted, onItemClick });
        });
    }
}
```

Additionally, the `ListItem` is now reusable in other areas of our application(s).

### Mixins

Dojo 2 makes use of mixins to decorate additional functionality and properties to existing widgets. Mixins provide a mechanism that allows loosely coupled design and composition of behaviors into existing widgets without having to change the base widget.

TypeScript supports mixins using a constructor type of `new (...args: any[]) => any;` that enables a class to be passed as a function argument and extended to add new functionality.

Example mixin that adds method `setState` and `readonly` `state` property:

```ts
// interface for the extended API
interface StateMixin {
    readonly state: Readonly<any>;
    setState(state: any): void;
}

// function that accepts a class that extends `WidgetBase` and returns the extended class with the `StateMixin`
// behavior
function StateMixin<T extends new(...args: any[]) => WidgetBase>(Base: T): T & (new(...args: any[]) => StateMixin) {
    return class extends Base {
        private _state: any;

        public setState(state: any): void {
            // shallow copy of the state
            this._state = { ...this._state, ...state };
            // invalidate the widget
            this.invalidate();
        }

        public get state(): any {
            return this._state;
        }
    };
}
```

Examples of Dojo 2 mixins can be seen with `ThemedMixin` and `I18nMixin` that are described in [Classes & theming](#classes--theming) and [Internationalization](#internationalization) sections.

### Animation

Dojo 2 widget-core provides a `WebAnimation` meta to apply web animations to VNodes.

To specify the web animations pass an `AnimationProperties` object to the `WebAnimation` meta along with the key of the node you wish to animate. This can be a single animation or an array or animations.

#### Basic Example

```ts
export default class AnimatedWidget extends WidgetBase {
    protected render() {
        const animate = {
            id: 'rootAnimation',
            effects: [
                { height: '10px' },
                { height: '100px' }
            ],
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

#### Changing Animation

Animations can be changed on each widget render in a reactive pattern, for example changing the animation from `slideUp` to `slideDown` on a title pane depending on the titlepane being open or not.

```ts
export default class AnimatedWidget extends WidgetBase {
    private _open = false;

    protected render() {
        const animate = this._open ? {
            id: 'upAnimation',
            effects: [
                { height: '100px' },
                { height: '0px' }
            ],
            controls: {
                play: true
            }
        } : {
            id: 'downAnimation',
            effects: [
                { height: '0px' },
                { height: '100px' }
            ],
            controls: {
                play: true
            }
        };

        this.meta(WebAnimation).animate('root', animate);

        return v('div', {
            key: 'root'
        })
    }
}
```

#### Passing an effects function

An `effects` function can be passed to the animation and evaluated at render time. This allows you to create programmatic effects such as those depending on measurements from the `Dimensions` `Meta`.

```ts
export default class AnimatedWidget extends WidgetBase {
    private _getEffect() {
        const { scroll } = this.meta(Dimensions).get('content');

        return [
            { height: '0px' },
            { height: `${scroll.height}px` }
        ];
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
        })
    }
}
```

#### Get animation info

The `WebAnimation` meta provides a `get` function that can be used to retrieve information about an animation via its `id`.
This info contains the currentTime, playState, playbackRate and startTime of the animation. If no animation is found or the animation has been cleared this will return undefined.

```ts
export default class AnimatedWidget extends WidgetBase {
    protected render() {
        const animate = {
            id: 'rootAnimation',
            effects: [
                { height: '10px' },
                { height: '100px' }
            ],
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

### Styling & Theming

#### Overview

Dojo 2 widget-core provides `ThemedMixin` to decorate a widget with theming functionality and a `@theme` decorator to specify the classes available to the widget. Both `ThemedMixin` and `@theme` are provided by `@dojo/widget-core/mixins/Themed`.

To specify the theme classes for a widget, an interface needs to be imported with named exports for each class and passed to the `@theme` decorator. Importing the interface provides IntelliSense / auto-complete for the class names and passing this via the `@theme` decorator informs the `ThemedMixin` which classes can be themed.

<details><summary>Example CSS classes interface</summary>

```typescript
export const classNameOne: string;
export const classNameTwo: string;
```
</details>


**Important:** at runtime, a JavaScript file is required to provide the processed CSS class names.

The `ThemedMixin` provides a method available on the instance `this.theme()` takes a single argument that is either a `string` class name or an array of `string` class names and returns the theme's equivalent class names as either a single string or array of strings.

However, it is not always desirable to allow consumers to override styling that may be required for a widget to function correctly. These classes can be added directly to the `classes` array in `VirtualDomProperties`.

The following example passes `css.root` that will be themeable and `css.rootFixed` that cannot be overridden.

```typescript
import * as css from './styles/myWidget.m.css';
import { ThemedMixin, theme } from '@dojo/widget-core/mixins/Themed';

@theme(css)
export default class MyWidget extends ThemedMixin(WidgetBase) {
    protected render() {
        return v('div', { classes: [ this.theme(css.root), css.rootFixed ] });
    }
}
```

If an array is passed to `this.theme` then an array will be returned. For example, `this.theme([ css.root, css.other ])` will return an array containing the theme's class names `[ 'themedRoot', 'themedOther' ]`.

#### Writing a theme

Themes are TypeScript modules that export an object that contains css-modules files keyed by a widgets CSS file name.

```css
/* myTheme/styles/myWidget.m.css */
.root {
    color: blue;
}
```

```typescript
// myTheme/theme.ts
import * as myWidget from './styles/myWidget.m.css';

export default {
    'myWidget': myWidget
}
```

In the above example, the new `root` class provided by the theme for `myWidget` will replace the `root` class that was provided by the original `myWidget.m.css`. This means the `myWidget` will now have its color set to blue, but will no longer receive the styles from the `root` class in the original CSS.

#### Applying a theme

To apply a theme to a widget, simply require it as a module and pass it to a widget via its properties. It is important to ensure that any child widgets created within your widget's render function are passed the `theme` or they will not be themed.

```typescript
// app.ts
import myTheme from './myTheme/theme';

// ...
render() {
    return w(TabPanel, { theme: myTheme } });
}
```

#### Passing extra classes

Sometimes you may need to apply positioning or layout styles to a child widget. As it is not possible to pass `classes` directly to virtualized widget nodes. `WNodes` thus provide an `extraClasses` property to target themeable classes within its `render` function. In most cases, this should only target the `root` class and apply positioning adjustments. The classes passed via `extraClasses` are outside of the theming mechanism and thus will not be affected by a change in `theme`.

```css
/* app.m.css */
.tabPanel {
    position: absolute;
    left: 50px;
    top: 50px;
}
```

```typescript
// app.ts
import * as appCss from './styles/app.m.css';

// ...
render() {
    return w(TabPanel, { extraClasses: { 'root': appCss.tabPanel } });
}
```

In the above example, the tabPanel will receive its original `root` class in addition to the `appCss.tabPanel` class when used with `this.theme`.

### Internationalization

Widgets can be internationalized by adding the `I18nMixin` mixin from `@dojo/widget-core/mixins/I18n`. [Message bundles](https://github.com/dojo/i18n) are localized by passing them to `localizeBundle`. Note that with this pattern it is possible for a widget to obtain its messages from multiple bundles; however, we strongly recommend limiting widgets to a single bundle whenever possible.

If the bundle supports the widget's current locale, but those locale-specific messages have not yet been loaded, then a bundle of blank message values is returned. Alternatively, the `localizeBundle` method accepts a second boolean argument, which, when `true`, causes the default messages to be returned instead of the blank bundle. The widget will be invalidated once the locale-specific messages have been loaded, triggering a re-render with the localized message content.

The object returned by `localizeBundle` contains the following properties and methods:

* `messages`: An object containing the localized message key-value pairs. If the messages have not yet loaded, then `messages` will be either a blank bundle or the default messages, depending upon how `localizeBundle` was called.
* `isPlaceholder`: a boolean property indicating whether the returned messages are the actual locale-specific messages (`false`) or just the placeholders used while waiting for the localized messages to finish loading (`true`). This is useful to prevent the widget from rendering at all if localized messages have not yet loaded.
* `format(key: string, replacements: { [key: string]: string })`: a method that accepts a message key as its first argument and an object of replacement values as its second. For example, if the bundle contains `greeting: 'Hello, {name}!'`, then calling `format('greeting', { name: 'World' })` would return `'Hello, World!'`.

Each widget can have its own locale by passing a property - `properties.locale`. If no locale is set, then the default locale, as set by [`@dojo/i18n`](https://github.com/dojo/i18n), is assumed.

```ts
const MyWidgetBase = I18nMixin(WidgetBase);

class I18nWidget extends MyWidgetBase<I18nWidgetProperties> {
    render() {
        // Load the "greetings" messages for the current locale. If the locale-specific
        // messages have not been loaded yet, then the default messages are returned,
        // and the widget will be invalidated once the locale-specific messages have
        // loaded.
        const { format, isPlaceholder, messages } = this.localizeBundle(greetingsBundle);

        // In many cases it makes sense to postpone rendering until the locale-specific messages have loaded,
        // which can be accomplished by returning early if `isPlaceholder` is `true`.
        if (isPlaceholder) {
            return;
        }

        return v('div', { title: messages.hello }, [
            w(Label, {
                // Passing a message string to a child widget.
                label: messages.purchaseItems
            }),
            w(Button, {
                // Passing a formatted message string to a child widget.
                label: format('itemCount', { count: 2 })
            })
        ]);
    }
}
```

Once the `I18n` mixin has been added to a widget, the default bundle can be replaced with the `i18nBundle` property. Further, while we recommend against using multiple bundles in the same widget, there may be times when you need to consume a third-party widget that does so. As such, `i18nBundle` can also be a `Map` of default bundles to override bundles.

```typescript
import { Bundle } from '@dojo/i18n/i18n';

// A complete bundle to replace WidgetA's message bundle
import overrideBundleForWidgetA from './nls/widgetA';

// Bundles for WidgetB
import widgetB1 from 'third-party/nls/widgetB1';
import overrideBundleForWidgetB from './nls/widgetB';

// WidgetB uses multiple bundles, but only `thirdy-party/nls/widgetB1` needs to be overridden
const overrideMapForWidgetB = new Map<Bundle<any>, Bundle<any>>();
map.set(widgetB1, overrideBundleForWidgetB);

export class MyWidget extends WidgetBase {
	protected render() {
		return [
			w(WidgetA, {
				i18nBundle: overrideBundleForWidgetA
			}),
			w(WidgetB, {
				i18nBundle: overrideMapForWidgetB
			}),
		];
	}
}
```

## Key Principles

These are some of the **important** principles to keep in mind when creating and using widgets:

1. The widget's *`__render__`*, *`__setProperties__`*, *`__setChildren__`* functions should **never** be called or overridden.
   - These are the internal methods of the widget APIs and their behavior can change in the future, causing regressions in your application.
2. Except for projectors, you should **never** need to deal directly with widget instances
   - The Dojo 2 widget system manages all instances required including caching and destruction, trying to create and manage other widgets will cause issues and will not work as expected.
3. **Never** update `properties` within a widget instance, they should be considered pure.
   - Properties are considered read-only and should not be updated within a widget instance, updating properties could cause unexpected behavior and introduce bugs in your application.
4. Hyperscript should **always** be written using the `@dojo/widget-core/d#v()` function.
   - The widget-core abstraction for Hyperscript is the only type of vdom that widget-core can process for standard DOM elements, any other mechanism will not work properly or at all.

## Advanced Concepts

This section provides some details on more advanced Dojo 2 functionality and configuration that may be required to build more complex widgets and applications.

### Advanced Properties

Controlling the diffing strategy can be done at an individual property level using the `diffProperty` decorator on a widget class.

`widget-core` provides a set of diffing strategy functions from `@dojo/widget-core/diff.ts` that can be used. When these functions do not provide the required functionality a custom diffing function can be provided. Properties that have been configured with a specific diffing type will be excluded from the automatic diffing.

| Diff Function                 | Description                                                                       |
| -------------------- | ----------------------------------------------------------------------------------|
| `always`    | Always report a property as changed.                                              |
| `auto`      | Ignore functions (except classes that extend `WidgetBase`), shallow compare objects, and reference compare all other values.|                                 |
| `ignore`    | Never report a property as changed.                                               |
| `reference` | Compare values by reference (`old === new`)                                       |
| `shallow`   | Treat the values as objects and compare their immediate values by reference.      |

**Important:** All diffing functions should be pure functions and are called *WITHOUT* any scope.

```ts
// using a diff function provided by widget-core#diff
@diffProperty('title', reference)
class MyWidget extends WidgetBase<MyProperties> { }

//custom diff function; A pure function with no side effects.
function customDiff(previousProperty: string, newProperty: string): PropertyChangeRecord {
    return {
        changed: previousProperty !== newProperty,
        value: newProperty
    };
}

// using a custom diff function
@diffProperty('title', customDiff)
class MyWidget extends WidgetBase<MyProperties> { }
```

##### Property Diffing Reactions

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

### Registry

The `Registry` provides a mechanism to define widgets and injectors (see the [`Containers & Injectors`](#containers--injectors) section), that can be dynamically/lazily loaded on request. Once the registry widget is loaded all widgets that need the newly loaded widget will be invalidated and re-rendered automatically.

A main registry can be provided to the `projector`, which will be automatically passed to all widgets within the tree (referred to as `baseRegistry`). Each widget also gets access to a private `Registry` instance that can be used to define registry items that are scoped to the widget. The locally defined registry items are considered a higher precedence than an item registered in the `baseRegistry`.

```ts
import { Registry } from '@dojo/widget-core/Registry';

import { MyWidget } from './MyWidget';
import { MyAppContext } from './MyAppContext';

const registry = new Registry();
registry.define('my-widget', MyWidget);
registry.defineInjector('my-injector', (invalidator) => {
	const appContext = new MyAppContext(invalidator);
	return () => appContext;
});
// ... Mixin and create Projector ...

projector.setProperties({ registry });
```

In some scenarios, it might be desirable to allow the `baseRegistry` to override an item defined in the local `registry`. Use true as the second argument of the registry.get function to override the local item.

The Registry will automatically detect and handle widget constructors as default exports for imported esModules for you.

#### Registry Decorator

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
        return w(MyActualChildWidget, {}, [
            w('heading', {})
        ]);
    }
}
```

#### Loading esModules

The registry can handle the detection of imported esModules for you that have the widget constructor as the default export. This means that your callback function can simply return the `import` call. If the widget constructor is not the default export you will need to pass it manually.

``` ts
@registry('Button', () => import('./Button')) // default export
@registry('Table', async () => {
    const module = await import('./HeadingWidget');
    return module.table;
})
class MyWidget extends WidgetBase {}
```

### Decorator Lifecycle Hooks

Occasionally, in a mixin or a widget class, it may be required to provide logic that needs to be executed before properties are diffed using `beforeProperties`, either side of a widget's `render` call using `beforeRender` & `afterRender` or after a constructor using `afterContructor`.

This functionality is provided by the `beforeProperties`, `beforeRender`, `afterRender` and `afterConstructor` decorators that can be found in the `decorators` directory.

***Note:*** All lifecycle functions are executed in the order that they are specified from the superclass up to the final class.

##### beforeProperties

The `beforeProperties` lifecycle hook is called immediately before property diffing is executed. Functions registered for `beforeProperties` receive `properties` and are required to return any updated, changed `properties` that are mixed over (merged) the existing properties.

As the lifecycle is executed before the property diffing is completed, any new or updated properties will be included in the diffing phase.

An example that demonstrates adding an extra property based on the widgets current properties, using a function declared on the widget class `myBeforeProperties`:

```ts
class MyClass extends WidgetBase<MyClassProperties> {

    @beforeProperties()
    protected myBeforeProperties(properties: MyClassProperties): MyClassProperties {
        if (properties.type = 'myType') {
            return { extraProperty: 'foo' };
        }
        return {};
    }
}
```

##### AlwaysRender

The `alwaysRender` decorator is used to force a widget to always render regardless of whether the widget's properties are considered different.

```ts
@alwaysRender()
class MyClass extends WidgetBase {}
```

##### BeforeRender

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

##### AfterRender

The `afterRender` lifecycle hook receives the returned `DNode`s from a widget's `render` call so that the nodes can be decorated, manipulated or swapped completely.

```ts
class MyBaseClass extends WidgetBase<WidgetProperties> {
    @afterRender()
    myAfterRender(result: DNode): DNode {
        // do something with the result
        return result;
    }
}
```

### Method Lifecycle Hooks

These lifecycle hooks are used by overriding methods in a widget class. Currently, `onAttach` and `onDetach` are supported and provide callbacks for when a widget has been first attached and removed (destroyed) from the virtual dom.

#### onAttach

`onAttach` is called once when a widget is first rendered and attached to the DOM.

```ts
class MyClass extends WidgetBase {
    onAttach() {
        // do things when attached to the DOM
    }
}
```

#### onDetach

`onDetach` is called when a widget is removed from the widget tree and therefore the DOM. `onDetach` is called recursively down the tree to ensure that even if a widget at the top of the tree is removed all the child widgets `onDetach` callbacks are fired.

```ts
class MyClass extends WidgetBase {
    onDetach() {
        // do things when removed from the DOM
    }
}
```

### Containers & Injectors

There is built-in support for side-loading/injecting values into sections of the widget tree and mapping them to a widget's properties. This is achieved by registering an injector factory with a `registry` and setting the registry as a property on the application's `projector` to ensure the registry instance is available to your application.

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
import { Container } from '@dojo/widget-core/Container';
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

### Decorators

All core decorators provided by widget-core, can be used in non-decorator environments (Either JavaScript/ES6 or a TypeScript project that does not have the experimental decorators configuration set to true in the `tsconfig`) programmatically by calling them directly, usually within a Widget class' `constructor`.

Example usages:

```ts
constructor() {
    beforeProperties(this.myBeforeProperties)(this);
    beforeRender(myBeforeRender)(this);
    afterRender(this.myAfterRender)(this);
    diffProperty('myProperty', this.myPropertyDiff)(this);
}
```

### Meta Configuration

Widget meta is used to access additional information about the widget, usually information only available through the rendered DOM element - for example, the dimensions of an HTML node. You can access and respond to metadata during a widget's render operation.

```typescript
class TestWidget extends WidgetBase<WidgetProperties> {
    render() {
        const dimensions = this.meta(Dimensions).get('root');

        return v('div', {
            key: 'root',
            innerHTML: `Width: ${dimensions.width}`
        });
    }
}
```

If an HTML node is required to calculate the meta information, a sensible default will be returned and your widget will be automatically re-rendered to provide more accurate information.

#### Dimensions

The `Dimensions` meta provides size/position information about a node.

```ts
const dimensions = this.meta(Dimensions).get('root');
```

In this simple snippet, `dimensions` would be an object containing `offset`, `position`, `scroll`, and `size` objects.

The following fields are provided:

| Property         | Source                                |
| -----------------| ------------------------------------- |
| `position.bottom`| `node.getBoundingClientRect().bottom` |
| `position.left`  | `node.getBoundingClientRect().left`   |
| `position.right` | `node.getBoundingClientRect().right`  |
| `position.top`   | `node.getBoundingClientRect().top`    |
| `size.width`     | `node.getBoundingClientRect().width`  |
| `size.height`    | `node.getBoundingClientRect().height` |
| `scroll.left`    | `node.scrollLeft`                     |
| `scroll.top`     | `node.scrollTop`                      |
| `scroll.height`  | `node.scrollHeight`                   |
| `scroll.width`   | `node.scrollWidth`                    |
| `offset.left`    | `node.offsetLeft`                     |
| `offset.top`     | `node.offsetTop`                      |
| `offset.width`   | `node.offsetWidth`                    |
| `offset.height`  | `node.offsetHeight`                   |

If the node has not yet been rendered, all values will contain `0`. If you need more information about whether or not the node has been rendered you can use the `has` method:

```ts
const hasRootBeenRendered = this.meta(Dimensions).has('root');
```

#### Intersection

The Intersection Meta provides information on whether a Node is visible in the application's viewport using the [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) (this is polyfilled for unsupported browsers).

This example renders a list with images, the image src is only added when the item is in the viewport which prevents needlessly downloading images until the user scrolls to them:

```ts
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { v, w } from '@dojo/widget-core/d';
import { DNode } from '@dojo/widget-core/interfaces';
import { Intersection } from '@dojo/widget-core/meta/Intersection';

// Add image URLs here to load
const images = [];

class Item extends WidgetBase<{ imageSrc: string }> {
	protected render() {
		const { imageSrc } = this.properties;
		const { isIntersecting } = this.meta(Intersection).get('root');
		let imageProperties: any = {
			key: 'root',
			styles: {
				height: '200px',
				width: '200px'
			}
		};

        // Only adds the image source if the node is in the viewport
		if (isIntersecting) {
			imageProperties = { ...imageProperties, src: imageSrc };
		}

		return v('img', imageProperties);
	}
}

class List extends WidgetBase {
	protected render() {
		let items: DNode[] = [];
		for (let i = 0; i < images.length; i++) {
			items.push(v('ul', { key: i }, [ w(Item, { key: i, imageSrc: images[i] }) ]));
		}

		return v('div', items);
	}
}
```

#### Animations

See the [Animations](#animations) section more information.

#### Drag

The `Drag` meta allows a consuming widget to determine if its nodes are being dragged and by how much.  The meta provider abstracts away the need for dealing with modeling specific mouse, pointer, and touch events to create a drag state.

```ts
const dragResult = this.meta(Drag).get('root');
```

The drag information returned contains the following properties:

|Property|Description|
|-|-|
|`delta`|An `x`/`y` position that contains the number of pixels the pointer has moved since the last read of the drag state.|
|`isDragging`|If the pointer is currently _active_ in dragging the identified node.|
|`start`|A position object that contains `x`/`y` positions for `client`, `offset`, `page`, and `screen` that provides the start positions that the `delta` movement refers to.  *Note* that `offset` and `page` are not supported by all browsers and the meta provider does nothing to normalize this data, it simply copies it from the underlying events.|

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
        return v('div', {
            classes: [ css.root, dragResult.isDragging ? css.dragging : null ],
            key: 'root'
        }, [
            v('div', {
                classes: [ css.slider ],
                key: 'slider',
                styles: {
                    height: `${height}px`,
                    top: `${top}px`
                }
            })
        ])
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

As can be seen in the above code, the meta provider simply provides information which the widgets can react to.  The implementation
needs to react to these changes.

#### Focus

The `Focus` meta determines whether a given node is focused or contains document focus. Calling `this.meta(Focus).get(key)` returns the following results object:

|Property|Description|
|-|-|
|`active`|A boolean indicating whether the specified node itself is focused.|
|`containsFocus`|A boolean indicating whether one of the descendants of the specified node is currently focused. This will return true if `active` is true.|

An example usage that opens a tooltip if the trigger is focused might look like this:

```typescript
class MyWidget extends WidgetBase<WidgetProperties> {
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

```typescript
class MyWidget extends WidgetBase<WidgetProperties> {
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

#### Matches

The `Matches` meta determines if the target of a DOM event matches a particular virtual DOM key.

```ts
const matches = this.meta(Matches).get('root', evt);
```

This allows a widget to not have to _know_ anything about the real DOM when dealing with events that may have bubbled
up from child DOM.  For example to determine if the containing node in the widget was clicked on, versus the child node,
you would do something like this:

```ts
class TestWidget extends WidgetBase<WidgetProperties> {
    private _onclick(evt: MouseEvent) {
        if (this.meta(Matches).get('root', evt)) {
            console.log('The root node was clicked on.');
        }
    }

    render() {
        const dimensions = this.meta(Matches).get('root');

        return v('div', {
            key: 'root'
            onclick: this._onclick
        }, [
            v('div', {
                innerHTML: 'Hello World'
            })
        ]);
    }
}
```

#### Resize

The resize observer meta uses the latest [`ResizeObserver`](https://wicg.github.io/ResizeObserver/) within Dojo 2 based widgets. [Native browser support](https://caniuse.com/#feat=resizeobserver) is currently provided by `Chrome 64+`, other Dojo supported browsers work via [polyfill](https://github.com/WICG/ResizeObserver/issues/3).

This allows you to observe resize events at the component level. The `meta` accepts an object of `predicate` functions which receive `ContentRect` dimensions and will be executed when a resize event has occured. The results are made available in a widget's `render` function. This is an incredibly powerful tool for creating responsive components and layouts.

```ts
function isMediumWidthPredicate(contentRect: ContentRect) {
    return contentRect.width < 500;
}

function isSmallHeightPredicate(contentRect: ContentRect) {
    return contentRect.height < 300;
}

class TestWidget extends WidgetBase<WidgetProperties> {
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

##### Implementing Custom Meta

You can create your own meta if you need access to DOM nodes.

```typescript
import MetaBase from "@dojo/widget-core/meta/Base";

class HtmlMeta extends MetaBase {
    get(key: string): string {
        const node = this.getNode(key);
        return node ? node.innerHTML : '';
    }
}
```

And you can use it like:

```typescript
class MyWidget extends WidgetBase<WidgetProperties> {
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

* `has` - A method that accepts a `key` and returns a `boolean` to denote if the corresponding node exists in the rendered DOM.
* `getNode` - A method that accepts a `key` string to inform the widget it needs a rendered DOM element corresponding to that key. If one is available, it will be returned immediately. If not, a callback is created which will invalidate the widget when the node becomes available. This uses the underlying `nodeHandler` event system.
* `invalidate` - A method that will invalidate the widget.
* `afterRender` - This provides a hook into the widget `afterRender` lifecycle that can be used to clear up any resources that the meta has created. This is used, for instance, in the `WebAnimation` meta to clear down unused animations.

Meta classes that require extra options should accept them in their methods.

```typescript
import MetaBase from "@dojo/widget-core/meta/Base";

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

### Inserting DOM nodes into the VDom Tree

The `dom()` function is used to wrap DOM that is created outside of Dojo 2. This is the only mechanism to integrate foreign DOM nodes into the virtual DOM system.

`dom()` works much like `v()` but instead of taking a `tag` it accepts an existing DOM node and creates a `VNode` that references the DOM node and the vdom system will reuse this node. Unlike `v()` a `diffType` can be passed that indicates the mode to use when determining if a property or attribute has changed and needs to be applied, the default is `none`.

* `none`: This mode will always pass an empty object as the previous `attributes` and `properties` so the `props` and `attrs` passed to `dom()` will always be applied.
* `dom`: This mode uses the `attributes` and `properties` from the DOM node for the diff.
* `vdom`: This mode will use the previous `VNode` for the diff, this is the mode used normally during the vdom rendering.

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
        click: () => { console.log('clicker'); }
    },
    diffType: 'none' | 'dom' | 'vdom'
});
```

### JSX Support

In addition to creating widgets functionally using the `v()` and `w()` functions from `@dojo/widget-core/d`, Dojo 2 optionally supports the use of the `jsx` syntax known as [`tsx`](https://www.typescriptlang.org/docs/handbook/jsx.html) in TypeScript.

To start to use `jsx` in your project, widgets need to be named with a `.tsx` extension and some configuration is required in the project's `tsconfig.json`:

Add the configuration options for `jsx`:

```js
"jsx": "react",
"jsxFactory": "tsx",
```

Include `.tsx` files in the project:

```js
 "include": [
     "./src/**/*.ts",
     "./src/**/*.tsx"
 ]
```

Once the project is configured, `tsx` can be used in a widget's `render` function simply by importing the `tsx` function as:

```ts
import { tsx } from '@dojo/widget-core/tsx';
```

```tsx
class MyWidgetWithTsx extends Themed(WidgetBase)<MyProperties> {
    protected render(): DNode {
        const { clear, properties: { completed, count, activeCount, activeFilter } } = this;

        return (
            <footer classes={this.theme(css.footer)}>
                <span classes={this.theme(css.count)}>
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

**Note:** Unfortunately `tsx` is not directly used within the module so the tsx module will report as an unused import, and will need to be ignored by linters.

### Web Components

Widgets can be turned into [Custom Elements](https://www.w3.org/TR/2016/WD-custom-elements-20161013/) with
minimal extra effort.

The `customElement` decorator can be used to annotate the widget class
that should be converted to a custom element,

```typescript
interface MyWidgetProperties {
	onClick: (event: Event) => void;
	foo: string;
	bar: string;
}

@customElement<MyWidgetProperties>({
	tag: 'my-widget',
	attributes: [ 'foo', 'bar' ],
	events: [ 'onClick' ]
})
class MyWidget extends WidgetBase<MyWidgetProperties> {
// ...
}
```

No additional steps are required. The custom element
can be used in your application automatically. The decorator can be provided
with configuration options to modify the functionality of the custom
element.

##### Attributes

An array of attribute names that should be set as properties on the widget.
The attribute name should be the same as the corresponding property on the widget.

##### Properties

An array of property names that will be accessible programmatically on the
custom element but not as attributes. The property name must match
the corresponding widget property.

##### Events

Some widgets have function properties, like events, that need to be exposed to your element. You can use the
`events` array to specify widget properties to map to DOM events.

```ts
{
    events: [ 'onChange' ]
}
```

This will add a property to `onChange` that will emit the `change` custom event. You can listen like any other
DOM event,

```ts
textWidget.addEventListener('change', function (event) {
    // do something
});
```

The name of the event is determined by removing the `'on'` prefix from the name
and lowercasing the resulting name.

##### Tag Name

Your widget will be registered with the browser using the provided tag name. The tag name **must** have a `-` in it.

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

It should be noted that children nodes are removed from the DOM when attached, and added as children to the widget instance.

## How Do I Contribute?

We appreciate your interest!  Please see the [Dojo Meta Repository](https://github.com/dojo/meta#readme) for the Contributing Guidelines.

### Code Style

This repository uses [`prettier`](https://prettier.io/) for code styling rules and formatting. A pre-commit hook is installed automatically and configured to run `prettier` against all staged files as per the configuration in the project's `package.json`.

An additional npm script to run `prettier` (with write set to `true`) against all `src` and `test` project files is available by running:

```bash
npm run prettier
```

### Setup Installation

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

### Benchmarks

To run the JavaScript benchmarks, run:

`npm run benchmark`

The benchmarking setup relies heavily on [js-framework-benchmark](https://github.com/krausest/js-framework-benchmark) from GitHub.

## Licensing Information

© 2018 [JS Foundation](https://js.foundation/). [New BSD](http://opensource.org/licenses/BSD-3-Clause) license.
