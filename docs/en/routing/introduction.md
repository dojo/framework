# Introduction

Dojo's Routing package provides a first class declarative routing solution for web applications. Widgets are the fundamental concept in Dojo applications and with routing it is no different. Dojo Routing provides a collection of widgets that integrate directly into a Dojo application and enable application widgets to be associated with routes without compromising their functionality, reusability or property interface.

| Feature                            | Description                                                                                    |
| ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Multiple History Managers**      | Routing comes with a collection of history managers depending on the needs of your application |
| **Out-of-the-box Routing Widgets** | There are a selection of out the box routing widgets, such as `Link` and `ActiveLink`          |
| **Automatic Code Splitting**       | Combined with `@dojo/cli-build-app`, top level routes are automatically code split             |

# Basic usage

## Adding routing to an application

-   Add an initial route configuration that defines a single url path that maps to an identifier referred to as an `outlet`. Outlets will be described later in the documentation.

> src/routes.ts

```ts
export default [
	{
		path: 'home',
		outlet: 'home'
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

-   Add an `outlet` widget to show the text "Home" when the `home` route is visited. Outlets are widgets that display something when a route is matched. The application's `src/routes.ts` file associates a route to an outlet via the outlet's `id` property.

> src/App.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import Outlet from '@dojo/framework/routing/Outlet';

const factory = create();

export default factory(function App() {
	return (
		<div>
			<Outlet id="home" renderer={() => <div>Home</div>} />
		</div>
	);
});
```

-   The URL of the route is determined by the `path` element of the route configuration. In this case, `home` was specified so the route can be accessed via the URL path `/#home`.
    -   By default the router uses the [HashHistory](/learn/routing/history-managers#hashhistory) history manager which requires the use of the `#` before the route path. Other [history managers](/learn/routing/history-managers) are available to support other history management mechanisms.

## Path and query parameters

Path parameters are placeholders in the routing configuration that will match any value for the segment. The parameters are defined using curly braces, for example: `{param}`.

> src/routes.ts

```ts
export default [
	{
		path: 'home/{page}',
		outlet: 'home'
	}
];
```

The parameters values are injected into to matching `Outlets`'s `renderer` property.

> src/App.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import Outlet from '@dojo/framework/routing/Outlet';

const factory = create();

export default factory(function App() {
	return (
		<div>
			<Outlet id="home" renderer={(matchDetails) => <div>{`Home ${matchDetails.params.page}`}</div>} />
		</div>
	);
});
```

Query parameters can also be added to route URLs. As with normal query parameters, the first must be prefixed with a `?` with additional query parameters delimited by the `&` character. Note that the route configuration does not change when using query parameters.

> src/routes.ts

```ts
export default [
	{
		path: 'home/{page}?queryOne=Friends&queryTwo=Family',
		outlet: 'home'
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
					const { queryParams } = matchDetails;
					return <div>{`Home ${queryParams.queryOne}-${queryParams.queryTwo}`}</div>;
				}}
			/>
		</div>
	);
});
```

If the browser is pointed to the URL path `/home/page?queryOne=modern&queryTwo=dojo`, then the query parameters are injected into the matching `Outlet`'s `renderer` method as an object of type `MatchDetails` and accessed via that object's `queryParams` property. Using this URL, the page would show "Hello modern-dojo". If a query parameter is not provided, then its value will be set to `undefined`.

## Default route and parameters

-   Specify a default route by updating the routing configuration to include `defaultRoute: true` for the preferred route. The default route is used to redirect the application on initial load if no route has been provided or the requested route has not been registered.

> src/routes.ts

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

> src/routes.ts

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

## Using link widgets

The `Link` widget is a wrapper around an anchor tag that enables consumers to specify an `outlet` to create a link to. If the generated link requires specific path or query parameters that are not in the route, they can be passed via the `params` property.

Link Properties:

-   `to: string`: The `outlet` id.
-   `params: { [index: string]: string }`: Params to generate the link with for the outlet.
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

-   `activeClasses: string[]`: An array of classes to apply when the `Link`'s outlet is matched.

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

## Code splitting by route

When using `@dojo/cli-build-app`, Dojo supports automatic code splitting by default for all top level outlets. This means that all widgets referenced within the `Outlet`s `renderer` will include a specific bundle for the outlet that will be loaded lazily when a user accesses the route.

To take advantage of the code splitting there are 4 rules:

1.  The routing configuration needs to be the default export in the `src/routes.ts` module.
2.  The widgets must be the default export of their module.
3.  The `renderer` property must be defined inline.
4.  The outlet `id` must be static and defined inline.

> src/routes.ts

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

With the routing configuration above the following example will generate 4 separate bundles for each of the widgets returned in the `Outlet`'s renderer, `Home`, `About`, `Profile` and `Settings`.

> src/App.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import Outlet from '@dojo/framework/routing/Outlet';

import Home from './Home';
import About from './About';
import Profile from './Profile';
import Settings from './Settings';

const factory = create();

export default factory(function App() {
	return (
		<div>
			<Outlet id="home" renderer={() => <Home />} />
			<Outlet id="about" renderer={() => <About />} />
			<Outlet id="profile" renderer={() => <Profile />} />
			<Outlet id="settings" renderer={() => <Settings />} />
		</div>
	);
});
```
