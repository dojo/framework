import { Constructor } from '../interfaces';
import { diffProperty, WidgetBase } from './../WidgetBase';
import WidgetRegistry from '../WidgetRegistry';
import { reference } from './../diff';

export interface RegistryMixinProperties {
	registry?: WidgetRegistry;
}

export interface RegistryMixin {
	properties: RegistryMixinProperties;
}

export function RegistryMixin<T extends Constructor<WidgetBase<any>>>(Base: T): T & Constructor<RegistryMixin> {
	class Registry extends Base {

		@diffProperty('registry', reference)
		protected diffPropertyRegistry(previousProperties: any, newProperties: any): void {
			const result = this.registries.replace(previousProperties.registry, newProperties.registry);
			if (!result) {
				this.registries.add(newProperties.registry);
			}
		}
	}
	return Registry;
}

export default RegistryMixin;
