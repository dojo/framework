import WidgetRegistry from '../WidgetRegistry';
import { WidgetBase, diffProperty } from './../WidgetBase';
import { PropertyChangeRecord, Constructor } from '../interfaces';

export interface RegistryMixinProperties {
	registry?: WidgetRegistry;
}

export interface RegistryMixin {
	properties: RegistryMixinProperties;
}

export function RegistryMixin<T extends Constructor<WidgetBase<any>>>(base: T): T & Constructor<RegistryMixin> {
	class Registry extends base {

		@diffProperty('registry')
		public diffPropertyRegistry(previousValue: WidgetRegistry, value: WidgetRegistry): PropertyChangeRecord {
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
