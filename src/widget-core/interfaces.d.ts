/**
 * These represent the base classes and capabilties for widgets.
 *
 * Additional features and functionality are added to widgets by compositing mixins onto these
 * bases.
 */
import Promise from '@dojo/shim/Promise';
import { EventedListener, Evented, EventedOptions } from '@dojo/interfaces/bases';
import { EventTargettedObject, EventTypedObject, Handle } from '@dojo/interfaces/core';
import { VNode, VNodeProperties } from '@dojo/interfaces/vdom';
import { ComposeFactory } from '@dojo/compose/compose';

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

export type WidgetFactoryFunction = () => Promise<WidgetBaseFactory>

export type FactoryRegistryItem = WidgetBaseFactory | Promise<WidgetBaseFactory> | WidgetFactoryFunction

/**
 * Factory Registry
 */
export interface FactoryRegistryInterface {

	/**
	 * Define a FactoryRegistryItem against a factory label
	 */
	define(factoryLabel: string, registryItem: FactoryRegistryItem): void;

	/**
	 * Return the registered FactoryRegistryItem for the label.
	 */
	get(factoryLabel: string): WidgetBaseFactory | Promise<WidgetBaseFactory> | null;

	/**
	 * Check if the factory label has already been used to define a FactoryRegistryItem.
	 */
	has(factoryLabel: string): boolean;
}

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

export interface WNode {
	/**
	 * Factory to create a widget
	 */
	factory: WidgetBaseFactory | string;

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

export type DNode = HNode | WNode | string | null;

export interface PropertyChangeRecord {
	changed: boolean;
	value: any;
}

export type Widget<P extends WidgetProperties> = Evented & WidgetMixin<P> & WidgetOverloads<P>

export interface WidgetBaseFactory extends ComposeFactory<Widget<WidgetProperties>, WidgetOptions<WidgetProperties>> { }

export interface WidgetOverloads<P extends WidgetProperties> {
	/**
	 * Attach a listener to the invalidated event, which is emitted when the `.invalidate()` method is called
	 *
	 * @param type The event type to listen for
	 * @param listener The listener to call when the event is emitted
	 */
	on(type: 'invalidated', listener: EventedListener<Widget<P>, EventTargettedObject<Widget<P>>>): Handle;
	/**
	 * Attach a listener to the properties changed event, which is emitted when a difference in properties passed occurs
	 *
	 * @param type The event type to listen for
	 * @param listener The listener to call when the event is emitted
	 */
	on(type: 'properties:changed', listener: EventedListener<Widget<P>, PropertiesChangeEvent<Widget<P>, P>>): Handle;
}

export interface PropertiesChangeRecord<P extends WidgetProperties> {
	changedKeys: string[];
	properties: P;
}

export interface PropertyComparison<P extends WidgetProperties> {
	/**
	 * Determine changed or new property keys on setProperties and assign them on return.
	 */
	diffProperties<S>(this: S, previousProperties: P, newProperties: P): PropertiesChangeRecord<Partial<P>>;
}

export interface WidgetMixin<P extends WidgetProperties> extends PropertyComparison<P> {

	/**
	 * index key
	 */
	readonly [index: string]: any;

	/**
	 * An array of children `DNode`s returned via `getChildrenNodes`
	 */
	readonly children: DNode[];

	/**
	 * Set children
	 */
	setChildren(children: DNode | DNode[]): void;

	/**
	 * Get the top level node and children when rendering the widget.
	 */
	getNode(): DNode;

	/**
	 * Generate the children nodes when rendering the widget.
	 */
	getChildrenNodes(): DNode[];

	/**
	 * Properties passed to affect state
	 */
	readonly properties: Readonly<Partial<P>>;

	/*
	 * set properties on the widget
	 */
	setProperties(this: Widget<WidgetProperties>, properties: P): void;

	/**
	 * The ID of the widget, which gets automatically rendered in the VNode property `data-widget-id` when
	 * rendered.
	 */
	readonly id: string | undefined;

	/**
	 * Signal to the widget that it is in an invalid state and that it should not re-use its cache on the
	 * next render.
	 *
	 * Calls to invalidate, will also cause the widget to invalidate its parent, if assigned.
	 */
	invalidate(): void;

	/**
	 * Public render function that defines the widget structure using DNode and HNodes. Must return
	 * a single top element.
	 */
	render(): DNode;

	/**
	 * Public render function that defines the widget structure using DNode and HNodes. Must return
	 * a single top element.
	 */
	render(): DNode;

	/**
	 * Render the widget, returing the virtual DOM node that represents this widget.
	 *
	 * It is not intended that mixins will override or aspect this method, as the render process is decomposed to
	 * allow easier modification of behaviour of the render process.  The base implementatin intelligently caches
	 * its render and essentially provides the following return for the method:
	 */
	__render__(): VNode | string | null;

	/**
	 * The specific Factory Registry on the widget if passed
	 */
	registry: FactoryRegistryInterface | undefined;
}

export interface WidgetOptions<P extends WidgetProperties> extends EventedOptions {
	/**
	 * Properties used to affect internal widget state
	 */
	properties?: P;
}

export interface WidgetProperties {
	[index: string]: any;
	id?: string;
	key?: string;
	bind?: any;
}

export interface WidgetFactory<W extends WidgetMixin<P>, P extends WidgetProperties> extends ComposeFactory<W, WidgetOptions<P>> {}

export interface TypedTargetEvent<T extends EventTarget> extends Event {
	target: T;
}
