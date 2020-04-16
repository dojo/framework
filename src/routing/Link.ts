import { create, v } from '../core/vdom';
import has from '../core/has';
import injector from '../core/middleware/injector';
import { VNodeProperties } from '../core/interfaces';
import { Params } from './interfaces';
import Router from './Router';

export interface LinkProperties extends VNodeProperties {
	key?: string;
	routerKey?: string;
	isOutlet?: boolean;
	params?: Params;
	onClick?: (event: MouseEvent) => void;
	to: string;
}

const factory = create({ injector }).properties<LinkProperties>();

export const Link = factory(function Link({ middleware: { injector }, properties, children }) {
	let { routerKey = 'router', to, isOutlet = true, target, params = {}, onClick, ...props } = properties();
	const router = injector.get<Router>(routerKey);
	let href: string | undefined = to;

	let linkProps: VNodeProperties;
	if (router) {
		if (isOutlet) {
			href = router.link(href, params);
		}
		const onclick = (event: MouseEvent) => {
			onClick && onClick(event);

			if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !target) {
				if (!has('build-serve') || !has('build-time-rendered')) {
					event.preventDefault();
					href !== undefined && router.setPath(href);
				}
			}
		};
		linkProps = { ...props, onclick, href };
	} else {
		linkProps = { ...props, href };
	}
	return v('a', linkProps, children());
});

export default Link;
