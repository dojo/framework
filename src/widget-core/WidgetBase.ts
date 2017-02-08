import { VNode, VNodeProperties } from '@dojo/interfaces/vdom';
import { assign } from '@dojo/core/lang';
import WeakMap from '@dojo/shim/WeakMap';
import Promise from '@dojo/shim/Promise';
import Map from '@dojo/shim/Map';
import Set from '@dojo/shim/Set';
import { EventTypedObject } from '@dojo/interfaces/core';
import { Evented } from './bases/Evented';
import { v, registry, isWNode } from './d';
import FactoryRegistry from './FactoryRegistry';

/**
 * Base widget properties
 */
export interface WidgetProperties {

	/**
	 * id for a widget
	 */
	id?: string;

	/**
	 * The key for a widget. Used to differentiate uniquely identify child widgets for
	 * rendering and instance management
	 */
	key?: string;

	/**
	 * The scope to bind all function properties
	 */
	bind?: any;
}

/**
 * Wrapper for v
 */
export interface HNode {
	/**
	 * Array of processed VNode children.
	 */
	vNodes?: (string | VNode | null)[];
	/**
	 * Specified children
	 */
	children: (DNode | string)[];

	/**
	 * render function that wraps returns VNode
	 */
	render<T>(options?: { bind?: T }): VNode;

	/**
	 * The properties used to create the VNode
	 */
	properties: VNodeProperties;

	/**
	 * The type of node
	 */
	type: symbol;
}

/**
 * Wrapper for `w`
 */
export interface WNode {
	/**
	 * Factory to create a widget
	 */
	factory: WidgetConstructor | string;

	/**
	 * Options used to create factory a widget
	 */
	properties: WidgetProperties;

	/**
	 * DNode children
	 */
	children: DNode[];

	/**
	 * The type of node
	 */
	type: symbol;
}

/**
 * union type for all possible return types from render
 */
export type DNode = HNode | WNode | string | null;

/**
 * the event emitted on properties:changed
 */
export interface PropertiesChangeEvent<T, P extends WidgetProperties> extends EventTypedObject<'properties:changed'> {
	/**
	 * the full set of properties
	 */
	properties: P;
	/**
	 * the changed properties between setProperty calls
	 */
	changedPropertyKeys: string[];
	/**
	 * the target (this)
	 */
	target: T;
}

/**
 * Propeerty Change record for specific property diff functions
 */
export interface PropertyChangeRecord {
	changed: boolean;
	value: any;
}

/**
 * Properties changed record, return for diffProperties
 */
export interface PropertiesChangeRecord<P extends WidgetProperties> {
	changedKeys: string[];
	properties: P;
}

/**
 * WidgetBase constructor type
 */
export type WidgetConstructor = new (...args: any[]) => WidgetBase<WidgetProperties>;

/**
 * Widget cache wrapper for instance management
 */
interface WidgetCacheWrapper {
	child: WidgetBase<WidgetProperties>;
	factory: WidgetConstructor;
	used: boolean;
}

/**
 * Regular expression to find specific property diff functions
 */
const propertyFunctionNameRegex = /^diffProperty(.*)/;

/**
 * Regular express to find render decorator functions
 */
const decoratorFunctionNameRegex = /^renderDecorator.*/;

/**
 * Main widget base for all widgets to extend
 */
export class WidgetBase<P extends WidgetProperties> extends Evented {

	/**
	 * children array
	 */
	private  _children: DNode[];

	/**
	 * marker indicating is the widget requires a render
	 */
	private dirty: boolean;

	/**
	 * cachedVNode from previous render
	 */
	private cachedVNode?: VNode | string;

	/**
	 * internal widget properties
	 */
	private  _properties: P;

	/**
	 * properties from the previous render
	 */
	private previousProperties: P & { [index: string]: any };

	/**
	 * Map of factory promises
	 */
	private initializedFactoryMap: Map<string, Promise<WidgetConstructor>>;

	/**
	 * cached chldren map for instance management
	 */
	private cachedChildrenMap: Map<string | Promise<WidgetConstructor> | WidgetConstructor, WidgetCacheWrapper[]>;

