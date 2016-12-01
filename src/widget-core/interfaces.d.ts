/**
 * These represent the base classes for widgets, which have base implementations.
 *
 * These bases though will likely have signficant cross cutting concerns and therefore are located here.
 *
 * Additional features and functionality are added to widgets by compositing mixins onto these
 * bases.
 *
 * The main interfaces that are defined in this module are:
 *   - Widget
 *   - ContainerWidget
 */

import Promise from 'dojo-shim/Promise';
import Map from 'dojo-shim/Map';
import { Renderable, RenderableParent } from 'dojo-interfaces/abilities';
import { EventedListener, State, Stateful, StatefulOptions } from 'dojo-interfaces/bases';
import { EventTargettedObject, Factory, Handle, StylesMap } from 'dojo-interfaces/core';
import { VNode, VNodeProperties } from 'dojo-interfaces/vdom';

/**
 * A function that is called to return top level node
 */
export interface NodeFunction {
	(this: Widget<WidgetState>): DNode;
}

/**
 * A function that is called when collecting the children nodes on render.
 */
export interface ChildNodeFunction {
	(this: Widget<WidgetState>): DNode[] | VNode[];
}

/**
 * A function that is called when collecting the node attributes on render, accepting the current map of
 * attributes and returning a set of VNode properties that should mixed into the current attributes.
 *
 * TODO: Should this act more like an actualy reducer, where the previousValue is passed in and is mutated directly,
 *       along with the instance reference?  Something like (previousAttributes: VNodeProperties, instance: WidgetMixin): VNodeProperties
 */
export interface NodeAttributeFunction {
	/**
	 * A function which can return additional VNodeProperties which are
	 *
	 * @param attributes The current VNodeProperties that will be part of the render
	 */
	(this: Widget<WidgetState>, attributes: VNodeProperties): VNodeProperties;
}

export interface ChildrenChangeEvent<T> {
	/**
	 * The subject of the event
	 */
	target: T;

	/**
	 * The type of the event
	 */
	type: 'children:changed';
}

export interface ContainerWidgetMixin<C extends Renderable> {
	/**
	 * A map of children *owned* by the widget
	 */
	readonly children: Map<string, C>;

	/**
	 * Remove all the children from the widget, but do not destroy them
	 */
	clear(): void;

	/**
	 * Create a list or map of children and add them to the children owned by this widget
	 *
	 * @param children A tuple list of children made up of the factory and the options to pass to the factory or a map of
	 *                 children to be created
	 */
	createChildren<O extends WidgetOptions<WidgetState>>(children: CreateWidgetList<C, O> | CreateWidgetMap<C, O>): Promise<CreateWidgetResults<C>>;

	/**
	 * Set a child to the end of the children associated with this widget, using the `child.id` as the label for the
	 * child
	 *
	 * @param child The child to set
	 */
	set(child: C | C[] | { [label: string]: C }): Handle;

	/**
	 * Set a child to the end of the children associated with this widget, using the supplied string as the label for
	 * the child.
	 *
	 * @param label The label for the child
	 * @param child The child to set
	 */
	set(label: string, child: C): Handle;

	/**
	 * Called (if present) when children are rendered to ensure that the children are rendered in the correct order.
	 *
	 * If the function returns `-1` then `childA` comes before `childB`, if `0` is returned the order remains unchanged, and
	 * if `1` is returned `childB` comes before `childA`.
	 *
	 * @param childA The first child to compare
	 * @param childB The second child to compare
	 */
	sort?(childA: C, childB: C): 0 | 1 | -1;
}

export interface ContainerWidgetOverloads<C extends Renderable> {
	/**
	 * Add a listener to the `children:changed` event which is fired when there is a change in the children of the widget
	 *
	 * @param type The event type to listen for
	 * @param listener The event listener which will be called when the event is emitted
	 */
	on(type: 'children:changed', listener: EventedListener<
		ContainerWidget<C, ContainerWidgetState>,
		ChildrenChangeEvent<ContainerWidget<C, ContainerWidgetState>>
	>): Handle;
}

