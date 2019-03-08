# Basic Usage

## Adding Routing to an Application

Begin by adding an initial route configuration, that defines a single url path that maps to an identifier called an `outlet`.

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
import Registry from '@dojo/framework/widget-core/Registry';
import { registerRouterInjector } from '@dojo/framework/routing/RouterInjector';

import routes from './routes';
import App from './App';

const registry = new Registry();
// creates a router with the routes and registers the router with the registry
registerRouterInjector(routes, registry);

const r = renderer(() => <App />);
r.mount({ registry });
```

To display something when a route is matched, we use a widget called an `Outlet`. So lets add one to show `Home` when the `home` route is visited.

In the routing configuration the `home` route is associated with an outlet identifier, `home`, to associate the `Outlet` widget to the `home` route the outlet id is passed using the `id` property.

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
		path: 'home/{page}?{queryOne}&{queryTwo}',
		outlet: 'home'
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
					const { queryParams } = matchDetails;
					return <div>{`Home ${queryParams.queryOne}-${queryParams.queryTwo}`}</div>;
				}} />
			</div>
		);
	}
}
```

The query params are injected into matching `Outlet` `renderer` properties accessed from `queryParams` property.

## Default Route & Parameters

To add a default route for your application update the routing configuration to include `defaultRoute: true` for the preferred route. The default route is used to redirect the application on initial load if no route has been provided or the route has not been registered.

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

## Using Link Widgets

The `Link` component is a wrapper around an `a` DOM element that enables consumers to specify an `outlet` to create a link to. It is also possible to use a static route by setting the `isOutlet` property to `false`.

If the generated link requires specific path or query parameters that are not in the route, they can be passed via the `params` property.

Link Properties:

* `to: string`: The `outlet` id or `href` for the link.
* `params: { [index: string]: string }`: Params to generate the link with for the outlet.
* `isOutlet: boolean`(optional): Indicates if the link is for an outlet or a static `href`, defaults to `true`.
* `onClick: (event: MouseEvent) => void`(optional): Function that gets called when the `Link` is clicked.

In addition to the `Link` specific properties, all the standard `VNodeProperties` are available for the `Link` component as they would be creating an `a` DOM Element.

>src/App.tsx
```tsx
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import { tsx } from '@dojo/framework/widget-core/tsx';
import { Link } from '@dojo/framework/routing/Link';

export default class App extends WidgetBase {
	protected render() {
		return (
			<div>
				<Link to="home" params={{ foo: 'bar' }}>Link Text</Link>
				<Link to="#/static-route" isOutlet={false}>Link Text</Link>
			</div>
		);
	}
}
```

The `ActiveLink` component is a wrapper around the `Link` component that conditionally sets classes on the `a` node if the link is currently active:

ActiveLink Properties:

* `activeClasses: string[]`: An array of classes to apply when the `Link`'s outlet is matched.

```tsx
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import { tsx } from '@dojo/framework/widget-core/tsx';
import { ActiveLink } from '@dojo/framework/routing/ActiveLink';

export default class App extends WidgetBase {
	protected render() {
		return (
			<div>
				<ActiveLink to="home" params={{ foo: 'bar' }} activeClasses={[ 'link-active' ]}>Link Text</ActiveLink>
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

With the routing configuration above the following example will generate 4 separate bundles for each of the widgets returned in the `Outlet`'s renderer, `Home`, `About`, `Profile` and `Settings`.

>src/App.tsx
```tsx
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import { tsx } from '@dojo/framework/widget-core/tsx';
import Outlet from '@dojo/framework/routing/Outlet';

import Home from './Home';
import About from './About';
import Profile from './Profile';
import Settings from './Settings';

export default class App extends WidgetBase {
	protected render() {
		return (
			<div>
				<Outlet id="home" renderer={() => <Home />} />
				<Outlet id="about" renderer={() => <About />} />
				<Outlet id="profile" renderer={() => <Profile />} />
				<Outlet id="settings" renderer={() => <Settings />} />
			</div>
		);
	}
}
```
