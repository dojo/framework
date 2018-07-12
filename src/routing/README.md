# @dojo/routing

<!-- start-github-only -->

[![Build Status](https://travis-ci.org/dojo/routing.svg?branch=master)](https://travis-ci.org/dojo/routing)
[![codecov.io](https://codecov.io/github/dojo/routing/coverage.svg?branch=master)](https://codecov.io/github/dojo/routing?branch=master)
[![npm version](https://badge.fury.io/js/%40dojo%2Frouting.svg)](https://badge.fury.io/js/%40dojo%2Frouting)

A routing library for Dojo 2 applications.

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

## Usage

To use `@dojo/routing`, install the package along with its required peer dependencies:

```bash
npm install @dojo/routing

# peer dependencies
npm install @dojo/core
npm install @dojo/has
npm install @dojo/shim
npm install @dojo/widget-core
```

## Features

Widgets are a fundamental concept for any Dojo 2 application and as such Dojo 2 Routing provides a collection of components that integrate directly with existing widgets within an application. These components enable widgets to be registered against a route _without_ requiring any knowledge of the `Router`. Routing in a Dojo 2 application consists of:

- `Outlet` widget wrappers that are assigned a specific outlet key and represent the view for a specific route
- a configuration of individual `Route`s that map paths to outlet keys
- a `Router` that resolves a `Route` based on the current path
- a `History` provider that notifies the `Router` of path changes
- a `Registry` that injects the `Router` into the widget ecosystem

### Route Configuration

Application routes are registered using a `RouteConfig`, which defines a route's `path`, the associated `outlet`, and nested child `RouteConfig`s. The full routes are recursively constructed from the nested route structure.

Example routing configuration:

```ts
import { RouteConfig } from '@dojo/routing/interfaces';

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
import { MemoryHistory } from '@dojo/routing/MemoryHistory';

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

The hash-based manager uses the fragment identifier to store navigation state and is the default manager used within `@dojo/routing`.

```ts
import { Router } from '@dojo/routing/Router';
import { HashHistory } from '@dojo/routing/history/HashHistory';

const router = new Router(config, HashHistory);
```

The history manager has `current` getter, `set(path: string)` and `prefix(path: string)` APIs. The `HashHistory` class assumes the global object is a browser `window` object, but an explicit object can be provided. The manager uses `window.location.hash` and adds an event listener for the `hashchange` event. The `current` getter returns the current path, without a # prefix.

##### State History

The state history uses the browser's history API, `pushState()` and `replaceState()`, to add or modify history entries. The state history manager requires server-side support to work effectively.

##### Memory History

The `MemoryHistory` does not rely on any browser API but keeps its own internal path state. It should not be used in production applications but is useful for testing routing.

```ts
import { Router } from '@dojo/routing/Router';
import { MemoryHistory } from '@dojo/routing/history/MemoryHistory';

const router = new Router(config, MemoryHistory);
```

### Router Context Injection

The `RouterInjector` module exports a helper function, `registerRouterInjector`, that combines the instantiation of a `Router` instance, registering route configuration and defining injector in the provided registry. The `router` instance is returned.

```ts
import { Registry } from '@dojo/widget-core/Registry';
import { registerRouterInjector } from '@dojo/routing/RoutingInjector';

const registry = new Registry();
const router = registerRouterInjector(config, registry);
```

The defaults can be overridden using `RouterInjectorOptions`:

```ts
import { Registry } from '@dojo/widget-core/Registry';
import { registerRouterInjector } from '@dojo/routing/RoutingInjector';
import { MemoryHistory } from './history/MemoryHistory';

const registry = new Registry();
const history = new MemoryHistory();

const router = registerRouterInjector(config, registry, { history, key: 'custom-router-key' });
```

### Outlets

The primary concept for the routing integration is an `outlet`, a unique identifier associated with the registered application route. Dojo 2 Widgets can then be configured with these outlet identifiers using the `Outlet` higher order component. `Outlet` returns a new widget that can be used like any other widget within a `render` method, e.g. `w(MyFooOutlet, { })`.

Properties can be passed to an `Outlet` widget in the same way as if the original widget was being used. However, all properties are made optional to allow the properties to be injected using the [mapParams](#mapParams) function described below.

The number of widgets that can be mapped to a single outlet identifier is not restricted. All configured widgets for a single outlet will be rendered when the route associated to the outlet is matched by the `router` and the `outlet`s are part of the current widget hierarchy.

The following example configures a stateless widget with an outlet called `foo`. The resulting `FooOutlet` can be used in a widgets `render` in the same way as any other Dojo 2 Widget.

```ts
import { Outlet } from '@dojo/routing/Outlet';
import { MyViewWidget } from './MyViewWidget';

const FooOutlet = Outlet(MyViewWidget, 'foo');
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

#### Outlet Component Types

When registering an outlet a different widget can be configured for each match type of a route:

| Type    | Description |
| ------- | ------------ |
|`index`  | This is an exact match for the registered route. E.g. Navigating to `foo/bar` with a registered route `foo/bar`.   |
|`main`| Any match other than an index match, for example, `foo/bar` would partially match `foo/bar/qux`, but only if `foo/bar/qux` was also a registered route. Otherwise, it would be an `ERROR` match. |
|`error`  | When a partial match occurs but there is no match for the next section of the route. |

To do this, instead of passing a widget as the first argument to the `Outlet`, use the `OutletComponents` object.

```ts
import { MyViewWidget, MyErrorWidget } from './MyWidgets';

const fooWidgets: OutletComponents = {
	main: MyViewWidget,
	error: MyErrorWidget
};

const FooOutlet = Outlet(fooWidgets, 'foo');
```

It is important to note that a widget registered against match type `error` will not be used if the outlet also has a widget registered for match type `index`.

#### Outlet Options

Outlet Options of `mapParams`, `onEnter`, `onExit`, and `key` can be passed as an optional third argument to an `Outlet`.

##### Map Parameters

When a widget is configured for an outlet it is possible to provide a callback function that is used to inject properties that will be available during render lifecycle of the widget.

```ts
mapParams(type: 'error | index | main', location: string, params: {[key: string]: any}, router: Router)
```

| Argument | Description                                                            |
| -------- | ---------------------------------------------------------------------- |
| type     | The `MatchType` that caused the outlet to render                        |
| params   | Key/Value object of the params that were parsed from the matched route |
| router   | The router instance that can be used to provide functions that go to other routes/outlets|

The following example uses `mapParams` to inject an `onClose` function that will go to the route registered against the `other-outlet` route and `id` property extracted from `params` in the `MyViewWidget` properties:

```ts
const mapParams = (options: MapParamsOptions) {
	const { type, params, router } = options;

	return {
		onClose() {
			// This creates a link for another outlet and sets the path
			router.setPath(router.link('other-outlet'));
		},
		id: params.id
	}
}

const FooOutlet = Outlet(MyViewWidget, 'foo', { mapParams });
```

##### Key

The `key` is the identifier used to locate the `router` from the `registry`, throughout the routing library this defaults to `router`.

#### Global Error Outlet

Whenever a match type of `error` is registered a global outlet is automatically added to the matched outlets called `errorOutlet`. This outlet can be used to render a widget for any unknown routes.

```ts
const ErrorOutlet = Outlet(ErrorWidget, 'errorOutlet');
```

### Link

The `Link` component is a wrapper around an `a` DOM element that enables consumers to specify an `outlet` to create a link to. It is also possible to use a static route by setting the `isOutlet` property to `false`.

If the generated link requires specific path or query parameters that are not in the route, they can be passed via the `params` property.

```ts
import { Link } from '@dojo/routing/Link';

render() {
	return v('div', [
		w(Link, { to: 'foo', params: { foo: 'bar' }}, [ 'Link Text' ]),
		w(Link, { to: '#/static-route', isOutlet: false, [ 'Other Link Text' ])
	]);
}
```

All the standard `VNodeProperties` are available for the `Link` component as they would be creating an `a` DOM Element using `v()` with `@dojo/widget-core`.

## How do I contribute?

We appreciate your interest!  Please see the [Dojo 2 Meta Repository](https://github.com/dojo/meta#readme) for the Contributing Guidelines.

### Code Style

This repository uses [`prettier`](https://prettier.io/) for code styling rules and formatting. A pre-commit hook is installed automatically and configured to run `prettier` against all staged files as per the configuration in the project's `package.json`.

An additional npm script to run `prettier` (with write set to `true`) against all `src` and `test` project files is available by running:

```bash
npm run prettier
```

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

## Licensing information

© 2018 [JS Foundation](https://js.foundation/) & contributors. [New BSD](http://opensource.org/licenses/BSD-3-Clause) license.

<!-- doc-viewer-config
{
	"api": "docs/api.json"
}
-->
