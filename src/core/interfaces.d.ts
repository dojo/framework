/* tslint:disable:interface-name */
import { Bundle, Messages } from '../i18n/i18n';
import { Destroyable } from '../core/Destroyable';
import { Evented, EventType, EventObject } from '../core/Evented';
import Map from '../shim/Map';
import WeakMap from '../shim/WeakMap';
import { RegistryHandler } from './RegistryHandler';

/**
 * Generic constructor type
 */
export type Constructor<T> = new (...args: any[]) => T;

/**
 * Typed target event
 */
export interface TypedTargetEvent<T extends EventTarget, Y extends EventType = EventType> extends EventObject<Y> {
	target: T;
}

/*
 These are the event handlers.
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

/**
 * Cannot extend the global due to TS error: `All declarations of 'target' must have identical modifiers.`
 */
export interface DojoEvent<T extends EventTarget = EventTarget> extends Event {
	target: T;
}

declare global {
	interface MouseEvent<T extends EventTarget = EventTarget> {
		target: T;
	}
	interface PointerEvent<T extends EventTarget = EventTarget> {
		target: T;
	}
	interface TouchEvent<T extends EventTarget = EventTarget> {
		target: T;
	}
	interface KeyboardEvent<T extends EventTarget = EventTarget> {
		target: T;
	}
	interface FocusEvent<T extends EventTarget = EventTarget> {
		target: T;
	}
	interface UIEvent<T extends EventTarget = EventTarget> {
		target: T;
	}
	interface WheelEvent<T extends EventTarget = EventTarget> {
		target: T;
	}
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

export interface TransitionStrategy {
	enter(element: Element, enterAnimation: string, enterAnimationActive?: SupportedClassName): void;
	exit(element: Element, exitAnimation: string, exitAnimationActive?: SupportedClassName): void;
}

export interface ProjectorOptions {
	readonly transitions?: TransitionStrategy;
	styleApplyer?(domNode: HTMLElement, styleName: string, value: string): void;
}

export interface ProjectionOptions extends ProjectorOptions {
	namespace?: string;
	merge: boolean;
	sync: boolean;
	mergeElement?: Element;
	rootNode: Element;
	depth: number;
	projectorInstance: DefaultWidgetBaseInterface;
}

export interface Projection {
	readonly domNode: Element;
}

export type SupportedClassName = string | null | undefined | boolean;

export type ClassNames = {
	[key: string]: string;
};

export interface Theme {
	[key: string]: object;
}

export interface Classes {
	[widgetKey: string]: {
		[classKey: string]: SupportedClassName[];
	};
}

export type DeferredVirtualProperties = (inserted: boolean) => VNodeProperties;

export type NodeOperationPredicate = () => boolean;

export type DiffType = 'none' | 'dom' | 'vdom';

export interface On {
	[index: string]: <T extends Event>(event?: T) => void | undefined;
}

export interface DomOptions {
	node: Element | Text;
	props?: VNodeProperties;
	attrs?: { [index: string]: string | undefined };
	on?: On;
	diffType?: DiffType;
	onAttach?: () => void;
}

export interface VDomOptions {
	props?: VNodeProperties;
	attrs?: { [index: string]: string | undefined };
	on?: On;
}

export interface VNodeProperties<T extends EventTarget = EventTarget> {
	enterAnimation?: SupportedClassName;

	exitAnimation?: SupportedClassName;

	enterAnimationActive?: SupportedClassName;

	exitAnimationActive?: SupportedClassName;

	/**
	 * Used to uniquely identify a DOM node among siblings.
	 * A key is required when there are more children with the same selector and these children are added or removed dynamically.
	 * NOTE: this does not have to be a string or number, a [[Component]] Object for instance is also possible.
	 */
	readonly key?: string | number;
	/**
	 * An array of supported class names to be added to classList on a DOM node
	 */
	readonly classes?: SupportedClassName | SupportedClassName[];
	/**
	 * An object literal like `{height:'100px'}` which allows styles to be changed dynamically. All values must be strings.
	 */
	readonly styles?: Partial<CSSStyleDeclaration>;

	// Pointer Events
	onpointermove?(ev: PointerEvent<T>): boolean | void;
	onpointerdown?(ev: PointerEvent<T>): boolean | void;
	onpointerup?(ev: PointerEvent<T>): boolean | void;
	onpointerover?(ev: PointerEvent<T>): boolean | void;
	onpointerout?(ev: PointerEvent<T>): boolean | void;
	onpointerenter?(ev: PointerEvent<T>): boolean | void;
	onpointerleave?(ev: PointerEvent<T>): boolean | void;
	onpointercancel?(ev: PointerEvent<T>): boolean | void;
	// For Pointer Event Polyfill see: https://github.com/jquery/PEP
	readonly 'touch-action'?: string;
	// From Element
	ontouchcancel?(ev: TouchEvent<T>): boolean | void;
	ontouchend?(ev: TouchEvent<T>): boolean | void;
	ontouchmove?(ev: TouchEvent<T>): boolean | void;
	ontouchstart?(ev: TouchEvent<T>): boolean | void;
	// From HTMLFormElement
	readonly action?: string;
	readonly encoding?: string;
	readonly enctype?: string;
	readonly method?: string;
	readonly name?: string;
	readonly target?: string;
	// From HTMLElement
	onblur?(ev: FocusEvent<T>): boolean | void;
	onchange?(ev: DojoEvent<T>): boolean | void;
	onclick?(ev: MouseEvent<T>): boolean | void;
	ondblclick?(ev: MouseEvent<T>): boolean | void;
	onfocus?(ev: FocusEvent<T>): boolean | void;
	oninput?(ev: DojoEvent<T>): boolean | void;
	onkeydown?(ev: KeyboardEvent<T>): boolean | void;
	onkeypress?(ev: KeyboardEvent<T>): boolean | void;
	onkeyup?(ev: KeyboardEvent<T>): boolean | void;
	onload?(ev: DojoEvent<T>): boolean | void;
	onmousedown?(ev: MouseEvent<T>): boolean | void;
	onmouseenter?(ev: MouseEvent<T>): boolean | void;
	onmouseleave?(ev: MouseEvent<T>): boolean | void;
	onmousemove?(ev: MouseEvent<T>): boolean | void;
	onmouseout?(ev: MouseEvent<T>): boolean | void;
	onmouseover?(ev: MouseEvent<T>): boolean | void;
	onmouseup?(ev: MouseEvent<T>): boolean | void;
	onmousewheel?(ev: WheelEvent<T>): boolean | void;
	onscroll?(ev: UIEvent<T>): boolean | void;
	onsubmit?(ev: DojoEvent<T>): boolean | void;
	readonly spellcheck?: boolean;
	readonly tabIndex?: number;
	readonly disabled?: boolean;
	readonly title?: string;
	readonly accessKey?: string;
	readonly id?: string;
	// From HTMLInputElement
	readonly type?: string;
	readonly autocomplete?: string;
	readonly checked?: boolean;
	readonly placeholder?: string;
	readonly readOnly?: boolean;
	readonly src?: string;
	readonly value?: string;
	// From HTMLImageElement
	readonly alt?: string;
	readonly srcset?: string;
	/**
	 * Puts a non-interactive string of html inside the DOM node.
	 *
	 * Note: if you use innerHTML, cannot protect you from XSS vulnerabilities and you must make sure that the innerHTML value is safe.
	 */
	readonly innerHTML?: string;

	/**
	 * determines if the node should be focused
	 */
	readonly focus?: boolean | NodeOperationPredicate;

	/**
	 * determines is the element needs to be clicked
	 */
	readonly click?: boolean | NodeOperationPredicate;

	/**
	 * determines if the node should be scrolled to
	 */
	readonly scrollIntoView?: boolean | NodeOperationPredicate;

	/**
	 * determines if the node should be blurred
	 */
	readonly blur?: boolean | NodeOperationPredicate;

	/**
	 * Everything that is not explicitly listed (properties and attributes that are either uncommon or custom).
	 */
	readonly [index: string]: any;
}

/**
 * Type of the `WidgetRegistry` label
 */
export type RegistryLabel = string | symbol;

export type InjectorPayload = () => any;

/**
 * Factory that returns an injector function
 */
export type InjectorFactory = (invalidator: () => void) => InjectorPayload;

/**
 * The injector item created for a registered Injector factory
 */
export interface InjectorItem<T = any> {
	injector: () => T;
	invalidator: Evented;
}

/**
 * Base widget properties
 */
export interface WidgetProperties {
	/**
	 * The key for a widget. Used to differentiate uniquely identify child widgets for
	 * rendering and instance management
	 */
	key?: string | number;
}

/**
 * Widget properties that require a key
 */
export interface KeyedWidgetProperties extends WidgetProperties {
	/**
	 * The key for a widget. Used to differentiate uniquely identify child widgets for
	 * rendering and instance management
	 */
	key: string | number;
}

/**
 * Wrapper for v
 */
export interface VNode {
	/**
	 * Specified children
	 */
	children?: DNode[];

	/**
	 * VNode properties
	 */
	properties: VNodeProperties;

	/**
	 * VNode attributes
	 */
	attributes?: { [index: string]: string | undefined };

	/**
	 * VNode events
	 */
	events?: On;

	/**
	 * Deferred callback for VNode properties
	 */
	deferredPropertiesCallback?: DeferredVirtualProperties;

	/**
	 * The tag of the VNode
	 */
	tag: string;

	/**
	 * The type of node
	 */
	type: string;

	/**
	 * Text node string
	 */
	text?: string;

	/**
	 * Indicates the type of diff for the VNode
	 */
	diffType?: DiffType;
}

export interface DomVNode extends VNode {
	domNode: Text | Element;
	onAttach?: () => void;
}

export interface ESMDefaultWidgetBase<T extends WidgetBaseTypes> {
	default: Constructor<T> | WNodeFactory<T>;
	__esModule?: boolean;
}

export type WidgetBaseConstructorFunction<W extends WidgetBaseTypes = DefaultWidgetBaseInterface> = () => Promise<
	Constructor<W> | WNodeFactory<W>
>;

export type ESMDefaultWidgetBaseFunction<W extends WidgetBaseTypes = DefaultWidgetBaseInterface> = () => Promise<
	ESMDefaultWidgetBase<W>
>;

export type LazyWidget<W extends WidgetBaseTypes = DefaultWidgetBaseInterface> =
	| WidgetBaseConstructorFunction<W>
	| ESMDefaultWidgetBaseFunction<W>;

export type LazyDefine<W extends WidgetBaseTypes = DefaultWidgetBaseInterface> = {
	label: string;
	registryItem: LazyWidget<W>;
};

export interface MiddlewareMap<
	Middleware extends () => { api: {}; properties: {} } = () => { api: {}; properties: {} }
> {
	[index: string]: Middleware;
}

export type MiddlewareApiMap<U extends MiddlewareMap<any>> = { [P in keyof U]: ReturnType<U[P]>['api'] };

export type MiddlewareApi<T extends MiddlewareResultFactory<any, any, any, any>> = ReturnType<ReturnType<T>['api']>;

export type WrappedProperties<T> = {
	[P in keyof T]: T[P] extends ((...args: any[]) => any) | Constructor<any> | undefined
		? T[P] & { unwrap: () => T[P] }
		: T[P]
};

export interface Callback<Props, Children, Middleware, ReturnValue> {
	(
		options: {
			id: string;
			middleware: MiddlewareApiMap<Middleware>;
			properties: () => WrappedProperties<Readonly<Props>>;
			children: () => Children extends any[] ? Children : [Children];
		}
	): ReturnValue;
	middlewares?: any;
}

export interface MiddlewareResult<Props, Children, Middleware, ReturnValue> {
	api: ReturnValue;
	properties: Props;
	callback: Callback<Props, Children, Middleware, ReturnValue>;
	middlewares: Middleware;
}

export interface DefaultMiddlewareResult extends MiddlewareResult<any, any, any, any> {}

export interface MiddlewareResultFactory<Props, Children, Middleware, ReturnValue> {
	(): MiddlewareResult<Props, Children, Middleware, ReturnValue>;
}

export interface DefaultChildrenWNodeFactory<W extends WNodeFactoryTypes> {
	(properties: W['properties'], children?: W['children'] extends any[] ? W['children'] : [W['children']]): WNode<W>;
	new (): {
		__properties__: W['properties'] & { __children__?: DNode | DNode[] | (DNode | DNode[])[] };
	};
	properties: W['properties'];
	children: W['children'];
	type: 'default';
}

export interface WNodeFactory<W extends WNodeFactoryTypes> {
	(
		properties: W['properties'],
		children: W['children'] extends [any]
			? W['children'][0][]
			: W['children'] extends any[] ? W['children'] : [W['children']]
	): WNode<W>;
	new (): {
		__properties__: W['properties'] & { __children__: W['children'] };
	};
	properties: W['properties'];
	children: W['children'];
	type: 'required';
}

export interface OptionalWNodeFactory<W extends WNodeFactoryTypes> {
	(
		properties: W['properties'],
		children?: W['children'] extends [any]
			? W['children'][0][]
			: W['children'] extends any[] ? W['children'] : [W['children']]
	): WNode<W>;
	new (): {
		__properties__: W['properties'] & { __children__?: W['children'] };
	};
	properties: W['properties'];
	children: W['children'];
	type: 'optional';
}

export interface WNodeFactoryTypes<P = any, C = any> {
	readonly properties: P;
	readonly children: C;
}

export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void)
	? I
	: never;

