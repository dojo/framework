import { includes } from '@dojo/shim/array';
import FactoryRegistry from '../FactoryRegistry';
import { WidgetBase, onPropertiesChanged, diffProperty } from './../WidgetBase';
import {
	PropertyChangeRecord,
	PropertiesChangeEvent,
	Constructor,
	WidgetProperties
} from '../interfaces';

export interface RegistryMixinProperties extends WidgetProperties {
	registry: FactoryRegistry;
}

export function RegistryMixin<T extends Constructor<WidgetBase<RegistryMixinProperties>>>(base: T): T {
	class Registry extends base {

		@diffProperty('registry')
		public diffPropertyRegistry(previousValue: FactoryRegistry, value: FactoryRegistry): PropertyChangeRecord {
			return {
				changed: previousValue !== value,
				value: value
			};
		}

		@onPropertiesChanged
		protected onPropertiesChanged(evt: PropertiesChangeEvent<this, RegistryMixinProperties>) {
			if (includes(evt.changedPropertyKeys, 'registry')) {
				this.registry = evt.properties.registry;
			}
		}
	};
	return Registry;
}

export default RegistryMixin;
