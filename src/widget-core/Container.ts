import { WidgetBase } from './WidgetBase';
import {
	Constructor,
	DNode,
	RegistryLabel,
	WidgetBaseInterface,
	WidgetProperties
} from './interfaces';
import { w } from './d';
import { BaseInjector, defaultMappers, Mappers } from './Injector';

export type Container<T extends WidgetBaseInterface> = Constructor<WidgetBase<Partial<T['properties']> & WidgetProperties>>;

export function Container<W extends WidgetBaseInterface>(
	component: Constructor<W> | RegistryLabel,
	name: RegistryLabel,
	mappers: Partial<Mappers> = defaultMappers
): Container<W> {
	const {
		getProperties = defaultMappers.getProperties,
		getChildren = defaultMappers.getChildren
	} = mappers;

	return class extends WidgetBase<any> {
		protected render(): DNode {
			const { properties, children } = this;

			return w<BaseInjector<any>>(name, {
				scope: this,
				render: () => w(component, properties, children),
				getProperties,
				properties,
				getChildren,
				children
			});
		}
	};
}

export default Container;
