import { Evented } from '@dojo/core/Evented';
import { Constructor, RegistryLabel, WidgetBaseInterface } from './interfaces';
import { Registry, RegistryEventObject } from './Registry';
import { Injector } from './Injector';

export default class RegistryHandler extends Evented {
	private _registries: { handle?: any, registry: Registry }[] = [];

	public add(registry: Registry, isDefault: boolean = false) {
		if (isDefault) {
			this._registries.push({ registry });
		}
		else {
			this._registries.unshift({ registry });
		}
	}

	public remove(registry: Registry): boolean {
		return this._registries.some((registryWrapper, i) => {
			if (registryWrapper.registry === registry) {
				registry.destroy();
				this._registries.splice(i, 1);
				return true;
			}
			return false;
		});
	}

	public replace(original: Registry, replacement: Registry): boolean {
		return this._registries.some((registryWrapper, i) => {
			if (registryWrapper.registry === original) {
				original.destroy();
				registryWrapper.registry = replacement;
				return true;
			}
			return false;
		});
	}

	public get defaultRegistry(): Registry | undefined {
		if (this._registries.length) {
			return this._registries[this._registries.length - 1].registry;
		}
	}

	public has(widgetLabel: RegistryLabel): boolean {
		return this._registries.some((registryWrapper) => {
			return registryWrapper.registry.has(widgetLabel);
		});
	}

	public getInjector<T extends Injector>(label: RegistryLabel): T | null {
		for (let i = 0; i < this._registries.length; i++) {
			const registryWrapper = this._registries[i];
			return registryWrapper.registry.getInjector<T>(label);
		}
		return null;
	}

	public get<T extends WidgetBaseInterface = WidgetBaseInterface>(widgetLabel: RegistryLabel): Constructor<T> | null {
		for (let i = 0; i < this._registries.length; i++) {
			const registryWrapper = this._registries[i];
			const item = registryWrapper.registry.get<T>(widgetLabel);
			if (item) {
				return item;
			}
			else if (!registryWrapper.handle) {
				registryWrapper.handle = registryWrapper.registry.on(widgetLabel, (event: RegistryEventObject) => {
					if (event.action === 'loaded') {
						this.emit({ type: 'invalidate' });
						registryWrapper.handle.destroy();
						registryWrapper.handle = undefined;
					}
				});
			}
		}
		return null;
	}
}
