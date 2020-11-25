import { create, tsx, diffProperty, invalidator } from '../core/vdom';
import Map from '../shim/Map';
import injector from '../core/middleware/injector';
import icache from '../core/middleware/icache';
import { RenderResult } from '../core/interfaces';
import { MatchDetails, RouteContext } from './interfaces';
import Router from './Router';
import { RouteProperties } from './Route';

const ROUTER_KEY = 'router';

export interface RouteMatch {
	[index: string]: boolean;
}

export interface Matches {
	[index: string]: boolean;
}

export interface Matcher {
	(defaultMatches: Matches, matchDetails: Map<string, RouteContext>): Matches;
}

export interface OutletProperties {
	id: string;
	matcher?: Matcher;
	routerKey?: string;
}

export interface OutletChildren {
	[index: string]: RenderResult | ((matchDetails: MatchDetails) => RenderResult);
}

export interface OutletFunctionChild {
	(matchDetails: MatchDetails): RenderResult;
}

const factory = create({ icache, injector, diffProperty, invalidator })
	.properties<OutletProperties>()
	.children<OutletChildren | OutletFunctionChild>();

export const Outlet = factory(function Outlet({
	middleware: { icache, injector, diffProperty, invalidator },
	properties,
	children
}) {
	diffProperty('routerKey', (current: RouteProperties, next: RouteProperties) => {
		const { routerKey: currentRouterKey = ROUTER_KEY } = current;
		const { routerKey = ROUTER_KEY } = next;
		if (routerKey !== currentRouterKey) {
			const currentHandle = icache.get<Function>('handle');
			if (currentHandle) {
				currentHandle();
			}
			const handle = injector.subscribe(routerKey);
			if (handle) {
				icache.set('handle', () => handle);
			}
		}
		invalidator();
	});
	const { id, matcher, routerKey = ROUTER_KEY } = properties();
	const [outletChildren] = children();

	const currentHandle = icache.get<Function>('handle');
	if (!currentHandle) {
		const handle = injector.subscribe(routerKey);
		if (handle) {
			icache.set('handle', () => handle);
		}
	}

	const router = injector.get<Router>(routerKey);

	if (router) {
		const currentRouteContext = router.getMatchedRoute();
		const routeContextMap = router.getOutlet(id);
		if (routeContextMap && currentRouteContext) {
			if (typeof outletChildren === 'function') {
				return outletChildren({ ...currentRouteContext, router });
			}
			let matches = Object.keys(outletChildren).reduce(
				(matches, key) => {
					matches[key] = !!routeContextMap.get(key);
					return matches;
				},
				{} as Matches
			);
			if (matcher) {
				matches = matcher(matches, routeContextMap);
			}
			return (
				<virtual>
					{Object.keys(matches)
						.filter((key) => matches[key])
						.map((key) => {
							const renderer = outletChildren[key];
							if (typeof renderer === 'function') {
								const context = routeContextMap.get(key) || currentRouteContext;
								return renderer({ ...context, router });
							}
							return renderer;
						})}
				</virtual>
			);
		}
	}
	return null;
});

export default Outlet;
