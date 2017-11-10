import WeakMap from '@dojo/shim/WeakMap';
import { WidgetBase } from './../WidgetBase';
import { handleDecorator } from './handleDecorator';
import { Injector } from './../Injector';
import { beforeProperties } from './beforeProperties';
import { RegistryLabel } from './../interfaces';

/**
 * Map of instances against registered injectors.
 */
const registeredInjectorsMap: WeakMap<WidgetBase, Injector[]> = new WeakMap();

/**
 * Defines the contract requires for the get properties function
 * used to map the injected properties.
 */
export interface GetProperties<T = any> {
	(payload: any, properties: T): T;
}

/**
 * Defines the inject configuration required for use of the `inject` decorator
 */
export interface InjectConfig {

	/**
	 * The label of the registry injector
	 */
	name: RegistryLabel;

	/**
	 * Function that returns propertues to inject using the passed properties
	 * and the injected payload.
	 */
	getProperties: GetProperties;
}

/**
 * Decorator retrieves an injector from an available registry using the name and
 * calls the `getProperties` function with the payload from the injector
 * and current properties with the the injected properties returned.
 *
 * @param InjectConfig the inject configuration
 */
export function inject({ name, getProperties }: InjectConfig) {
	return handleDecorator((target, propertyKey) => {
		beforeProperties(function(this: WidgetBase, properties: any) {
			const injector = this.registry.getInjector(name);
			if (injector) {
				const registeredInjectors = registeredInjectorsMap.get(this) || [];
				if (registeredInjectors.length === 0) {
					registeredInjectorsMap.set(this, registeredInjectors);
				}
				if (registeredInjectors.indexOf(injector) === -1) {
					injector.on('invalidate', () => {
						this.invalidate();
					});
					registeredInjectors.push(injector);
				}
				return getProperties(injector.get(), properties);
			}
		})(target);
	});
}

export default inject;
