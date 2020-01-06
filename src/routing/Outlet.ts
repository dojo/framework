import { create, diffProperty, invalidator } from '../core/vdom';
import injector from '../core/middleware/injector';
import icache from '../core/middleware/icache';
import { DNode } from '../core/interfaces';
import { MatchDetails } from './interfaces';
import Router from './Router';

export interface OutletProperties {
	renderer: (matchDetails: MatchDetails) => DNode | DNode[];
	id: string;
	routerKey?: string;
}

const factory = create({ icache, injector, diffProperty, invalidator }).properties<OutletProperties>();

export const Outlet = factory(function Outlet({
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
	diffProperty('routerKey', (current: OutletProperties, next: OutletProperties) => {
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
		const outletContext = router.getOutlet(id);
		if (outletContext) {
			const { queryParams, params, type, isError, isExact } = outletContext;
			const result = renderer({ queryParams, params, type, isError, isExact, router });
			if (result) {
				return result;
			}
		}
	}
	return null;
});

export default Outlet;
