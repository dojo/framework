# Basic Usage

## Adding Routing to an Application

Begin by adding an initial route configuration, that defines a single route that maps to an identifier known as an `outlet`.

>src/routes.ts
```ts
export default [
	{
		path: 'home',
		outlet: 'home'
	}
];
```

Then configure the application to be "routing" aware by registering the router with an application registry.

>src/main.tsx
```tsx
import renderer from '@dojo/framework/widget-core/vdom';
import { tsx } from '@dojo/framework/widget-core/tsx';
import { registerRouterInjector } from '@dojo/framework/routing/RouterInjector';

import routes from './routes';
import App from './App';

const registry = new Registry();
// creates a router with the routes and registers the router with the registry
registerRouterInjector(routes, registry);

const r = renderer(() => <App />);
r.mount({ registry });
```

Use the `Outlet` widget to control what widgets to render when the path for an outlet id is matched, the example will render `<div>Home</div>` for the `home` outlet.

>src/App.tsx
```tsx
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import { tsx } from '@dojo/framework/widget-core/tsx';
import Outlet from '@dojo/framework/routing/Outlet';

export default class App extends WidgetBase {
	protected render() {
		return (
			<div>
				<Outlet id="home" renderer={() => <div>Home</div>} />
			</div>
		);
	}
}
```

## Path & Query Parameters

Path parameters are placeholders in the routing configuration that will match any value for the segment. The parameters are defined using curly braces, for example: `{param}`.

>src/routes.ts
```ts
export default [
	{
		path: 'home/{page}',
		outlet: 'home'
	}
];
```

The parameters values are injected into to matching `Outlets`'s `renderer` property.

>src/App.tsx
```tsx
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import { tsx } from '@dojo/framework/widget-core/tsx';
import Outlet from '@dojo/framework/routing/Outlet';

export default class App extends WidgetBase {
	protected render() {
		return (
			<div>
				<Outlet id="home" renderer={(matchDetails) => <div>{`Home ${matchDetails.params.page}`}</div>} />
			</div>
		);
	}
}
```

Query parameters are also defined using curly braces split from the route path by a `?`. To define more than one query param, use the `&` delimiter.

>src/routes.ts
```ts
export default [
	{
		path: 'home/{page}?{queryOne}&{queryOne}',
		outlet: 'home'
	}
];
```

The query params are injected into matching `Outlet` `renderer` properties accessed from `queryParams` property.

## Default Route & Parameters

To add a default route for your application update the routing configuration to include `defaultRoute: true` for the preferred route.

>src/routes.ts
```ts
export default [
	{
		path: 'home',
		outlet: 'home',
		defaultRoute: true
	}
];
```

If the default route has path or query parameters a map of defaults need to be specified.

>src/routes.ts
```ts
export default [
	{
		path: 'home/{page}',
		outlet: 'home',
		defaultRoute: true,
		defaultParams: {
			page: 'about'
		}
	}
];
```

## Route Configuration

The routing configuration is a hierarchical structure used to describe the entire Dojo application, associating `outlet` ids to a routing path. The routing path can be nested using children which enables building a routing structure that can accurately reflect the requirements of the application.

The routing configuration API is constructed with the following properties:

* `path: string`: The routing path segment to match in the URL.
* `outlet: string`: The `outlet` id used to render widgets to the associated routing path.
* `defaultRoute: boolean`(optional): Marks the outlet as default, the application will redirect to this route automatically if an unknown routes is detected on application load.
* `defaultParams: { [index: string]: string }`(optional): Associated default parameters (`path` and `query`), required if the default route has required params.
* `children: RouteConfig[]`(optional): Nested child routing configuration.

>src/routes.ts
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

| Route             | Outlet          |
| ----------------- | --------------- |
| `/home`           | `home`          |
| `/about`          | `about-overview`|
| `/about/company`  | `about-company` |
| `/about/history`  | `about-history` |
| `/about/{param}`  | `about-services`|