	/**
	 * map of specific property diff functiona
	 */
	private diffPropertyFunctionMap: Map<string, string>;

	/**
	 * set of render decorators
	 */
	private renderDecorators: Set<string>;

	/**
	 * Map of functions properies for the bound function
	 */
	private bindFunctionPropertyMap: WeakMap<(...args: any[]) => any, { boundFunc: (...args: any[]) => any, scope: any }>;

	/**
	 * Internal factory registry
	 */
	protected registry: FactoryRegistry | undefined;

	/**
	 * @constructor
	 * @param options widget options for construction
	 */
	constructor(properties: P) {
		super({});

		this._children = [];
		this._properties = <P> {};
		this.previousProperties = <P> {};
		this.initializedFactoryMap = new Map<string, Promise<WidgetConstructor>>();
		this.cachedChildrenMap = new Map<string | Promise<WidgetConstructor> | WidgetConstructor, WidgetCacheWrapper[]>();
		this.diffPropertyFunctionMap = new Map<string, string>();
		this.renderDecorators = new Set<string>();
		this.bindFunctionPropertyMap = new WeakMap<(...args: any[]) => any, { boundFunc: (...args: any[]) => any, scope: any }>();

		const self: { [index: string]: any } = this;
		for (let property in this) {
			let match = property.match(propertyFunctionNameRegex);
			if (match && (typeof self[match[0]] === 'function')) {
				this.diffPropertyFunctionMap.set(match[0], `${match[1].slice(0, 1).toLowerCase()}${match[1].slice(1)}`);
				continue;
			}
			match = property.match(decoratorFunctionNameRegex);
			if (match && (typeof self[match[0]] === 'function')) {
				this.renderDecorators.add(match[0]);
				continue;
			}
		};

		this.own(this.on('properties:changed', (evt: PropertiesChangeEvent<WidgetBase<WidgetProperties>, WidgetProperties>) => {
			this.invalidate();
		}));

		this.setProperties(properties);
	}

	/**
	 * return the widget's id from properties
	 */
	public get id(): string | undefined {
		return this._properties.id;
	}

	/**
	 * Return readonly widget properties
	 */
	public get properties(): Readonly<P> {
		return this._properties;
	}

	/**
	 * Sets the properties for the widget. Responsible for calling the diffing functions for the properties against the
	 * previous properties. Runs though any registered specific property diff functions collecting the results and then
	 * runs the remainder through the catch all diff function. The aggregate of the two sets of the results is then
	 * set as the widgets properties
	 *
	 * @param properties The new widget properties
	 */
	public setProperties(properties: P & { [index: string]: any }): void {
		const diffPropertyResults: { [index: string]: PropertyChangeRecord } = {};
		const diffPropertyChangedKeys: string[] = [];

		this.bindFunctionProperties(properties);

		this.diffPropertyFunctionMap.forEach((property: string, diffFunctionName: string) => {
			const previousProperty = this.previousProperties[property];
			const newProperty = properties[property];
			const self: { [index: string]: any } = this;
			const result: PropertyChangeRecord = self[diffFunctionName](previousProperty, newProperty);

			if (!result) {
				return;
			}

			if (result.changed) {
				diffPropertyChangedKeys.push(property);
			}
			delete properties[property];
			delete this.previousProperties[property];
			diffPropertyResults[property] = result.value;
		});

		const diffPropertiesResult = this.diffProperties(this.previousProperties, properties);
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
		this.previousProperties = this.properties;
	}

	/**
	 * Returns the widgets children
	 */
	public get children(): DNode[] {
		return this._children;
	}

	/**
	 * Sets the widgets children
	 */
	public setChildren(children: DNode[]): void {
		this._children = children;
		this.emit({
			type: 'widget:children',
			target: this
		});
	}

