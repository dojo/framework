# Introduction

Dojo's Routing package provides a first class declarative routing solution for web applications. Widgets are the fundamental concept in Dojo applications and with routing it is no different. Dojo Routing provides a collection of widgets that integrate directly into a Dojo application and enable application widgets to be associated with routes without compromising their functionality, reusability or property interface.

| Feature                            | Description                                                                                    |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Multiple History Managers**      | Routing comes with a collection of history managers depending on the needs of your application |
| **Out-of-the-box Routing Widgets** | There are a selection of out the box routing widgets, such as `Link` and `ActiveLink`          |
| **Automatic Code Splitting**       | Combined with `@dojo/cli-build-app`, top level routes are automatically code split             |

## Basic usage

### Adding routing to an application

-   Add an initial route configuration that defines a single url path that maps to a route identifier and an `outlet` name.

> src/routes.ts

```ts
export default [
	{
		id: 'home',
		path: 'home',
		outlet: 'main'
	},
	{
		id: 'about',
		path: 'about',
		outlet: 'main'
	},
	{
		id: 'profile',
		path: 'profile',
		outlet: 'main'
	}
];
```

-   Configure the application to be routing-aware by registering the router with an application registry.

> src/main.tsx

```tsx
import renderer, { tsx } from '@dojo/framework/core/vdom';
import Registry from '@dojo/framework/core/Registry';
import { registerRouterInjector } from '@dojo/framework/routing/RouterInjector';

import routes from './routes';
import App from './App';

const registry = new Registry();
// creates a router with the routes and registers the router with the registry
registerRouterInjector(routes, registry);

const r = renderer(() => <App />);
r.mount({ registry });
```

-   Add a `Route` widget to show the text "Home" when the `home` route is visited. `Route` is a widget that displays something when the path for the route id is matched. The application's `src/routes.ts` file associates a route to an id via the `Route`'s `id` property.

> src/App.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import Route from '@dojo/framework/routing/Route';

const factory = create();

export default factory(function App() {
	return (
		<div>
			<Route id="home" renderer={() => <div>Home</div>} />
			<Route id="about" renderer={() => <div>About</div>} />
			<Route id="profile" renderer={() => <div>Profile</div>} />
		</div>
	);
});
```

or using outlets and the `Outlet` widget, check out the [`Outlet` documentation](/learn/routing/outlets) for more information:

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import Outlet from '@dojo/framework/routing/Outlet';

const factory = create();

export default factory(function App() {
	return (
		<div>
			<Outlet id="main">
				{{
					home: <div>Home</div>,
					about: <div>About</div>,
					profile: <div>Profile</div>
				}}
			</Outlet>
		</div>
	);
});
```

-   The URL of the route is determined by the `path` element of the route configuration. In this case, `home` was specified so the route can be accessed via the URL path `/#home`.
    -   By default the router uses the [HashHistory](/learn/routing/history-managers#hashhistory) history manager which requires the use of the `#` before the route path. Other [history managers](/learn/routing/history-managers) are available to support other history management mechanisms.

### Path and query parameters

Path parameters are placeholders in the routing configuration that will match any value for the segment. The parameters are defined using curly braces, for example: `{param}`.

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

The parameter values are injected into the matching `Route`'s `renderer` property.

> src/App.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import Route from '@dojo/framework/routing/Route';

const factory = create();

export default factory(function App() {
	return (
		<div>
			<Route id="home" renderer={(matchDetails) => <div>{`Home ${matchDetails.params.page}`}</div>} />
		</div>
	);
});
```

Query parameters can also be added to route URLs. As with normal query parameters, the first must be prefixed with a `?` with additional query parameters delimited by the `&` character. Note that the route configuration does not change when using query parameters.

> src/routes.ts

```ts
export default [
	{
		id: 'home',
		path: 'home/{page}?{queryOne}&{queryTwo}',
		outlet: 'home'
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
					const { queryParams } = matchDetails;
					return <div>{`Home ${queryParams.queryOne}-${queryParams.queryTwo}`}</div>;
				}}
			/>
		</div>
	);
});
```

If the browser is pointed to the URL path `/home/page?queryOne=modern&queryTwo=dojo`, then the query parameters are injected into the matching `Route`'s `renderer` method as an object of type `MatchDetails` and accessed via that object's `queryParams` property. Using this URL, the page would show "Hello modern-dojo". If a query parameter is not provided, then its value will be set to `undefined`.

### Default route and parameters

-   Specify a default route by updating the routing configuration to include `defaultRoute: true` for the preferred route. The default route is used to redirect the application on initial load if no route has been provided or the requested route has not been registered.

> src/routes.ts

```ts
export default [
	{
		id: 'home',
		path: 'home',
		outlet: 'home',
		defaultRoute: true
	}
];
```

If the default route has path or query parameters a map of defaults need to be specified.

> src/routes.ts

```ts
export default [
	{
		id: 'home',
		path: 'home/{page}',
		outlet: 'home',
		defaultRoute: true,
		defaultParams: {
			page: 'about'
		}
	}
];
```

### Wildcard Routes

The `*` character can be used to indicate a wildcard route. The route will be matched normally up until the `*` and will match
any path at that point. A wildcard route will never be preferred over another matching route without a wildcard. The `*` implicitly indicates the end of the
match, and any segments specified after the `*` in the route config will be ignored. Any additional segments in the actual URL will be passed with
the `matchDetails` in an array property called `wildcardSegments`.

```ts
export default [
	{
		id: 'catchall',
		// Anything after the asterisk will be ignored in this config
		path: '*',
		outlet: 'catchall'
	},
	// This path will be preferred to the wildcard as long as it matches
	{
		id: 'home',
		path: 'home',
		outlet: 'home'
	}
];
```

All segments after and including the matched `*` will be injected into the matching `Route`'s `renderer` property as `wildcardSegments`.

> src/App.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import Route from '@dojo/framework/routing/Route';

const factory = create();

export default factory(function App() {
	return (
		<div>
			<Route id="home" renderer={(matchDetails) => <div>{`Home ${matchDetails.params.page}`}</div>} />
			<Route
				id="catchall"
				renderer={(matchDetails) => <div>{`Matched Route ${matchDetails.wildcardSegments.join(', ')}`}</div>}
			/>
		</div>
	);
});
```

