import Map from '../shim/Map';
import WeakMap from '../shim/WeakMap';
import { auto } from './diff';
import {
	AfterRender,
	BeforeProperties,
	BeforeRender,
	DiffPropertyReaction,
	DNode,
	Render,
	WidgetMetaConstructor,
	WidgetBaseInterface,
	WidgetProperties,
	MetaBase,
	RenderResult
} from './interfaces';
import RegistryHandler from './RegistryHandler';
import NodeHandler from './NodeHandler';
import { WIDGET_BASE_TYPE } from './Registry';
import { Handle } from '../core/Destroyable';
import { Base } from './meta/Base';
import { widgetInstanceMap, v } from './vdom';

interface ReactionFunctionConfig {
	propertyName: string;
	reaction: DiffPropertyReaction;
}

export type BoundFunctionData = { boundFunc: (...args: any[]) => any; scope: any };

const decoratorMap = new WeakMap<Function, Map<string, any[]>>();
const builtDecoratorMap = new WeakMap<Function, Map<string, any[]>>();
const boundAuto = auto.bind(null);

function isDomMeta(meta: any): meta is Base {
	return Boolean(meta.afterRender);
}

const IGNORE_LIST: (string | symbol)[] = ['render', ...Object.getOwnPropertyNames(Object.getPrototypeOf({}))];

const autoBindCache = new Map<any, string[]>();

function autoBind(instance: any) {
	let prototype = instance.constructor.prototype;

	let keys: string[] = [];

	if (autoBindCache.has(prototype)) {
		keys = autoBindCache.get(prototype) as string[];
	} else {
		while (prototype) {
			const ownKeys = Object.getOwnPropertyNames(prototype);
			if (prototype.constructor.hasOwnProperty('_type')) {
				break;
			}
			const descriptors = Object.getOwnPropertyDescriptors(prototype);
			const descriptorKeys = Object.keys(descriptors);
			const getterKeys = descriptorKeys.filter((key) => descriptors[key].get || descriptors[key].set);
			const filteredKeys = ownKeys.filter((key) => getterKeys.indexOf(key) === -1);

			keys = [...keys, ...filteredKeys];
			prototype = Object.getPrototypeOf(prototype);
		}

		keys = keys.filter((k) => typeof instance[k] === 'function' && IGNORE_LIST.indexOf(k) === -1);

		autoBindCache.set(prototype, keys);
	}

	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];

		const boundFunc = instance[key].bind(instance);
		Object.defineProperty(instance, key, {
			configurable: true,
			get() {
				return boundFunc;
			}
		});
	}
}

/**
 * Main widget base for all widgets to extend
 */
export class WidgetBase<P = WidgetProperties, C extends DNode = DNode> implements WidgetBaseInterface<P, C> {
	/**
	 * static identifier
	 */
	static _type = WIDGET_BASE_TYPE;

	/**
	 * property specifically for typing when using tsx
	 */
	/* tslint:disable-next-line:variable-name */
	public __properties__!: this['properties'] & WidgetProperties & { __children__?: DNode | (DNode | DNode[])[] };

	/**
	 * children array
	 */
	private _children: (C | null)[];

	/**
	 * Indicates if it is the initial set properties cycle
	 */
	private _initialProperties = true;

	/**
	 * internal widget properties
	 */
	private _properties: P & WidgetProperties & { [index: string]: any };

	/**
	 * Array of property keys considered changed from the previous set properties
	 */
	private _changedPropertyKeys: string[] = [];

	/**
	 * map of decorators that are applied to this widget
	 */
	private _decoratorCache: Map<string, any[]>;

	private _registry: RegistryHandler = new RegistryHandler();

	private _metaMap: Map<WidgetMetaConstructor<any>, MetaBase> | undefined;

	private _boundRenderFunc: Render;

	private _boundInvalidate: () => void;

	private _nodeHandler: NodeHandler = new NodeHandler();

	private _handles: Handle[] = [];

	/**
	 * @constructor
	 */
	constructor() {
		this._children = [];
		this._decoratorCache = new Map<string, any[]>();
		this._properties = {} as P;
		this._boundRenderFunc = this.render.bind(this);
		this._boundInvalidate = this.invalidate.bind(this);
		this.own(this._registry);
		this.own(this._registry.on('invalidate', this._boundInvalidate));

		widgetInstanceMap.set(this, {
			dirty: true,
			onAttach: (): void => {
				this.onAttach();
			},
			onDetach: (): void => {
				this.onDetach();
				this.destroy();
			},
			nodeHandler: this._nodeHandler,
			rendering: false,
			inputProperties: {},
			registry: this.registry
		});

		this.own({
			destroy: () => {
				widgetInstanceMap.delete(this);
				this._nodeHandler.clear();
				this._nodeHandler.destroy();
			}
		});

		this._runAfterConstructors();
	}

