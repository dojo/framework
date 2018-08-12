import { DNode } from '../widget-core/interfaces';
import { WidgetBase } from '../widget-core/WidgetBase';
import { alwaysRender } from '../widget-core/decorators/alwaysRender';
import { MatchDetails, OnExit, OutletContext, OnEnter, Params } from './interfaces';
import { Router } from './Router';
import { diffProperty } from '../widget-core/decorators/diffProperty';
import { Handle } from '../core/Destroyable';

export interface OutletProperties {
	renderer: (matchDetails: MatchDetails) => DNode;
	outlet: string;
	routerKey?: string;
}

@alwaysRender()
export class Outlet extends WidgetBase<OutletProperties> {
	private _handle: Handle;
	private _matched = false;
	private _matchedParams: Params = {};
	private _onExit?: OnExit;

	@diffProperty('routerKey')
	protected onRouterKeyChange(current: OutletProperties, next: OutletProperties) {
		const { routerKey = 'router' } = next;
		const item = this.registry.getInjector<Router>(routerKey);
		if (this._handle) {
			this._handle.destroy();
		}
		if (item) {
			this._handle = item.invalidator.on('invalidate', () => {
				this.invalidate();
			});
			this.own(this._handle);
		}
	}

	protected onDetach() {
		this._onExit && this._onExit();
	}

	protected onAttach() {
		if (!this._handle) {
			this.onRouterKeyChange(this.properties, this.properties);
		}
	}

	private _hasRouteChanged(params: Params): boolean {
		if (!this._matched) {
			return true;
		}
		const newParamKeys = Object.keys(params);
		for (let i = 0; i < newParamKeys.length; i++) {
			const key = newParamKeys[i];
			if (this._matchedParams[key] !== params[key]) {
				return true;
			}
		}
		return false;
	}

	private _onEnter(outletContext: OutletContext, onEnterCallback?: OnEnter) {
		const { params, type } = outletContext;
		if (this._hasRouteChanged(params)) {
			onEnterCallback && onEnterCallback(params, type);
			this._matched = true;
			this._matchedParams = params;
		}
	}

	protected render(): DNode {
		const { renderer, outlet, routerKey = 'router' } = this.properties;
		const item = this.registry.getInjector<Router>(routerKey);

		if (item) {
			const router = item.injector();
			const outletContext = router.getOutlet(outlet);
			if (outletContext) {
				const { queryParams, params, type, onEnter, onExit, isError, isExact } = outletContext;
				this._onExit = onExit;
				const result = renderer({ queryParams, params, type, isError, isExact, router });
				if (result) {
					this._onEnter(outletContext, onEnter);
					return result;
				}
			}
		}
		if (this._matched) {
			this._onExit && this._onExit();
			this._onExit = undefined;
			this._matched = false;
		}
		return null;
	}
}
export default Outlet;
