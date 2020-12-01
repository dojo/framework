# Route configuration

The routing configuration is a hierarchical structure used to describe the entire Dojo application, associating `id`s and `outlet`s to a routing path. The routing path can be nested using children which enables building a routing structure that can accurately reflect the requirements of the application.

The routing configuration API is constructed with the following properties:

-   `id: string`: The unique id of the route.
-   `path: string`: The routing path segment to match in the URL.
-   `outlet: string`: The `outlet` name for the route. This is used by the `Outlet` widget to determine what needs to be rendered.
-   `defaultRoute: boolean` (optional): Marks the outlet as default, the application will redirect to this route automatically if no route or an unknown route is found on application load.
-   `defaultParams: { [index: string]: string }` (optional): Associated default parameters (`path` and `query`), required if the default route has required params.
-   `redirect: string` (optional): A path to redirect to when matched exactly, params can be referenced from the matched route by the using the `{}` syntax
-   `children: RouteConfig[]` (optional): Nested child routing configuration.

> src/routes.ts

```ts
export default [
	{
		id: 'home',
		path: 'home',
		outlet: 'home',
		defaultRoute: true
	},
	{
		id: 'about',
		path: 'about',
		outlet: 'about-overview',
		redirect: 'about/company'
		children: [
			{
				id: 'about-services',
				path: '{services}',
				outlet: 'about'
			},
			{
				id: 'about-company',
				path: 'company',
				outlet: 'about'
			},
			{
				id: 'about-history',
				path: 'history',
				outlet: 'about'
			}
		]
	}
];
```

This example would register the following paths and route ids:

| URL Path          | Route            |
| ----------------- | ---------------- |
| `/home`           | `home`           |
| `/about`          | `about-overview` |
| `/about/company`  | `about-company`  |
| `/about/history`  | `about-history`  |
| `/about/knitting` | `about-services` |
| `/about/sewing`   | `about-services` |

The `about-services` route has been registered to match any path after `/about` This is at odds with the other registered routes, `about-company` and `about-history`, however Dojo routing ensures that the correct routes is matched in these scenarios.

# Outlets

An outlet represents a visual location of an application that renderers different content depending on which route has been matched. Using outlets reduces boilerplate required compared to using routes, multiple routes can be associated to the same outlet to more naturally and accurately structure the application output.

Consider a typical application layout which includes a left side menu and a main content view that depending on the route has a right hand side bar:

```
-------------------------------------------------------------------
|        |                                            |           |
|        |                                            |           |
|        |                                            |           |
|        |                                            |           |
|        |                                            |           |
|  menu  |                   main                     | side-menu |
|        |                                            |           |
|        |                                            |           |
|        |                                            |           |
|        |                                            |           |
|        |                                            |           |
-------------------------------------------------------------------
```

The route configuration below specifies all the main pages to the main content outlet, but the `widget` to a `side-menu` outlet. This enables building an application that constantly renders the main content depending on route, but also include a right hand side menu for all children routes of the `widget` route.

```tsx
const routes = [
	{
		id: 'landing',
		path: '/',
		outlet: 'main',
		defaultRoute: true
	},
	{
		id: 'widget',
		path: 'widget/{widget}',
		outlet: 'side-menu',
		children: [
			{
				id: 'tests',
				path: 'tests',
				outlet: 'main'
			},
			{
				id: 'overview',
				path: 'overview',
				outlet: 'main'
			},
			{
				id: 'example'
				path: 'example/{example}',
				outlet: 'main'
			}
		]
	}
];
```

In the routing configuration above, there are two outlets defined, `main` and `side-menu`, and a simplified application layout using outlets is shown below. By default the `Outlet` will render any of the keys that equal a route id that has been matched for the outlet, in this case `main`. If a function is passed to the `Outlet` then it will render whenever _any_ route is matched for the outlet specified.

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import Outlet from '@dojo/framework/routing/Outlet';