	/**
	 * The default diff function for properties, also responsible for cloning the properties.
	 *
	 * @param previousProperties The widgets previous properties
	 * @param newProperties The widgets new properties
	 * @returns A properties change record for the the diff
	 */
	public diffProperties(previousProperties: P & { [index: string]: any }, newProperties: P & { [index: string]: any }): PropertiesChangeRecord<P> {
		const changedKeys = Object.keys(newProperties).reduce((changedPropertyKeys: string[], propertyKey: string): string[] => {
			if (previousProperties[propertyKey] !== newProperties[propertyKey]) {
				changedPropertyKeys.push(propertyKey);
			}
			return changedPropertyKeys;
		}, []);

		return { changedKeys, properties: assign({}, newProperties) };
	}

	/**
	 * Default render, returns a `div` with widgets children
	 *
	 * @returns the DNode for the widget
	 */
	public render(): DNode {
		return v('div', {}, this.children);
	}

	/**
	 * Main internal function for dealing with widget rendering
	 */
	public __render__(): VNode | string | null {
		if (this.dirty || !this.cachedVNode) {
			let dNode = this.render();
			this.renderDecorators.forEach((decoratorFunctionName: string) => {
				const self: { [index: string]: any } = this;
				dNode = self[decoratorFunctionName](dNode);
			});
			const widget = this.dNodeToVNode(dNode);
			this.manageDetachedChildren();
			if (widget) {
				this.cachedVNode = widget;
			}
			this.dirty = false;
			return widget;
		}
		return this.cachedVNode;
	}

	/**
	 * invalidate the widget
	 */
	public invalidate(): void {
		this.dirty = true;
		this.emit({
			type: 'invalidated',
			target: this
		});
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
				const bindInfo = this.bindFunctionPropertyMap.get(property) || {};
				let { boundFunc, scope } = bindInfo;

				if (!boundFunc || scope !== bind) {
					boundFunc = property.bind(bind);
					this.bindFunctionPropertyMap.set(property, { boundFunc, scope: bind });
				}
				properties[propertyKey] = boundFunc;
			}
		});
	}

	/**
	 * Returns the factory from the registry for the specified label. First checks a local registry passed via
	 * properties, if no local registry or the factory is not found fallback to the global registry
	 *
	 * @param factoryLabel the label to look up in the registry
	 */
	private getFromRegistry(factoryLabel: string): Promise<WidgetConstructor> | WidgetConstructor | null {
		if (this.registry && this.registry.has(factoryLabel)) {
			return this.registry.get(factoryLabel);
		}
		return registry.get(factoryLabel);
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

			let { factory } = dNode;
			let child: WidgetBase<WidgetProperties>;

			if (typeof factory === 'string') {
				const item = this.getFromRegistry(factory);

				if (item instanceof Promise) {
					if (item && !this.initializedFactoryMap.has(factory)) {
						const promise = item.then((factory) => {
							this.invalidate();
							return factory;
						});
						this.initializedFactoryMap.set(factory, promise);
					}
					return null;
				}
				else if (item === null) {
					throw new Error();
				}
				factory = item;
			}

			const childrenMapKey = key || factory;
			let cachedChildren = this.cachedChildrenMap.get(childrenMapKey) || [];
			let cachedChild: WidgetCacheWrapper | undefined;
			cachedChildren.some((cachedChildWrapper) => {
				if (cachedChildWrapper.factory === factory && !cachedChildWrapper.used) {
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
				child = new factory(properties);
				child.own(child.on('invalidated', () => {
					this.invalidate();
				}));
				cachedChildren = [...cachedChildren, { child, factory, used: true }];
				this.cachedChildrenMap.set(childrenMapKey, cachedChildren);
				this.own(child);
			}
			if (!key && cachedChildren.length > 1) {
				const errorMsg = 'It is recommended to provide a unique `key` property when using the same widget factory multiple times';
				console.warn(errorMsg);
				this.emit({ type: 'error', target: this, error: new Error(errorMsg) });
			}

			child.setChildren(children);
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
		this.cachedChildrenMap.forEach((cachedChildren, key) => {
			const filterCachedChildren = cachedChildren.filter((cachedChild) => {
				if (cachedChild.used) {
					cachedChild.used = false;
					return true;
				}
				cachedChild.child.destroy();
				return false;
			});
			this.cachedChildrenMap.set(key, filterCachedChildren);
		});
	}
}