/**
 * Wrapper for `w`
 */
export interface WNode<W extends WidgetBaseTypes = any> {
	/**
	 * Constructor to create a widget or string constructor label
	 */
	widgetConstructor: Constructor<W> | RegistryLabel | LazyDefine<W> | Callback<any, any, any, RenderResult>;

	/**
	 * Properties to set against a widget instance
	 */
	properties: W['properties'];

	/**
	 * DNode children
	 */
	children: DNode[];

	/**
	 * The type of node
	 */
	type: string;
}

/**
 * union type for all possible return types from render
 */
export type DNode<W extends WidgetBaseTypes = any> = VNode | WNode<W> | undefined | null | string | boolean;

/**
 * Property Change record for specific property diff functions
 */
export interface PropertyChangeRecord {
	changed: boolean;
	value: any;
}

export interface DiffPropertyFunction {
	(previousProperty: any, newProperty: any): PropertyChangeRecord;
}

export interface DiffPropertyReaction {
	(previousProperties: any, newProperties: any): void;
}

/**
 * WidgetBase constructor type
 */
export type WidgetBaseConstructor<P extends WidgetProperties = WidgetProperties, C extends DNode = DNode> = Constructor<
	WidgetBaseInterface<P, C>
>;

export interface DefaultWidgetBaseInterface extends WidgetBaseInterface<WidgetProperties, DNode> {}

