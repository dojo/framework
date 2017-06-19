import { Constructor, PropertyChangeRecord } from '../interfaces';
import { diffProperty, WidgetBase } from './../WidgetBase';
import WidgetRegistry from '../WidgetRegistry';

export interface RegistryMixinProperties {
	registry?: WidgetRegistry;
}

export interface RegistryMixin {
	properties: RegistryMixinProperties;
}

export function RegistryMixin<T extends Constructor<WidgetBase<any>>>(Base: T): T & Constructor<RegistryMixin> {
	class Registry extends Base {

		@diffProperty('registry')
		protected diffPropertyRegistry(previousValue: WidgetRegistry, value: WidgetRegistry): PropertyChangeRecord {
			let changed = false;
			if (!previousValue) {
				this.registries.add(value);
				changed = true;
			}
			else if (previousValue !== value) {
				this.registries.replace(previousValue, value);
				changed = true;
			}
			return {
				changed,
				value: value
			};
		}
	}
	return Registry;
}

export default RegistryMixin;
