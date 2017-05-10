import Promise from '@dojo/shim/Promise';
import Map from '@dojo/shim/Map';
import Symbol from '@dojo/shim/Symbol';
import { Handle } from '@dojo/interfaces/core';
import Evented, { EventObject, BaseEventedEvents } from '@dojo/core/Evented';
import { WidgetBaseConstructor, RegistryLabel } from './interfaces';

export type WidgetBaseConstructorFunction = () => Promise<WidgetBaseConstructor>;

export type WidgetRegistryItem = WidgetBaseConstructor | Promise<WidgetBaseConstructor> | WidgetBaseConstructorFunction;

/**
 * Widget base symbol type
 */
export const WIDGET_BASE_TYPE = Symbol('Widget Base');

export interface WidgetRegistryEventObject extends EventObject {
	action: string;
}

export interface WidgetRegistryListener {
	(event: WidgetRegistryEventObject): void;
}

export interface WidgetRegistryEvents extends BaseEventedEvents {
	(type: RegistryLabel, listener: WidgetRegistryListener | WidgetRegistryListener[]): Handle;
}

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
	define(widgetLabel: RegistryLabel, registryItem: WidgetRegistryItem): void;

	/**
	 * Return a WidgetRegistryItem for the given label, null if an entry doesn't exist
	 *
	 * @param widgetLabel The label of the widget to return
	 * @returns The WidgetRegistryItem for the widgetLabel, `null` if no entry exists
	 */
	get(widgetLabel: RegistryLabel): WidgetBaseConstructor | null;

	/**
	 * Returns a boolean if an entry for the label exists
	 *
	 * @param widgetLabel The label to search for
	 * @returns boolean indicating if a widget registry item exists
	 */
	has(widgetLabel: RegistryLabel): boolean;
}

/**
 * Checks is the item is a subclass of WidgetBase (or a WidgetBase)
 *
 * @param item the item to check
 * @returns true/false indicating if the item is a WidgetBaseConstructor
 */
export function isWidgetBaseConstructor(item: any): item is WidgetBaseConstructor {
	return Boolean(item && item._type === WIDGET_BASE_TYPE);
}

/**
 * The WidgetRegistry implementation
 */
export class WidgetRegistry extends Evented implements WidgetRegistry {

	on: WidgetRegistryEvents;

	/**
	 * internal map of labels and WidgetRegistryItem
	 */
	private registry: Map<RegistryLabel, WidgetRegistryItem> = new Map<RegistryLabel, WidgetRegistryItem>();

	/**
	 * Emit loaded event for registry label
	 */
	private emitLoadedEvent(widgetLabel: RegistryLabel): void {
		this.emit({
			type: widgetLabel,
			action: 'loaded'
		});
	}

	has(widgetLabel: RegistryLabel): boolean {
		return this.registry.has(widgetLabel);
	}

	define(widgetLabel: RegistryLabel, item: WidgetRegistryItem): void {
		if (this.registry.has(widgetLabel)) {
			throw new Error(`widget has already been registered for '${widgetLabel.toString()}'`);
		}

		this.registry.set(widgetLabel, item);

		if (item instanceof Promise) {
			item.then((widgetCtor) => {
				this.registry.set(widgetLabel, widgetCtor);
				this.emitLoadedEvent(widgetLabel);
				return widgetCtor;
			}, (error) => {
				throw error;
			});
		}
		else {
			this.emitLoadedEvent(widgetLabel);
		}
	}

	get(widgetLabel: RegistryLabel): WidgetBaseConstructor | null {
		if (!this.has(widgetLabel)) {
			return null;
		}

		const item = this.registry.get(widgetLabel);

		if (isWidgetBaseConstructor(item)) {
			return item;
		}

		if (item instanceof Promise) {
			return null;
		}

		const promise = (<WidgetBaseConstructorFunction> item)();
		this.registry.set(widgetLabel, promise);

		promise.then((widgetCtor) => {
			this.registry.set(widgetLabel, widgetCtor);
			this.emitLoadedEvent(widgetLabel);
			return widgetCtor;
		}, (error) => {
			throw error;
		});

		return null;
	}
}

export default WidgetRegistry;
