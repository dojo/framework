import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { v } from '@dojo/widget-core/d';
import { inject } from '@dojo/widget-core/decorators/inject';
import { Constructor, DNode, VNodeProperties } from '@dojo/widget-core/interfaces';
import { LinkProperties } from './interfaces';
import { Router } from './Router';

const getProperties = (router: Router, properties: LinkProperties): VNodeProperties => {
	const { to, isOutlet = true, params = {}, onClick, ...props } = properties;
	const href = isOutlet ? router.link(to, params) : to;

	const handleOnClick = (event: MouseEvent) => {
		onClick && onClick(event);

		if (!event.defaultPrevented && event.button === 0 && !properties.target) {
			event.preventDefault();
			href !== undefined && router.setPath(href);
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
		const props = {
			...this.properties,
			onclick: this._onClick,
			onClick: undefined,
			to: undefined,
			isOutlet: undefined,
			params: undefined,
			routerKey: undefined,
			router: undefined
		};
		return v('a', props, this.children);
	}
}

export function createLink(routerKey: string): Constructor<BaseLink> {
	@inject({ name: routerKey, getProperties })
	class Link extends BaseLink {}
	return Link;
}

export const Link = createLink('router');

export default Link;
