import { DNode, WidgetProperties } from '../widget-core/interfaces';
import { WidgetBase } from '../widget-core/WidgetBase';
import { inject } from '../widget-core/decorators/inject';
import { alwaysRender } from '../widget-core/decorators/alwaysRender';
import { OnEnter, OutletOptions, Outlet, Params, OutletContext, OutletRender } from './interfaces';
import { Router } from './Router';

export function Outlet<O extends WidgetProperties>(outletRender: OutletRender<O>, options: OutletOptions): Outlet<O> {
	const { outlet, key = 'router' } = options;

	@inject({ name: key, getProperties: (properties) => properties })
	@alwaysRender()
	class OutletComponent extends WidgetBase<O, null> {
		private _matched = false;
		private _matchedParams: Params = {};
		private _onExit?: () => void;

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

		protected onDetach() {
			if (this._matched) {
				this._onExit && this._onExit();
				this._matched = false;
			}
		}

		protected render(): DNode {
			const item = this.registry.getInjector<Router>(key)!;
			const router = item.injector();
			const outletContext = router.getOutlet(outlet);
			if (outletContext) {
				const { queryParams, params, type, onEnter, onExit } = outletContext;
				this._onExit = onExit;
				const result = outletRender(this.properties, { queryParams, params, type, router });
				if (result) {
					this._onEnter(outletContext, onEnter);
					return result;
				}
			}

			if (this._matched) {
				this._onExit && this._onExit();
				this._matched = false;
			}
			return null;
		}
	}
	return OutletComponent;
}

export default Outlet;
