import { includes } from '@dojo/shim/array';
import FactoryRegistry from '../FactoryRegistry';
import { WidgetBase } from './../WidgetBase';
import {
	PropertyChangeRecord,
	PropertiesChangeEvent,
	Constructor,
	WidgetProperties
} from '../interfaces';

export interface RegistryMixinProperties extends WidgetProperties {
	registry: FactoryRegistry;
}

export function RegistryMixin<T extends Constructor<WidgetBase<WidgetProperties>>>(base: T): T {
	return class extends base {
		properties: RegistryMixinProperties;

		constructor(...args: any[]) {
			super(...args);
			this.own(this.on('properties:changed', (evt: PropertiesChangeEvent<this, RegistryMixinProperties>) => {
				if (includes(evt.changedPropertyKeys, 'registry')) {
					this.registry = evt.properties.registry;
				}
			}));
			const { properties: { registry } } = this;
			if (registry) {
				this.registry = registry;
			}
		}

		public diffPropertyRegistry(previousValue: FactoryRegistry, value: FactoryRegistry): PropertyChangeRecord {
			return {
				changed: previousValue !== value,
				value: value
			};
		}
	};
}
