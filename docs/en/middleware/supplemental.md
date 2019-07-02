# Dojo middleware concepts

Dojo provides a concept of render middleware to help bridge the gap between reactive, functional widgets and their underlying imperative DOM structure.

Certain web app requirements are best implemented when widgets have access to information about the DOM. Common examples are:

-   Responsive UIs that are not tied to specific device types but instead adapt to varying element sizes given available page real estate.
-   Lazy-loading data only when needed once certain elements become visible in the users' viewport - such as infinite scroll lists.
-   Directing element focus and responding to user focus changes

Middleware does not need to be tied to the DOM however; the concept can also be used for more generic concerns around a widget's rendering lifecycle. Common examples of such requirements are:

-   Caching data between renders when data retrieval is costly
-   Pausing and resuming widget rendering depending on certain conditionals; avoiding unnecessary rendering when required information is not available
-   Marking a functional widget as invalid so that Dojo can re-render it

A single middleware component typically exposes certain functionality associated with one or more of a widget's rendered DOM elements; often, the widget's root node. The middleware system provides widgets more advanced control over their representation and interaction within a browser, and also allows them to make use of several upcoming web standards in a consistent manner.

Sensible defaults will be returned if a widget accesses certain middleware properties before the widget's underlying DOM elements exist. There is also middleware that can pause a widget's rendering until certain conditions are met. Using these, widgets can avoid unnecessary rendering until required information is available, and Dojo will then automatically re-render the affected widgets with accurate middleware properties once data becomes available.

## Creating middleware

Middleware is defined using the `create()` factory method from the `@dojo/framework/core/vdom` module. This process is similar to creating functional widgets, however instead of returning VDOM nodes, middleware factories return an object with an appropriate API that allows access to the middleware's feature set. Simple middleware that only need a single function call to implement their requirements can also return a function directly, without needing to wrap it in an object.

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

Middleware is primarily used by functional widgets but can also be composed within other middleware to implement more complex requirements. In both cases, any required middleware is passed as properties to the `create()` method, after which they are available via the `middleware` argument in the widget or middleware factory implementation function.

For example, the above `myMiddleware` can be used within a widget as follows:

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
-   Pausing further rendering of consuming widgets while waiting for the external value to come back
-   Resuming rendering and invalidating consuming widgets so they can be re-rendered once the external value is made available through the local cache

> src/middleware/ValueCachingMiddleware.ts

```ts
import { create, defer, invalidator } from '@dojo/framework/core/vdom';
import { cache } from '@dojo/framework/core/middleware/cache';

const factory = create({ defer, cache });

export const ValueCachingMiddleware = factory(({ middleware: { defer, cache, invalidator }}) => {
	get(key: string) {
		const cachedValue = cache.get(key);
		if (cachedValue) {
			return cachedValue;
		}
		// Cache miss: fetch the value somehow through a promise
		const promise = fetchExternalValue(value);
		// Pause further widget rendering
		defer.pause();
		promise.then((result) => {
			// Cache the value for subsequent renderings
			cache.set(key, result);
			// Resume widget rendering once the value is available
			defer.resume();
			// Invalidate the widget for a re-render
			invalidator();
		});
		return null;
	}
});

export default ValueCachingMiddleware;
```

## Passing properties to middleware

As middleware is defined via the `create()` utility function, a properties interface can also be given in the same way as specifying property interfaces for functional widgets. The main difference however is that middleware properties are added to the properties interface of any consuming widgets. This means property values are given when instantiating the widgets, not when widgets make use of the middleware. Properties are considered read-only throughout the whole composition hierarchy, so middleware cannot alter property values.

The following is an example of middleware with a properties interface:

> src/middleware/middlewareWithProperties.tsx

```ts
import { create } from '@dojo/framework/core/vdom';

const factory = create().properties<{ conditional?: boolean }>();

export const middlewareWithProperties = factory(({ properties }) => {
	return {
		getConditionalState() {
			return properties.conditional ? 'Conditional is true' : 'Conditional is false';
		}
	};
});

export default middlewareWithProperties;
```

This middleware and its property can be used in a widget such as:

> src/widgets/MiddlewarePropertiesWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import middlewareWithProperties from '../middleware/middlewareWithProperties';

