import {
	Constructor,
	RegistryLabel,
	DNode,
	WidgetBaseInterface,
	WidgetProperties
} from '@dojo/widget-core/interfaces';
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { w } from '@dojo/widget-core/d';

import { Router } from './Router';
import { RouterInjector, routerKey } from './RouterInjector';
import { Component, MapParams, OutletComponents } from './interfaces';

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
	mapParams?: MapParams,
	key: RegistryLabel = routerKey
): Outlet<W, F, E> {
	const indexComponent = isComponent(outletComponents) ? undefined : outletComponents.index;
	const mainComponent = isComponent(outletComponents) ? outletComponents : outletComponents.main;
	const errorComponent = isComponent(outletComponents) ? undefined : outletComponents.error;

	return class extends WidgetBase<any, null> {

		protected render(): DNode {
			const { children, properties } = this;

			return w<RouterInjector>(key, {
				scope: this,
				render: (): DNode => { return null; },
				getProperties: (injected: Router<any>, properties: any) => {
					return { outlet, mainComponent, indexComponent, errorComponent, mapParams };
				},
				properties,
				children
			});
		}
	};
}

export default Outlet;
