import { registry as globalRegistry, w } from '@dojo/widget-core/d';
import { BaseInjector, Injector, InjectorProperties } from '@dojo/widget-core/Injector';
import { DNode, RegistryLabel } from '@dojo/widget-core/interfaces';
import { beforeRender } from '@dojo/widget-core/WidgetBase';
import { WidgetRegistry } from '@dojo/widget-core/WidgetRegistry';

import HashHistory from './history/HashHistory';
import { History } from './history/interfaces';
import { MapParamsOptions, MatchType, OutletProperties, RouteConfig } from './interfaces';
import { Router } from './Router';

/**
 * Key for the router injector
 */
export const routerKey = Symbol();

/**
 * Creates a router instance for a specific History manager (default is `HashHistory`) and registers
 * the route configuration.
 *
 * @param config The route config to register for the router
 * @param registry An optional registry that defaults to the global registry
 * @param history The history manager the router needs to use, default is `HashHistory`
 * @param key The key for the router injector, defaults to exported `routerKey` symbol
 */
export function registerRouterInjector(
	config: RouteConfig[],
	registry: WidgetRegistry = globalRegistry,
	history: History = new HashHistory(),
	key: RegistryLabel = routerKey
): Router<any> {
	if (registry.has(key)) {
		throw new Error('Router has already been defined');
	}
	const router = new Router({ history, config });
	registry.define(key, Injector(RouterInjector, router));
	return router;
}

export interface RouterInjectorProperties extends InjectorProperties {
	getProperties(injected: Router<any>, properties: any): OutletProperties;
}

/**
 * Injector for routing
 */
export class RouterInjector extends BaseInjector<Router<any>> {
	constructor(context: Router<any>) {
		super(context);
		context.on('navstart', (event: any) => {
			this.invalidate();
		});
	}

	@beforeRender()
	protected beforeRender(renderFunc: () => DNode | DNode[], properties: RouterInjectorProperties, children: any[]): () => DNode | DNode[] {
		const {
			outlet,
			mainComponent,
			indexComponent,
			errorComponent,
			mapParams = (options: MapParamsOptions) => {}
		} = properties.getProperties(this.toInject(), properties);

		const outletContext = this.context.getOutlet(outlet);
		if (outletContext) {
			const { params = {}, type, location } = outletContext;

			properties.getProperties = (router: Router<any>, properties: any) => {
				return mapParams({params, type, location, router});
			};

			if ((type === MatchType.INDEX || type === MatchType.ERROR) && indexComponent) {
				properties.render = () => w(indexComponent, properties.properties, children);
			}
			else if (type === MatchType.ERROR && errorComponent) {
				properties.render = () => w(errorComponent, properties.properties, properties.children);
			}
			else if (type !== MatchType.ERROR && mainComponent) {
				properties.render = () => w(mainComponent, properties.properties, properties.children);
			}
		}
		return renderFunc;
	}
}

export default RouterInjector;
