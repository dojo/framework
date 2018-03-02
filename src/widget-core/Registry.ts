import Promise from '@dojo/shim/Promise';
import Map from '@dojo/shim/Map';
import Symbol from '@dojo/shim/Symbol';
import { EventObject } from '@dojo/core/interfaces';
import { Evented } from '@dojo/core/Evented';
import { Constructor, RegistryLabel, WidgetBaseConstructor, WidgetBaseInterface } from './interfaces';
import { Injector } from './Injector';

export type WidgetBaseConstructorFunction = () => Promise<WidgetBaseConstructor>;

export type ESMDefaultWidgetBaseFunction = () => Promise<ESMDefaultWidgetBase<WidgetBaseInterface>>;

export type RegistryItem =
	| WidgetBaseConstructor
	| Promise<WidgetBaseConstructor>
	| WidgetBaseConstructorFunction
	| ESMDefaultWidgetBaseFunction;

/**
 * Widget base symbol type
 */
export const WIDGET_BASE_TYPE = Symbol('Widget Base');

export interface RegistryEventObject extends EventObject<RegistryLabel> {
	action: string;
	item: WidgetBaseConstructor | Injector;
}

/**
 * Widget Registry Interface
 */
export interface RegistryInterface {
	/**
	 * Define a WidgetRegistryItem against a label
	 *
	 * @param label The label of the widget to register
	 * @param registryItem The registry item to define
	 */
	define(label: RegistryLabel, registryItem: RegistryItem): void;

	/**
	 * Return a RegistryItem for the given label, null if an entry doesn't exist
	 *
	 * @param widgetLabel The label of the widget to return
	 * @returns The RegistryItem for the widgetLabel, `null` if no entry exists
	 */
	get<T extends WidgetBaseInterface = WidgetBaseInterface>(label: RegistryLabel): Constructor<T> | null;

	/**
	 * Returns a boolean if an entry for the label exists
	 *
	 * @param widgetLabel The label to search for
	 * @returns boolean indicating if a widget registry item exists
	 */
	has(label: RegistryLabel): boolean;

	/**
	 * Define an Injector against a label
	 *
	 * @param label The label of the injector to register
	 * @param registryItem The injector to define
	 */
	defineInjector(label: RegistryLabel, registryItem: Injector): void;

	/**
	 * Return an Injector registry item for the given label, null if an entry doesn't exist
	 *
	 * @param label The label of the injector to return
	 * @returns The RegistryItem for the widgetLabel, `null` if no entry exists
	 */
	getInjector<T extends Injector>(label: RegistryLabel): T | null;

	/**
	 * Returns a boolean if an injector for the label exists
	 *
	 * @param widgetLabel The label to search for
	 * @returns boolean indicating if a injector registry item exists
	 */
	hasInjector(label: RegistryLabel): boolean;
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

export interface ESMDefaultWidgetBase<T> {
	default: Constructor<T>;
	__esModule?: boolean;
}

export function isWidgetConstructorDefaultExport<T>(item: any): item is ESMDefaultWidgetBase<T> {
	return Boolean(
		item &&
			item.hasOwnProperty('__esModule') &&
			item.hasOwnProperty('default') &&
			isWidgetBaseConstructor(item.default)
	);
}

/**
 * The Registry implementation
 */
export class Registry extends Evented<{}, RegistryLabel, RegistryEventObject> implements RegistryInterface {
	/**
	 * internal map of labels and RegistryItem
	 */
	private _widgetRegistry: Map<RegistryLabel, RegistryItem>;

	private _injectorRegistry: Map<RegistryLabel, Injector>;

	/**
	 * Emit loaded event for registry label
	 */
	private emitLoadedEvent(widgetLabel: RegistryLabel, item: WidgetBaseConstructor | Injector): void {
		this.emit({
			type: widgetLabel,
			action: 'loaded',
			item
		});
	}

	public define(label: RegistryLabel, item: RegistryItem): void {
		if (this._widgetRegistry === undefined) {
			this._widgetRegistry = new Map();
		}

		if (this._widgetRegistry.has(label)) {
			throw new Error(`widget has already been registered for '${label.toString()}'`);
		}

		this._widgetRegistry.set(label, item);

		if (item instanceof Promise) {
			item.then(
				(widgetCtor) => {
					this._widgetRegistry.set(label, widgetCtor);
					this.emitLoadedEvent(label, widgetCtor);
					return widgetCtor;
				},
				(error) => {
					throw error;
				}
			);
		} else if (isWidgetBaseConstructor(item)) {
			this.emitLoadedEvent(label, item);
		}
	}

	public defineInjector(label: RegistryLabel, item: Injector): void {
		if (this._injectorRegistry === undefined) {
			this._injectorRegistry = new Map();
		}

		if (this._injectorRegistry.has(label)) {
			throw new Error(`injector has already been registered for '${label.toString()}'`);
		}

		this._injectorRegistry.set(label, item);
		this.emitLoadedEvent(label, item);
	}

	public get<T extends WidgetBaseInterface = WidgetBaseInterface>(label: RegistryLabel): Constructor<T> | null {
		if (!this.has(label)) {
			return null;
		}

		const item = this._widgetRegistry.get(label);

		if (isWidgetBaseConstructor<T>(item)) {
			return item;
		}

		if (item instanceof Promise) {
			return null;
		}

		const promise = (<WidgetBaseConstructorFunction>item)();
		this._widgetRegistry.set(label, promise);

		promise.then(
			(widgetCtor) => {
				if (isWidgetConstructorDefaultExport<T>(widgetCtor)) {
					widgetCtor = widgetCtor.default;
				}

				this._widgetRegistry.set(label, widgetCtor);
				this.emitLoadedEvent(label, widgetCtor);
				return widgetCtor;
			},
			(error) => {
				throw error;
			}
		);

		return null;
	}

	public getInjector<T extends Injector>(label: RegistryLabel): T | null {
		if (!this.hasInjector(label)) {
			return null;
		}

		return this._injectorRegistry.get(label) as T;
	}

	public has(label: RegistryLabel): boolean {
		return Boolean(this._widgetRegistry && this._widgetRegistry.has(label));
	}

	public hasInjector(label: RegistryLabel): boolean {
		return Boolean(this._injectorRegistry && this._injectorRegistry.has(label));
	}
}

export default Registry;
