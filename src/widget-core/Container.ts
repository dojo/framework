import { WidgetBase } from './WidgetBase';
import { inject, GetProperties } from './decorators/inject';
import { Constructor, DNode, RegistryLabel } from './interfaces';
import { w } from './d';
import { alwaysRender } from './decorators/alwaysRender';

export type Container<T extends WidgetBase> = Constructor<WidgetBase<Partial<T['properties']>>>;

export function Container<W extends WidgetBase>(
	component: Constructor<W> | RegistryLabel,
	name: RegistryLabel,
	{ getProperties }: { getProperties: GetProperties }
): Container<W> {
	@alwaysRender()
	@inject({ name, getProperties })
	class WidgetContainer extends WidgetBase<Partial<W['properties']>> {
		protected render(): DNode {
			return w(component, this.properties, this.children);
		}
	}
	return WidgetContainer;
}

export default Container;