export interface WidgetBaseTypes<P = any, C extends DNode = DNode> {
	/**
	 * Widget properties
	 */
	readonly properties: P;

	/**
	 * Returns the widget's children
	 */
	readonly children: (C | null)[];
}

/**
 * The interface for WidgetBase
 */
export interface WidgetBaseInterface<P = WidgetProperties, C extends DNode = DNode> extends WidgetBaseTypes<P, C> {
	/**
	 * Sets the properties for the widget. Responsible for calling the diffing functions for the properties against the
	 * previous properties. Runs though any registered specific property diff functions collecting the results and then
	 * runs the remainder through the catch all diff function. The aggregate of the two sets of the results is then
	 * set as the widget's properties
	 *
	 * @param properties The new widget properties
	 */
	__setProperties__(properties: P & { [index: string]: any }): void;

	/**
	 * Sets the widget's children
	 */
	__setChildren__(children: (C | null)[]): void;

	/**
	 * Main internal function for dealing with widget rendering
	 */
	__render__(): RenderResult;

	/**
	 * property used for typing with tsx
	 */
	__properties__: this['properties'] & { __children__?: DNode | (DNode | DNode[])[] };
}

/**
 * Meta Base type
 */
export interface MetaBase extends Destroyable {}

/**
 * Meta Base type
 */
