import { EventTypedObject } from '@dojo/interfaces/core';
import Map from '@dojo/shim/Map';
import WeakMap from '@dojo/shim/WeakMap';
import { v } from './d';
import { auto } from './diff';
import {
	AfterRender,
	BeforeProperties,
	BeforeRender,
	CoreProperties,
	DiffPropertyReaction,
	DNode,
	Render,
	WidgetMetaBase,
	WidgetMetaConstructor,
	WidgetBaseInterface,
	WidgetProperties
} from './interfaces';
import RegistryHandler from './RegistryHandler';
import NodeHandler from './NodeHandler';
import { isWidgetBaseConstructor, WIDGET_BASE_TYPE } from './Registry';

enum WidgetRenderState {
	IDLE = 1,
	PROPERTIES,
	CHILDREN,
	RENDER
}

interface ReactionFunctionArguments {
	previousProperties: any;
	newProperties: any;
	changed: boolean;
}

interface ReactionFunctionConfig {
	propertyName: string;
	reaction: DiffPropertyReaction;
}

export interface WidgetAndElementEvent extends EventTypedObject<'properties:changed'> {
	key: string;
	element: HTMLElement;
	target: WidgetBase;
}

export type BoundFunctionData = { boundFunc: (...args: any[]) => any, scope: any };

const decoratorMap = new Map<Function, Map<string, any[]>>();
const boundAuto = auto.bind(null);

/**
 * Main widget base for all widgets to extend
 */
export class WidgetBase<P = WidgetProperties, C extends DNode = DNode> implements WidgetBaseInterface<P, C> {

	/**
	 * static identifier
	 */
	static _type: symbol = WIDGET_BASE_TYPE;

	/**
	 * children array
	 */
	private _children: (C | null)[];

	/**
	 * marker indicating if the widget requires a render
	 */
	private _dirty: boolean;

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
	 * Core properties widget base sets for all widget
	 */
	private _coreProperties: CoreProperties = {} as CoreProperties;

	private _cachedDNode: DNode | DNode[];

	/**
	 * map of decorators that are applied to this widget
	 */
	private _decoratorCache: Map<string, any[]>;

	private _registry: RegistryHandler;

	/**
	 * Map of functions properties for the bound function
	 */
	private _bindFunctionPropertyMap: WeakMap<(...args: any[]) => any, BoundFunctionData>;

	private _renderState: WidgetRenderState = WidgetRenderState.IDLE;

	private _metaMap: Map<WidgetMetaConstructor<any>, WidgetMetaBase>;

	private _boundRenderFunc: Render;

	private _boundInvalidate: () => void;

	public readonly nodeHandler: NodeHandler = new NodeHandler();

	private _parentInvalidator: Function;

	/**
	 * @constructor
	 */
	constructor() {
		this._children = [];
		this._decoratorCache = new Map<string, any[]>();
		this._properties = <P> {};
		this.nodeHandler = new NodeHandler();
		this._boundRenderFunc = this.render.bind(this);
		this._boundInvalidate = this.invalidate.bind(this);
	}

	public set parentInvalidator(invalidator: Function) {
		if (this._parentInvalidator === undefined) {
			this._parentInvalidator = invalidator;
		}
		else {
			console.warn('Unable to update parent invalidator after it has been set');
		}
	}

	protected meta<T extends WidgetMetaBase>(MetaType: WidgetMetaConstructor<T>): T {
		if (this._metaMap === undefined) {
			this._metaMap = new Map<WidgetMetaConstructor<any>, WidgetMetaBase>();
		}
		let cached = this._metaMap.get(MetaType);
		if (!cached) {
			cached = new MetaType({
				invalidate: this._boundInvalidate,
				nodeHandler: this.nodeHandler,
				bind: this
			});
			this._metaMap.set(MetaType, cached);
			cached;
		}

		return cached as T;
	}

	/**
	 * Widget lifecycle method that is called whenever a dom node is created for a HNode.
	 * Override this method to access the dom nodes that were inserted into the dom.
	 * @param element The dom node represented by the vdom node.
	 * @param key The vdom node's key.
	 */
	public onElementCreated(element: Element, key: string): void {
		// Do nothing by default.
	}

	/**
	 * Widget lifecycle method that is called whenever a dom node that is associated with a HNode is updated.
	 * Override this method to access the dom node.
	 * @param element The dom node represented by the vdom node.
	 * @param key The vdom node's key.
	 */
	public onElementUpdated(element: Element, key: string): void {
		// Do nothing by default.
	}

	public get properties(): Readonly<P> & Readonly<WidgetProperties> {
		return this._properties;
	}

	public get changedPropertyKeys(): string[] {
		return [ ...this._changedPropertyKeys ];
	}

	public get coreProperties(): CoreProperties {
		return this._coreProperties;
	}

	public __setCoreProperties__(coreProperties: CoreProperties): void {
		this._renderState = WidgetRenderState.PROPERTIES;
		const { baseRegistry } = coreProperties;

		if (this._coreProperties.baseRegistry !== baseRegistry) {
			if (this._registry === undefined) {
				this._registry = new RegistryHandler();
				this._registry.on('invalidate', this._boundInvalidate);
			}
			this._registry.base = baseRegistry;
			this.invalidate();
		}
		this._coreProperties = coreProperties;
	}

