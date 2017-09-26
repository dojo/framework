import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { v } from '@dojo/widget-core/d';
import { inject } from '@dojo/widget-core/decorators/inject';
import { Constructor, DNode, VirtualDomProperties } from '@dojo/widget-core/interfaces';

import { routerKey } from './RouterInjector';
import { Router } from './Router';

export interface LinkProperties extends VirtualDomProperties {
	key?: string;
	isOutlet?: boolean;
	params?: any;
	onClick?: (event: MouseEvent) => void;
	to: string;
}

const getProperties = (router: Router<any>, properties: any): LinkProperties => {
	const { to, isOutlet = true, params = {}, onClick, ...props } = properties;
	const href = isOutlet ? router.link(to, { ...router.getCurrentParams(), ...params }) : to;
	const handleOnClick = (event: MouseEvent) => {

		if (onClick) {
			onClick(event);
		}

		if (!event.defaultPrevented && event.button === 0 && !properties.target) {
			event.preventDefault();
			router.setPath(href);
		}
	};
	return {
		href,
		onClick: handleOnClick,
		...props
	};
};

export class BaseLink extends WidgetBase<LinkProperties> {

	private _onClick(event: MouseEvent): void {
		this.properties.onClick && this.properties.onClick(event);
	}

	protected render(): DNode {
		const props = { ...this.properties, onclick: this._onClick, onClick: undefined, to: undefined, isOutlet: undefined, params: undefined, routerKey: undefined, router: undefined };
		return v('a', { ...props }, this.children);
	}
}

export function createLink(routerKey: any): Constructor<BaseLink> {
	@inject({ name: routerKey, getProperties })
	class Link extends BaseLink {};
	return Link;
}

export const Link = createLink(routerKey);