export interface WidgetMetaBase extends MetaBase {
	has(key: string | number): boolean;
	afterRender(): void;
}

/**
 * Meta Base constructor type
 */
export interface WidgetMetaConstructor<T extends MetaBase> {
	new (properties: WidgetMetaProperties): T;
}

export interface NodeHandlerInterface extends Evented {
	get(key: string | number): Element | undefined;
	has(key: string | number): boolean;
	add(element: Element, key: string): void;
	addRoot(element: Element, key: string): void;
	addProjector(element: Element, properties: VNodeProperties): void;
	clear(): void;
}

/**
 * Properties passed to meta Base constructors
 */
export interface WidgetMetaProperties {
	invalidate: () => void;
	nodeHandler: NodeHandlerInterface;
	bind: WidgetBaseInterface;
}

export type RenderResult = DNode | DNode[];

export interface Render {
	(): DNode | DNode[];
}

/**
 * Interface for beforeRender function
 */
export interface BeforeRender {
	(renderFunc: Render, properties: WidgetProperties, children: DNode[]): Render | undefined;
}

/**
 * Interface for afterRender function
 */
export interface AfterRender {
	(dNode: DNode | DNode[]): DNode | DNode[];
}

/**
 * Interface for beforeProperties function
 */
export interface BeforeProperties<P = any> {
	(properties: P): P;
}