import Menu from './Menu';
import SideMenu from './SideMenu';
import Landing from './Landing';
import Tests from './Tests';
import Example from './Example';

const factory = create();

const App = factory(function App() {
	return (
		<div>
			<Menu />
			<main>
				<div>
					<Outlet id="main">
						{{
							landing: <Landing />,
							tests: <Tests />,
							example: ({ params: { example }}) => <Example example={example}/>,
							overview: <Example example="overview"/>
						}}
					</Outlet>
				</div>
				<div>
					<Outlet id="side-menu">
						{({ params: { widget }}) => <SideMenu widget={widget}>}
					</Outlet>
				</div>
			</main>
		</div>
	);
});
```

The node structure of the `App` looks good and succinctly represents the actual visual output for the user with minimal duplication, there still is a need to duplicate the usage of the `Example` widget across to different routes. This can be solved by using the `matcher` property to override the default route matching rules. The `matcher` receives the `defaultMatches` and a `matchDetailsMap` in order to make custom matching decisions. In the final example below the usage of `Example` has been combined into a new `key`, `details` that does not exist as a route. This will never match for the outlet unless we override the default matches to set it to true when either the `example` or `overview` route has matched. Finally in the `details` renderer the example property has been defaulted to `overview` to maintain the same behavior as before.

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import Outlet from '@dojo/framework/routing/Outlet';

import Menu from './Menu';
import SideMenu from './SideMenu';
import Landing from './Landing';
import Tests from './Tests';
import Example from './Example';

const factory = create();

const App = factory(function App() {
	return (
		<div>
			<Menu />
			<main>
				<div>
					<Outlet id="main" matcher={(defaultMatches, matchDetailsMap) => {
						defaultMatches.details = matchDetailsMap.has('example') || matchDetailsMap.has('overview');
						return defaultMatches;
					}}>
						{{
							landing: <Landing />,
							tests: <Tests />,
							details: ({ params: { example = "overview" }}) => <Example example={example}/>,
						}}
					</Outlet>
				</div>
				<div>
					<Outlet id="side-menu">
						{({ params: { widget }}) => <SideMenu widget={widget}>}
					</Outlet>
				</div>
			</main>
		</div>
	);
});
```

# Router API

The Dojo Router exposes an API that can be used to generate and navigate to links, get the params for the current route and check if a route id has been matched.

-   `link(route: string, params: Params = {}): string | undefined`: Generate a link based on the route id and optionally params. If no params are passed it will attempt to use the current routes parameters, then any default parameters provided in the routing configuration. If a link cannot be generated, `undefined` is returned.
-   `setPath(path: string): void`: Sets the path in the router.
-   `get currentParams(): { [string: index]: string }`: Returns parameters in the current route
-   `getRoute(id: string): RouteContext | undefined`: Returns the `RouteContext` for a route id if it is currently matched. If the route id is not matched, then return `undefined`.

## Generating a link for a route

> src/routes.ts

```ts
export default [
	{
		id: 'home',
		path: 'home',
		outlet: 'home'
	},
	{
		id: 'about',
		path: 'about',
		outlet: 'about-overview',
		children: [
			{
				id: 'about-services',
				path: '{services}',
				outlet: 'about',
				defaultParams: {
					services: 'sewing'
				}
			},
			{
				id: 'about-company',
				path: 'company',
				outlet: 'about'
			},
			{
				id: 'about-history',
				path: 'history',
				outlet: 'about'
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

## Get a matched route

Use the `getRoute` to return the `RouteContext` for a matched route id, or `undefined` if the route id's path is not matched.

`RouteContext`:

-   `id: string`: The route id
-   `outlet: string`: The outlet id
-   `queryParams: { [index: string]: string }`: The query params from the matched routing.
-   `params: { [index: string]: string }`: The path params from the matched routing.
-   `isExact(): boolean`: A function indicates if the route is an exact match for the path.
-   `isError(): boolean`: A function indicates if the route is an error match for the path.
-   `type: 'index' | 'partial' | 'error'`: The type of match for the route, either `index`, `partial` or `error`.

```ts
import Router from '@dojo/framework/routing/Router';

