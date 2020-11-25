# Middleware fundamentals

Dojo provides a concept of render middleware to help bridge the gap between reactive, functional widgets and their underlying imperative DOM structure.

Certain web app requirements are best implemented when widgets have access to information about the DOM. Common examples are:

-   Responsive UIs that are not tied to specific device types but instead adapt to varying element sizes given available page real estate.
-   Lazy-loading data only when needed once certain elements become visible in a user's viewport - such as infinite scroll lists.
-   Directing element focus and responding to user focus changes

Middleware does not need to be tied to the DOM however; the concept can also be used for more generic concerns around a widget's rendering lifecycle. Common examples of such requirements are:

-   Caching data between renders when data retrieval is costly
-   Pausing and resuming widget rendering depending on certain conditionals; avoiding unnecessary rendering when required information is not available
-   Marking a functional widget as invalid so that Dojo can re-render it

A single middleware component typically exposes certain functionality associated with one or more of a widget's rendered DOM elements; often, the widget's root node. The middleware system provides widgets more advanced control over their representation and interaction within a browser, and also allows widgets to make use of several emerging web standards in a consistent manner.

Sensible defaults get returned if a widget accesses certain middleware properties before the widget's underlying DOM elements exist. There is also middleware that can pause a widget's rendering until certain conditions are met. Using these middleware, widgets can avoid unnecessary rendering until required information is available, and Dojo will then automatically re-render the affected widgets with accurate middleware properties once data becomes available.

## Creating middleware

Middleware is defined using the `create()` factory method from the `@dojo/framework/core/vdom` module. This process is similar to creating functional widgets, however, instead of returning VDOM nodes, middleware factories return an object with an appropriate API that allows access to the middleware's feature set. Simple middleware that only need a single function call to implement their requirements can also return a function directly, without needing to wrap the middleware in an object.

The following illustrates a middleware component with a trivial `get()`/`set()` API:

> src/middleware/myMiddleware.ts

```ts
import { create } from '@dojo/framework/core/vdom';

const factory = create();

export const myMiddleware = factory(() => {
	return {
		get() {},
		set() {}
	};
});

export default myMiddleware;
```

## Using middleware

Middleware is primarily used by functional widgets but can also get composed within other middleware to implement more complex requirements. In both cases, any required middleware gets passed as properties to the `create()` method, after which they are available via the `middleware` argument in the widget or middleware factory implementation function.

For example, the above `myMiddleware` can be used within a widget:

> src/widgets/MiddlewareConsumerWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import myMiddleware from '../middleware/myMiddleware';

const render = create({ myMiddleware });
export const MiddlewareConsumerWidget = render(({ middleware: { myMiddleware } }) => {
	myMiddleware.set();
	return <div>{`Middleware value: ${myMiddleware.get()}`}</div>;
});

export default MiddlewareConsumerWidget;
```

## Composing middleware

The following example shows middleware composing other middleware to implement more useful requirements:

-   Fetching a value from a local cache
-   Obtaining the value from an external location on a cache miss
-   Pausing further rendering of consuming widgets while waiting for the external value to return
-   Resuming rendering and invalidating consuming widgets so they can be re-rendered once the external value is made available through the local cache

> src/middleware/ValueCachingMiddleware.ts

```ts
import { create, defer } from '@dojo/framework/core/vdom';
import icache from '@dojo/framework/core/middleware/icache';

const factory = create({ defer, icache });

export const ValueCachingMiddleware = factory(({ middleware: { defer, icache }}) => {
	get(key: string) {
		const cachedValue = icache.get(key);
		if (cachedValue) {
			return cachedValue;
		}
		// Cache miss: fetch the value somehow through a promise
		const promise = fetchExternalValue(value);
		// Pause further widget rendering
		defer.pause();
		promise.then((result) => {
			// Cache the value for subsequent renderings
			icache.set(key, result);
			// Resume widget rendering once the value is available
			defer.resume();
		});
		return null;
	}
});

