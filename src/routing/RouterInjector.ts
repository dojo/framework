import { Registry } from '@dojo/widget-core/Registry';
import { Injector } from '@dojo/widget-core/Injector';
import { RegistryLabel } from '@dojo/widget-core/interfaces';

import HashHistory from './history/HashHistory';
import { History } from './history/interfaces';
import { Router } from './Router';
import { RouteConfig } from './interfaces';

/**
 * Key for the router injector
 */
export const routerKey = Symbol();

/**
 * Router Injector Options
 *
 */
export interface RouterInjectorOptions {
	history?: History;
	key?: RegistryLabel;
}

/**
 * Creates a router instance for a specific History manager (default is `HashHistory`) and registers
 * the route configuration.
 *
 * @param config The route config to register for the router
 * @param registry An optional registry that defaults to the global registry
 * @param options The router injector options
 */
export function registerRouterInjector(config: RouteConfig[], registry: Registry, options: RouterInjectorOptions = {}): Router<any> {
	const { key = routerKey, history = new HashHistory() } = options;

	if (registry.hasInjector(key)) {
		throw new Error('Router has already been defined');
	}
	const router = new Router({ history, config });
	const injector = new Injector(router);
	router.on('navstart', () => {
		injector.emit({ type: 'invalidate' });
	});
	registry.defineInjector(key, injector);
	return router;
}