const render = create({ middlewareWithProperties });
export const MiddlewarePropertiesWidget = render(({ properties, middleware: { middlewareWithProperties } }) => {
	return (
		<div>
			<div>{`Middleware property value: ${properties.conditional}`}</div>
			<div>{`Middleware property usage: ${middlewareWithProperties.getConditionalState()}`}</div>
		</div>
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

# List of available middleware

Dojo provides a variety of middleware within the framework that implement many useful enterprise-grade web application requirements.

## Core render middleware

The `@dojo/framework/core/vdom` module includes foundational middleware that is useful across the majority of Dojo applications. These are mainly useful when building other custom middleware (they underpin the [additional middleware](#optional-middleware) offered by the framework), but can occasionally be useful in general widget development.

### `invalidator`

Allows widgets to flag themselves as invalid so that Dojo can re-render them.

**API:**

```ts
import invalidator from '@dojo/framework/core/vdom';
```

-   `invalidator()`
    -   Marks the consuming widget as invalid and requiring a re-render.

### `node`

Provides widgets access to their underlying DOM nodes.

**API:**

```ts
import node from '@dojo/framework/core/vdom';
```

-   `node.get(key: string | number): HTMLElement | null`
    -   Returns the widget's specified DOM element, identified by the node's `key` property. Returns `null` if the specified DOM element does not exist for the current widget.

### `defer`

Allows widgets to pause and resume their rendering logic; useful when short-circuiting rendering until certain conditions are met.

**API:**

```ts
import defer from '@dojo/framework/core/vdom';
```

-   `defer.pause()`
    -   Pauses further rendering of the current widget until flagged otherwise.
-   `defer.resume()`
    -   Resumes widget rendering.

### `diffProperty`

Allows widgets fine-grained control over difference detection by registering their own diff function for a specified property. The function will be called by the framework when attempting to re-render a widget, in order to determine if any changes have been made that require a full re-render to take place. If no differences are detected across a widget's properties set, the update is skipped and any existing DOM nodes remain as-is.

**Note:** Only a single diff function can be registered for a given property at any given time. Setting a custom diff function overrides Dojo's default difference detection strategy for the property.

**API:**

```ts
import diffProperty from '@dojo/framework/core/vdom';
```

-   `diffProperty(propertyName: string, diff: (current: any, next: any) => void)`
    -   Registers the specified `diff` function that is called to determine if any differences exist between the `current` and `next` values of the widget's `propertyName` property. Writing custom diff functions is typically coupled with use of the [`invalidator`](#invalidator) middleware to flag the current widget as invalid when a difference in property values requires the widget's DOM nodes to be updated.

### `destroy`

Assigns a function that is called on widget destruction, allowing any required resource teardown to take place.

**Note:** Only a single destroy function can be registered for a given widget. If widgets require multiple resources to be torn down, the registered function should keep track of and iteratively destroy all necessary resources.

**API:**

```ts
import destroy from '@dojo/framework/core/vdom';
```

-   `destroy(destroyFunction: () => void)`
    -   Sets the `destroyFunction` that will be called when the current widget is destroyed. Setting a function will override any destroy function previously set for the widget.

### `getRegistry`

Provides access to the widget's own `Registry` instance, as well as the root application `Registry` if required, via a handler interface.

**Note:** The registry is an advanced concept not typically required when writing Dojo applications. It is mainly used internally by the framework to implement more advanced user-facing functionality such as [Dojo stores](../stores/basic-usage.md).

**API:**

```ts
import getRegistry from '@dojo/framework/core/vdom';
```

-   `getRegistry(): RegistryHandler | null`
    -   Returns the `RegistryHandler` for the current widget, or `null` if the widget has not yet been fully initialized.

## Optional middleware

Dojo provides a variety of optional middleware that widgets can include when needing to implement specific requirements.

### `block`

TODO - covered elsewhere

**API:**

```ts
import block from '@dojo/framework/core/middleware/block';
```

### `cache`

Provides a simple widget-scoped cache that can persist small amounts of data between widget renders.

**API:**

```ts
import cache from '@dojo/framework/core/middleware/cache';
```

-   `cache.get<T = any>(key: any): T | null`
    -   Retrieves the currently cached value for the specified `key`, or `null` on a cache miss.
-   `cache.set<T = any>(key: any, value: T)`
    -   Stores the provided `value` in the cache against the specified `key`.
-   `cache.clear()`
    -   Clears all values currently stored in the widget's local cache.

### `dimensions`

Provides various size and position information about a widget's underlying nodes.

**API:**

```ts
import dimensions from '@dojo/framework/core/middleware/dimensions';
```

-   `dimensions.get(key: string | number): Readonly<DimensionResults>`
    -   Returns dimension information for the widget's specified DOM element, identified by the node's `key` property. If the node does not exist for the current widget (either has not yet been rendered or an invalid key was specified), all returned values will be `0`.

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

### `focus`

Allows widgets to inspect and control focus amongst their resulting DOM output when combined with the [VDOM focus primitives](../creating-widgets/supplemental.md#handling-focus).

**API:**

```ts
import focus from '@dojo/framework/core/middleware/focus';
```

-   `focus.shouldFocus(): boolean`
    -   Returns `true` if focus should be specified within the current render cycle. Will only return `true` once, after which `false` is returned from future calls until `focus.focus()` is called again. This function is typically passed as the [`focus` property](../creating-widgets/supplemental.md#handling-focus) to a specific VDOM node, allowing the widget to direct where focus should be applied.
-   `focus.focus()`
    -   Can be called to indicate that the widget or one of its children requires focus in the next render cycle. This function is typically passed as the `onfocus` event handler to outputted VDOM nodes, allowing widgets to respond to user-driven focus change events.
-   `focus.isFocused(key: string | number): boolean`
    -   Returns `true` if the widget's VDOM node identified by the specified `key` currently has focus. Returns `false` if the relevant VDOM node does not have focus, or does not exist for the current widget.

### `i18n`

TODO - covered elsewhere

**API:**

```ts
import i18n from '@dojo/framework/core/middleware/i18n';
```

### `icache`

Composes [`cache`](#cache) and [`invalidator`](#invalidator) middleware functionality to provide a cache that supports lazy value resolution and automatic widget invalidation once a value becomes available.

**API:**

```ts
import icache from '@dojo/framework/core/middleware/icache';
```

-   `icache.getOrSet<T = any>(key: any, value: any): T | undefined`
    -   Retrieves the cached value for the given `key`, if one exists, otherwise `value` is set. In both instances, `undefined` is returned if the cached value has not yet been resolved.
-   `icache.get<T = any>(key: any): T | undefined`
    -   Retrieves the cached value for the given `key`, or `undefined` if either no value has been set, or if the value is still pending resolution.
-   `icache.set(key: any, value: any)`
    -   Sets the provided `value` for the given `key`. If `value` is a function, it will be invoked in order to obtain the actual value to cache. If the function returns a promise, a 'pending' value will be cached until the final value is fully resolved. In all scenarios, once a value is available and has been stored in the cache, the widget will be marked as invalid so it can be re-rendered with the final value available.
-	`clear()`
    -   Clears all values currently stored in the widget's local cache.

### `injector`

Allows retrieving injectors from the Dojo registry and assigning invalidation callback functions to then.

**Note:** Injectors and the registry are advanced concepts not typically required when writing Dojo applications. They are mainly used internally by the framework to implement more advanced user-facing functionality such as [Dojo stores](../stores/basic-usage.md).

**API:**

```ts
import injector from '@dojo/framework/core/middleware/injector';
```

-   `injector.subscribe(label: RegistryLabel, callback: Function = invalidator)`
    -   Subscribes the given `callback` invalidation function against the specified registry `label` injector (if one exists). If a `callback` is not specified, the [`invalidator`](#invalidator) middleware is used by default so that the current widget will be marked as invalid and re-rendered when the injector makes its data available.
-   `injector.get<T>(label: RegistryLabel): T | null`
    -   Retrieves the current injector associated with the given registry `label`, or `null` if no such injector exists.

### `intersection`

Provides information on whether a node is visible in a particular viewport using the [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API).

As this is still an upcoming web standard, the framework automatically ensures the underlying API is made available when running an application in a browser that does not yet support it.

**API:**

```ts
import intersection from '@dojo/framework/core/middleware/intersection';
```

-   `intersection.get(key: string | number, options: IntersectionGetOptions = {}): IntersectionResult`
    -   Returns intersection information for the widget's specified DOM element, identified by the node's `key` property. If the node does not exist for the current widget (either has not yet been rendered or an invalid key was specified), a result is returned indicating zero intersection.

The `options` argument allows for more control on how intersection is calculated. The available fields are the same as those for the [intersection observer API options](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API#Intersection_observer_options).

`IntersectionResult` properties:

| Property | Type | Description |
|---|---|---|
|`intersectionRatio`|`number`|The ratio of the element's bounding box that is intersecting the root element's viewport, from `0.0` to `1.0`. By default the root element is considered the browser's viewport unless an element is specified via the `options.root` argument.|
|`isIntersecting`|`boolean`|A value of `true` indicates that the target element intersects with the root element's viewport (representing a transition into a state of intersection). A value of `false` indicates a transition from intersecting to not-intersecting.|

### `resize`

Allows a widget to respond to resize events of its DOM nodes using a [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver), and provides updated information on the node's new size when a resize occurs. Using this middleware is an effective way of creating applications that are responsive across a variety of viewport sizes.

As this is still an upcoming web standard, the framework automatically ensures the underlying API is made available when running an application in a browser that does not yet support it.

**API:**

```ts
import resize from '@dojo/framework/core/middleware/resize';
```

-   `resize.get(key: string | number): DOMRectReadOnly | null`
    -   Returns size information for the widget's specified DOM element, identified by the node's `key` property. If the node does not exist for the current widget (either has not yet been rendered or an invalid key was specified), `null` is returned. The returned object is a standard [`DOMRectReadOnly`](https://developer.mozilla.org/en-US/docs/Web/API/DOMRectReadOnly) structure.

### `store`

TODO - covered elsewhere

**API:**

```ts
import store from '@dojo/framework/core/middleware/store';
```

### `theme`

TODO - covered elsewhere

**API:**

```ts
import theme from '@dojo/framework/core/middleware/theme';
```
