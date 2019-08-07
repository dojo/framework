# Route configuration

The routing configuration is a hierarchical structure used to describe the entire Dojo application, associating `outlet` ids to a routing path. The routing path can be nested using children which enables building a routing structure that can accurately reflect the requirements of the application.

The routing configuration API is constructed with the following properties:

-   `path: string`: The routing path segment to match in the URL.
-   `outlet: string`: The `outlet` id used to render widgets to the associated routing path.
-   `defaultRoute: boolean` (optional): Marks the outlet as default, the application will redirect to this route automatically if no route or an unknown route is found on application load.
-   `defaultParams: { [index: string]: string }` (optional): Associated default parameters (`path` and `query`), required if the default route has required params.
-   `children: RouteConfig[]` (optional): Nested child routing configuration.

> src/routes.ts

```ts
export default [
	{
		path: 'home',
		outlet: 'home',
		defaultRoute: true
	},
	{
		path: 'about',
		outlet: 'about-overview',
		children: [
			{
				path: '{services}',
				outlet: 'about-services'
			},
			{
				path: 'company',
				outlet: 'about-company'
			},
			{
				path: 'history',
				outlet: 'about-history'
			}
		]
	}
];
```

This example would register the following routes and outlets:

| URL Path          | Outlet           |
| ----------------- | ---------------- |
| `/home`           | `home`           |
| `/about`          | `about-overview` |
| `/about/company`  | `about-company`  |
| `/about/history`  | `about-history`  |
| `/about/knitting` | `about-services` |
| `/about/sewing`   | `about-services` |

The `about-services` outlet has been registered to match any path after `/about` This is at odds with the other registered outlets, `about-company` and `about-history`, however Dojo routing ensures that the correct outlet is matched in these scenarios.

# Router API

The Dojo Router exposes an API that can be used to generate and navigate to links, get the params for the current route and check if an outlet id has been matched.

-   `link(outlet: string, params: Params = {}): string | undefined`: Generate a link based on the outlet id and optionally params. If no params are passed it will attempt to use the current routes parameters, then any default parameters provided in the routing configuration. If a link cannot be generated, `undefined` is returned.
-   `setPath(path: string): void`: Sets the path in the router.
-   `get currentParams(): { [string: index]: string }`: Returns parameters in the current route
-   `getOutlet(outletIdentifier: string): OutletContext | undefined`: Returns the `OutletContext` for an outlet id if it is currently matched. If the outlet id is not matched, then return `undefined`.

## Generating a link for an outlet

> src/routes.ts

```ts
export default [
	{
		path: 'home',
		outlet: 'home'
	},
	{
		path: 'about',
		outlet: 'about-overview',
		children: [
			{
				path: '{services}',
				outlet: 'about-services',
				defaultParams: {
					services: 'sewing'
				}
			},
			{
				path: 'company',
				outlet: 'about-company'
			},
			{
				path: 'history',
				outlet: 'about-history'
			}
		]
	}
];
```

> src/main.ts

```ts
import Router from '@dojo/framework/routing/Router';

import routes from './routes';

const router = new Router(routes);

// returns `#home`
console.log(router.link('home'));

// returns `#about`
console.log(router.link('about-overview'));

// returns `#about/company`
console.log(router.link('about-company'));

// returns `#about/history`
console.log(router.link('about-history'));

// returns `#about/knitting`
console.log(router.link('about-services'), { services: 'knitting' });

// Uses the current URL then default params to returns `#about/knitting`
// when the current route is `#about/cooking` returns `#about/cooking`
// when the current route does not contain the params returns `#about/sewing`
console.log(router.link('about-services'));

// returns `undefined` for an unknown route
console.log(router.link('unknown'));
```

## Changing a route

```ts
import Router from '@dojo/framework/routing/Router';

import routes from './routes';

const router = new Router(routes);

// goto `#home` route
router.setPath('#home');
```

## Getting the current parameters

```ts
import Router from '@dojo/framework/routing/Router';

import routes from './routes';

const router = new Router(routes);

// returns the current params for the route
const params = router.currentParams;
```

## Get a matched outlet

Use the `getOutlet` to return the `OutletContext` for a matched outlet, or `undefined` if the outlet is not matched.

`OutletContext`:

-   `id: string`: The outlet id
-   `queryParams: { [index: string]: string }`: The query params from the matched routing.
-   `params: { [index: string]: string }`: The path params from the matched routing.
-   `isExact(): boolean`: A function indicates if the outlet is an exact match for the path.
-   `isError(): boolean`: A function indicates if the outlet is an error match for the path.
-   `type: 'index' | 'partial' | 'error'`: The type of match for the route, either `index`, `partial` or `error`.

```ts
import Router from '@dojo/framework/routing/Router';

