import { VNode, VNodeProperties } from '@dojo/interfaces/vdom';
import { EventTypedObject } from '@dojo/interfaces/core';
import { Evented } from './bases/Evented';

/**
 * Generic constructor type
 */
export type Constructor<T> = new (...args: any[]) => T;

/**
 * Typed target event
 */
export interface TypedTargetEvent<T extends EventTarget> extends Event {
	target: T;
}

/*
 These are the event handlers exposed by Maquette.
 */

export type EventHandlerResult = boolean | void;

export interface EventHandler {
	(event?: Event): EventHandlerResult;
}

export interface FocusEventHandler {
	(event?: FocusEvent): EventHandlerResult;
}

export interface KeyboardEventHandler {
	(event?: KeyboardEvent): EventHandlerResult;
}

export interface MouseEventHandler {
	(event?: MouseEvent): EventHandlerResult;
}

export type BlurEventHandler = FocusEventHandler;
export type ChangeEventHandler = EventHandler;
export type ClickEventHandler = MouseEventHandler;
export type DoubleClickEventHandler = MouseEventHandler;
export type InputEventHandler = EventHandler;
export type KeyDownEventHandler = KeyboardEventHandler;
export type KeyPressEventHandler = KeyboardEventHandler;
export type KeyUpEventHandler = KeyboardEventHandler;
export type LoadEventHandler = EventHandler;
export type MouseDownEventHandler = MouseEventHandler;
export type MouseEnterEventHandler = MouseEventHandler;
export type MouseLeaveEventHandler = MouseEventHandler;
export type MouseMoveEventHandler = MouseEventHandler;
export type MouseOutEventHandler = MouseEventHandler;
export type MouseOverEventHandler = MouseEventHandler;
export type MouseUpEventHandler = MouseEventHandler;
export type MouseWheelEventHandler = (event?: MouseWheelEvent | WheelEvent) => EventHandlerResult;
export type ScrollEventHandler = (event?: UIEvent) => EventHandlerResult;
export type SubmitEventHandler = EventHandler;

/**
 * Base widget properties
 */
export interface WidgetProperties {

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
 * Property Change record for specific property diff functions
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
 *
 */
export type WidgetBaseConstructor<P extends WidgetProperties> = Constructor<WidgetBaseInterface<P>>;

/**
 * WidgetBase constructor type
 */
export type WidgetConstructor = WidgetBaseConstructor<WidgetProperties>;

/**
 * The interface for WidgetBase
 */
export interface WidgetBaseInterface<P extends WidgetProperties> extends Evented {

	/**
	 * Widget properties
	 */
	readonly properties: P;

	/**
	 * Returns the widget's children
	 */
	readonly children: DNode[];

	/**
	 * Sets the properties for the widget. Responsible for calling the diffing functions for the properties against the
	 * previous properties. Runs though any registered specific property diff functions collecting the results and then
	 * runs the remainder through the catch all diff function. The aggregate of the two sets of the results is then
	 * set as the widget's properties
	 *
	 * @param properties The new widget properties
	 */
	setProperties(properties: P & { [index: string]: any }): void;

	/**
	 * Sets the widget's children
	 */
	setChildren(children: DNode[]): void;

	/**
	 * The default diff function for properties, also responsible for cloning the properties.
	 *
	 * @param previousProperties The widget's previous properties
	 * @param newProperties The widget's new properties
	 * @returns A properties change record for the the diff
	 */
	diffProperties(previousProperties: P & { [index: string]: any }, newProperties: P & { [index: string]: any }): PropertiesChangeRecord<P>;

	/**
	 * Default render, returns a `div` with widget's children
	 *
	 * @returns the DNode for the widget
	 */
	render(): DNode;

	/**
	 * Main internal function for dealing with widget rendering
	 */
	__render__(): VNode | string | null;

	/**
	 * invalidate the widget
	 */
	invalidate(): void;
}
