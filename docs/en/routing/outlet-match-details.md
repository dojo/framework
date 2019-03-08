# Using the Outlet MatchDetails

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
