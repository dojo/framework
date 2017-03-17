import { Evented, BaseEventedEvents } from '@dojo/core/Evented';
import { assign } from '@dojo/core/lang';
import { EventedListenerOrArray } from '@dojo/interfaces/bases';
import { Handle } from '@dojo/interfaces/core';
import { VNode, ProjectionOptions, VNodeProperties } from '@dojo/interfaces/vdom';
import Map from '@dojo/shim/Map';
import Promise from '@dojo/shim/Promise';
import Set from '@dojo/shim/Set';
import WeakMap from '@dojo/shim/WeakMap';
import { v, registry, isWNode, isHNode, decorate } from './d';
import {
	DNode,
	WidgetConstructor,
	WidgetProperties,
	WidgetBaseInterface,
	PropertyChangeRecord,
	PropertiesChangeRecord,
	PropertiesChangeEvent,
	HNode
} from './interfaces';
import WidgetRegistry, { WIDGET_BASE_TYPE } from './WidgetRegistry';

/**
 * Widget cache wrapper for instance management
 */
interface WidgetCacheWrapper {
	child: WidgetBaseInterface<WidgetProperties>;
	widgetConstructor: WidgetConstructor;
	used: boolean;
}

/**
 * Diff property configuration
 */
interface DiffPropertyConfig {
	propertyName: string;
	diffFunction: Function;
}

export interface WidgetBaseEvents<P extends WidgetProperties> extends BaseEventedEvents {
	(type: 'properties:changed', handler: EventedListenerOrArray<WidgetBase<P>, PropertiesChangeEvent<WidgetBase<P>, P>>): Handle;
}

const decoratorMap = new Map<Function, Map<string, any[]>>();

/**
 * Decorator that can be used to register a function to run as an aspect to `render`
 */
export function afterRender(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
	target.addDecorator('afterRender', target[propertyKey]);
}

/**
 * Decorator that can be used to register a function as a specific property diff
 *
 * @param propertyName The name of the property of which the diff function is applied
 */
export function diffProperty(propertyName: string) {
	return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
		target.addDecorator('diffProperty', { propertyName, diffFunction: target[propertyKey] });
	};
}

/**
 * Decorator used to register listeners to the `properties:changed` event.
 */
export function onPropertiesChanged(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
	target.addDecorator('onPropertiesChanged', target[propertyKey]);
}

/**
 * Function that identifies DNodes that are HNodes with key properties.
 */
function isHNodeWithKey(node: DNode): node is HNode {
	return isHNode(node) && (node.properties != null) && (node.properties.key != null);
}

/**
 * Main widget base for all widgets to extend
 */
export class WidgetBase<P extends WidgetProperties> extends Evented implements WidgetBaseInterface<P> {

	/**
	 * static identifier
	 */
	static _type: symbol = WIDGET_BASE_TYPE;

	/**
	 * on for the events defined for widget base
	 */
	public on: WidgetBaseEvents<P>;

	/**
	 * Internal widget registry
	 */
	protected registry: WidgetRegistry | undefined;

	/**
	 * children array
	 */
	private _children: DNode[];

	/**
	 * marker indicating if the widget requires a render
	 */
	private _dirty: boolean;

	/**
	 * cachedVNode from previous render
	 */
	private _cachedVNode?: VNode | string;

	/**
	 * internal widget properties
	 */
	private  _properties: P;

	/**
	 * properties from the previous render
	 */
	private _previousProperties: P & { [index: string]: any };

	/**
	 * Map constructor labels to widget constructor
	 */
	private _initializedConstructorMap: Map<string, Promise<WidgetConstructor>>;

	/**
	 * cached chldren map for instance management
	 */
	private _cachedChildrenMap: Map<string | Promise<WidgetConstructor> | WidgetConstructor, WidgetCacheWrapper[]>;

	/**
	 * map of specific property diff functions
	 */
	private _diffPropertyFunctionMap: Map<string, string>;

	private _decoratorCache: Map<string, any[]>;

	/**
	 * set of render decorators
	 */
	private _renderDecorators: Set<string>;

	/**
	 * Map of functions properties for the bound function
	 */
	private _bindFunctionPropertyMap: WeakMap<(...args: any[]) => any, { boundFunc: (...args: any[]) => any, scope: any }>;

	/**
	 * @constructor
	 */
	constructor() {
		super({});

		this._children = [];
		this._decoratorCache = new Map<string, any[]>();
		this._properties = <P> {};
		this._previousProperties = <P> {};
		this._initializedConstructorMap = new Map<string, Promise<WidgetConstructor>>();
		this._cachedChildrenMap = new Map<string | Promise<WidgetConstructor> | WidgetConstructor, WidgetCacheWrapper[]>();
		this._diffPropertyFunctionMap = new Map<string, string>();
		this._renderDecorators = new Set<string>();
		this._bindFunctionPropertyMap = new WeakMap<(...args: any[]) => any, { boundFunc: (...args: any[]) => any, scope: any }>();

		this.own(this.on('properties:changed', (evt) => {
			this._dirty = true;

			const propertiesChangedListeners = this.getDecorator('onPropertiesChanged') || [];
			propertiesChangedListeners.forEach((propertiesChangedFunction) => {
				propertiesChangedFunction.call(this, evt);
			});
		}));
	}

