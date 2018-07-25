import WidgetBase from '../widget-core/WidgetBase';
import { w } from '../widget-core/d';
import { LinkProperties } from './interfaces';
import Link from './Link';
import Router from './Router';
import { WNode } from '../widget-core/interfaces';

export interface ActiveLinkProperties extends LinkProperties {
	activeClasses: string[];
}

export class ActiveLink extends WidgetBase<ActiveLinkProperties> {
	private _renderLink(isActive = false) {
		let { activeClasses, classes = [], ...props } = this.properties;
		classes = Array.isArray(classes) ? classes : [classes];
		if (isActive) {
			classes = [...classes, ...activeClasses];
		}
		props = { ...props, classes };
		return w(Link, props);
	}

	protected render(): WNode {
		const { to, routerKey = 'router' } = this.properties;
		const item = this.registry.getInjector<Router>(routerKey);
		if (!item) {
			return this._renderLink();
		}
		const router = item.injector();
		return this._renderLink(!!router.getOutlet(to));
	}
}

export default ActiveLink;
