# routing

<!-- start-github-only -->

Routing for Dojo applications.

-   [Features](#features)
    -   [Route Configuration](#route-configuration)
    -   [Router](#router)
        -   [History Managers](#history-managers)
        -   [Outlet Event](#outlet-event)
    -   [Router Context Injection](#router-context-injection)
    -   [Outlets](#outlets)
        -   [Global Error Outlet](#global-error-outlet)
    -   [Link](#link)
    -   [ActiveLink](#activelink)

<!-- end-github-only -->

## Features

Widgets are a fundamental concept for any Dojo application and as such Dojo Routing provides a collection of components that integrate directly with existing widgets within an application. These components enable widgets to be registered against a route _without_ requiring any knowledge of the `Router`. Routing in a Dojo application consists of:

-   `Outlet` widget wrappers that are assigned a specific outlet key and represent the view for a specific route
-   a configuration of individual `Route`s that map paths to outlet keys
-   a `Router` that resolves a `Route` based on the current path
-   a `History` provider that notifies the `Router` of path changes
-   a `Registry` that injects the `Router` into the widget ecosystem

### Route Configuration

Application routes are registered using a `RouteConfig`, which defines a route's `path`, the associated `outlet`, and nested child `RouteConfig`s. The full routes are recursively constructed from the nested route structure.

Example routing configuration:

```ts
import { RouteConfig } from '@dojo/framework/routing/interfaces';

const config: RouteConfig[] = [
	{
		path: 'foo',
		outlet: 'root',
		children: [
			{
				path: 'bar',
				outlet: 'bar'
			},
			{
				path: 'baz',
				outlet: 'baz',
				children: [
					{
						path: 'qux',
						outlet: 'qux'
					}
				]
			}
		]
	}
];
```

This configuration would register the following routes and outlets:

| Route          | Outlet |
| -------------- | ------ |
| `/foo`         | `root` |
| `/foo/bar`     | `bar`  |
| `/foo/baz`     | `baz`  |
| `/foo/baz/qux` | `qux`  |

#### Path Parameters

Path parameters can be defined in a `path` using curly braces in the path attribute of a `RouteConfig`. Parameters will match any segment and the value of that segment is made available to matching outlets via the [mapParams](#mapParams) `Outlet` options. The parameters provided to child outlets will include any parameters from matching parent routes.

```ts
const config = [
	{
		path: 'foo/{foo}',
		outlet: 'foo'
	}
];
```

For routes with path parameters, a map of default params can be specified for each route. These parameters are used as a fallback when generating a link from an outlet without specifying parameters, or when parameters do not exist in the current route.

```ts
const config = [
	{
		path: 'foo/{foo}',
		outlet: 'foo',
		defaultParams: {
			foo: 'bar'
		}
	}
];
```

A default route can be specified using the optional configuration property `defaultRoute`, which will be used if the current route does not match a registered route.

```ts
const config = [
	{
		path: 'foo/{foo}',
		outlet: 'foo',
		defaultRoute: true
	}
];
```

### Router

A `Router` registers a [route configuration](#route-configuration) which is passed to the router on construction:

```ts
const router = new Router(config);
```

The router will automatically be registered with a `HashHistory` history manager. This can be overridden by passing a different history manager as the second parameter.

```ts
import { MemoryHistory } from '@dojo/framework/routing/MemoryHistory';

const router = new Router(config, { HistoryManager: MemoryHistory });
```

Once the router has been created with the application route configuration, it needs to be made available to all the components within your application. This is done using a `Registry` from `@dojo/framework/core/Registry` and defining an injector that wires the `invalidator` to the router's `nav` event and returns the `router` instance. This injector is defined using a key, the default key for routing is `router`.

```ts
import { Registry } from '@dojo/framework/core/Registry';
import { Injector } from '@dojo/framework/core/Injector';

const registry = new Registry();

// Assuming we have the router instance available
registry.defineInjector('router', () => {
	router.on('nav', () => invalidator());
	return () => router;
};
```

**Note:** Routing provides a [convenience method for registering the router](#router-context-injection).

Finally, the `registry` needs to be made available to all widgets within the application by passing it to the `.mount()` method of the vdom `renderer`.

```ts
const r = renderer(() => v(App, {}));
r.mount({ registry });
```

#### History Managers

Routing comes with three history managers for monitoring and changing the navigation state, `HashHistory`, `StateHistory` and `MemoryHistory`. By default the `HashHistory` is used, however, this can be overridden by passing a different `HistoryManager` when creating the `Router`.

```ts
const router = new Router(config, { HistoryManager: MemoryHistory });
```

##### Hash History

The hash-based manager uses the fragment identifier to store navigation state and is the default manager used within `@dojo/framework/routing`.

```ts
import { Router } from '@dojo/framework/routing/Router';
import { HashHistory } from '@dojo/framework/routing/history/HashHistory';

const router = new Router(config, { HistoryManager: HashHistory });
```

The history manager has `current` getter, `set(path: string)` and `prefix(path: string)` APIs. The `HashHistory` class assumes the global object is a browser `window` object, but an explicit object can be provided. The manager uses `window.location.hash` and adds an event listener for the `hashchange` event. The `current` getter returns the current path, without a # prefix.

##### State History

The state history uses the browser's history API, `pushState()` and `replaceState()`, to add or modify history entries. The state history manager requires server-side support to work effectively.

##### Memory History

The `MemoryHistory` does not rely on any browser API but keeps its own internal path state. It should not be used in production applications but is useful for testing routing.

```ts
import { Router } from '@dojo/framework/routing/Router';
import { MemoryHistory } from '@dojo/framework/routing/history/MemoryHistory';

const router = new Router(config, { HistoryManager: MemoryHistory });
```

#### Outlet Event

The `outlet` event is emitted from the `router` instance each time an outlet is entered or exited. The outlet context is provided with the event payload along with the `enter` or `exit` action.

```ts
router.on('outlet', ({ outlet, action }) => {
	if (action === 'enter') {
		if (outlet.id === 'my-outlet') {
			// do something, perhaps fetch data or set state
		}
	}
});
```

### Router Context Injection

The `RouterInjector` module exports a helper function, `registerRouterInjector`, that combines the instantiation of a `Router` instance, registering route configuration and defining injector in the provided registry. The `router` instance is returned.

```ts
import { Registry } from '@dojo/framework/core/Registry';
import { registerRouterInjector } from '@dojo/framework/routing/RoutingInjector';

const registry = new Registry();
const router = registerRouterInjector(config, registry);
```

The defaults can be overridden using `RouterInjectorOptions`:

```ts
import { Registry } from '@dojo/framework/core/Registry';
import { registerRouterInjector } from '@dojo/framework/routing/RoutingInjector';
import { MemoryHistory } from './history/MemoryHistory';

const registry = new Registry();
const history = new MemoryHistory();

const router = registerRouterInjector(config, registry, { history, key: 'custom-router-key' });
```

### Outlets

The primary concept for the routing integration is an `outlet`, a unique identifier associated with the registered application route. The `Outlet` is a standard dojo widget and can be used anywhere within an application. The `Outlet` widget has a small API:

-   `id`: The id of the outlet to execute the `renderer` when matched.
-   `renderer`: A render function that is called when the outlet is matched.
-   `routerKey` (Optional): The `key` used when the router was defined in the registry - defaults to `router`.

that accepts the name of the outlet to render for and a `renderer` function that returns the `DNode`s to render when the outlet is matched.

```ts
render() {
	return v('div', [
		w(Outlet, { id: 'my-outlet', renderer: () => {
			return w(MyWidget, {});
		}})
	])
}
```

The `renderer` function receives `MatchDetails` that provide router specific information that can be used to to determine what to render and compute properties to pass to the the widgets.

```ts
interface MatchDetails {
	/**
	 * Query params from the matching route for the outlet
	 */
	queryParams: Params;

	/**
	 * Params from the matching route for the outlet
	 */
	params: Params;

	/**
	 * Match type of the route for the outlet, either `index`, `partial` or `error`
	 */
	type: MatchType;

	/**
	 * The router instance
	 */
	router: RouterInterface;

	/**
	 * Function returns true if the outlet match was an `error` type
	 */
	isError(): boolean;

	/**
	 * Function returns true if the outlet match was an `index` type
	 */
	isExact(): boolean;
}
```

```ts
render() {
	return v('div', [
		w(Outlet, { id: 'my-outlet', renderer: (matchDetails: MatchDetails) => {
			if (matchDetails.isError()) {
				return w(ErrorWidget, {});
			}
			if (matchDetails.isExact()) {
				return w(IndexWidget, { id: matchDetails.params.id });
			}
			return w(OtherWidget, { id: matchDetails.params.id });
		}})
	])
}
```

#### Global Error Outlet

Whenever a match type of `error` is registered a global outlet is automatically added to the matched outlets called `errorOutlet`. This outlet can be used to render a widget for any unknown routes.

```ts
render() {
	return w(Outlet, {
		id: 'errorOutlet',
		renderer: (matchDetails: MatchDetails) => {
			return w(ErrorWidget, properties);
		}
	});
}
```

### Link

The `Link` component is a wrapper around an `a` DOM element that enables consumers to specify an `outlet` to create a link to. It is also possible to use a static route by setting the `isOutlet` property to `false`.

If the generated link requires specific path or query parameters that are not in the route, they can be passed via the `params` property.

```ts
import { Link } from '@dojo/framework/routing/Link';

render() {
	return v('div', [
		w(Link, { to: 'foo', params: { foo: 'bar' }}, [ 'Link Text' ]),
		w(Link, { to: '#/static-route', isOutlet: false, [ 'Other Link Text' ])
	]);
}
```

All the standard `VNodeProperties` are available for the `Link` component as they would be creating an `a` DOM Element using `v()` with `@dojo/framework/core`.

### ActiveLink

The `ActiveLink` component is a wrapper around the `Link` component that conditionally sets classes on the `a` node if the link is currently active

```ts
import { ActiveLink } from '@dojo/framework/routing/ActiveLink';

render() {
	return v('div', [
		w(ActiveLink, { to: 'foo', params: { foo: 'bar' }, isExact: false, activeClasses: [ 'link-active' ]}, [ 'Link Text' ])
	]);
}
```