/**
 * The *final* type for ContainerWidget
 */
export type ContainerWidget<C extends Renderable, S extends ContainerWidgetState> = Widget<S> & ContainerWidgetMixin<C> & ContainerWidgetOverloads<C>;

export interface ContainerWidgetOptions<C extends Renderable, S extends ContainerWidgetState> extends WidgetOptions<S> {
	/**
	 * A list of children to be created and added to the container at creation time
	 */
	createChildren?: CreateWidgetList<C, WidgetOptions<WidgetState>> | CreateWidgetMap<C, WidgetOptions<WidgetState>>;

	/**
	 * Provide a sort function for this instance which will sort the children renders at render time
	 */
	sort?(childA: C, childB: C): 0 | 1 | -1;
}

export interface ContainerWidgetState extends WidgetState {
	/**
	 * The IDs of the children which are currently owned by the containing widget
	 */
	children: string[];
}

/**
 * A set of widget factories and options used to create new widgets
 */
export type CreateWidgetList<W extends Renderable, O extends WidgetOptions<WidgetState>> = ([Factory<W, O>, O ] | [Factory<W, O>])[];

/**
 * A map of widget factories and options, where the key of the map is used as the label for the created child
 */
export interface CreateWidgetMap<W extends Renderable, O extends WidgetOptions<WidgetState>> {
	[label: string]: {
		factory: Factory<W, O>;
		options?: O;
	};
}

export interface CreateWidgetOptions<C extends Renderable, O extends WidgetOptions<WidgetState>> {
	/**
	 * The factory to use in creating the child
	 */
	factory: Factory<C, O>;

	/**
	 * The label to assign the child to, if omitted, the child's `.id` property will be used
	 */
	label?: string;

	/**
	 * Any options to pass to the factory when creating the child
	 */
	options?: O;
}

/**
 * Interface that provides a map of widgets, used when returning from a creation API
 */
export interface CreateWidgetResults<W extends Renderable> {
	[label: string]: W;
}

export interface SubWidgetManager<W extends Renderable> {
	/**
	 * Create an instance of a widget based on the a passed factory and add it to the widgets directly managed
	 * by the composite widget
	 *
	 * @param label The label which the widget should be referenced by
	 * @param factory The factory which will return an instance when called
	 * @param options Any options to pass to the factory upon construction
	 */
	create<V extends W,  O extends WidgetOptions<WidgetState>>(options: CreateWidgetOptions<V, O>): Promise<[string, V]>;

	/**
	 * Create instances of widgets based on the passed map of widget factories which are passed
	 *
	 * @param widgetFactories A map where the key is the label and the value is an object which provides the factory and
	 *                        any options that should be passed to the constructor
	 */
	create<O extends WidgetOptions<WidgetState>>(widgetFactories: CreateWidgetMap<W, O>): Promise<CreateWidgetResults<W>>;

	/**
	 * Retrieve an instance of a widget which is part of the composite widget
	 */
	get<V extends W>(label: string): V | undefined;

	/**
	 * Returns `true` if the label is currently registered with the composite widget, otherwise returns `false`
	 */
	has(label: string): boolean;

	/**
	 * Adds a sub widget to the widgets directly managed by the composite widget
	 *
	 * @param label The label which the widget should be referenced by
	 * @param widget The instance of the widget to add
	 */
	set(label: string, widget: W): Handle;

	/**
	 * Returns the number of widgets that are being directly managed by the composite widget
	 */
	readonly size: number;
}

export interface HNode {
	/**
	 * Specified children
	 */
	children: (VNode | DNode | null)[];

	/**
	 * render function that wraps returns VNode
	 */
	render(): VNode;
}

export interface WNode {
	/**
	 * Factory to create a widget
	 */
	factory: Factory<Widget<WidgetState>, WidgetOptions<WidgetState>>;

	/**
	 * Options used to create factory a widget
	 */
	options: WidgetOptions<WidgetState>;