The `about-services` outlet has been registered to match any path after `/about` This is at odds with the other registered outlets, `about-company` and `about-history`, however the [matching algorithm](#route-matching-algorithm) ensures that exact match is weighted higher than a parameter match.

## Using the Outlet MatchDetails

For every `outlet` that is match on a route change `MatchDetails` are injected into the `Outlet` widget's `renderer` property. The `MatchDetails` object contains specific details for the matched outlet.

* `queryParams: { [index: string]: string }`: The query params from the matched routing.
* `params: { [index: string]: string }`: The path params from the matched routing.
* `isExact(): boolean`: A function indicates if the outlet is an exact match for the path.
* `isError(): boolean`: A function indicates if the outlet is an error match for the path.
* `type: 'index' | 'partial' | 'error'`: The type of match for the route, either `index`, `partial` or `error`.
* `router: RouterInterface`: The router instance which can used to create links and initiate route changes.

>src/routes.ts
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

>src/App.tsx
```tsx
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import { tsx } from '@dojo/framework/widget-core/tsx';
import Outlet from '@dojo/framework/routing/Outlet';

export default class App extends WidgetBase {
	protected render() {
		return (
			<div>
				<Outlet id="home" renderer={(matchDetails) => {
					const { params, queryParams, isExact, isError, router } = matchDetails;

					const gotoHome = () => {
						const link = router.link('home');
						if (link) {
							router.setPath(link);
						}
					};

					if (isExact()) {
						// The path `home` was matched
						return <div>Home Page</div>
					}
					if (isError()) {
						// The `home` segment of the path was matched but the next segment was not match
						// for example, `home/other`
						return (
							<div>
								<button onclick={gotoHome}>Goto Home</button>
								<div>Unknown Page</div>
							</div>
						);
					}
					// The `home` segment of the path was matched and the next segment was also matched
					// for example, `home/details`
					return <div>Partial Match for Home</div>

				}} />
			</div>
		);
	}
}
```

## `Link` and `ActiveLink`

Put some examples/details on using the `Link` and `ActiveLink` widget.

## History Managers

Dojo Routing comes with three history managers, which determine the underlying routing implementation to use, with `HashHistory` as the default history manager.

### HashHistory

 `HashHistory` uses the fragment identifier to process route changes, for example `https://foo.com/#home` would process the `home` as the route path.

 ### StateHistory

`StateHistory` uses the browser's [history API](https://developer.mozilla.org/en-US/docs/Web/API/History), to manage application route changes.

**Note:** The `StateHistory` manager will require server-side machinery to enable an application to support refreshing on a route.

 ### MemoryHistory

Add some notes on memory history.

>src/main.tsx
```tsx
import renderer from '@dojo/framework/widget-core/vdom';
import { tsx } from '@dojo/framework/widget-core/tsx';
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

## Error Outlet

A special `outlet` called, `errorOutlet` is registered for that will match when the route doesn't match (`exact` or `partial`) any outlet in the routing configuration. You can use this `outlet` to render a widget to inform the user that the route does not exist.

```tsx
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import { tsx } from '@dojo/framework/widget-core/tsx';
import Outlet from '@dojo/framework/routing/Outlet';

export default class App extends WidgetBase {
	protected render() {
		return (
			<div>
				<Outlet id="errorOutlet" renderer={() => {
					return <div>Unknown Page</div>;
				}} />
			</div>
		);
	}
}
```

## Code Splitting By Route

When using `@dojo/cli-build-app` Dojo supports automatically code splitting your application by default for all top level outlets. This means that all widgets referenced within the `Outlet`s `renderer` will included specific bundle for the outlet that will be loaded lazily when the user goes to the route.

To take advantage of the code splitting there are 4 rules:

1) The routing configuration needs to be the default export in the `src/routes.ts` module.
2) The widgets must be the default export of their module.
3) The `renderer` property must be defined inline.
4) The outlet `id` must be static and defined inline.

>src/routes.ts
```ts
export default [
	{
		path: 'home',
		outlet: 'home'
	},
	{
		path: 'about',
		outlet: 'about',
		children: [
			{
				path: 'company',
				outlet: 'about-company'
			}
		]
	},
	{
		path: 'profile',
		outlet: 'profile'
	},
	{
		path: 'settings',
		outlet: 'settings'
	}
];
```

## Route Matching Algorithm

Dojo Routing applies a scoring algorithm for path matches so that how you the routing configuration is ordered does not affect the which outlets are matched.

Every segment match gets 4 points, plus:

 * 3 points for a static segment, i.e. `/foo` matching `path: 'foo'`.
 * 2 points for a dynamic segment, i.e. `/foo` matching `path: '{param}'`
