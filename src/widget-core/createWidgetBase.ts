import { isComposeFactory } from '@dojo/compose/compose';
import createStateful from '@dojo/compose/bases/createStateful';
import {
	DNode,
	PropertiesChangeEvent,
	Widget,
	WidgetMixin,
	WidgetState,
	WidgetOptions,
	WidgetProperties,
	WidgetBaseFactory,
	FactoryRegistryItem,
	PropertiesChangeRecord,
	PropertyChangeRecord
} from './interfaces';
import { VNode, VNodeProperties } from '@dojo/interfaces/vdom';
import { assign } from '@dojo/core/lang';
import WeakMap from '@dojo/shim/WeakMap';
import Promise from '@dojo/shim/Promise';
import Map from '@dojo/shim/Map';
import { v, registry, isWNode } from './d';

interface WidgetInternalState {
	children: DNode[];
	dirty: boolean;
	widgetClasses: string[];
	cachedVNode?: VNode | string;
	initializedFactoryMap: Map<string, Promise<WidgetBaseFactory>>;
	properties: WidgetProperties;
	previousProperties: WidgetProperties;
	historicChildrenMap: Map<string | Promise<WidgetBaseFactory> | WidgetBaseFactory, Widget<WidgetProperties>>;
	currentChildrenMap: Map<string | Promise<WidgetBaseFactory> | WidgetBaseFactory, Widget<WidgetProperties>>;
	diffPropertyFunctionMap: Map<string, string>;
};

/**
 * Internal state map for widget instances
 */
const widgetInternalStateMap = new WeakMap<Widget<WidgetProperties>, WidgetInternalState>();

const propertyFunctionNameRegex = /^diffProperty(.*)/;

function getFromRegistry(instance: Widget<WidgetProperties>, factoryLabel: string): FactoryRegistryItem | null {
	if (instance.registry && instance.registry.has(factoryLabel)) {
		return instance.registry.get(factoryLabel);
	}
	return registry.get(factoryLabel);
}

function dNodeToVNode(instance: Widget<WidgetProperties>, dNode: DNode): VNode | string | null {
	const internalState = widgetInternalStateMap.get(instance);

	if (typeof dNode === 'string' || dNode === null) {
		return dNode;
	}

	if (isWNode(dNode)) {
		const { children, properties } = dNode;
		const { id } = properties;

		let { factory } = dNode;
		let child: Widget<WidgetProperties>;

		if (typeof factory === 'string') {
			const item = getFromRegistry(instance, factory);

			if (isComposeFactory(item)) {
				factory = <WidgetBaseFactory> item;
			}
			else {
				if (item && !internalState.initializedFactoryMap.has(factory)) {
					const promise = (<Promise<WidgetBaseFactory>> item).then((factory) => {
						instance.invalidate();
						return factory;
					});
					internalState.initializedFactoryMap.set(factory, promise);
				}
				return null;
			}
		}

		const childrenMapKey = id || factory;
		const cachedChild = internalState.historicChildrenMap.get(childrenMapKey);

		if (cachedChild) {
			child = cachedChild;
			if (properties) {
				child.setProperties(properties);
			}
		}
		else {
			child = factory({ properties });
			child.own(child.on('invalidated', () => {
				instance.invalidate();
			}));
			internalState.historicChildrenMap.set(childrenMapKey, child);
			instance.own(child);
		}
		if (!id && internalState.currentChildrenMap.has(factory)) {
			const errorMsg = 'must provide unique keys when using the same widget factory multiple times';
			console.error(errorMsg);
			instance.emit({ type: 'error', target: instance, error: new Error(errorMsg) });
		}

		child.setChildren(children);
		internalState.currentChildrenMap.set(childrenMapKey, child);

		return child.__render__();
	}

	dNode.children = dNode.children
		.filter((child) => child !== null)
		.map((child: DNode) => {
			return dNodeToVNode(instance, child);
		});

	return dNode.render({ bind: instance });
}

function manageDetachedChildren(instance: Widget<WidgetProperties>): void {
	const internalState = widgetInternalStateMap.get(instance);

	internalState.historicChildrenMap.forEach((child, key) => {
		if (!internalState.currentChildrenMap.has(key) && internalState.historicChildrenMap.has(key)) {
			internalState.historicChildrenMap.delete(key);
			child.destroy();
		}
	});
	internalState.currentChildrenMap.clear();
}

function formatTagNameAndClasses(tagName: string, classes: string[]) {
	if (classes.length) {
		return `${tagName}.${classes.join('.')}`;
	}
	return tagName;
}