import routes from './routes';

const router = new Router(routes);

// returns the outlet context if the `home` outlet is matched, otherwise `undefined`
const outletContext = router.getOutlet('home');
```

# Using the outlet `MatchDetails`

For every `outlet` that is matched on a route change, `MatchDetails` are injected into the `Outlet` widget's `renderer` property. The `MatchDetails` object contains specific details for the matched outlet.

Note: All examples assume that the default [HashHistory](#hashhistory) history manager is being used.

## `queryParams`

-   `queryParams: { [index: string]: string }`: The query params from the matched route.

> src/routes.ts

```ts
export default [
	{
		path: 'home',
		outlet: 'home'
	}
];
```

-   given the URL path `/#home?foo=bar&baz=42`, the `queryParams` object will look like:

```js
{
	foo: 'bar',
	baz: '42'
}
```

## `params`

-   `params: { [index: string]: string }`: The path params from the matched route.

> src/routes.ts

```ts
export default [
	{
		path: 'home/{page}',
		outlet: 'home'
	}
];
```

-   given the URL path `/#home/about`, the `params` object will have look like:

```js
{
	page: 'about';
}
```

## `isExact()`

-   `isExact(): boolean`: A function that indicates if the outlet is an exact match for the path. This can be used to conditionally render different widgets or nodes.

> src/routes.ts

```ts
export default [
	{
		path: 'home',
		outlet: 'home',
		children: [
			{
				path: 'about',
				outlet: 'about'
			}
		]
	}
];
```

-   given the above route definition, if the URL path is set to `/#home/about`, then `isExact()` will evaluate to `false` for the `Outlet` with the id "home" and `true` for the an `Outlet` that is a child of the home `Outlet` with the id "about" as shown in the following file:

> src/App.tsx

```ts
import { create, tsx } from '@dojo/framework/core/vdom';
import Outlet from '@dojo/framework/routing/Outlet';

const factory = create();

export default factory(function App() {
	return (
		<div>
			<Outlet
				id="home"
				renderer={(homeMatchDetails) => {
					console.log('home', homeMatchDetails.isExact()); // home false
					return (
						<Outlet
							id="about"
							renderer={(aboutMatchDetails) => {
								console.log('about', aboutMatchDetails.isExact()); // about true
								return [];
							}}
						/>
					);
				}}
			/>
		</div>
	);
});
```

## `isError()`

-   `isError(): boolean`: A function indicates if the outlet is an error match for the path. This indicates after this outlet was matched, no other matches were found.

> src/routes.ts

```ts
export default [
	{
		path: 'home',
		outlet: 'home',
		children: [
			path: 'about',
			outlet: 'about'
		]
	}
];
```

-   given this route definition, if the URL path is set to `/#home/foo` then there is no exact route match, so the `isError()` method on the home `Outlet`'s `martchDetails` object will yield `true`. Navigating to `/#home` or `/#home/about` however will cause the same method to return `false` since both routes are defined.

## `type`

-   `type: 'index' | 'partial' | 'error'`: The type of match for the route, either `index`, `partial` or `error`. Using `type` should not be necessary, instead favouring a combination of `isExact` and `isError`.

```ts
export default [
	{
		path: 'home',
		outlet: 'home',
		children: [
			path: 'about',
			outlet: 'about'
		]
	}
];
```

-   given the above route definition, the following values of `type` would be provided to each outlet:

| URL path       | Home outlet | About outlet |
| -------------- | :---------: | :----------: |
| `/#home`       |   'index'   |     N/A      |
| `/#home/about` |  'partial'  |   'index'    |
| `/#home/foo`   |   'error'   |     N/A      |

## `router`

-   `router: RouterInterface`: The router instance which can used to create links and initiate route changes. For more information see the router API.

> src/routes.ts

```ts
export default [
	{
		path: 'home',
		outlet: 'home',
		children: [
			{
				path: 'details',
				outlet: 'home-details'
			}
		]
	}
];
```

> src/App.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import Outlet from '@dojo/framework/routing/Outlet';

const factory = create();