	protected meta<T extends MetaBase>(MetaType: WidgetMetaConstructor<T>): T {
		if (this._metaMap === undefined) {
			this._metaMap = new Map<WidgetMetaConstructor<any>, MetaBase>();
		}
		let cached = this._metaMap.get(MetaType);
		if (!cached) {
			cached = new MetaType({
				invalidate: this._boundInvalidate,
				nodeHandler: this._nodeHandler,
				bind: this
			});
			this.own(cached);
			this._metaMap.set(MetaType, cached);
		}

		return cached as T;
	}

	protected onAttach(): void {
		// Do nothing by default.
	}

	protected onDetach(): void {
		// Do nothing by default.
	}

	public get properties(): Readonly<P> & Readonly<WidgetProperties> {
		return this._properties;
	}

	public get changedPropertyKeys(): string[] {
		return [...this._changedPropertyKeys];
	}

	public __setProperties__(originalProperties: this['properties']): void {
		const instanceData = widgetInstanceMap.get(this);
		if (instanceData) {
			instanceData.inputProperties = originalProperties;
		}
		const properties = this._runBeforeProperties(originalProperties);
		const registeredDiffPropertyNames = this.getDecorator('registeredDiffProperty');
		const changedPropertyKeys: string[] = [];
		const propertyNames = Object.keys(properties);

		if (this._initialProperties) {
			autoBind(this);
		}

		if (this._initialProperties === false || registeredDiffPropertyNames.length !== 0) {
			const allProperties = [...propertyNames, ...Object.keys(this._properties)];
			const checkedProperties: (string | number)[] = [];
			const diffPropertyResults: any = {};
			let runReactions = false;

			for (let i = 0; i < allProperties.length; i++) {
				const propertyName = allProperties[i];
				if (checkedProperties.indexOf(propertyName) !== -1) {
					continue;
				}
				checkedProperties.push(propertyName);
				const previousProperty = this._properties[propertyName];
				const newProperty = properties[propertyName];
				if (registeredDiffPropertyNames.indexOf(propertyName) !== -1) {
					runReactions = true;
					const diffFunctions = this.getDecorator(`diffProperty:${propertyName}`);
					for (let i = 0; i < diffFunctions.length; i++) {
						const result = diffFunctions[i](previousProperty, newProperty);
						if (result.changed && changedPropertyKeys.indexOf(propertyName) === -1) {
							changedPropertyKeys.push(propertyName);
						}
						if (propertyName in properties) {
							diffPropertyResults[propertyName] = result.value;
						}
					}
				} else {
					const result = boundAuto(previousProperty, newProperty);
					if (result.changed && changedPropertyKeys.indexOf(propertyName) === -1) {
						changedPropertyKeys.push(propertyName);
					}
					if (propertyName in properties) {
						diffPropertyResults[propertyName] = result.value;
					}
				}
			}

			if (runReactions) {
				const reactionFunctions: ReactionFunctionConfig[] = this.getDecorator('diffReaction');
				const executedReactions: Function[] = [];
				reactionFunctions.forEach(({ reaction, propertyName }) => {
					const propertyChanged = changedPropertyKeys.indexOf(propertyName) !== -1;
					const reactionRun = executedReactions.indexOf(reaction) !== -1;
					if (propertyChanged && !reactionRun) {
						reaction.call(this, this._properties, diffPropertyResults);
						executedReactions.push(reaction);
					}
				});
			}
			this._properties = diffPropertyResults;
			this._changedPropertyKeys = changedPropertyKeys;
		} else {
			for (let i = 0; i < propertyNames.length; i++) {
				const propertyName = propertyNames[i];
				if (typeof properties[propertyName] === 'function') {
					properties[propertyName] = properties[propertyName];
				} else {
					changedPropertyKeys.push(propertyName);
				}
			}
			this._changedPropertyKeys = changedPropertyKeys;
			this._properties = { ...properties };
		}
		this._initialProperties = false;

		if (this._changedPropertyKeys.length > 0) {
			this.invalidate();
		}
	}

	public get children(): (C | null)[] {
		return this._children;
	}

	public __setChildren__(children: (C | null)[]): void {
		if (this._children.length > 0 || children.length > 0) {
			this._children = children;
			this.invalidate();
		}
	}

	public __render__(): RenderResult {
		const instanceData = widgetInstanceMap.get(this);
		if (instanceData) {
			instanceData.dirty = false;
		}
		const render = this._runBeforeRenders();
		const dNode = this._runAfterRenders(render());
		return dNode;
	}

	public invalidate(): void {
		const instanceData = widgetInstanceMap.get(this);
		if (instanceData && instanceData.invalidate) {
			instanceData.invalidate();
		}
	}

	protected render(): DNode | DNode[] {
		return v('div', {}, this.children);
	}

