import { create, diffProperty, invalidator, w } from '../core/vdom';
import { Handle } from '../core/Destroyable';
import injector from '../core/middleware/injector';
import icache from '../core/middleware/icache';
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

const factory = create({ injector, diffProperty, icache, invalidator }).properties<ActiveLinkProperties>();

export const ActiveLink = factory(function ActiveLink({
	middleware: { diffProperty, injector, icache, invalidator },
	properties,
	children
}) {
	const { to, routerKey = 'router', params } = properties();
	let { activeClasses, isExact, classes = [], ...props } = properties();

	diffProperty('to', (current: ActiveLinkProperties, next: ActiveLinkProperties) => {
		if (current.to !== next.to) {
			const router = injector.get<Router>(routerKey);
			const currentHandle = icache.get<Handle>('handle');
			if (currentHandle) {
				currentHandle.destroy();
			}
			if (router) {
				const handle = router.on('route', ({ route }) => {
					if (route.id === to) {
						invalidator();
					}
				});
				icache.set('handle', () => handle);
			}
			invalidator();
		}
	});

	const router = injector.get<Router>(routerKey);
	if (router) {
		if (!icache.get('handle')) {
			const handle = router.on('route', ({ route }) => {
				if (route.id === to) {
					invalidator();
				}
			});
			icache.set('handle', () => handle);
		}
		const context = router.getRoute(to);
		const isActive = context && paramsEqual(params, { ...context.params, ...context.queryParams });
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