export default ValueCachingMiddleware;
```

## Passing properties to middleware

As middleware gets defined via the `create()` utility function, a properties interface can also be given in the same way as specifying property interfaces for functional widgets. The main difference is that middleware properties are added to the properties interface of any consuming widgets. This means property values are given when instantiating the widgets, not when widgets make use of the middleware. Properties are considered read-only throughout the entire composition hierarchy, so middleware cannot alter property values.

The following is an example of middleware with a properties interface:

> src/middleware/middlewareWithProperties.tsx

```ts
import { create } from '@dojo/framework/core/vdom';

const factory = create().properties<{ conditional?: boolean }>();

export const middlewareWithProperties = factory(({ properties }) => {
	return {
		getConditionalState() {
			return properties().conditional ? 'Conditional is true' : 'Conditional is false';
		}
	};
});

export default middlewareWithProperties;
```

This middleware and its property can get used in a widget:

> src/widgets/MiddlewarePropertiesWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import middlewareWithProperties from '../middleware/middlewareWithProperties';

const render = create({ middlewareWithProperties });
export const MiddlewarePropertiesWidget = render(({ properties, middleware: { middlewareWithProperties } }) => {
	return (
		<virtual>
			<div>{`Middleware property value: ${properties().conditional}`}</div>
			<div>{`Middleware property usage: ${middlewareWithProperties.getConditionalState()}`}</div>
		</virtual>
	);
});

export default MiddlewarePropertiesWidget;
```

The value for the middleware `conditional` property is then specified when creating instances of `MiddlewarePropertiesWidget`, for example:

> src/main.tsx

```tsx
import renderer, { tsx } from '@dojo/framework/core/vdom';
import MiddlewarePropertiesWidget from './widgets/MiddlewarePropertiesWidget';

const r = renderer(() => <MiddlewarePropertiesWidget conditional={true} />);
r.mount();
```

# Available middleware

Dojo provides a variety of optional middleware that widgets can include when needing to implement specific requirements.

## `icache`

