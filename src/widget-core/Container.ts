import { WidgetBase } from './WidgetBase';
import { Constructor, DNode, WidgetBaseInterface, RegistryLabel } from './interfaces';
import { w } from './d';
import { defaultMappers, BaseInjector, Mappers } from './Injector';

export function Container<W extends WidgetBaseInterface>(
	component: Constructor<W> | RegistryLabel,
	name: RegistryLabel,
	{
		getProperties = defaultMappers.getProperties,
		getChildren = defaultMappers.getChildren
	}: Partial<Mappers> = defaultMappers
): Constructor<WidgetBase<W['properties']>> {

	return class extends WidgetBase<any> {
		protected render(): DNode {
			const { properties, children } = this;

			return w<BaseInjector<any>>(name, {
				bind: this,
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
