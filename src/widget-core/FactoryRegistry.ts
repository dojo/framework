import Promise from '@dojo/shim/Promise';
import Map from '@dojo/shim/Map';
import Symbol from '@dojo/shim/Symbol';
import { WidgetConstructor } from './interfaces';

/**
 * A function the returns a Promise<WidgetConstructor>
 */
export type WidgetFactoryFunction = () => Promise<WidgetConstructor>

/**
 * Factory Registry Item - Either WidgetConsructor, Promise for a WidgetConstructor or WidgetFactoryFunction
 */
export type FactoryRegistryItem = WidgetConstructor | Promise<WidgetConstructor> | WidgetFactoryFunction

/**
 * Widget base symbol type
 */
export const WIDGET_BASE_TYPE = Symbol('Widget Base');

/**
 * Factory Registry Interface
 */
export interface FactoryRegistryInterface {

	/**
	 * define a FactoryRegistryItem for a specified label
	 *
	 * @param factoryLabel The label of the factory to register
	 * @param registryItem The registry item to define
	 */
	define(factoryLabel: string, registryItem: FactoryRegistryItem): void;

	/**
	 * Return a Factory or promise for a factory for the given label, null if an entry doesn't exist
	 *
	 * @param factoryLabel The label of the factory to return
	 * @returns The Factory or Promise for the label, `null` if no entry exists
	 */
	get(factoryLabel: string): WidgetConstructor | Promise<WidgetConstructor> | null;

	/**
	 * Returns a boolean if an entry for the label exists
	 *
	 * @param factoryLabel The label to search for
	 * @returns boolean indicating if a factory exists
	 */
	has(factoryLabel: string): boolean;
}

/**
 * Checks is the item is a subclass of WidgetBase (or a WidgetBase)
 *
 * @param item the item to check
 * @returns true/false indicating if the item is a WidgetConstructor
 */
export function isWidgetBaseConstructor(item: any): item is WidgetConstructor {
	return Boolean(item && item._type === WIDGET_BASE_TYPE);
}

/**
 * The FactoryRegistry implementation
 */
export default class FactoryRegistry implements FactoryRegistryInterface {

	/**
	 * internal map of labels and FactoryRegistryItem
	 */
	private registry: Map<string, FactoryRegistryItem>;

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

	get(factoryLabel: string): WidgetConstructor | Promise<WidgetConstructor> | null {
		if (!this.has(factoryLabel)) {
			return null;
		}

		const item = this.registry.get(factoryLabel);

		if (item instanceof Promise || isWidgetBaseConstructor(item)) {
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
