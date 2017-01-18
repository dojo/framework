import WeakMap from '@dojo/shim/WeakMap';
import { includes } from '@dojo/shim/array';
import { PropertiesChangeEvent, PropertyChangeRecord } from './../interfaces';
import { Evented } from '@dojo/interfaces/bases';
import createEvented from '@dojo/compose/bases/createEvented';
import { ComposeFactory } from '@dojo/compose/compose';
import FactoryRegistry from '../FactoryRegistry';

/**
 * Properties required for the RegistryMixin
 */
export interface RegistryMixinProperties {
	registry: FactoryRegistry;
}

/**
 * RegistryMixin Options
 */
export interface RegistryMixinOptions {
	properties: RegistryMixinProperties;
}

/**
 * RegistryMixin
 */
export interface RegistryMixin extends Evented {
	diffPropertyRegistry(previousProperty: FactoryRegistry, property: FactoryRegistry): PropertyChangeRecord;
}

/**
 * Compose RegistryFactory interface
 */
export interface RegistryFactory extends ComposeFactory<RegistryMixin, RegistryMixinOptions> {}

/**
 * Registry
 */
export interface Registry extends RegistryMixin {
	readonly registry: FactoryRegistry;
	readonly properties: RegistryMixinProperties;
}

const internalRegistryMap = new WeakMap<Registry, FactoryRegistry>();

const registryFactory: RegistryFactory = createEvented.mixin({
	className: 'RegistryMixin',
	mixin: {
		diffPropertyRegistry(this: Registry, previousValue: FactoryRegistry, value: FactoryRegistry): PropertyChangeRecord {
			return {
				changed: previousValue !== value,
				value: value
			};
		},
		get registry(this: Registry): FactoryRegistry {
			return internalRegistryMap.get(this);
		}
	},
	initialize(instance: Registry, options: RegistryMixinOptions) {
		instance.own(instance.on('properties:changed', (evt: PropertiesChangeEvent<RegistryMixin, RegistryMixinProperties>) => {
			if (includes(evt.changedPropertyKeys, 'registry')) {
				internalRegistryMap.set(instance, evt.properties.registry);
			}
		}));
		const { properties: { registry } } = instance;
		if (registry) {
			internalRegistryMap.set(instance, registry);
		}
	}
});

export default registryFactory;
