import { Registry } from '@dojo/widget-core/Registry';
import { Injector } from '@dojo/widget-core/Injector';
import { RegistryLabel } from '@dojo/widget-core/interfaces';

import { Router } from './Router';
import { RouteConfig, RouterOptions } from './interfaces';

/**
 * Router Injector Options
 *
 */
export interface RouterInjectorOptions extends RouterOptions {
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
export function registerRouterInjector(
	config: RouteConfig[],
	registry: Registry,
	options: RouterInjectorOptions = {}
): Router {
	const { key = 'router', ...routerOptions } = options;

	if (registry.hasInjector(key)) {
		throw new Error('Router has already been defined');
	}
	const router = new Router(config, routerOptions);
	const injector = new Injector(router);
	router.on('navstart', () => {
		injector.emit({ type: 'invalidate' });
	});
	registry.defineInjector(key, injector);
	return router;
}
