import { WidgetBase } from '../widget-core/WidgetBase';
import { v } from '../widget-core/d';
import { VNode } from '../widget-core/interfaces';
import { LinkProperties } from './interfaces';
import { Router } from './Router';

export class Link extends WidgetBase<LinkProperties> {
	private _getProperties() {
		let { routerKey = 'router', to, isOutlet = true, target, params = {}, onClick, ...props } = this.properties;
		const item = this.registry.getInjector<Router>(routerKey);
		let href: string | undefined = to;

		if (item) {
			const router = item.injector();
			if (isOutlet) {
				href = router.link(href, params);
			}
			const onclick = (event: MouseEvent) => {
				onClick && onClick(event);

				if (!event.defaultPrevented && event.button === 0 && !target) {
					event.preventDefault();
					href !== undefined && router.setPath(href);
				}
			};
			props = { ...props, onclick, href };
		} else {
			props = { ...props, href };
		}

		return props;
	}

	protected render(): VNode {
		return v('a', this._getProperties(), this.children);
	}
}

export default Link;
