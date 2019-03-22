import { DNode } from '../core/interfaces';
import { WidgetBase } from '../core/WidgetBase';
import { alwaysRender } from '../core/decorators/alwaysRender';
import { MatchDetails } from './interfaces';
import { Router } from './Router';
import { diffProperty } from '../core/decorators/diffProperty';
import { Handle } from '../core/Destroyable';

export interface OutletProperties {
	renderer: (matchDetails: MatchDetails) => DNode | DNode[];
	id: string;
	routerKey?: string;
}

@alwaysRender()
export class Outlet extends WidgetBase<OutletProperties> {
	private _handle: Handle | undefined;

	@diffProperty('routerKey')
	protected onRouterKeyChange(current: OutletProperties, next: OutletProperties) {
		const { routerKey = 'router' } = next;
		const item = this.registry.getInjector<Router>(routerKey);
		if (this._handle) {
			this._handle.destroy();
			this._handle = undefined;
		}
		if (item) {
			this._handle = item.invalidator.on('invalidate', () => {
				this.invalidate();
			});
			this.own(this._handle);
		}
	}

	protected onAttach() {
		if (!this._handle) {
			this.onRouterKeyChange(this.properties, this.properties);
		}
	}

	protected render(): DNode | DNode[] {
		const { renderer, id, routerKey = 'router' } = this.properties;
		const item = this.registry.getInjector<Router>(routerKey);

		if (item) {
			const router = item.injector();
			const outletContext = router.getOutlet(id);
			if (outletContext) {
				const { queryParams, params, type, isError, isExact } = outletContext;
				const result = renderer({ queryParams, params, type, isError, isExact, router });
				if (result) {
					return result;
				}
			}
		}
		return null;
	}
}

export default Outlet;