export interface LocaleData {
	/**
	 * The locale for the widget. If not specified, then the root locale (as determined by `@dojo/i18n`) is assumed.
	 * If specified, the widget's node will have a `lang` property set to the locale.
	 */
	locale?: string;

	/**
	 * An optional flag indicating the widget's text direction. If `true`, then the underlying node's `dir`
	 * property is set to "rtl". If it is `false`, then the `dir` property is set to "ltr". Otherwise, the property
	 * is not set.
	 */
	rtl?: boolean;
}

export interface FocusProperties {
	/** Function to determine if the widget should focus */
	focus?: () => boolean;
}

export interface I18nProperties extends LocaleData {
	/**
	 * An optional override for the bundle passed to the `localizeBundle`. If the override contains a `messages` object,
	 * then it will completely replace the underlying bundle. Otherwise, a new bundle will be created with the additional
	 * locale loaders.
	 */
	i18nBundle?: Bundle<Messages> | Map<Bundle<Messages>, Bundle<Messages>>;
}

export type LocalizedMessages<T extends Messages> = {
	/**
	 * Indicates whether the messages are placeholders while waiting for the actual localized messages to load.
	 * This is always `false` if the associated bundle does not list any supported locales.
	 */
	readonly isPlaceholder: boolean;

	/**
	 * Formats an ICU-formatted message template for the represented bundle.
	 *
	 * @param key
	 * The message key.
	 *
	 * @param options
	 * The values to pass to the formatter.
	 *
	 * @return
	 * The formatted string.
	 */
	format(key: keyof T, options?: any): string;

	/**
	 * The localized messages if available, or either the default messages or a blank bundle depending on the
	 * call signature for `localizeBundle`.
	 */
	readonly messages: T;
};

export type Invalidator = () => void;
