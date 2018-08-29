import WidgetBase from '../widget-core/WidgetBase';
import { WNode } from '../widget-core/interfaces';
import { w } from '../widget-core/d';
import diffProperty from '../widget-core/decorators/diffProperty';
import { LinkProperties } from './interfaces';
import Link from './Link';
import Router from './Router';
import { Handle } from '../shim/interfaces';

export interface ActiveLinkProperties extends LinkProperties {
	activeClasses: string[];
}

function paramsEqual(linkParams: any = {}, contextParams: any = {}) {
	return Object.keys(linkParams).every((key) => linkParams[key] === contextParams[key]);
}

export class ActiveLink extends WidgetBase<ActiveLinkProperties> {
	private _outletHandle: Handle | undefined;

	private _renderLink(isActive = false) {
		let { activeClasses, classes = [], ...props } = this.properties;
		classes = Array.isArray(classes) ? classes : [classes];
		if (isActive) {
			classes = [...classes, ...activeClasses];
		}
		props = { ...props, classes };
		return w(Link, props);
	}

	@diffProperty('to')
	protected _onOutletPropertyChange(previous: ActiveLinkProperties, current: ActiveLinkProperties) {
		const { to, routerKey = 'router' } = current;
		const item = this.registry.getInjector<Router>(routerKey);
		if (this._outletHandle) {
			this._outletHandle.destroy();
			this._outletHandle = undefined;
		}
		if (item) {
			const router = item.injector();
			this._outletHandle = router.on('outlet', ({ outlet }) => {
				if (outlet === to) {
					this.invalidate();
				}
			});
		}
	}

	protected render(): WNode {
		const { to, routerKey = 'router', params } = this.properties;
		const item = this.registry.getInjector<Router>(routerKey);
		if (!item) {
			return this._renderLink();
		}
		const router = item.injector();
		const context = router.getOutlet(to);

		const isActive = context && paramsEqual(params, context.params);

		return this._renderLink(isActive);
	}
}

export default ActiveLink;
