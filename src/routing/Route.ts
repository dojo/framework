import { create, diffProperty, invalidator } from '../core/vdom';
import injector from '../core/middleware/injector';
import icache from '../core/middleware/icache';
import { DNode } from '../core/interfaces';
import { MatchDetails } from './interfaces';
import Router from './Router';

export interface RouteProperties {
	renderer: (matchDetails: MatchDetails) => DNode | DNode[];
	id: string;
	routerKey?: string;
}

const factory = create({ icache, injector, diffProperty, invalidator }).properties<RouteProperties>();

export const Route = factory(function Route({
	middleware: { icache, injector, diffProperty, invalidator },
	properties
}) {
	const { renderer, id, routerKey = 'router' } = properties();
	const currentHandle = icache.get<Function>('handle');
	if (!currentHandle) {
		const handle = injector.subscribe(routerKey);
		if (handle) {
			icache.set('handle', () => handle);
		}
	}
	diffProperty('routerKey', (current: RouteProperties, next: RouteProperties) => {
		const { routerKey: currentRouterKey = 'router' } = current;
		const { routerKey = 'router' } = next;
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
	const router = injector.get<Router>(routerKey);

	if (router) {
		const routeContext = router.getRoute(id);
		if (routeContext) {
			const { queryParams, params, type, isError, isExact, wildcardSegments } = routeContext;
			const result = renderer({ queryParams, params, type, isError, isExact, router, wildcardSegments });
			if (result) {
				return result;
			}
		}
	}
	return null;
});

export default Route;
