import Promise from '@dojo/shim/Promise';
import Map from '@dojo/shim/Map';
import Symbol from '@dojo/shim/Symbol';
import { WidgetConstructor } from './interfaces';

export type WidgetConstructorFunction = () => Promise<WidgetConstructor>

export type WidgetRegistryItem = WidgetConstructor | Promise<WidgetConstructor> | WidgetConstructorFunction

/**
 * Widget base symbol type
 */
export const WIDGET_BASE_TYPE = Symbol('Widget Base');

/**
 * Widget Registry Interface
 */
export interface WidgetRegistry {

	/**
	 * define a WidgetRegistryItem for a specified label
	 *
	 * @param widgetLabel The label of the widget to register
	 * @param registryItem The registry item to define
	 */
	define(widgetLabel: string, registryItem: WidgetRegistryItem): void;

	/**
	 * Return a WidgetRegistryItem for the given label, null if an entry doesn't exist
	 *
	 * @param widgetLabel The label of the widget to return
	 * @returns The WidgetRegistryItem for the widgetLabel, `null` if no entry exists
	 */
	get(widgetLabel: string): WidgetConstructor | Promise<WidgetConstructor> | null;

	/**
	 * Returns a boolean if an entry for the label exists
	 *
	 * @param widgetLabel The label to search for
	 * @returns boolean indicating if a widget registry item exists
	 */
	has(widgetLabel: string): boolean;
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
 * The WidgetRegistry implementation
 */
export class WidgetRegistry implements WidgetRegistry {

	/**
	 * internal map of labels and WidgetRegistryItem
	 */
	private registry: Map<string, WidgetRegistryItem>;

	constructor() {
		this.registry = new Map<string, WidgetRegistryItem>();
	}

	has(widgetLabel: string): boolean {
		return this.registry.has(widgetLabel);
	}

	define(widgetLabel: string, registryItem: WidgetRegistryItem): void {
		if (this.registry.has(widgetLabel)) {
			throw new Error(`widget has already been registered for '${widgetLabel}'`);
		}
		this.registry.set(widgetLabel, registryItem);
	}

	get(widgetLabel: string): WidgetConstructor | Promise<WidgetConstructor> | null {
		if (!this.has(widgetLabel)) {
			return null;
		}

		const item = this.registry.get(widgetLabel);

		if (item instanceof Promise || isWidgetBaseConstructor(item)) {
			return item;
		}

		const promise = (<WidgetConstructorFunction> item)();

		this.registry.set(widgetLabel, promise);

		return promise.then((widgetCtor) => {
			this.registry.set(widgetLabel, widgetCtor);
			return widgetCtor;
		}, (error) => {
			throw error;
		});
	}
}

export default WidgetRegistry;
