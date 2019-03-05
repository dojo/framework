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

Then configuring the application to be "routing" aware by registering the router with an application registry.

>src/main.tsx
```tsx
import renderer from '@dojo/framework/widget-core/vdom';
import { tsx } from '@dojo/framework/widget-core/tsx';
import { registerRoutingInjector } from '@dojo/framework/routing/RoutingInjector';

import routes from './routes';
import App from './App';

const registry = new Registry();
// creates a router with the routes and registers the router with the registry
registerRoutingInjector(routes, registry);

const r = renderer(() => <App />);
r.mount({ registry });
```

Use the `Outlet` widget to control what widgets to render when an outlet id is matched, the example will render `<div>Home</div>` for the `home` outlet.

>src/App.tsx
```tsx
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import { tsx } from '@dojo/framework/widget-core/tsx';
import Outlet from '@dojo/framework/routing/Outlet';

export default class App extends WidgetBase {
	protected render() {
		return (
			<div>
				<Outlet id="home" renderer={() => <div>Home</div>}
			</div>
		);
	}
}
```

## Path & Query Parameters

Path parameters are placeholders in the routing configuration that will match any value for the segment. The parameters are defined using curly braces, `{param}`.

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
				<Outlet id="home" renderer={(matchDetails) => <div>{`Home ${matchDetails.params.page}`}</div>}
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
