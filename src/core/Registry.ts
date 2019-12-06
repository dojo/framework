import Promise from '../shim/Promise';
import Map from '../shim/Map';
import { Evented, EventObject } from '../core/Evented';
import {
	Constructor,
	InjectorFactory,
	InjectorItem,
	RegistryLabel,
	WidgetBaseConstructor,
	WidgetBaseInterface,
	ESMDefaultWidgetBase,
	WidgetBaseConstructorFunction,
	ESMDefaultWidgetBaseFunction,
	Callback,
	WNodeFactory,
	RenderResult,
	WidgetBaseTypes,
	DefaultChildrenWNodeFactory,
	OptionalWNodeFactory
} from './interfaces';

export type RegistryItem =
	| WidgetBaseConstructor
	| WNodeFactory<any>
	| DefaultChildrenWNodeFactory<any>
	| OptionalWNodeFactory<any>
	| Promise<WidgetBaseConstructor | WNodeFactory<any>>
	| WidgetBaseConstructorFunction
	| ESMDefaultWidgetBaseFunction;

/**
 * Widget base type
 */
export const WIDGET_BASE_TYPE = '__widget_base_type';

export interface RegistryEventObject extends EventObject<RegistryLabel> {
	action: string;
	item:
		| WNodeFactory<any>
		| DefaultChildrenWNodeFactory<any>
		| OptionalWNodeFactory<any>
		| WidgetBaseConstructor
		| InjectorItem;
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
	get(label: RegistryLabel): WNodeFactory<any> | Callback<any, any, any, RenderResult> | Constructor<any> | null;
	get<T extends WNodeFactory<any>>(label: RegistryLabel): T | null;
	get<T extends Callback<any, any, any, RenderResult>>(label: RegistryLabel): T | null;
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
	 * @param registryItem The injector factory
	 */
	defineInjector(label: RegistryLabel, injectorFactory: InjectorFactory): void;

	/**
	 * Return an Injector registry item for the given label, null if an entry doesn't exist
	 *
	 * @param label The label of the injector to return
	 * @returns The RegistryItem for the widgetLabel, `null` if no entry exists
	 */
	getInjector<T>(label: RegistryLabel): InjectorItem<T> | null;

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
export function isWidgetBaseConstructor<T extends WidgetBaseInterface = any>(item: any): item is Constructor<T> {
	return Boolean(item && item._type === WIDGET_BASE_TYPE);
}

export function isWidgetFunction(item: any): item is Callback<any, any, any, RenderResult> {
	return Boolean(item && item.isWidget);
}

export function isWNodeFactory<W extends WidgetBaseTypes>(node: any): node is WNodeFactory<W> {
	if (typeof node === 'function' && node.isFactory) {
		return true;
	}
	return false;
}

export function isWidget<T extends WidgetBaseInterface = any>(
	item: any
): item is Constructor<T> | Callback<any, any, any, RenderResult> {
	return isWidgetBaseConstructor(item) || isWidgetFunction(item);
}

export function isWidgetConstructorDefaultExport<T extends WidgetBaseTypes>(
	item: any
): item is ESMDefaultWidgetBase<T> {
	return Boolean(
		item &&
			item.hasOwnProperty('__esModule') &&
			item.hasOwnProperty('default') &&
			(isWidget(item.default) || isWNodeFactory(item.default))
	);
}

/**
 * The Registry implementation
 */
export class Registry extends Evented<{}, RegistryLabel, RegistryEventObject> implements RegistryInterface {
	/**
	 * internal map of labels and RegistryItem
	 */
	private _widgetRegistry: Map<RegistryLabel, RegistryItem> | undefined;

	private _injectorRegistry: Map<RegistryLabel, InjectorItem> | undefined;

	/**
	 * Emit loaded event for registry label
	 */
	private emitLoadedEvent(
		widgetLabel: RegistryLabel,
		item:
			| DefaultChildrenWNodeFactory<any>
			| OptionalWNodeFactory<any>
			| WNodeFactory<any>
			| WidgetBaseConstructor
			| InjectorItem
	): void {
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
					this._widgetRegistry!.set(label, widgetCtor);
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

	public defineInjector(label: RegistryLabel, injectorFactory: InjectorFactory): void {
		if (this._injectorRegistry === undefined) {
			this._injectorRegistry = new Map();
		}

		if (this._injectorRegistry.has(label)) {
			throw new Error(`injector has already been registered for '${label.toString()}'`);
		}

		const invalidator = new Evented();

		const injectorItem: InjectorItem = {
			injector: injectorFactory(() => invalidator.emit({ type: 'invalidate' })),
			invalidator
		};

		this._injectorRegistry.set(label, injectorItem);
		this.emitLoadedEvent(label, injectorItem);
	}

	public get(
		label: RegistryLabel
	): WNodeFactory<any> | Callback<any, any, any, RenderResult> | Constructor<any> | null;
	public get<T extends WNodeFactory<any>>(label: RegistryLabel): T | null;
	public get<T extends Callback<any, any, any, RenderResult>>(label: RegistryLabel): T | null;
	public get<T extends WidgetBaseInterface = WidgetBaseInterface>(label: RegistryLabel): Constructor<T> | null;
	public get<T extends WidgetBaseInterface = WidgetBaseInterface>(
		label: RegistryLabel
	): WNodeFactory<T> | Callback<any, any, any, RenderResult> | Constructor<T> | null {
		if (!this._widgetRegistry || !this.has(label)) {
			return null;
		}

		const item = this._widgetRegistry.get(label);

		if (isWidget<T>(item) || isWNodeFactory(item)) {
			return item as any;
		}

		if (item instanceof Promise) {
			return null;
		}

		const promise = (<WidgetBaseConstructorFunction>item)();
		this._widgetRegistry.set(label, promise);

		promise.then(
			(widgetCtor: any) => {
				if (isWidgetConstructorDefaultExport<T>(widgetCtor)) {
					widgetCtor = widgetCtor.default;
				}

				this._widgetRegistry!.set(label, widgetCtor);
				this.emitLoadedEvent(label, widgetCtor);
				return widgetCtor;
			},
			(error) => {
				throw error;
			}
		);

		return null;
	}

	public getInjector<T>(label: RegistryLabel): InjectorItem<T> | null {
		if (!this._injectorRegistry || !this.hasInjector(label)) {
			return null;
		}

		return this._injectorRegistry.get(label)!;
	}

	public has(label: RegistryLabel): boolean {
		return Boolean(this._widgetRegistry && this._widgetRegistry.has(label));
	}

	public hasInjector(label: RegistryLabel): boolean {
		return Boolean(this._injectorRegistry && this._injectorRegistry.has(label));
	}
}

export default Registry;