### Using link widgets

The `Link` widget is a wrapper around an anchor tag that enables consumers to specify a route `id` to create a link to. If the generated link requires specific path or query parameters that are not in the route, they can be passed via the `params` property.

Link Properties:

-   `to: string`: The `route` id.
-   `params: { [index: string]: string }`: Params to generate the link with for the route.
-   `onClick: (event: MouseEvent) => void` (optional): Function that gets called when the `Link` is clicked.

In addition to the `Link` specific properties, all the standard `VNodeProperties` are available for the `Link` widget as they would be creating an anchor tag.

> src/App.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { Link } from '@dojo/framework/routing/Link';

const factory = create();

export default factory(function App() {
	return (
		<div>
			<Link to="home" params={{ foo: 'bar' }}>
				Link Text
			</Link>
		</div>
	);
});
```

The `ActiveLink` widget is a wrapper around the `Link` widget that conditionally sets classes on the `a` node if the link is currently active:

ActiveLink Properties:

-   `activeClasses: string[]`: An array of classes to apply when the `Link`'s route is matched.

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { ActiveLink } from '@dojo/framework/routing/ActiveLink';

const factory = create();

export default factory(function App() {
	return (
		<div>
			<ActiveLink to="home" params={{ foo: 'bar' }} activeClasses={['link-active']}>
				Link Text
			</ActiveLink>
		</div>
	);
});
```

### Code splitting by route

When using `@dojo/cli-build-app`, Dojo supports automatic code splitting by default for all top level routes. This means that all widgets referenced within the `Route`s `renderer` will include a specific bundle for the route that will be loaded lazily when a user accesses the route.

To take advantage of the code splitting there are 4 rules:

1.  The routing configuration needs to be the default export in the `src/routes.ts` module.
2.  The widgets must be the default export of their module.
3.  The `renderer` property must be defined inline.
4.  The `id` and `outlet` in the routing config must be static and defined inline.

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
		outlet: 'about',
		children: [
			{
				id: 'company',
				path: 'company',
				outlet: 'about-company'
			}
		]
	},
	{
		id: 'profile',
		path: 'profile',
		outlet: 'profile'
	},
	{
		id: 'settings',
		path: 'settings',
		outlet: 'settings'
	}
];
```

With the routing configuration above the following example will generate 4 separate bundles for each of the widgets returned in the `Route`'s renderer, `Home`, `About`, `Profile` and `Settings`.

> src/App.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import Route from '@dojo/framework/routing/Route';

import Home from './Home';
import About from './About';
import Profile from './Profile';
import Settings from './Settings';

const factory = create();

export default factory(function App() {
	return (
		<div>
			<Route id="home" renderer={() => <Home />} />
			<Route id="about" renderer={() => <About />} />
			<Route id="profile" renderer={() => <Profile />} />
			<Route id="settings" renderer={() => <Settings />} />
		</div>
	);
});
```