	public __setProperties__(originalProperties: this['properties']): void {
		const properties = this._runBeforeProperties(originalProperties);
		const registeredDiffPropertyNames = this.getDecorator('registeredDiffProperty');
		const changedPropertyKeys: string[] = [];
		const propertyNames = Object.keys(properties);
		this._renderState = WidgetRenderState.PROPERTIES;

		if (this._initialProperties === false || registeredDiffPropertyNames.length !== 0) {
			const allProperties = [ ...propertyNames, ...Object.keys(this._properties) ];
			const checkedProperties: string[] = [];
			const diffPropertyResults: any = {};
			let runReactions = false;

			for (let i = 0; i < allProperties.length; i++) {
				const propertyName = allProperties[i];
				if (checkedProperties.indexOf(propertyName) > 0) {
					continue;
				}
				checkedProperties.push(propertyName);
				const previousProperty = this._properties[propertyName];
				const newProperty = this._bindFunctionProperty(properties[propertyName], this._coreProperties.bind);
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
				}
				else {
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
				this._mapDiffPropertyReactions(properties, changedPropertyKeys).forEach((args, reaction) => {
					if (args.changed) {
						reaction.call(this, args.previousProperties, args.newProperties);
					}
				});
			}
			this._properties = diffPropertyResults;
			this._changedPropertyKeys = changedPropertyKeys;
		}
		else {
			this._initialProperties = false;
			for (let i = 0; i < propertyNames.length; i++) {
				const propertyName = propertyNames[i];
				if (typeof properties[propertyName] === 'function') {
					properties[propertyName] = this._bindFunctionProperty(properties[propertyName], this._coreProperties.bind);
				}
				else {
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
		this._renderState = WidgetRenderState.CHILDREN;
		if (this._children.length > 0 || children.length > 0) {
			this._children = children;
			this.invalidate();
		}
	}

	public __render__(): DNode | DNode[] {
		this._renderState = WidgetRenderState.RENDER;
		if (this._dirty || this._cachedDNode === undefined) {
			this._dirty = false;
			const render = this._runBeforeRenders();
			let dNode = render();
			this._cachedDNode = this.runAfterRenders(dNode);
			this.nodeHandler.clear();
		}
		this._renderState = WidgetRenderState.IDLE;
		return this._cachedDNode;
	}

	public invalidate(): void {
		if (this._renderState === WidgetRenderState.IDLE) {
			this._dirty = true;
			if (this._parentInvalidator) {
				this._parentInvalidator();
			}
		}
		else if (this._renderState === WidgetRenderState.PROPERTIES) {
			this._dirty = true;
		}
		else if (this._renderState === WidgetRenderState.CHILDREN) {
			this._dirty = true;
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
		value = Array.isArray(value) ? value : [ value ];
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
		}
		else {
			const decorators = this.getDecorator(decoratorKey);
			this._decoratorCache.set(decoratorKey, [ ...decorators, ...value ]);
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

		return allDecorators;
	}

	/**
	 * Function to retrieve decorator values
	 *
	 * @param decoratorKey The key of the decorator
	 * @returns An array of decorator values
	 */
	protected getDecorator(decoratorKey: string): any[] {
		let allDecorators = this._decoratorCache.get(decoratorKey);

		if (allDecorators !== undefined) {
			return allDecorators;
		}

		allDecorators = this._buildDecoratorList(decoratorKey);

		this._decoratorCache.set(decoratorKey, allDecorators);
		return allDecorators;
	}

	private _mapDiffPropertyReactions(newProperties: any, changedPropertyKeys: string[]): Map<Function, ReactionFunctionArguments> {
		const reactionFunctions: ReactionFunctionConfig[] = this.getDecorator('diffReaction');

		return reactionFunctions.reduce((reactionPropertyMap, { reaction, propertyName }) => {
			let reactionArguments = reactionPropertyMap.get(reaction);
			if (reactionArguments === undefined) {
				reactionArguments = {
					previousProperties: {},
					newProperties: {},
					changed: false
				};
			}
			reactionArguments.previousProperties[propertyName] = this._properties[propertyName];
			reactionArguments.newProperties[propertyName] = newProperties[propertyName];
			if (changedPropertyKeys.indexOf(propertyName) !== -1) {
				reactionArguments.changed = true;
			}
			reactionPropertyMap.set(reaction, reactionArguments);
			return reactionPropertyMap;
		}, new Map<Function, ReactionFunctionArguments>());

	}

	/**
	 * Binds unbound property functions to the specified `bind` property
	 *
	 * @param properties properties to check for functions
	 */
	private _bindFunctionProperty(property: any, bind: any): any {
		if (typeof property === 'function' && isWidgetBaseConstructor(property) === false) {
			if (this._bindFunctionPropertyMap === undefined) {
				this._bindFunctionPropertyMap = new WeakMap<(...args: any[]) => any, { boundFunc: (...args: any[]) => any, scope: any }>();
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
			this._registry.on('invalidate', this._boundInvalidate);
		}
		return this._registry;
	}

	private _runBeforeProperties(properties: any) {
		const beforeProperties: BeforeProperties[] = this.getDecorator('beforeProperties');
		if (beforeProperties.length > 0) {
			return beforeProperties.reduce((properties, beforePropertiesFunction) => {
				return { ...properties, ...beforePropertiesFunction.call(this, properties) };
			}, { ...properties });
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
	protected runAfterRenders(dNode: DNode | DNode[]): DNode | DNode[] {
		const afterRenders = this.getDecorator('afterRender');

		if (afterRenders.length > 0) {
			return afterRenders.reduce((dNode: DNode | DNode[], afterRenderFunction: AfterRender) => {
				return afterRenderFunction.call(this, dNode);
			}, dNode);
		}

		if (this._metaMap !== undefined) {
			this._metaMap.forEach((meta) => {
				meta.afterRender();
			});
		}

		return dNode;
	}
}

export default WidgetBase;