const createWidget: WidgetBaseFactory = createStateful
	.mixin<WidgetMixin<WidgetProperties>, WidgetOptions<WidgetState, WidgetProperties>>({
		mixin: {
			get properties(this: Widget<WidgetProperties>): WidgetProperties {
				const { properties } = widgetInternalStateMap.get(this);
				return properties;
			},

			classes: [],

			getNode(): DNode {
				const tag = formatTagNameAndClasses(this.tagName, this.classes);
				return v(tag, this.getNodeAttributes(), this.getChildrenNodes());
			},

			get children(this: Widget<WidgetProperties>) {
				return widgetInternalStateMap.get(this).children;
			},

			setChildren(this: Widget<WidgetProperties>, children: DNode[]): void {
				const internalState = widgetInternalStateMap.get(this);
				internalState.children = children;
				this.emit({
					type: 'widget:children',
					target: this
				});
			},

			getChildrenNodes(this: Widget<WidgetProperties>): DNode[] {
				return this.children;
			},

			getNodeAttributes(this: Widget<WidgetProperties>, overrides?: VNodeProperties): VNodeProperties {
				const props: VNodeProperties = {};

				this.nodeAttributes.forEach((fn) => {
					const newProps: VNodeProperties = fn.call(this);
					if (newProps) {
						assign(props, newProps);
					}
				});

				return props;
			},

			invalidate(this: Widget<WidgetProperties>): void {
				const internalState = widgetInternalStateMap.get(this);
				internalState.dirty = true;
				this.emit({
					type: 'invalidated',
					target: this
				});
			},

			get id(this: Widget<WidgetProperties>): string | undefined {
				return this.properties.id;
			},

			setProperties(this: Widget<WidgetProperties>, properties: WidgetProperties) {
				const internalState = widgetInternalStateMap.get(this);

				const diffPropertyResults: { [index: string]: PropertyChangeRecord } = {};
				const diffPropertyChangedKeys: string[] = [];

				internalState.diffPropertyFunctionMap.forEach((property: string, diffFunctionName: string) => {
					const previousProperty = internalState.previousProperties[property];
					const newProperty = properties[property];
					const result: PropertyChangeRecord = this[diffFunctionName](previousProperty, newProperty);

					if (!result) {
						return;
					}

					if (result.changed) {
						diffPropertyChangedKeys.push(property);
					}
					delete properties[property];
					delete internalState.previousProperties[property];
					diffPropertyResults[property] = result.value;
				});

				const diffPropertiesResult = this.diffProperties(internalState.previousProperties, properties);
				internalState.properties = assign(diffPropertiesResult.properties, diffPropertyResults);

				const changedPropertyKeys = [...diffPropertiesResult.changedKeys, ...diffPropertyChangedKeys];

				if (changedPropertyKeys.length) {
					this.emit({
						type: 'properties:changed',
						target: this,
						properties: this.properties,
						changedPropertyKeys
					});
				}
				internalState.previousProperties = this.properties;
			},

			diffProperties(this: Widget<WidgetProperties>, previousProperties: WidgetProperties, newProperties: WidgetProperties): PropertiesChangeRecord<WidgetProperties> {
				const changedKeys = Object.keys(newProperties).reduce((changedPropertyKeys: string[], propertyKey: string): string[] => {
					if (previousProperties[propertyKey] !== newProperties[propertyKey]) {
						changedPropertyKeys.push(propertyKey);
					}
					return changedPropertyKeys;
				}, []);

				return { changedKeys, properties: assign({}, newProperties) };
			},

			onPropertiesChanged: function(this: Widget<WidgetProperties>, properties: WidgetProperties, changedPropertyKeys: string[]): void {
				const state = changedPropertyKeys.reduce((state: any, key) => {
					const property = (<any> properties)[key];
					if (!(typeof property === 'function')) {
						state[key] = property;
					}
					return state;
				}, {});
				this.setState(state);
			},

			nodeAttributes: [
				function (this: Widget<WidgetProperties>): VNodeProperties {
					const baseIdProp = this.state && this.state.id ? { 'data-widget-id': this.state.id } : {};
					const { styles = {} } = this.state || {};
					const classes: { [index: string]: boolean; } = {};

					const internalState = widgetInternalStateMap.get(this);

					internalState.widgetClasses.forEach((c) => classes[c] = false);

					if (this.state && this.state.classes) {
						this.state.classes.forEach((c) => classes[c] = true);
						internalState.widgetClasses =  this.state.classes;
					}

					return assign(baseIdProp, { key: this, classes, styles });
				}
			],

			__render__(this: Widget<WidgetProperties>): VNode | string | null {
				const internalState = widgetInternalStateMap.get(this);
				if (internalState.dirty || !internalState.cachedVNode) {
					const widget = dNodeToVNode(this, this.getNode());
					manageDetachedChildren(this);
					if (widget) {
						internalState.cachedVNode = widget;
					}
					internalState.dirty = false;
					return widget;
				}
				return internalState.cachedVNode;
			},

			registry: undefined,

			tagName: 'div'
		},
		initialize(instance: Widget<WidgetProperties>, options: WidgetOptions<WidgetState, WidgetProperties> = {}) {
			const { tagName, properties = {} } = options;
			const diffPropertyFunctionMap = new Map<string, string>();

			instance.tagName = tagName || instance.tagName;

			Object.keys(Object.getPrototypeOf(instance)).forEach((attribute) => {
				const match = attribute.match(propertyFunctionNameRegex);
				if (match) {
					diffPropertyFunctionMap.set(match[0], `${match[1].slice(0, 1).toLowerCase()}${match[1].slice(1)}`);
				}
			});

			widgetInternalStateMap.set(instance, {
				dirty: true,
				widgetClasses: [],
				properties: {},
				previousProperties: {},
				initializedFactoryMap: new Map<string, Promise<WidgetBaseFactory>>(),
				historicChildrenMap: new Map<string | Promise<WidgetBaseFactory> | WidgetBaseFactory, Widget<WidgetProperties>>(),
				currentChildrenMap: new Map<string | Promise<WidgetBaseFactory> | WidgetBaseFactory, Widget<WidgetProperties>>(),
				diffPropertyFunctionMap,
				children: []
			});

			instance.own(instance.on('properties:changed', (evt: PropertiesChangeEvent<Widget<WidgetProperties>, WidgetProperties>) => {
				instance.onPropertiesChanged(evt.properties, evt.changedPropertyKeys);
			}));

			instance.own(instance.on('state:changed', () => {
				instance.invalidate();
			}));

			instance.setProperties(properties);
		}
	});

export default createWidget;
