import { handleDecorator, DecoratorHandler } from './handleDecorator';
import { RegistryItem } from '../Registry';

export interface RegistryConfig {
	[name: string]: RegistryItem;
}

/**
 * Decorator that can be used to register a widget with the calling widgets local registry
 */
export function registry(nameOrConfig: string, loader: RegistryItem): DecoratorHandler;
export function registry(nameOrConfig: RegistryConfig): DecoratorHandler;
export function registry(nameOrConfig: string | RegistryConfig, loader?: RegistryItem) {
	return handleDecorator((target, propertyKey) => {
		target.addDecorator('afterConstructor', function(this: any) {
			if (typeof nameOrConfig === 'string') {
				this.registry.define(nameOrConfig, loader);
			} else {
				Object.keys(nameOrConfig).forEach((name) => {
					this.registry.define(name, nameOrConfig[name]);
				});
			}
		});
	});
}

export default registry;