	/**
	 * A render decorator that registers vnode callbacks for 'afterCreate' and
	 * 'afterUpdate' that will in turn call lifecycle methods onElementCreated and onElementUpdated.
	 */
	@afterRender
	protected attachLifecycleCallbacks (node: DNode) {
		// Create vnode afterCreate and afterUpdate callback functions that will only be set on nodes
		// with "key" properties.

		decorate(node, (node: HNode) => {
			node.properties.afterCreate = this.afterCreateCallback;
			node.properties.afterUpdate = this.afterUpdateCallback;
		}, isHNodeWithKey);

		return node;
	}

	/**
	 * vnode afterCreate callback that calls the onElementCreated lifecycle method.
	 */
	private afterCreateCallback(element: Element, projectionOptions: ProjectionOptions, vnodeSelector: string,
		properties: VNodeProperties, children: VNode[]): void {
		this.onElementCreated(element, String(properties.key));
	}

	/**
	 * vnode afterUpdate callback that calls the onElementUpdated lifecycle method.
	 */
	private afterUpdateCallback(element: Element, projectionOptions: ProjectionOptions, vnodeSelector: string,
		properties: VNodeProperties, children: VNode[]): void {
		this.onElementUpdated(element, String(properties.key));
	}

	/**
	 * Widget lifecycle method that is called whenever a dom node is created for a vnode.
	 * Override this method to access the dom nodes that were inserted into the dom.
	 * @param element The dom node represented by the vdom node.
	 * @param key The vdom node's key.
	 */
	protected onElementCreated(element: Element, key: string): void {
		// Do nothing by default.
	}

	/**
	 * Widget lifecycle method that is called whenever a dom node that is associated with a vnode is updated.
	 * Note: this method is dependant on the Maquette afterUpdate callback which is called if a dom
	 * node might have been updated.  Maquette does not guarantee the dom node was updated.
	 * Override this method to access the dom node.
	 * @param element The dom node represented by the vdom node.
	 * @param key The vdom node's key.
	 */
	protected onElementUpdated(element: Element, key: string): void {
		// Do nothing by default.
	}

	public get properties(): Readonly<P> {
		return this._properties;
	}

	public setProperties(properties: P): void {
		const diffPropertyResults: { [index: string]: PropertyChangeRecord } = {};
		const diffPropertyChangedKeys: string[] = [];

		this.bindFunctionProperties(properties);

		const registeredDiffPropertyConfigs: DiffPropertyConfig[] = this.getDecorator('diffProperty') || [];

		registeredDiffPropertyConfigs.forEach(({ propertyName, diffFunction }) => {
			const previousProperty = this._previousProperties[propertyName];
			const newProperty = (<any> properties)[propertyName];
			const result: PropertyChangeRecord = diffFunction(previousProperty, newProperty);

			if (!result) {
				return;
			}

			if (result.changed) {
				diffPropertyChangedKeys.push(propertyName);
			}
			delete (<any> properties)[propertyName];
			delete this._previousProperties[propertyName];
			diffPropertyResults[propertyName] = result.value;
		});

		const diffPropertiesResult = this.diffProperties(this._previousProperties, properties);
		this._properties = assign(diffPropertiesResult.properties, diffPropertyResults);

		const changedPropertyKeys = [...diffPropertiesResult.changedKeys, ...diffPropertyChangedKeys];

		if (changedPropertyKeys.length) {
			this.emit({
				type: 'properties:changed',
				target: this,
				properties: this.properties,
				changedPropertyKeys
			});
		}
		this._previousProperties = this.properties;
	}

	public get children(): DNode[] {
		return this._children;
	}

	public setChildren(children: DNode[]): void {
		this._dirty = true;
		this._children = children;
		this.emit({
			type: 'widget:children',
			target: this
		});
	}

	public diffProperties(previousProperties: P & { [index: string]: any }, newProperties: P & { [index: string]: any }): PropertiesChangeRecord<P> {
		const changedKeys = Object.keys(newProperties).reduce((changedPropertyKeys: string[], propertyKey: string): string[] => {
			if (previousProperties[propertyKey] !== newProperties[propertyKey]) {
				changedPropertyKeys.push(propertyKey);
			}
			return changedPropertyKeys;
		}, []);

		return { changedKeys, properties: assign({}, newProperties) };
	}

	public __render__(): VNode | string | null {
		if (this._dirty || !this._cachedVNode) {
			this._dirty = false;
			let dNode = this.render();
			const afterRenders = this.getDecorator('afterRender') || [];
			afterRenders.forEach((afterRenderFunction: Function) => {
				dNode = afterRenderFunction.call(this, dNode);
			});
			const widget = this.dNodeToVNode(dNode);
			this.manageDetachedChildren();
			if (widget) {
				this._cachedVNode = widget;
			}
			return widget;
		}
		return this._cachedVNode;
	}

