import WeakMap from '@dojo/shim/WeakMap';
import { Context, Parameters, RouteInterface, RouterInterface } from '../interfaces';

export const parentMap = new WeakMap<RouteInterface<Context, Parameters>, RouterInterface<Context>>();

/**
 * Whether the route has been appended to another route or router.
 */
export function hasBeenAppended(route: RouteInterface<Context, Parameters>): boolean {
	return parentMap.has(route) || route.parent !== undefined;
}

/**
 * Finds the router whose route hierarchy the route has been appended to.
 *
 * Throws if the route was not appended to any router.
 */
export function findRouter(route: RouteInterface<Context, Parameters>): RouterInterface<Context> {
	while (route.parent) {
		route = route.parent;
	}

	const router = parentMap.get(route);
	if (!router) {
		throw new Error('Cannot generate link for route that is not in the hierarchy');
	}
	else {
		return router;
	}
}
