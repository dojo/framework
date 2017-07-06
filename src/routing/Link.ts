import { beforeRender, WidgetBase } from '@dojo/widget-core/WidgetBase';
import { v, w } from '@dojo/widget-core/d';
import { DNode, VirtualDomProperties } from '@dojo/widget-core/interfaces';

import { routerKey as globalRouterKey, RouterInjector } from './RouterInjector';
import { Router } from './Router';

export interface LinkProperties extends VirtualDomProperties {
	key?: string;
	isOutlet?: boolean;
	params?: any;
	routerKey?: string;
	onClick?: (event: MouseEvent) => void;
	to: string;
}

export class Link extends WidgetBase<LinkProperties> {

	private _onClick(event: MouseEvent): void {
		this.properties.onClick && this.properties.onClick(event);
	}

	@beforeRender()
	protected withRouter(renderFunc: () => DNode, properties: any, children: any): () => DNode {
		const { to, isOutlet = true, params = {}, routerKey = globalRouterKey, onClick, ...props } = properties;
		if (this.getRegistries().get(routerKey)) {
			return () => w<RouterInjector>(routerKey, {
				scope: this,
				render: renderFunc,
				properties,
				getProperties: (router: Router<any>, properties: any): LinkProperties => {
					const handleOnClick = (event: MouseEvent) => {
						const { to } = this.properties;

						if (onClick) {
							onClick(event);
						}

						if (!event.defaultPrevented && event.button === 0 && !this.properties.target) {
							event.preventDefault();
							router.setPath(to);
						}
					};

					return {
						to: isOutlet ? router.link(to, { ...router.getCurrentParams(), ...params }) : to,
						onClick: handleOnClick,
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
		const props = { ...this.properties, onclick: this._onClick, onClick: undefined, to: undefined, isOutlet: undefined, params: undefined, routerKey: undefined, router: undefined };
		return v('a', { ...props, href: to }, this.children);
	}
}