	/**
	 * Function to add decorators to WidgetBase
	 *
	 * @param decoratorKey The key of the decorator
	 * @param value The value of the decorator
	 */
	protected addDecorator(decoratorKey: string, value: any): void {
		value = Array.isArray(value) ? value : [value];
		if (this.hasOwnProperty('constructor')) {
			let decoratorList = decoratorMap.get(this.constructor);
			if (!decoratorList) {
				decoratorList = new Map<string, any[]>();
				decoratorMap.set(this.constructor, decoratorList);
			}

			let specificDecoratorList = decoratorList.get(decoratorKey);
			if (!specificDecoratorList) {
				specificDecoratorList = [];
				decoratorList.set(decoratorKey, specificDecoratorList);
			}
			specificDecoratorList.push(...value);
		} else {
			const decorators = this.getDecorator(decoratorKey);
			this._decoratorCache.set(decoratorKey, [...decorators, ...value]);
		}
	}

	/**
	 * Function to build the list of decorators from the global decorator map.
	 *
	 * @param decoratorKey  The key of the decorator
	 * @return An array of decorator values
	 * @private
	 */
	private _buildDecoratorList(decoratorKey: string): any[] {
		const allDecorators = [];

		let constructor = this.constructor;

		while (constructor) {
			const instanceMap = decoratorMap.get(constructor);
			if (instanceMap) {
				const decorators = instanceMap.get(decoratorKey);

				if (decorators) {
					allDecorators.unshift(...decorators);
				}
			}

			constructor = Object.getPrototypeOf(constructor);
		}

		const buildDecorators = builtDecoratorMap.get(this.constructor) || new Map();
		buildDecorators.set(decoratorKey, allDecorators);
		builtDecoratorMap.set(this.constructor, buildDecorators);
		return allDecorators;
	}

	/**
	 * Function to retrieve decorator values
	 *
	 * @param decoratorKey The key of the decorator
	 * @returns An array of decorator values
	 */
	protected getDecorator(decoratorKey: string): any[] {
		let decoratorCache = builtDecoratorMap.get(this.constructor);
		let allDecorators =
			this._decoratorCache.get(decoratorKey) || (decoratorCache && decoratorCache.get(decoratorKey));

		if (allDecorators !== undefined) {
			return allDecorators;
		}

		allDecorators = this._buildDecoratorList(decoratorKey);

		allDecorators = [...allDecorators];
		this._decoratorCache.set(decoratorKey, allDecorators);
		return allDecorators;
	}

	public get registry(): RegistryHandler {
		return this._registry;
	}

	private _runBeforeProperties(properties: any) {
		const beforeProperties: BeforeProperties[] = this.getDecorator('beforeProperties');
		if (beforeProperties.length > 0) {
			return beforeProperties.reduce(
				(properties, beforePropertiesFunction) => {
					return { ...properties, ...beforePropertiesFunction.call(this, properties) };
				},
				{ ...properties }
			);
		}
		return properties;
	}

	/**
	 * Run all registered before renders and return the updated render method
	 */
	private _runBeforeRenders(): Render {
		const beforeRenders = this.getDecorator('beforeRender');

		if (beforeRenders.length > 0) {
			return beforeRenders.reduce((render: Render, beforeRenderFunction: BeforeRender) => {
				const updatedRender = beforeRenderFunction.call(this, render, this._properties, this._children);
				if (!updatedRender) {
					console.warn('Render function not returned from beforeRender, using previous render');
					return render;
				}
				return updatedRender;
			}, this._boundRenderFunc);
		}
		return this._boundRenderFunc;
	}

	/**
	 * Run all registered after renders and return the decorated DNodes
	 *
	 * @param dNode The DNodes to run through the after renders
	 */
	private _runAfterRenders(dNode: DNode | DNode[]): DNode | DNode[] {
		const afterRenders = this.getDecorator('afterRender');

		if (afterRenders.length > 0) {
			dNode = afterRenders.reduce((dNode: DNode | DNode[], afterRenderFunction: AfterRender) => {
				return afterRenderFunction.call(this, dNode);
			}, dNode);
		}

		if (this._metaMap !== undefined) {
			this._metaMap.forEach((meta) => {
				isDomMeta(meta) && meta.afterRender();
			});
		}

		return dNode;
	}

	private _runAfterConstructors(): void {
		const afterConstructors = this.getDecorator('afterConstructor');

		if (afterConstructors.length > 0) {
			afterConstructors.forEach((afterConstructor) => afterConstructor.call(this));
		}
	}

	protected own(handle: Handle): void {
		this._handles.push(handle);
	}

	protected destroy() {
		while (this._handles.length > 0) {
			const handle = this._handles.pop();
			if (handle) {
				handle.destroy();
			}
		}
	}
}

export default WidgetBase;
