import { VNode } from '@dojo/interfaces/vdom';
import { assign } from '@dojo/core/lang';
import WeakMap from '@dojo/shim/WeakMap';
import Promise from '@dojo/shim/Promise';
import Map from '@dojo/shim/Map';
import Set from '@dojo/shim/Set';
import { Evented } from './bases/Evented';
import {
	DNode,
	WidgetConstructor,
	WidgetProperties,
	WidgetBaseInterface,
	PropertyChangeRecord,
	PropertiesChangeRecord,
	PropertiesChangeEvent
} from './interfaces';
import { v, registry, isWNode } from './d';
import FactoryRegistry, { WIDGET_BASE_TYPE } from './FactoryRegistry';

/**
 * Widget cache wrapper for instance management
 */
interface WidgetCacheWrapper {
	child: WidgetBaseInterface<WidgetProperties>;
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
export class WidgetBase<P extends WidgetProperties> extends Evented implements WidgetBaseInterface<P> {

	/**
	 * static identifier
	 */
	static _type: symbol = WIDGET_BASE_TYPE;

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

	public get id(): string | undefined {
		return this._properties.id;
	}

	public get properties(): Readonly<P> {
		return this._properties;
	}

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

	public get children(): DNode[] {
		return this._children;
	}

	public setChildren(children: DNode[]): void {
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

	public render(): DNode {
		return v('div', {}, this.children);
	}

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
			let child: WidgetBaseInterface<WidgetProperties>;

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
					console.warn(`Unable to render unknown widget factory ${factory}`);
					return null;
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

export default WidgetBase;
