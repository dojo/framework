import {
	Constructor,
	RegistryLabel,
	DNode,
	WidgetBaseInterface,
	WidgetProperties
} from '@dojo/widget-core/interfaces';
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { w } from '@dojo/widget-core/d';
import { inject } from '@dojo/widget-core/decorators/inject';

import { Router } from './Router';
import { routerKey } from './RouterInjector';
import {
	MatchType,
	Component,
	MapParams,
	OutletComponents,
	MapParamsOptions
} from './interfaces';

export function isComponent<W extends WidgetBaseInterface>(value: any): value is Component<W> {
	return Boolean(value && ((typeof value === 'string') || (typeof value === 'function') || (typeof value === 'symbol')));
}

export type Outlet<
	W extends WidgetBaseInterface,
	F extends WidgetBaseInterface,
	E extends WidgetBaseInterface> = Constructor<WidgetBase<Partial<E['properties']> & Partial<W['properties']> & Partial<F['properties']> & WidgetProperties, null>>;

export function Outlet<W extends WidgetBaseInterface, F extends WidgetBaseInterface, E extends WidgetBaseInterface>(
	outletComponents: Component<W> | OutletComponents<W, F, E>,
	outlet: string,
	mapParams: MapParams = (options: MapParamsOptions) => {},
	key: RegistryLabel = routerKey
): Outlet<W, F, E> {
	const indexComponent = isComponent(outletComponents) ? undefined : outletComponents.index;
	const mainComponent = isComponent(outletComponents) ? outletComponents : outletComponents.main;
	const errorComponent = isComponent(outletComponents) ? undefined : outletComponents.error;
	function getProperties(this: WidgetBase, router: Router<any>, properties: any) {
		return { router };
	};

	@inject({ name: routerKey, getProperties })
	class OutletComponent extends WidgetBase<Partial<W['properties']> & { router: Router<any> }, null> {

		public __setProperties__(properties: Partial<W['properties']> & { router: Router<any> }): void {
			super.__setProperties__(properties);
			this.invalidate();
		}

		protected render(): DNode {
			const { router } = this.properties;
			const outletContext = router.getOutlet(outlet);
			if (outletContext) {
				const { params, type, location } = outletContext;
				const properties = { ...this.properties, ...mapParams({ params, type, location, router }) };

				if ((type === MatchType.INDEX || type === MatchType.ERROR) && indexComponent) {
					return w(indexComponent, properties, this.children);
				}
				else if (type === MatchType.ERROR && errorComponent) {
					return w(errorComponent, properties, this.children);
				}
				else if (type !== MatchType.ERROR && mainComponent) {
					return w(mainComponent, properties, this.children);
				}
			}
			return null;
		}
	}
	return OutletComponent;
}

export default Outlet;