export default factory(function App() {
	return (
		<div>
			<Outlet
				id="home"
				renderer={(matchDetails) => {
					const { params, queryParams, isExact, isError, router } = matchDetails;

					const gotoHome = () => {
						const link = router.link('home');
						if (link) {
							router.setPath(link);
						}
					};

					if (isExact()) {
						// The path `home` was matched
						return <div>Home Page</div>;
					}
					if (isError()) {
						// The `home` segment of the path was matched but the
						// next segment was not matched for example, `home/other`
						return (
							<div>
								<button onclick={gotoHome}>Goto Home</button>
								<div>Unknown Page</div>
							</div>
						);
					}
					// The `home` segment of the path was matched and the next
					// segment was also matched for example, `home/details`
					return <div>Partial Match for Home</div>;
				}}
			/>
		</div>
	);
});
```

# History managers

Dojo Routing comes with three history managers for managing an application's navigation state, `HashHistory`, `StateHistory` and `MemoryHistory`. By default the `HashHistory` is used, however, this can be overridden by passing a different `HistoryManager` when creating the `Router` or using `registerRouterInjector`.

> src/main.ts

```ts
import Router from '@dojo/framework/routing/Router';
import StateHistory from '@dojo/framework/routing/history/StateHistory';

import routes from './routes';

// creates a router using the default history manager, `HashHistory`
const router = new Router(routes);

// creates a router using the `StateHistory`
const routerWithHistoryOverride = new Router(routes, { HistoryManager: StateHistory });
```

Or using the `registerRouterInjector` helper function:

> src/main.ts

```ts
import Registry from '@dojo/framework/core/Registry';
import { registerRouterInjector } from '@dojo/framework/routing/RouterInjector';
import StateHistory from '@dojo/framework/routing/history/StateHistory';

import routes from './routes';

const registry = new Registry();

// creates and registers a router using the default history manager, `HashHistory`
registerRouterInjector(routes, registry);

// creates and registers a router using the `StateHistory`
registerRouterInjector(routes, registry, { HistoryManager: StateHistory });
```

## `HashHistory`

`HashHistory` uses the fragment identifier to process route changes, for example `https://foo.com/#home` would process the `home` as the route path. As `HashHistory` is the default manager, you do not need to import the module.

```ts
import { Router } from '@dojo/framework/routing/Router';

const router = new Router(config);
```

## `StateHistory`

`StateHistory` uses the browser's [history API](https://developer.mozilla.org/en-US/docs/Web/API/History), to manage application route changes.

The `StateHistory` manager will require server-side machinery to enable an application to support refreshing on a route, for example:

1.  Re-writing the `index.html` request to load from the application root.
2.  Re-writing requests to load static resources (`.js`, `.css` etc) from the application root.

**Note:** This machinery is included with `@dojo/cli-build-app` using the `--serve` option (intended for development only).

```ts
import { Router } from '@dojo/framework/routing/Router';
import { StateHistory } from '@dojo/framework/routing/history/StateHistory';

const router = new Router(config, { HistoryManager: StateHistory });
```

## `MemoryHistory`

The `MemoryHistory` does not rely on any browser API but keeps its own internal path state. It should not be used in production applications but is useful for testing application routing.

```ts
import { Router } from '@dojo/framework/routing/Router';
import { MemoryHistory } from '@dojo/framework/routing/history/MemoryHistory';

const router = new Router(config, { HistoryManager: MemoryHistory });
```

> src/main.tsx

```tsx
import renderer from '@dojo/framework/core/vdom';
import { tsx } from '@dojo/framework/core/vdom';
import { registerRouterInjector } from '@dojo/framework/routing/RouterInjector';

import routes from './routes';
import App from './App';

const registry = new Registry();
// creates a router with the routes and registers the router with the registry
registerRouterInjector(routes, registry);

const r = renderer(() => <App />);
r.mount({ registry });
```

These history managers work like adapters, meaning that custom history managers can be implemented by fulfilling the history manager interface.

# Error outlet

A special `outlet` called `errorOutlet` is registered for that will match when the route doesn't match (`exact` or `partial`) any outlet in the routing configuration. You can use this `outlet` to render a widget to inform the user that the route does not exist.

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import Outlet from '@dojo/framework/routing/Outlet';

const factory = create();

export default factory(function App() {
	return (
		<div>
			<Outlet
				id="errorOutlet"
				renderer={() => {
					return <div>Unknown Page</div>;
				}}
			/>
		</div>
	);
});
```

If there is a default route registered, this will take precedence over the error outlet on the initial application load.