A middleware that uses the [`invalidator`](/learn/middleware/core-render-middleware#invalidator) middleware functionality to provide a cache that supports lazy value resolution and automatic widget invalidation once a value becomes available. By default the cache will invalidate when a value is set in the cache, however there is an optional third argument on the set APIs that can be used to skip the invalidation when required.

**API:**

```ts
import icache from '@dojo/framework/core/middleware/icache';
```

-   `icache.getOrSet<T = any>(key: any, value: any, invalidate: boolean = true): T | undefined`
    -   Retrieves the cached value for the given `key`, if one exists, otherwise `value` is set. In both instances, `undefined` is returned if the cached value has not yet been resolved.
-   `icache.get<T = any>(key: any): T | undefined`
    -   Retrieves the cached value for the given `key`, or `undefined` if either no value has been set, or if the value is still pending resolution.
-   `icache.set(key: any, value: any, invalidate: boolean = true): any`
    -   Sets the provided `value` for the given `key`. If `value` is a function, it will be invoked in order to obtain the actual value to cache. If the function returns a promise, a 'pending' value will be cached until the final value is fully resolved. In all scenarios, once a value is available and has been stored in the cache, the widget will be marked as invalid so it can be re-rendered with the final value available.
-   `icache.has(key: any): boolean`
    -   Returns `true` or `false` based in whether the key is set in the cache.
-   `icache.delete(key: any, invalidate: boolean = true): void`
    -   Remove the item from the cache.
-   `icache.clear(invalidate: boolean = true)`
    -   Clears all values currently stored in the widget's local cache.
-   `icache.pending(key: string)`
    -   Returns the status of async setters for the key

The current cache value is passed when a function is passed to `icache.set`, the example below demonstrates using the current value to for an incrementing number.

```tsx
icache.set('key', (current) => {
	if (current) {
		return current + 1;
	}
	return 1;
});
```

`icache` can be typed in two different ways. One approach uses generics to enable the return type to get specified at the call-site, and for `getOrSet`, the return type can get inferred from the value type. If the `value` for `getOrSet` is a function then the type will get inferred from the functions return type.

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import icache from '@dojo/framework/core/middleware/icache';

const factory = create({ icache });

interface FetchResult {
	foo: string;
}

const MyIcacheWidget = factory(function MyIcacheWidget({ middleware: { icache } }) {
	// `results` will infer the type of the resolved promise, `FetchResult | undefined`
	const results = icache.getOrSet('key', async () => {
		const response = await fetch('url');
		const body: FetchResult = await response.json();
		return body;
	});

	return <div>{results}</div>;
});
```

However this approach doesn't provide any typing for the cache keys. The preferred way to type `icache` is to create a pre-typed middleware using `createICacheMiddleware`. This allows for passing an interface which will create an `icache` middleware typed specifically for the passed interface and provides type safety for the cache keys.

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { createICacheMiddleware } from '@dojo/framework/core/middleware/icache';

interface FetchResult {
	foo: string;
}

interface MyIcacheWidgetState {
	key: FetchResult;
}

const icache = createICacheMiddleware<MyIcacheWidgetState>();
const factory = create({ icache });

const MyIcacheWidget = factory(function MyIcacheWidget({ middleware: { icache } }) {
	// `results` will be typed to `FetchResult | undefined` based on the `MyIcacheWidgetState`
	const results = icache.getOrSet('key', async () => {
		const response = await fetch('url');
		const body: FetchResult = await response.json();
		return body;
	});

	return <div>{results}</div>;
});
```

## `theme`

Allows widgets to theme their CSS classes when rendering, and also provides applications the ability to set themes and determine what the currently set theme is, if any.

Described in detail in the [Dojo Styling and Theming reference guide](/learn/styling/theming-a-dojo-application#making-themeable-widgets).

**API:**

```ts
import theme from '@dojo/framework/core/middleware/theme';
```

-   `theme.classes<T extends ClassNames>(css: T): T`
    -   Widgets can pass in one or more of their CSS class names and will receive back updated names for the currently set theme that can be used when returning widget virtual nodes.
-   `theme.set(css: Theme)`
    -   Allows applications to set a specific theme.
-   `theme.get(): Theme | undefined`
    -   Returns the currently set theme, or `undefined` if no theme has been set. Typically used within an application's root widget.

## `i18n`

Allows widgets to localize their message text when rendering, and also provides applications the ability to set a locale and determine what the currently set locale is, if any.

Described in detail in the [Dojo Internationalization reference guide](/learn/i18n/internationalizing-a-dojo-application).

**API:**

```ts
import i18n from '@dojo/framework/core/middleware/i18n';
```

-   `i18n.localize<T extends Messages>(bundle: Bundle<T>, useDefaults = false): LocalizedMessages<T>`
    -   Returns a set of messages out of the specified `bundle` that are localized to the currently set locale. `useDefaults` controls whether messages from the default language are returned when corresponding values are not available for the current locale. Defaults to `false` in which case empty values are returned instead of messages in the default language.
-   `i18n.set(localeData?: LocaleData)`
    -   Allows applications to set a specific locale.
-   `i18n.get()`
    -   Returns the currently-set locale, or `undefined` if no locale has been set. Typically used within an application's root widget.

## `dimensions`

Provides various size and position information about a widget's underlying nodes.

**API:**

```ts
import dimensions from '@dojo/framework/core/middleware/dimensions';
```

-   `dimensions.get(key: string | number): Readonly<DimensionResults>`
    -   Returns dimension information for the widget's specified DOM element, identified by the node's `key` property. If the node does not exist for the current widget (either has not yet been rendered or an invalid key was specified), all returned values are `0`.

The returned `DimensionResults` contains the following properties, mapped from the specified DOM element's sources:

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

## `intersection`

Provides information on whether a node is visible in a particular viewport using the [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API).

As the Intersection Observer API is still an emerging web standard, the framework automatically ensures the underlying API is made available when running an application in a browser that does not yet support it. Note that as of the v6 release of Dojo Framework, the [Intersection Observer API v2](https://w3c.github.io/IntersectionObserver/v2/) is not yet supported.

**API:**

```ts
import intersection from '@dojo/framework/core/middleware/intersection';
```

-   `intersection.get(key: string | number, options: IntersectionGetOptions = {}): IntersectionResult`
    -   Returns intersection information for the widget's specified DOM element, identified by the node's `key` property. If the node does not exist for the current widget (either has not yet been rendered or an invalid key was specified), a result is returned indicating zero intersection.

The `options` argument allows for more control on how intersection gets calculated. The available fields are the same as those for the [intersection observer API options](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API#Intersection_observer_options).

`IntersectionResult` properties:

| Property            | Type      | Description                                                                                                                                                                                                                                     |
| ------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `intersectionRatio` | `number`  | The ratio of the element's bounding box that is intersecting the root element's viewport, from `0.0` to `1.0`. By default the root element is considered the browser's viewport unless an element is specified via the `options.root` argument. |
| `isIntersecting`    | `boolean` | A value of `true` indicates that the target element intersects with the root element's viewport (representing a transition into a state of intersection). A value of `false` indicates a transition from intersecting to not-intersecting.      |

## `resize`

Allows a widget to respond to resize events of its DOM nodes using a [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver), and provides updated information on the node's new size when a resize occurs. Using this middleware is an effective way of creating applications that are responsive across a variety of viewport sizes.

As Resize Observer is still an emerging web standard, the framework automatically ensures the underlying API is made available when running an application in a browser that does not yet support it.

**API:**

```ts
import resize from '@dojo/framework/core/middleware/resize';
```

-   `resize.get(key: string | number): DOMRectReadOnly | null`
    -   Returns size information for the widget's specified DOM element, identified by the node's `key` property. If the node does not exist for the current widget (either has not yet been rendered or an invalid key was specified), `null` is returned. The returned object is a standard [`DOMRectReadOnly`](https://developer.mozilla.org/en-US/docs/Web/API/DOMRectReadOnly) structure.

## `breakpoint`

Allows widgets to determine a specific width breakpoint that is matched given the current width of one of their virtual nodes. This middleware is useful when creating widgets that can adapt to a variety of display widths, such as widgets that work at both mobile and desktop resolutions.

Composes the [`resize`](/learn/middleware/available-middleware#resize) middleware to obtain the element width and to automatically invalidate the widget when its width is adjusted.

**Note:** If no custom width breakpoints are given, Dojo will default to the following set:

-   `SM`: 0
-   `MD`: 576
-   `LG`: 768
-   `XL`: 960

**API:**

```ts
import breakpoint from '@dojo/framework/core/middleware/breakpoint';
```

```ts
interface Breakpoints {
	[index: string]: number;
}
```

-   `breakpoint.get(key: string | number, breakpoints: Breakpoints = defaultBreakpoints)`
    -   Returns the breakpoint that the widget's specified output node (identified by its `key`) matches, given the node's current width. Custom breakpoints can be provided through the `breakpoints` argument. The return value is an object containing a `breakpoint` property, identifying the name of the breakpoint that was matched, and a `contentRect` property which contains the same value as calling `resize.get(key)` would return.

When using the same set of breakpoints in many locations, it is easier to define the set once rather than needing to pass it to every `breakpoint.get()` call. Applications can define their own custom breakpoint middleware with appropriate defaults via:

> src/middleware/myCustomBreakpoint.ts

```ts
import { createBreakpointMiddleware } from '@dojo/framework/core/middleware/breakpoint';

const myCustomBreakpoint = createBreakpointMiddleware({ Narrow: 0, Wide: 500 });

export default myCustomBreakpoint;
```

## `inert`

Enables setting the [`inert`](https://html.spec.whatwg.org/multipage/interaction.html#inert) property on a node by `key`. This will ensure that the node in question does not respond to actions such as focus, mouse event etc. For scenarios such as a dialog that is attached to the `document.body`, `inert` can be inverted onto all the siblings of the `key`s node.

**API:**

```ts
import inert from '@dojo/framework/core/middleware/inert';
```

-   `inert.set(key: string | number, enable: boolean, invert: boolean = false): void;`
    -   Sets inert to the requested value for the node. When `invert` is passed the value will be set on all node's siblings.

> src/widgets/Dialog.tsx

```tsx
import { tsx, create } from '@dojo/framework/core/vdom';
import inert from '@dojo/framework/core/middleware/inert';
import icache from '@dojo/framework/core/middleware/icache';

import * as css from './App.m.css';

const dialogFactory = create({ inert, icache }).properties<{
	open: boolean;
	onRequestClose: () => void;
}>();

const Dialog = dialogFactory(function Dialog({ children, properties, middleware: { inert } }) {
	const { open } = properties();

	inert.set('dialog', open, true);

	if (!open) {
		return null;
	}

	return (
		<body>
			<div
				key="dialog"
				styles={{
					background: 'red',
					width: '400px',
					height: '400px',
					marginLeft: '-200px',
					marginTop: '-200px',
					position: 'absolute',
					left: '50%',
					top: '50%'
				}}
			>
				<button
					onclick={() => {
						properties().onRequestClose();
					}}
				>
					Close
				</button>
				{children()}
			</div>
		</body>
	);
});

const factory = create({ icache });

export default factory(function App({ middleware: { icache } }) {
	return (
		<div classes={[css.root]}>
			<input />
			<button
				onclick={() => {
					icache.set('open', true);
				}}
			>
				Open
			</button>
			<Dialog
				open={icache.getOrSet('open', false)}
				onRequestClose={() => {
					icache.set('open', false);
				}}
			>
				<div>
					<input />
					<input />
					<button>button</button>
					Content
				</div>
			</Dialog>
		</div>
	);
});
```

## `store`

Provides widgets access to their externalized state when using the Dojo stores component.

Described in detail in the [Dojo Stores reference guide](/learn/stores/introduction).

**API:**

```ts
import store from '@dojo/framework/core/middleware/store';
```

-   `store.get<U = any>(path: Path<S, U>): U`
    -   Retrieves the value from the store at the specified `path`. The composing widget will also be invalidated and re-rendered when the associated value is changed.
-   `store.path(path: any, ...segments: any): StatePaths<S>`
    -   Returns a store path beginning at a specified root with a number of additional segments.
-   `store.at<U = any>(path: Path<S, U[]>, index: number)`
    -   Returns a store path that includes a numeric index when accessing stored array values.
-   `store.executor<T extends Process<any, any>>(process: T): ReturnType<T>`
    -   Executes the given `process` within the composing widget's store and returns the result.

## `focus`

Allows widgets to inspect and control focus amongst their resulting DOM output when combined with the [VDOM focus primitives](/learn/creating-widgets/enabling-interactivity#handling-focus).

**API:**

```ts
import focus from '@dojo/framework/core/middleware/focus';
```

-   `focus.shouldFocus(): boolean`
    -   Returns `true` if focus should be specified within the current render cycle. Will only return `true` once, after which `false` is returned from future calls until `focus.focus()` is called again. This function is typically passed as the `focus` property to a specific VDOM node, allowing the widget to direct where focus should be applied.
-   `focus.focus()`
    -   Can be called to indicate that the widget or one of its children requires focus in the next render cycle. This function is typically passed as the `onfocus` event handler to outputted VDOM nodes, allowing widgets to respond to user-driven focus change events.
-   `focus.isFocused(key: string | number): boolean`
    -   Returns `true` if the widget's VDOM node identified by the specified `key` currently has focus. Returns `false` if the relevant VDOM node does not have focus, or does not exist for the current widget.

### Focus delegation example

The following shows an example of delegating and controlling focus across a widget hierarchy and output VNodes:

> src/widgets/FocusableWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import focus from '@dojo/framework/core/middleware/focus';
import icache from '@dojo/framework/core/middleware/icache';

/*
	The input's `onfocus()` event handler is assigned to a method passed in
	from a parent widget, via the child's create().properties<MyPropertiesInterface>
	API, allowing user-driven focus changes to propagate back into the application.
*/
const childFactory = create({ focus }).properties<{ onfocus: () => void }>();

const FocusInputChild = childFactory(function FocusInputChild({ middleware: { focus }, properties }) {
	const { onfocus } = properties();
	return <input onfocus={onfocus} focus={focus.shouldFocus} />;
});

const factory = create({ focus, icache });

export default factory(function FocusableWidget({ middleware: { focus, icache } }) {
	const keyWithFocus = icache.get('key-with-focus') || 0;

	const childCount = 5;
	function focusPreviousChild() {
		let newKeyToFocus = (icache.get('key-with-focus') || 0) - 1;
		if (newKeyToFocus < 0) {
			newKeyToFocus = childCount - 1;
		}
		icache.set('key-with-focus', newKeyToFocus);
		focus.focus();
	}
	function focusNextChild() {
		let newKeyToFocus = (icache.get('key-with-focus') || 0) + 1;
		if (newKeyToFocus >= childCount) {
			newKeyToFocus = 0;
		}
		icache.set('key-with-focus', newKeyToFocus);
		focus.focus();
	}
	function focusChild(key: number) {
		icache.set('key-with-focus', key);
		focus.focus();
	}

	return (
		<div>
			<button onclick={focusPreviousChild}>Previous</button>
			<button onclick={focusNextChild}>Next</button>
			<FocusInputChild
				key="0"
				onfocus={() => focusChild(0)}
				focus={keyWithFocus == 0 ? focus.shouldFocus : undefined}
			/>
			<FocusInputChild
				key="1"
				onfocus={() => focusChild(1)}
				focus={keyWithFocus == 1 ? focus.shouldFocus : undefined}
			/>
			<FocusInputChild
				key="2"
				onfocus={() => focusChild(2)}
				focus={keyWithFocus == 2 ? focus.shouldFocus : undefined}
			/>
			<FocusInputChild
				key="3"
				onfocus={() => focusChild(3)}
				focus={keyWithFocus == 3 ? focus.shouldFocus : undefined}
			/>
			<FocusInputChild
				key="4"
				onfocus={() => focusChild(4)}
				focus={keyWithFocus == 4 ? focus.shouldFocus : undefined}
			/>
		</div>
	);
});
```

## `validity`

Allows retrieving information specifically about a node's [validity state](https://developer.mozilla.org/en-US/docs/Web/API/ValidityState) which is useful for using the browser's built-in methods for validating form inputs and providing locale-based error messages.

**API:**

```ts
import validity from '@dojo/framework/core/middleware/validity';
```

-   `validity.get(key: string, value: string)` - Return the validity state for the DOM element, identified by the node's `key` property. Returns `{ valid: undefined, message: '' }` if the specified DOM element does not exist for the current widget. Otherwise, it returns a `ValidityState` object.

The `ValidityState` object contains the following properties:

| Property            | Type      | Description                                                                                                                       |
| ------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `valid`             | `boolean` | The value of the node's `validity.valid` property, stating whether the value of the node meets all of the validation constraints. |
| `validationMessage` | `string`  | The value of the node's `validationMessage` property, a localized message describing the failing constraints of the node's value. |

## `injector`

Allows retrieving injectors from the Dojo registry and assigning invalidation callback functions to then.

**Note:** Injectors and the registry are advanced concepts not typically required when writing Dojo applications. They are mainly used internally by the framework to implement more advanced user-facing functionality such as [Dojo stores](/learn/stores/introduction).

**API:**

```ts
import injector from '@dojo/framework/core/middleware/injector';
```

-   `injector.subscribe(label: RegistryLabel, callback: Function = invalidator)`
    -   Subscribes the given `callback` invalidation function against the specified registry `label` injector (if one exists). If a `callback` is not specified, the [`invalidator`](/learn/middleware/core-render-middleware#invalidator) middleware is used by default so that the current widget will be marked as invalid and re-rendered when the injector makes its data available.
-   `injector.get<T>(label: RegistryLabel): T | null`
    -   Retrieves the current injector associated with the given registry `label`, or `null` if no such injector exists.

## `block`

Allows widgets to execute modules known as **blocks** within Node.js at build time. Typically used as part of build-time rendering.

Described in detail in the [Building reference guide](/learn/building/buildtime-rendering).

**API:**

```ts
import block from '@dojo/framework/core/middleware/block';
```

-   `block<T extends (...args: any[]) => any>(module: T)`
    -   Executes the specified block module and returns its result.

# Core render middleware

The `@dojo/framework/core/vdom` module includes foundational middleware that is useful across the majority of Dojo applications. These are mainly useful when building other custom middleware (they underpin the [additional middleware](/learn/middleware/available-middleware) offered by the framework), but can occasionally be useful in general widget development.

## `invalidator`

The most important middleware which provides a hook into a widget's invalidation lifecycle. Calling `invalidator()` will queue the widget for rendering during the next scheduled render.

**API:**

```ts
import { invalidator } from '@dojo/framework/core/vdom';
```

-   `invalidator()`
    -   Marks the consuming widget as invalid and requiring a re-render.

## `node`

Provides widgets access to their underlying DOM nodes, identified by node `key`s. When a valid DOM node is requested but unavailable, Dojo will re-render the widget as soon as the DOM node becomes available.

**API:**

```ts
import { node } from '@dojo/framework/core/vdom';
```

-   `node.get(key: string | number): HTMLElement | null`
    -   Returns the widget's specified DOM element, identified by the node's `key` property. Returns `null` if the specified DOM element does not exist for the current widget.

## `diffProperty`

Allows widgets fine-grained control over difference detection by registering their own diff function for a specified property. The function will be called by the framework when attempting to re-render a widget, in order to determine if any changes have been made that require a full re-render to take place. If no differences are detected across a widget's properties set, the update is skipped and any existing DOM nodes remain as-is.

Writing custom diff functions is typically coupled with use of the [`invalidator`](/learn/middleware/core-render-middleware#invalidator) middleware to flag the current widget as invalid when a difference in property values requires the widget's DOM nodes to be updated.

An additional use for `diffProperty` is to be able to return a value that will be available from the widget properties. A value that is returned from the `callback` is used to replace the corresponding value on the widget's properties.

**Note:** Only a single diff function can be registered for a given property during the lifetime of a composing widget or middleware, after which subsequent calls will be ignored. By default the rendering engine uses an algorithm that shallowly diffs objects and arrays, ignores functions, and equality checks all other property types. Setting a custom diff function overrides Dojo's default difference detection strategy for the property.

**API:**

```ts
import { diffProperty } from '@dojo/framework/core/vdom';
```

-   `diffProperty(propertyName: string, properties: () => WidgetProperties (current: WidgetProperties, next: WidgetProperties) => void | WidgetProperties[propertyName])`
    -   Registers the specified `diff` function that is called to determine if any differences exist between the `current` and `next` values of the widget's `propertyName` property. The function uses the `properties` function to determine the available properties and the typings of the callback, both the parameters and the return value.

**Example:**

> src/customMiddleware.tsx

````tsx
import { create, diffProperty } from '@dojo/framework/core/vdom';

const factory = create({ diffProperty }).properties<{ foo?: string }>;

export const customMiddleware = factory(({ properties, middleware: { diffProperty } }) => {
	diffProperty('foo', properties, (current, next) => {
		if (!next.foo) {
			return 'default foo';
		}
	});
	// The rest of the custom middleware that defines the API
});

## `destroy`

Assigns a function that is called on widget destruction, allowing any required resource teardown to take place.

**Note:** `destroy()` can only be called once for each composing widget or middleware, after which further calls will be ignored. For advanced scenarios that need to conditionally add handles for execution when a widget is removed, a single destroy function should be registered that can keep track of and iteratively destroy all necessary resources.

**API:**

```ts
import { destroy } from '@dojo/framework/core/vdom';
````

-   `destroy(destroyFunction: () => void)`
    -   Sets the `destroyFunction` that will be called when the current widget is destroyed. Setting a function will override any destroy function previously set for the widget.

## `getRegistry`

Provides access to the widget's own `Registry` instance, as well as the root application `Registry` if required, via a handler interface.

**Note:** The registry is an advanced concept not typically required when writing Dojo applications. It is mainly used internally by the framework to implement more advanced user-facing functionality such as [Dojo stores](/learn/stores/introduction).

**API:**

```ts
import { getRegistry } from '@dojo/framework/core/vdom';
```

-   `getRegistry(): RegistryHandler | null`
    -   Returns the `RegistryHandler` for the current widget, or `null` if the widget has not yet been fully initialized.

## `defer`

Allows widgets to pause and resume their rendering logic; useful when short-circuiting rendering until certain conditions are met.

**API:**

```ts
import { defer } from '@dojo/framework/core/vdom';
```

-   `defer.pause()`
    -   Pauses further rendering of the current widget until flagged otherwise.
-   `defer.resume()`
    -   Resumes widget rendering.
