import Promise from '@dojo/shim/Promise';
import Map from '@dojo/shim/Map';
import Symbol from '@dojo/shim/Symbol';
import { Handle } from '@dojo/interfaces/core';
import { BaseEventedEvents, Evented, EventObject } from '@dojo/core/Evented';
import { Constructor, RegistryLabel, WidgetBaseConstructor, WidgetBaseInterface } from './interfaces';

export type WidgetBaseConstructorFunction = () => Promise<WidgetBaseConstructor>;

export type RegistryItem = WidgetBaseConstructor | Promise<WidgetBaseConstructor> | WidgetBaseConstructorFunction;

/**
 * Widget base symbol type
 */
export const WIDGET_BASE_TYPE = Symbol('Widget Base');

export interface RegistryEventObject extends EventObject {
	action: string;
}

export interface RegistryListener {
	(event: RegistryEventObject): void;
}

export interface RegistryEvents extends BaseEventedEvents {
	(type: RegistryLabel, listener: RegistryListener | RegistryListener[]): Handle;
}

/**
 * Widget Registry Interface
 */
export interface Registry {

	/**
	 * define a RegistryItem for a specified label
	 *
	 * @param widgetLabel The label of the widget to register
	 * @param registryItem The registry item to define
	 */
	define(widgetLabel: RegistryLabel, registryItem: RegistryItem): void;

	/**
	 * Return a RegistryItem for the given label, null if an entry doesn't exist
	 *
	 * @param widgetLabel The label of the widget to return
	 * @returns The RegistryItem for the widgetLabel, `null` if no entry exists
	 */
	get<T extends WidgetBaseInterface = WidgetBaseInterface>(widgetLabel: RegistryLabel): Constructor<T> | null;

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
export function isWidgetBaseConstructor<T extends WidgetBaseInterface>(item: any): item is Constructor<T> {
	return Boolean(item && item._type === WIDGET_BASE_TYPE);
}

/**
 * The Registry implementation
 */
export class Registry extends Evented implements Registry {

	public on: RegistryEvents;

	/**
	 * internal map of labels and RegistryItem
	 */
	private _registry: Map<RegistryLabel, RegistryItem> = new Map<RegistryLabel, RegistryItem>();

	/**
	 * Emit loaded event for registry label
	 */
	private emitLoadedEvent(widgetLabel: RegistryLabel): void {
		this.emit({
			type: widgetLabel,
			action: 'loaded'
		});
	}

	public has(widgetLabel: RegistryLabel): boolean {
		return this._registry.has(widgetLabel);
	}

	public define(widgetLabel: RegistryLabel, item: RegistryItem): void {
		if (this._registry.has(widgetLabel)) {
			throw new Error(`widget has already been registered for '${widgetLabel.toString()}'`);
		}

		this._registry.set(widgetLabel, item);

		if (item instanceof Promise) {
			item.then((widgetCtor) => {
				this._registry.set(widgetLabel, widgetCtor);
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

	public get<T extends WidgetBaseInterface = WidgetBaseInterface>(widgetLabel: RegistryLabel): Constructor<T> | null {
		if (!this.has(widgetLabel)) {
			return null;
		}

		const item = this._registry.get(widgetLabel);

		if (isWidgetBaseConstructor<T>(item)) {
			return item;
		}

		if (item instanceof Promise) {
			return null;
		}

		const promise = (<WidgetBaseConstructorFunction> item)();
		this._registry.set(widgetLabel, promise);

		promise.then((widgetCtor) => {
			this._registry.set(widgetLabel, widgetCtor);
			this.emitLoadedEvent(widgetLabel);
			return widgetCtor;
		}, (error) => {
			throw error;
		});

		return null;
	}
}

export default Registry;
