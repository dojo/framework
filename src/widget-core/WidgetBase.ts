import Map from '../shim/Map';
import WeakMap from '../shim/WeakMap';
import { v, VNODE, isVNode, isWNode } from './d';
import { auto } from './diff';
import {
	AfterRender,
	BeforeProperties,
	BeforeRender,
	DiffPropertyReaction,
	DNode,
	DefaultWidgetBaseInterface,
	LazyWidget,
	Render,
	WidgetMetaConstructor,
	WidgetBaseInterface,
	WidgetProperties,
	WNode,
	VNode,
	LazyDefine,
	MetaBase
} from './interfaces';
import RegistryHandler from './RegistryHandler';
import NodeHandler from './NodeHandler';
import { isWidgetBaseConstructor, WIDGET_BASE_TYPE } from './Registry';
import { Handle } from '../core/Destroyable';
import { Base } from './meta/Base';

interface ReactionFunctionConfig {
	propertyName: string;
	reaction: DiffPropertyReaction;
}

export interface WidgetData {
	onDetach: () => void;
	onAttach: () => void;
	dirty: boolean;
	nodeHandler: NodeHandler;
	invalidate?: Function;
	rendering: boolean;
	inputProperties: any;
}

export type BoundFunctionData = { boundFunc: (...args: any[]) => any; scope: any };

let lazyWidgetId = 0;
const lazyWidgetIdMap = new WeakMap<LazyWidget, string>();
const decoratorMap = new WeakMap<Function, Map<string, any[]>>();
const builtDecoratorMap = new WeakMap<Function, Map<string, any[]>>();
export const widgetInstanceMap = new WeakMap<
	WidgetBase<WidgetProperties, DNode<DefaultWidgetBaseInterface>>,
	WidgetData
>();
const boundAuto = auto.bind(null);

export const noBind = '__dojo_no_bind';

function toTextVNode(data: any): VNode {
	return {
		tag: '',
		properties: {},
		children: undefined,
		text: `${data}`,
		type: VNODE
	};
}

function isLazyDefine(item: any): item is LazyDefine {
	return Boolean(item && item.label);
}

function isDomMeta(meta: any): meta is Base {
	return Boolean(meta.afterRender);
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

	private _registry: RegistryHandler | undefined;

	/**
	 * Map of functions properties for the bound function
	 */
	private _bindFunctionPropertyMap: WeakMap<(...args: any[]) => any, BoundFunctionData> | undefined;

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
			inputProperties: {}
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

	public __setProperties__(originalProperties: this['properties'], bind?: WidgetBaseInterface): void {
		const instanceData = widgetInstanceMap.get(this);
		if (instanceData) {
			instanceData.inputProperties = originalProperties;
		}
		const properties = this._runBeforeProperties(originalProperties);
		const registeredDiffPropertyNames = this.getDecorator('registeredDiffProperty');
		const changedPropertyKeys: string[] = [];
		const propertyNames = Object.keys(properties);

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
				const newProperty = this._bindFunctionProperty(properties[propertyName], bind);
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
			this._initialProperties = false;
			for (let i = 0; i < propertyNames.length; i++) {
				const propertyName = propertyNames[i];
				if (typeof properties[propertyName] === 'function') {
					properties[propertyName] = this._bindFunctionProperty(properties[propertyName], bind);
				} else {
					changedPropertyKeys.push(propertyName);
				}
			}
			this._changedPropertyKeys = changedPropertyKeys;
			this._properties = { ...properties };
		}

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

	private _filterAndConvert(nodes: DNode[]): (WNode | VNode)[];
	private _filterAndConvert(nodes: DNode): WNode | VNode;
	private _filterAndConvert(nodes: DNode | DNode[]): (WNode | VNode) | (WNode | VNode)[];
	private _filterAndConvert(nodes: DNode | DNode[]): (WNode | VNode) | (WNode | VNode)[] {
		const isArray = Array.isArray(nodes);
		const filteredNodes = Array.isArray(nodes) ? nodes : [nodes];
		const convertedNodes: (WNode | VNode)[] = [];
		for (let i = 0; i < filteredNodes.length; i++) {
			const node = filteredNodes[i];
			if (!node || node === true) {
				continue;
			}
			if (typeof node === 'string') {
				convertedNodes.push(toTextVNode(node));
				continue;
			}
			if (isVNode(node) && node.deferredPropertiesCallback) {
				const properties = node.deferredPropertiesCallback(false);
				node.originalProperties = node.properties;
				node.properties = { ...properties, ...node.properties };
			}
			if (isWNode(node) && !isWidgetBaseConstructor(node.widgetConstructor)) {
				if (typeof node.widgetConstructor === 'function') {
					let id = lazyWidgetIdMap.get(node.widgetConstructor);
					if (!id) {
						id = `__lazy_widget_${lazyWidgetId++}`;
						lazyWidgetIdMap.set(node.widgetConstructor, id);
						this.registry.define(id, node.widgetConstructor);
					}
					node.widgetConstructor = id;
				} else if (isLazyDefine(node.widgetConstructor)) {
					const { label, registryItem } = node.widgetConstructor;
					if (!this.registry.has(label)) {
						this.registry.define(label, registryItem);
					}
					node.widgetConstructor = label;
				}

				node.widgetConstructor =
					this.registry.get<WidgetBase>(node.widgetConstructor) || node.widgetConstructor;
			}
			if (!node.bind) {
				node.bind = this;
			}
			convertedNodes.push(node);
			if (node.children && node.children.length) {
				node.children = this._filterAndConvert(node.children);
			}
		}
		return isArray ? convertedNodes : convertedNodes[0];
	}

	public __render__(): (WNode | VNode) | (WNode | VNode)[] {
		const instanceData = widgetInstanceMap.get(this);
		if (instanceData) {
			instanceData.dirty = false;
		}
		const render = this._runBeforeRenders();
		const dNode = this._filterAndConvert(this._runAfterRenders(render()));
		this._nodeHandler.clear();
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

	/**
	 * Binds unbound property functions to the specified `bind` property
	 *
	 * @param properties properties to check for functions
	 */
	private _bindFunctionProperty(property: any, bind: any): any {
		if (typeof property === 'function' && !property[noBind] && isWidgetBaseConstructor(property) === false) {
			if (this._bindFunctionPropertyMap === undefined) {
				this._bindFunctionPropertyMap = new WeakMap<
					(...args: any[]) => any,
					{ boundFunc: (...args: any[]) => any; scope: any }
				>();
			}
			const bindInfo: Partial<BoundFunctionData> = this._bindFunctionPropertyMap.get(property) || {};
			let { boundFunc, scope } = bindInfo;

			if (boundFunc === undefined || scope !== bind) {
				boundFunc = property.bind(bind) as (...args: any[]) => any;
				this._bindFunctionPropertyMap.set(property, { boundFunc, scope: bind });
			}
			return boundFunc;
		}
		return property;
	}

	public get registry(): RegistryHandler {
		if (this._registry === undefined) {
			this._registry = new RegistryHandler();
			this.own(this._registry);
			this.own(this._registry.on('invalidate', this._boundInvalidate));
		}
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
