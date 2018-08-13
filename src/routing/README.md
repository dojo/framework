# routing

<!-- start-github-only -->

Routing for Dojo applications.

 - [Features](#features)
   - [Route Configuration](#route-configuration)
   - [Router](#router)
     - [History Managers](#history-managers)
   - [Router Context Injection](#router-context-injection)
   - [Outlets](#outlets)
     - [Outlet Component Types](#outlet-component-types)
     - [Outlet Options](#outlet-options)
     - [Global Error Outlet](#global-error-outlet)
   - [Link](#link)

<!-- end-github-only -->

## Features

Widgets are a fundamental concept for any Dojo application and as such Dojo Routing provides a collection of components that integrate directly with existing widgets within an application. These components enable widgets to be registered against a route _without_ requiring any knowledge of the `Router`. Routing in a Dojo application consists of:

- `Outlet` widget wrappers that are assigned a specific outlet key and represent the view for a specific route
- a configuration of individual `Route`s that map paths to outlet keys
- a `Router` that resolves a `Route` based on the current path
- a `History` provider that notifies the `Router` of path changes
- a `Registry` that injects the `Router` into the widget ecosystem

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
						outlet: 'qux',
					}
				]
			}
		]
	}
]
```

This configuration would register the following routes and outlets:

| Route        | Outlet |
| ------------ | ------ |
|`/foo`        | `root` |
|`/foo/bar`    | `bar`  |
|`/foo/baz`    | `baz`  |
|`/foo/baz/qux`| `qux`  |

#### Path Parameters

Path parameters can be defined in a `path` using curly braces in the path attribute of a `RouteConfig`. Parameters will match any segment and the value of that segment is made available to matching outlets via the [mapParams](#mapParams) `Outlet` options. The parameters provided to child outlets will include any parameters from matching parent routes.

```ts
const config = [
	{
		path: 'foo/{foo}',
		outlet: 'foo'
	}
]
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
]
```

A default route can be specified using the optional configuration property `defaultRoute`, which will be used if the current route does not match a registered route.

```ts
const config = [
	{
		path: 'foo/{foo}',
		outlet: 'foo',
		defaultRoute: true
	}
]
```

Callbacks for `onEnter` and `onExit` can be set on the route configuration, these callbacks get called when an outlet is entered and exited.

```ts
const config = [
	{
		path: 'foo/{foo}',
		outlet: 'foo',
		onEnter: () => {
			console.log('outlet foo entered');
		},
		onExit: () => {
			console.log('outlet foo exited');
		}
	}
]
```

### Router

A `Router` registers a [route configuration](#route-configuration) which is passed to the router on construction:

```ts
const router = new Router(config);
```

The router will automatically be registered with a `HashHistory` history manager. This can be overridden by passing a different history manager as the second parameter.

```ts
import { MemoryHistory } from '@dojo/framework/routing/MemoryHistory';

const router = new Router(config, MemoryHistory);
```

Once the router has been created with the application route configuration, it needs to be made available to all the components within your application. This is done using a `Registry` from `@dojo/widget-core/Registry` and defining an `Injector` that contains the `router` instance as the `payload`. This `Injector` is defined using a known key, by default the key is `router` but this can be overridden if desired.

```ts
import { Registry } from '@dojo/widget-core/Registry';
import { Injector } from '@dojo/widget-core/Injector';

const registry = new Registry();

// Assuming we have the router instance available
registry.defineInjector('router', new Injector(router));
```

Finally, the `registry` needs to be made available to all widgets within the application by setting it as a `property` to the application's top-level `Projector` instance.

```ts
const projector = new Projector();
projector.setProperties({ registry });
```

#### History Managers

Routing comes with three history managers for monitoring and changing the navigation state, `HashHistory`, `StateHistory` and `MemoryHistory`. By default the `HashHistory` is used, however, this can be overridden by passing a different `HistoryManager` when creating the `Router`.

```ts
const router = new Router(config, MemoryHistory);
```

##### Hash History

The hash-based manager uses the fragment identifier to store navigation state and is the default manager used within `@dojo/framework/routing`.

```ts
import { Router } from '@dojo/framework/routing/Router';
import { HashHistory } from '@dojo/framework/routing/history/HashHistory';

const router = new Router(config, HashHistory);
```

The history manager has `current` getter, `set(path: string)` and `prefix(path: string)` APIs. The `HashHistory` class assumes the global object is a browser `window` object, but an explicit object can be provided. The manager uses `window.location.hash` and adds an event listener for the `hashchange` event. The `current` getter returns the current path, without a # prefix.

##### State History

The state history uses the browser's history API, `pushState()` and `replaceState()`, to add or modify history entries. The state history manager requires server-side support to work effectively.

##### Memory History

The `MemoryHistory` does not rely on any browser API but keeps its own internal path state. It should not be used in production applications but is useful for testing routing.

```ts
import { Router } from '@dojo/framework/routing/Router';
import { MemoryHistory } from '@dojo/framework/routing/history/MemoryHistory';

const router = new Router(config, MemoryHistory);
```

### Router Context Injection

The `RouterInjector` module exports a helper function, `registerRouterInjector`, that combines the instantiation of a `Router` instance, registering route configuration and defining injector in the provided registry. The `router` instance is returned.

```ts
import { Registry } from '@dojo/widget-core/Registry';
import { registerRouterInjector } from '@dojo/framework/routing/RoutingInjector';

const registry = new Registry();
const router = registerRouterInjector(config, registry);
```

The defaults can be overridden using `RouterInjectorOptions`:

```ts
import { Registry } from '@dojo/widget-core/Registry';
import { registerRouterInjector } from '@dojo/framework/routing/RoutingInjector';
import { MemoryHistory } from './history/MemoryHistory';

const registry = new Registry();
const history = new MemoryHistory();

const router = registerRouterInjector(config, registry, { history, key: 'custom-router-key' });
```

### Outlets

The primary concept for the routing integration is an `outlet`, a unique identifier associated with the registered application route. Dojo Widgets can then be configured with these outlet identifiers using the `Outlet` higher order component. `Outlet` returns a new widget that can be used like any other widget within a `render` method, e.g. `w(MyFooOutlet, { })`.

When defining an `Outlet` a properties interface can be passed as a generic to specify it's properties, `Outlet<MyOutletProperties>`. This can simply be a the properties of the widget that will be rendered by the outlet or a subset depending on whether some of the widget's properties will be calculated using information from the `router`.

An outlet accepts a render function that receives `properties` passed to the outlet and `OutletProperties`.

```ts
interface OutletProperties {
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

`OutletProperties` includes details from the matched route, including `params`, `queryParams`, the match `type` (`error`, `index`, `partial`), the `router` instance, `isError` and `isExact`. The `properties` passed to the outlet and the `OutletProperties` can be used in the render function to create the required properties for the widget to render when the outlet is matched.

The number of widgets that can be mapped to a single outlet identifier is not restricted. All configured widgets for a single outlet will be rendered when the route associated to the outlet is matched by the `router` and the `outlet`s are part of the current widget hierarchy.

The following example configures a stateless widget with an outlet called `foo`. The resulting `FooOutlet` can be used in a widgets `render` in the same way as any other Dojo Widget.

```ts
import { Outlet } from '@dojo/framework/routing/Outlet';
import { MyViewWidget, MyViewWidgetProperties } from './MyViewWidget';

const FooOutlet = Outlet<MyViewWidgetProperties>((properties) => w(MyViewWidget, properties) , { outlet: 'foo' });
```

Example usage of `FooOutlet`, where the widget will only be rendered when the route registered against outlet `foo` is matched.

```ts
class App extends WidgetBase {
	protected render(): DNode {
		return v('div', [
			w(FooOutlet, {})
		]);
	}
}
```

#### Outlet Options

##### outlet

The name of the outlet, that when matched will run the outlets render function.

##### Key

The `key` is the identifier used to locate the `router` from the `registry`, throughout the routing library this defaults to `router`.

#### Global Error Outlet

Whenever a match type of `error` is registered a global outlet is automatically added to the matched outlets called `errorOutlet`. This outlet can be used to render a widget for any unknown routes.

```ts
const ErrorOutlet = Outlet((properties) => w(ErrorWidget, properties), { outlet: 'errorOutlet' });
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

All the standard `VNodeProperties` are available for the `Link` component as they would be creating an `a` DOM Element using `v()` with `@dojo/widget-core`.

<!-- doc-viewer-config
{
	"api": "docs/routing/api.json"
}
-->
