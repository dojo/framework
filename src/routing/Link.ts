import { beforeRender, WidgetBase } from '@dojo/widget-core/WidgetBase';
import { v, w } from '@dojo/widget-core/d';
import { DNode, VirtualDomProperties, WidgetProperties } from '@dojo/widget-core/interfaces';

import { routerKey as globalRouterKey, RouterInjector } from './RouterInjector';
import { Router } from './Router';

export interface LinkProperties extends WidgetProperties, VirtualDomProperties {
	key?: string;
	isOutlet?: boolean;
	params?: any;
	routerKey?: string;
	to: string;
}

export class Link extends WidgetBase<LinkProperties> {

	@beforeRender()
	protected withRouter(renderFunc: () => DNode, properties: any, children: any): () => DNode {
		const { to, isOutlet = true, params = {}, routerKey = globalRouterKey, ...props } = properties;
		if (this.registries.get(routerKey)) {
			return () => w<RouterInjector>(routerKey, {
				scope: this,
				render: renderFunc,
				properties,
				getProperties: (router: Router<any>, properties: LinkProperties) => {
					if (!isOutlet) {
						return properties;
					}
					return {
						to: router.link(to, { ...router.getCurrentParams(), ...params }),
						...props
					};
				},
				children
			});
		}
		throw new Error(`Unable to generate link as injected router could not be found with key '${routerKey.toString()}'`);
	}

	protected render(): DNode {
		const { to } = this.properties;
		const props = { ...this.properties, to: undefined, isOutlet: undefined, params: undefined, routerKey: undefined };
		return v('a', { ...props, href: to }, this.children);
	}
}
