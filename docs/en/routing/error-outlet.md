# Error Outlet

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