	public invalidate(): void {
		this._dirty = true;
		this.emit({
			type: 'invalidated',
			target: this
		});
	}

	protected render(): DNode {
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
			const decorators = this._decoratorCache.get(decoratorKey) || [];
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

	/**
	 * Binds unbound property functions to the specified `bind` property
	 *
	 * @param properties properties to check for functions
	 */
	private bindFunctionProperties(properties: P & { [index: string]: any }): void {
		Object.keys(properties).forEach((propertyKey) => {
			const property = properties[propertyKey];
			const bind = properties.bind;

			if (typeof property === 'function') {
				const bindInfo = this._bindFunctionPropertyMap.get(property) || {};
				let { boundFunc, scope } = bindInfo;

				if (!boundFunc || scope !== bind) {
					boundFunc = property.bind(bind);
					this._bindFunctionPropertyMap.set(property, { boundFunc, scope: bind });
				}
				properties[propertyKey] = boundFunc;
			}
		});
	}

	/**
	 * Returns the constructor from the registry for the specified label. First checks a local registry passed via
	 * properties, if no local registry or the constructor is not found fallback to the global registry
	 *
	 * @param widgetLabel the label to look up in the registry
	 */
	private getFromRegistry(widgetLabel: string): Promise<WidgetConstructor> | WidgetConstructor | null {
		if (this.registry && this.registry.has(widgetLabel)) {
			return this.registry.get(widgetLabel);
		}
		return registry.get(widgetLabel);
	}

	/**
	 * Process a structure of DNodes into VNodes, string or null. `null` results are filtered.
	 *
	 * @param dNode the dnode to process
	 * @returns a VNode, string or null
	 */
	private dNodeToVNode(dNode: DNode): VNode | string | null {

		if (typeof dNode === 'string' || dNode === null) {
			return dNode;
		}

		if (isWNode(dNode)) {
			const { children, properties = {} } = dNode;
			const { key } = properties;

			let { widgetConstructor } = dNode;
			let child: WidgetBaseInterface<WidgetProperties>;

			if (typeof widgetConstructor === 'string') {
				const item = this.getFromRegistry(widgetConstructor);

				if (item instanceof Promise) {
					if (item && !this._initializedConstructorMap.has(widgetConstructor)) {
						const promise = item.then((ctor) => {
							this.invalidate();
							return ctor;
						});
						this._initializedConstructorMap.set(widgetConstructor, promise);
					}
					return null;
				}
				else if (item === null) {
					console.warn(`Unable to render unknown widget constructor ${widgetConstructor}`);
					return null;
				}
				widgetConstructor = item;
			}

			const childrenMapKey = key || widgetConstructor;
			let cachedChildren = this._cachedChildrenMap.get(childrenMapKey) || [];
			let cachedChild: WidgetCacheWrapper | undefined;
			cachedChildren.some((cachedChildWrapper) => {
				if (cachedChildWrapper.widgetConstructor === widgetConstructor && !cachedChildWrapper.used) {
					cachedChild = cachedChildWrapper;
					return true;
				}
				return false;
			});

			if (!properties.hasOwnProperty('bind')) {
				properties.bind = this;
			}

			if (cachedChild) {
				child = cachedChild.child;
				child.setProperties(properties);
				cachedChild.used = true;
			}
			else {
				child = new widgetConstructor();
				child.setProperties(properties);
				child.own(child.on('invalidated', () => {
					this.invalidate();
				}));
				cachedChildren = [...cachedChildren, { child, widgetConstructor, used: true }];
				this._cachedChildrenMap.set(childrenMapKey, cachedChildren);
				this.own(child);
			}
			if (!key && cachedChildren.length > 1) {
				const errorMsg = 'It is recommended to provide a unique `key` property when using the same widget multiple times';
				console.warn(errorMsg);
				this.emit({ type: 'error', target: this, error: new Error(errorMsg) });
			}

			if (Array.isArray(children)) {
				child.setChildren(children);
			}
			return child.__render__();
		}

		dNode.vNodes = dNode.children
		.filter((child) => child !== null)
		.map((child: DNode) => {
			return this.dNodeToVNode(child);
		});

		return dNode.render({ bind: this });
	}

	/**
	 * Manage widget instances after render processing
	 */
	private manageDetachedChildren(): void {
		this._cachedChildrenMap.forEach((cachedChildren, key) => {
			const filterCachedChildren = cachedChildren.filter((cachedChild) => {
				if (cachedChild.used) {
					cachedChild.used = false;
					return true;
				}
				cachedChild.child.destroy();
				return false;
			});
			this._cachedChildrenMap.set(key, filterCachedChildren);
		});
	}
}

export default WidgetBase;