	/**
	 * DNode children
	 */
	children: DNode[];
}

export type DNode = HNode | WNode | string;

export type Widget<S extends WidgetState> = Stateful<S> & WidgetMixin & WidgetOverloads;

export interface WidgetOverloads {
	/**
	 * Attach a listener to the invalidated event, which is emitted when the `.invalidate()` method is called
	 *
	 * @param type The event type to listen for
	 * @param listener The listener to call when the event is emitted
	 */
	on(type: 'invalidated', listener: EventedListener<Widget<WidgetState>, EventTargettedObject<Widget<WidgetState>>>): Handle;
}

export interface WidgetMixin {
	/**
	 * Classes which are applied upon render.
	 *
	 * This property is intended for "static" classes.  Classes which are aligned to the instance should be
	 * stored in the instances state object.
	 */
	readonly classes: string[];

	/**
	 * An array of children `DNode`s returned via `getChildrenNodes`
	 */
	children: DNode[];

	/**
	 * Get the top level node and children when rendering the widget.
	 */
	getNode: NodeFunction;

	/**
	 * Generate the children nodes when rendering the widget.
	 */
	getChildrenNodes: ChildNodeFunction;

	/**
	 * Generate the node attributes when rendering the widget.
	 *
	 * Mixins should not override or aspect this method, but instead provide a function as part of the
	 * `nodeAttributes` property, which will automatically get called by this method upon render.
	 */
	getNodeAttributes(): VNodeProperties;

	/**
	 * The ID of the widget, which gets automatically rendered in the VNode property `data-widget-id` when
	 * rendered.
	 */
	readonly id: string;

	/**
	 * Signal to the widget that it is in an invalid state and that it should not re-use its cache on the
	 * next render.
	 *
	 * Calls to invalidate, will also cause the widget to invalidate its parent, if assigned.
	 */
	invalidate(): void;

	/**
	 * An array of functions that return a map of VNodeProperties which should be mixed into the final
	 * properties used when rendering this widget.  These are intended to be "static" and bund to the class,
	 * making it easy for mixins to alter the behaviour of the render process without needing to override or aspect
	 * the `getNodeAttributes` method.
	 */
	nodeAttributes: NodeAttributeFunction[];

	/**
	 * Render the widget, returing the virtual DOM node that represents this widget.
	 *
	 * It is not intended that mixins will override or aspect this method, as the render process is decomposed to
	 * allow easier modification of behaviour of the render process.  The base implementatin intelligently caches
	 * its render and essentially provides the following return for the method:
	 *
	 * ```typescript
	 * return h(this.tagName, this.getNodeAttributes(), this.getChildrenNodes());
	 * ```
	 */
	render(): VNode | string;

	/**
	 * The tagName (selector) that should be used when rendering the node.
	 *
	 * If there is logic that is required to determine this value on render, a mixin should consider overriding
	 * this property with a getter.
	 */
	tagName: string;
}

export interface WidgetOptions<S extends WidgetState> extends StatefulOptions<S> {
	/**
	 * Any child node render functions that should be added to this instance
	 */
	getChildrenNodes?: ChildNodeFunction;

	/**
	 * Any classes that should be added to this instances
	 */
	classes?: string[];

	/**
	 * Any node attribute functions that should be added to this instance
	 */
	nodeAttributes?: NodeAttributeFunction | NodeAttributeFunction[];

	/**
	 * A parent to assign to this widget at creation time
	 */
	parent?: RenderableParent;

	/**
	 * Override the tag name for this widget instance
	 */
	tagName?: string;
}

export interface WidgetState extends State {
	/**
	 * Any classes that should be mixed into the widget's VNode upon render.
	 *
	 * Any classes expressed in state will be additive to those provided in the widget's `.classes` property
	 */
	classes?: string[];

	/**
	 * The ID of the widget
	 */
	id?: string;

	/**
	 * Any inline styles which should be mixed into the widget's VNode upon render.
	 */
	styles?: StylesMap;
}
