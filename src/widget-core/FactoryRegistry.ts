import { isComposeFactory } from 'dojo-compose/compose';
import Promise from 'dojo-shim/Promise';
import Map from 'dojo-shim/Map';
import {
	WidgetBaseFactory,
	FactoryRegistryInterface,
	FactoryRegistryItem,
	WidgetFactoryFunction
} from './interfaces';

export default class FactoryRegistry implements FactoryRegistryInterface {
	protected registry: Map<string, FactoryRegistryItem>;

	constructor() {
		this.registry = new Map<string, FactoryRegistryItem>();
	}

	has(factoryLabel: string): boolean {
		return this.registry.has(factoryLabel);
	}

	define(factoryLabel: string, registryItem: FactoryRegistryItem): void {
		if (this.registry.has(factoryLabel)) {
			throw new Error(`factory has already been registered for '${factoryLabel}'`);
		}
		this.registry.set(factoryLabel, registryItem);
	}

	get(factoryLabel: string): WidgetBaseFactory | Promise<WidgetBaseFactory> | null {
		if (!this.has(factoryLabel)) {
			return null;
		}

		const item = this.registry.get(factoryLabel);

		if (isComposeFactory(item) || item instanceof Promise) {
			return item;
		}

		const promise = (<WidgetFactoryFunction> item)();
		this.registry.set(factoryLabel, promise);

		return promise.then((factory) => {
			this.registry.set(factoryLabel, factory);
			return factory;
		}, (error) => {
			throw error;
		});
	}
}
