import { create, diffProperty, invalidator, w } from '../core/vdom';
import { Handle } from '../core/Destroyable';
import injector from '../core/middleware/injector';
import cache from '../core/middleware/cache';
import { SupportedClassName } from '../core/interfaces';
import Link, { LinkProperties } from './Link';
import Router from './Router';

export interface ActiveLinkProperties extends LinkProperties {
	activeClasses: SupportedClassName[];
	isExact?: boolean;
}

function paramsEqual(linkParams: any = {}, contextParams: any = {}) {
	return Object.keys(linkParams).every((key) => linkParams[key] === contextParams[key]);
}

const factory = create({ injector, diffProperty, cache, invalidator }).properties<ActiveLinkProperties>();

export const ActiveLink = factory(function ActiveLink({
	middleware: { diffProperty, injector, cache, invalidator },
	properties,
	children
}) {
	const { to, routerKey = 'router', params } = properties();
	let { activeClasses, isExact, classes = [], ...props } = properties();

	diffProperty('to', (current: ActiveLinkProperties, next: ActiveLinkProperties) => {
		if (current.to !== next.to) {
			const router = injector.get<Router>(routerKey);
			const currentHandle = cache.get<Handle>('handle');
			if (currentHandle) {
				currentHandle.destroy();
			}
			if (router) {
				const handle = router.on('outlet', ({ outlet }) => {
					if (outlet.id === to) {
						invalidator();
					}
				});
				cache.set('handle', handle);
			}
			invalidator();
		}
	});

	const router = injector.get<Router>(routerKey);
	if (router) {
		if (!cache.get('handle')) {
			const handle = router.on('outlet', ({ outlet }) => {
				if (outlet.id === to) {
					invalidator();
				}
			});
			cache.set('handle', handle);
		}
		const context = router.getOutlet(to);
		const isActive = context && paramsEqual(params, context.params);
		const contextIsExact = context && context.isExact();

		classes = Array.isArray(classes) ? classes : [classes];
		if (isActive && (!isExact || contextIsExact)) {
			classes = [...classes, ...activeClasses];
		}
		props = { ...props, classes };
	}
	return w(Link, props, children());
});

export default ActiveLink;
