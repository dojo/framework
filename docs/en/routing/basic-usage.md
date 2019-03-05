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