import routes from './routes';

const router = new Router(routes);

// returns the route context if the `home` route is matched, otherwise `undefined`
const routeContext = router.getRoute('home');
```

# Using MatchDetails

For every `route` that is matched on a route change, `MatchDetails` are injected into the both the `Route` and the `Outlet` widget. The `MatchDetails` object contains specific details for a matched route.

Note: All examples assume that the default [HashHistory](#hashhistory) history manager is being used.

## `queryParams`

-   `queryParams: { [index: string]: string }`: The query params from the matched route.

> src/routes.ts

```ts
export default [
	{
		id: 'home',
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
		id: 'home',
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

-   `isExact(): boolean`: A function that indicates if the route is an exact match for the path. This can be used to conditionally render different widgets or nodes.

> src/routes.ts

```ts
export default [
	{
		id: 'home',
		path: 'home',
		outlet: 'home',
		children: [
			{
				id: 'about',
				path: 'about',
				outlet: 'about'
			}
		]
	}
];
```

-   given the above route definition, if the URL path is set to `/#home/about`, then `isExact()` will evaluate to `false` for the `Route` with the id "home" and `true` for a `Route` that is a child of the home `Route` with the id "about" as shown in the following file:

> src/App.tsx

```ts
import { create, tsx } from '@dojo/framework/core/vdom';
import Route from '@dojo/framework/routing/Route';

const factory = create();

export default factory(function App() {
	return (
		<div>
			<Route
				id="home"
				renderer={(homeMatchDetails) => {
					console.log('home', homeMatchDetails.isExact()); // home false
					return (
						<Route
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

-   `isError(): boolean`: A function indicates if the route is an error match for the path. This indicates after this route was matched, no other matches were found.

> src/routes.ts

```ts
export default [
	{
		id: 'home',
		path: 'home',
		outlet: 'home',
		children: [
			id: 'about',
			path: 'about',
			outlet: 'about'
		]
	}
];
```

-   given this route definition, if the URL path is set to `/#home/foo` then there is no exact route match, so the `isError()` method on the home `Route`'s `matchDetails` object will yield `true`. Navigating to `/#home` or `/#home/about` however will cause the same method to return `false` since both routes are defined.

## `type`

-   `type: 'index' | 'partial' | 'error'`: The type of match for the route, either `index`, `partial` or `error`. Using `type` should not be necessary, instead favouring a combination of `isExact` and `isError`.

```ts
export default [
	{
		id: 'home',
		path: 'home',
		outlet: 'home',
		children: [
			id: 'about',
			path: 'about',
			outlet: 'about'
		]
	}
];
```

-   given the above route definition, the following values of `type` would be provided to each route:

| URL path       | Home route | About route |
| -------------- | :--------: | :---------: |
| `/#home`       |  'index'   |     N/A     |
| `/#home/about` | 'partial'  |   'index'   |
| `/#home/foo`   |  'error'   |     N/A     |

## `router`

-   `router: RouterInterface`: The router instance which can used to create links and initiate route changes. For more information see the router API.

> src/routes.ts

```ts
export default [
	{
		id: 'home',
		path: 'home',
		outlet: 'home',
		children: [
			{
				id: 'home-details',
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
import Route from '@dojo/framework/routing/Route';

const factory = create();

export default factory(function App() {
	return (
		<div>
			<Route
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

# Error route

A special `route` called `errorRoute` is registered that will match when the route doesn't match (`exact` or `partial`) any route in the routing configuration. You can use this `route` to render a widget to inform the user that the route does not exist.

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import Route from '@dojo/framework/routing/Route';

const factory = create();

export default factory(function App() {
	return (
		<div>
			<Route
				id="errorRoute"
				renderer={() => {
					return <div>Unknown Page</div>;
				}}
			/>
		</div>
	);
});
```

If there is a default route registered, this will take precedence over the error route on the initial application load.
