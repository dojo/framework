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
	[key: string]: {
		[key: string]: string;
	};
}

export interface Variant {
	root: string;
}

export interface NamedVariant {
	name: string;
	value: Variant;
}

export interface ThemeWithVariant {
	theme: ThemeWithVariants;
	variant: NamedVariant;
}

export interface ThemeWithVariants {
	theme: Theme;
	variants: {
		default: Variant;
		[key: string]: Variant;
	};
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
	onUpdate?: () => void;
	onDetach?: () => void;
}

export interface VDomOptions {
	props?: VNodeProperties;
	attrs?: { [index: string]: string | undefined };
	on?: On;
}

export interface AriaAttributes {
	/** Identifies the currently active element when DOM focus is on a composite widget, textbox, group, or application. */
	'aria-activedescendant'?: string;
	/** Indicates whether assistive technologies will present all, or only parts of, the changed region based on the change notifications defined by the aria-relevant attribute. */
	'aria-atomic'?: 'false' | 'true';
	/**
	 * Indicates whether inputting text could trigger display of one or more predictions of the user's intended value for an input and specifies how predictions would be
	 * presented if they are made.
	 */
	'aria-autocomplete'?: 'none' | 'inline' | 'list' | 'both';
	/** Indicates an element is being modified and that assistive technologies MAY want to wait until the modifications are complete before exposing them to the user. */
	'aria-busy'?: 'false' | 'true';
	/**
	 * Indicates the current "checked" state of checkboxes, radio buttons, and other widgets.
	 * @see aria-pressed @see aria-selected.
	 */
	'aria-checked'?: 'false' | 'mixed' | 'true';
	/**
	 * Defines the total number of columns in a table, grid, or treegrid.
	 * @see aria-colindex.
	 */
	'aria-colcount'?: string;
	/**
	 * Defines an element's column index or position with respect to the total number of columns within a table, grid, or treegrid.
	 * @see aria-colcount @see aria-colspan.
	 */
	'aria-colindex'?: string;
	/**
	 * Defines the number of columns spanned by a cell or gridcell within a table, grid, or treegrid.
	 * @see aria-colindex @see aria-rowspan.
	 */
	'aria-colspan'?: string;
	/**
	 * Identifies the element (or elements) whose contents or presence are controlled by the current element.
	 * @see aria-owns.
	 */
	'aria-controls'?: string;
	/** Indicates the element that represents the current item within a container or set of related elements. */
	'aria-current'?: 'false' | 'true' | 'page' | 'step' | 'location' | 'date' | 'time';
	/**
	 * Identifies the element (or elements) that describes the object.
	 * @see aria-labelledby
	 */
	'aria-describedby'?: string;
	/**
	 * Identifies the element that provides a detailed, extended description for the object.
	 * @see aria-describedby.
	 */
	'aria-details'?: string;
	/**
	 * Indicates that the element is perceivable but disabled, so it is not editable or otherwise operable.
	 * @see aria-hidden @see aria-readonly.
	 */
	'aria-disabled'?: 'false' | 'true';
	/**
	 * Indicates what functions can be performed when a dragged object is released on the drop target.
	 * @deprecated in ARIA 1.1
	 */
	'aria-dropeffect'?: 'none' | 'copy' | 'execute' | 'link' | 'move' | 'popup';
	/**
	 * Identifies the element that provides an error message for the object.
	 * @see aria-invalid @see aria-describedby.
	 */
	'aria-errormessage'?: string;
	/** Indicates whether the element, or another grouping element it controls, is currently expanded or collapsed. */
	'aria-expanded'?: 'false' | 'true';
	/**
	 * Identifies the next element (or elements) in an alternate reading order of content which, at the user's discretion,
	 * allows assistive technology to override the general default of reading in document source order.
	 */
	'aria-flowto'?: string;
	/**
	 * Indicates an element's "grabbed" state in a drag-and-drop operation.
	 * @deprecated in ARIA 1.1
	 */
	'aria-grabbed'?: 'false' | 'true';
	/** Indicates the availability and type of interactive popup element, such as menu or dialog, that can be triggered by an element. */
	'aria-haspopup'?: 'false' | 'true' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
	/**
	 * Indicates whether the element is exposed to an accessibility API.
	 * @see aria-disabled.
	 */
	'aria-hidden'?: 'false' | 'true';
	/**
	 * Indicates the entered value does not conform to the format expected by the application.
	 * @see aria-errormessage.
	 */
	'aria-invalid'?: 'false' | 'true' | 'grammar' | 'spelling';
	/** Indicates keyboard shortcuts that an author has implemented to activate or give focus to an element. */
	'aria-keyshortcuts'?: string;
	/**
	 * Defines a string value that labels the current element.
	 * @see aria-labelledby.
	 */
	'aria-label'?: string;
	/**
	 * Identifies the element (or elements) that labels the current element.
	 * @see aria-describedby.
	 */
	'aria-labelledby'?: string;
	/** Defines the hierarchical level of an element within a structure. */
	'aria-level'?: string;
	/** Indicates that an element will be updated, and describes the types of updates the user agents, assistive technologies, and user can expect from the live region. */
	'aria-live'?: 'off' | 'assertive' | 'polite';
	/** Indicates whether an element is modal when displayed. */
	'aria-modal'?: 'false' | 'true';
	/** Indicates whether a text box accepts multiple lines of input or only a single line. */
	'aria-multiline'?: 'false' | 'true';
	/** Indicates that the user may select more than one item from the current selectable descendants. */
	'aria-multiselectable'?: 'false' | 'true';
	/** Indicates whether the element's orientation is horizontal, vertical, or unknown/ambiguous. */
	'aria-orientation'?: 'horizontal' | 'vertical';
	/**
	 * Identifies an element (or elements) in order to define a visual, functional, or contextual parent/child relationship
	 * between DOM elements where the DOM hierarchy cannot be used to represent the relationship.
	 * @see aria-controls.
	 */
	'aria-owns'?: string;
	/**
	 * Defines a short hint (a word or short phrase) intended to aid the user with data entry when the control has no value.
	 * A hint could be a sample value or a brief description of the expected format.
	 */
	'aria-placeholder'?: string;
	/**
	 * Defines an element's number or position in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM.
	 * @see aria-setsize.
	 */
	'aria-posinset'?: string;
	/**
	 * Indicates the current "pressed" state of toggle buttons.
	 * @see aria-checked @see aria-selected.
	 */
	'aria-pressed'?: 'false' | 'mixed' | 'true';
	/**
	 * Indicates that the element is not editable, but is otherwise operable.
	 * @see aria-disabled.
	 */
	'aria-readonly'?: 'false' | 'true';
	/**
	 * Indicates what notifications the user agent will trigger when the accessibility tree within a live region is modified.
	 * @see aria-atomic.
	 */
	'aria-relevant'?: 'additions' | 'additions text' | 'all' | 'removals' | 'text';
	/** Indicates that user input is required on the element before a form may be submitted. */
	'aria-required'?: 'false' | 'true';
	/** Defines a human-readable, author-localized description for the role of an element. */
	'aria-roledescription'?: string;
	/**
	 * Defines the total number of rows in a table, grid, or treegrid.
	 * @see aria-rowindex.
	 */
	'aria-rowcount'?: string;
	/**
	 * Defines an element's row index or position with respect to the total number of rows within a table, grid, or treegrid.
	 * @see aria-rowcount @see aria-rowspan.
	 */
	'aria-rowindex'?: string;
	/**
	 * Defines the number of rows spanned by a cell or gridcell within a table, grid, or treegrid.
	 * @see aria-rowindex @see aria-colspan.
	 */
	'aria-rowspan'?: string;
	/**
	 * Indicates the current "selected" state of various widgets.
	 * @see aria-checked @see aria-pressed.
	 */
	'aria-selected'?: 'false' | 'true';
	/**
	 * Defines the number of items in the current set of listitems or treeitems. Not required if all elements in the set are present in the DOM.
	 * @see aria-posinset.
	 */
	'aria-setsize'?: string;
	/** Indicates if items in a table or grid are sorted in ascending or descending order. */
	'aria-sort'?: 'none' | 'ascending' | 'descending' | 'other';
	/** Defines the maximum allowed value for a range widget. */
	'aria-valuemax'?: string;
	/** Defines the minimum allowed value for a range widget. */
	'aria-valuemin'?: string;
	/**
	 * Defines the current value for a range widget.
	 * @see aria-valuetext.
	 */
	'aria-valuenow'?: string;
	/** Defines the human readable text alternative of aria-valuenow for a range widget. */
	'aria-valuetext'?: string;
}

export interface VNodePropertiesWithoutIndex<T extends EventTarget = EventTarget> extends AriaAttributes {
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
	 * determines if the element needs to be clicked
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
}

type NonUndefined<A> = A extends undefined ? never : A;

type FunctionKeys<T extends object> = { [K in keyof T]-?: NonUndefined<T[K]> extends Function ? K : never }[keyof T];

export interface VNodeProperties<T extends EventTarget = EventTarget> extends VNodePropertiesWithoutIndex<T> {
	oneventoptions?: { passive: FunctionKeys<VNodePropertiesWithoutIndex>[] };
	/**
	 * Everything that is not explicitly listed (properties and attributes that are either uncommon or custom).
	 */
	readonly [index: string]: any;
}

export interface SVGAttributes extends VNodeProperties<SVGElement> {
	'accent-height'?: string;
	accumulate?: 'none' | 'sum';
	additive?: 'replace' | 'sum';
	'alignment-baseline'?:
		| 'auto'
		| 'baseline'
		| 'before-edge'
		| 'text-before-edge'
		| 'middle'
		| 'central'
		| 'after-edge'
		| 'text-after-edge'
		| 'ideographic'
		| 'alphabetic'
		| 'hanging'
		| 'mathematical'
		| 'inherit';
	allowReorder?: 'no' | 'yes';
	alphabetic?: string;
	amplitude?: string;
	'arabic-form'?: 'initial' | 'medial' | 'terminal' | 'isolated';
	ascent?: string;
	attributeName?: string;
	attributeType?: string;
	autoReverse?: 'true' | 'false';
	azimuth?: string;
	baseFrequency?: string;
	'baseline-shift'?: string;
	baseProfile?: string;
	bbox?: string;
	begin?: string;
	bias?: string;
	by?: string;
	calcMode?: string;
	'cap-height'?: string;
	clip?: string;
	'clip-path'?: string;
	clipPathUnits?: string;
	'clip-rule'?: string;
	'color-interpolation'?: string;
	'color-interpolation-filters'?: 'auto' | 'sRGB' | 'linearRGB' | 'inherit';
	'color-profile'?: string;
	'color-rendering'?: string;
	contentScriptType?: string;
	contentStyleType?: string;
	cursor?: string;
	cx?: string;
	cy?: string;
	d?: string;
	decelerate?: string;
	descent?: string;
	diffuseConstant?: string;
	direction?: string;
	display?: string;
	divisor?: string;
	'dominant-baseline'?: string;
	dur?: string;
	dx?: string;
	dy?: string;
	edgeMode?: string;
	elevation?: string;
	'enable-background'?: string;
	end?: string;
	exponent?: string;
	externalResourcesRequired?: 'true' | 'false';
	fill?: string;
	'fill-opacity'?: string;
	'fill-rule'?: 'nonzero' | 'evenodd' | 'inherit';
	filter?: string;
	filterRes?: string;
	filterUnits?: string;
	'flood-color'?: string;
	'flood-opacity'?: string;
	focusable?: 'true' | 'false' | 'auto';
	'font-family'?: string;
	'font-size'?: string;
	'font-size-adjust'?: string;
	'font-stretch'?: string;
	'font-style'?: string;
	'font-variant'?: string;
	'font-weight'?: string;
	format?: string;
	from?: string;
	fx?: string;
	fy?: string;
	g1?: string;
	g2?: string;
	'glyph-name'?: string;
	'glyph-orientation-horizontal'?: string;
	'glyph-orientation-vertical'?: string;
	glyphRef?: string;
	gradientTransform?: string;
	gradientUnits?: string;
	hanging?: string;
	height?: string;
	'horiz-adv-x'?: string;
	'horiz-origin-x'?: string;
	href?: string;
	ideographic?: string;
	'image-rendering'?: string;
	in2?: string;
	in?: string;
	intercept?: string;
	k1?: string;
	k2?: string;
	k3?: string;
	k4?: string;
	k?: string;
	kernelMatrix?: string;
	kernelUnitLength?: string;
	kerning?: string;
	keyPoints?: string;
	keySplines?: string;
	keyTimes?: string;
	lengthAdjust?: string;
	'letter-spacing'?: string;
	'lighting-color'?: string;
	limitingConeAngle?: string;
	local?: string;
	'marker-end'?: string;
	markerHeight?: string;
	'marker-mid'?: string;
	'marker-start'?: string;
	markerUnits?: string;
	markerWidth?: string;
	mask?: string;
	maskContentUnits?: string;
	maskUnits?: string;
	mathematical?: string;
	mode?: string;
	numOctaves?: string;
	offset?: string;
	opacity?: string;
	operator?: string;
	order?: string;
	orient?: string;
	orientation?: string;
	origin?: string;
	overflow?: string;
	'overline-position'?: string;
	'overline-thickness'?: string;
	'paint-order'?: string;
	'panose-1'?: string;
	path?: string;
	pathLength?: string;
	patternContentUnits?: string;
	patternTransform?: string;
	patternUnits?: string;
	'pointer-events'?: string;
	points?: string;
	pointsAtX?: string;
	pointsAtY?: string;
	pointsAtZ?: string;
	preserveAlpha?: 'true' | 'false';
	preserveAspectRatio?: string;
	primitiveUnits?: string;
	r?: string;
	radius?: string;
	refX?: string;
	refY?: string;
	'rendering-intent'?: string;
	repeatCount?: string;
	repeatDur?: string;
	requiredExtensions?: string;
	requiredFeatures?: string;
	restart?: string;
	result?: string;
	rotate?: string;
	rx?: string;
	ry?: string;
	scale?: string;
	seed?: string;
	'shape-rendering'?: string;
	slope?: string;
	spacing?: string;
	specularConstant?: string;
	specularExponent?: string;
	speed?: string;
	spreadMethod?: string;
	startOffset?: string;
	stdDeviation?: string;
	stemh?: string;
	stemv?: string;
	stitchTiles?: string;
	'stop-color'?: string;
	'stop-opacity'?: string;
	'strikethrough-position'?: string;
	'strikethrough-thickness'?: string;
	string?: string;
	stroke?: string;
	'stroke-dasharray'?: string;
	'stroke-dashoffset'?: string;
	'stroke-linecap'?: 'butt' | 'round' | 'square' | 'inherit';
	'stroke-linejoin'?: 'miter' | 'round' | 'bevel' | 'inherit';
	'stroke-miterlimit'?: string;
	'stroke-opacity'?: string;
	'stroke-width'?: string;
	surfaceScale?: string;
	systemLanguage?: string;
	tableValues?: string;
	targetX?: string;
	targetY?: string;
	'text-anchor'?: string;
	'text-decoration'?: string;
	textLength?: string;
	'text-rendering'?: string;
	to?: string;
	transform?: string;
	u1?: string;
	u2?: string;
	'underline-position'?: string;
	'underline-thickness'?: string;
	unicode?: string;
	'unicode-bidi'?: string;
	'unicode-range'?: string;
	'units-per-em'?: string;
	'v-alphabetic'?: string;
	values?: string;
	'vector-effect'?: string;
	version?: string;
	'vert-adv-y'?: string;
	'vert-origin-x'?: string;
	'vert-origin-y'?: string;
	'v-hanging'?: string;
	'v-ideographic'?: string;
	viewBox?: string;
	viewTarget?: string;
	visibility?: string;
	'v-mathematical'?: string;
	width?: string;
	widths?: string;
	'word-spacing'?: string;
	'writing-mode'?: string;
	x1?: string;
	x2?: string;
	x?: string;
	xChannelSelector?: string;
	'x-height'?: string;
	'xlink:actuate'?: string;
	'xlink:arcrole'?: string;
	'xlink:href'?: string;
	'xlink:role'?: string;
	'xlink:show'?: string;
	'xlink:title'?: string;
	'xlink:type'?: string;
	'xml:base'?: string;
	'xml:lang'?: string;
	xmlns?: string;
	xmlnsXlink?: string;
	'xml:space'?: string;
	y1?: string;
	y2?: string;
	y?: string;
	yChannelSelector?: string;
	z?: string;
	zoomAndPan?: string;
}

export interface AnchorAttributes extends VNodeProperties<HTMLAnchorElement> {
	download?: string;
	href?: string;
	hreflang?: string;
	ping?: string;
	rel?: string;
	target?: string;
	type?: string;
	media?: string;
}

export interface AreaAttributes extends VNodeProperties<HTMLAreaElement> {
	alt?: string;
	coords?: string;
	download?: string;
	href?: string;
	media?: string;
	hreflang?: string;
	ping?: string;
	rel?: string;
	shape?: string;
	target?: string;
}

export interface AudioAttributes extends VNodeProperties<HTMLAudioElement> {
	autoplay?: boolean;
	controls?: boolean;
	crossOrigin?: 'anonymous' | 'use-credentials';
	loop?: boolean;
	mediaGroup?: string;
	muted?: boolean;
	preload?: 'none' | 'metadata' | 'auto' | '';
	src?: string;
}

export interface BaseAttributes extends VNodeProperties<HTMLBaseElement> {
	href?: string;
	target?: string;
}

export interface BlockquoteAttributes extends VNodeProperties<HTMLQuoteElement> {
	cite?: string;
}

export interface ButtonAttributes extends VNodeProperties<HTMLButtonElement> {
	autofocus?: boolean;
	disabled?: boolean;
	form?: string;
	formAction?: string;
	formEncType?: string;
	formMethod?: string;
	formNoValidate?: boolean;
	formTarget?: string;
	name?: string;
	type?: 'submit' | 'reset' | 'button' | 'menu';
}

export interface CanvasAttributes extends VNodeProperties<HTMLCanvasElement> {
	height?: number | string;
	width?: number | string;
}

export interface ColAttributes extends VNodeProperties<HTMLTableColElement> {
	span?: number;
	width?: number | string;
}

export interface ColgroupAttributes extends VNodeProperties {
	span?: number;
}

export interface DetailsAttributes extends VNodeProperties<HTMLDetailsElement> {
	open?: boolean;
}

export interface DelAttributes extends VNodeProperties {
	cite?: string;
	dateTime?: string;
}

export interface DialogAttributes extends VNodeProperties<HTMLDialogElement> {
	open?: boolean;
}

export interface EmbedAttributes extends VNodeProperties<HTMLEmbedElement> {
	height?: number | string;
	src?: string;
	type?: string;
	width?: number | string;
}

export interface FieldsetAttributes extends VNodeProperties<HTMLFieldSetElement> {
	disabled?: boolean;
	form?: string;
	name?: string;
}

export interface FormAttributes extends VNodeProperties<HTMLFormElement> {
	acceptCharset?: string;
	action?: string;
	autoComplete?: string;
	encType?: string;
	method?: string;
	name?: string;
	noValidate?: boolean;
	target?: string;
}

export interface HtmlAttributes extends VNodeProperties<HTMLHtmlElement> {
	manifest?: string;
}

export interface IFrameAttributes extends VNodeProperties<HTMLIFrameElement> {
	allow?: string;
	allowFullScreen?: boolean;
	allowTransparency?: boolean;
	frameBorder?: number | string;
	height?: number | string;
	marginHeight?: number;
	marginWidth?: number;
	name?: string;
	referrerPolicy?: string;
	sandbox?: string;
	scrolling?: string;
	seamless?: boolean;
	src?: string;
	srcDoc?: string;
	width?: number | string;
}

export interface ImgAttributes extends VNodeProperties<HTMLImageElement> {
	alt?: string;
	crossOrigin?: 'anonymous' | 'use-credentials' | '';
	decoding?: 'async' | 'auto' | 'sync';
	height?: number | string;
	loading?: 'eager' | 'lazy';
	referrerPolicy?: 'no-referrer' | 'origin' | 'unsafe-url';
	sizes?: string;
	src?: string;
	srcSet?: string;
	useMap?: string;
	width?: number | string;
}

export interface InsAttributes extends VNodeProperties {
	cite?: string;
	dateTime?: string;
}

export interface InputAttributes extends VNodeProperties<HTMLInputElement> {
	accept?: string;
	alt?: string;
	autoComplete?: string;
	autofocus?: boolean;
	capture?: boolean | string;
	checked?: boolean;
	crossOrigin?: string;
	disabled?: boolean;
	form?: string;
	formAction?: string;
	formEncType?: string;
	formMethod?: string;
	formNoValidate?: boolean;
	formTarget?: string;
	height?: number | string;
	list?: string;
	max?: number | string;
	maxLength?: number;
	min?: number | string;
	minLength?: number;
	multiple?: boolean;
	name?: string;
	pattern?: string;
	placeholder?: string;
	readOnly?: boolean;
	required?: boolean;
	size?: number;
	src?: string;
	step?: number | string;
	type?: string;
	width?: number | string;
}

interface KeygenAttributes extends VNodeProperties {
	autofocus?: boolean;
	challenge?: string;
	disabled?: boolean;
	form?: string;
	keyType?: string;
	keyParams?: string;
	name?: string;
}

interface LabelAttributes extends VNodeProperties<HTMLLabelElement> {
	for?: string;
	form?: string;
}

interface LinkAttributes extends VNodeProperties<HTMLLinkElement> {
	as?: string;
	crossOrigin?: string;
	href?: string;
	hrefLang?: string;
	integrity?: string;
	media?: string;
	rel?: string;
	sizes?: string;
	type?: string;
	charSet?: string;
}

interface MapAttributes extends VNodeProperties<HTMLMapElement> {
	name?: string;
}

interface MenuAttributes extends VNodeProperties<HTMLMenuElement> {
	type?: string;
}

interface MetaAttributes extends VNodeProperties<HTMLMetaElement> {
	charSet?: string;
	content?: string;
	httpEquiv?: string;
	name?: string;
}

interface MeterAttributes extends VNodeProperties<HTMLMeterElement> {
	form?: string;
	high?: number;
	low?: number;
	max?: number | string;
	min?: number | string;
	optimum?: number;
}

interface ObjectAttributes extends VNodeProperties<HTMLObjectElement> {
	classID?: string;
	data?: string;
	form?: string;
	height?: number | string;
	name?: string;
	type?: string;
	useMap?: string;
	width?: number | string;
	wmode?: string;
}

interface OlAttributes extends VNodeProperties<HTMLOListElement> {
	reversed?: boolean;
	start?: number;
	type?: '1' | 'a' | 'A' | 'i' | 'I';
}

interface OptgroupAttributes extends VNodeProperties<HTMLOptGroupElement> {
	disabled?: boolean;
	label?: string;
}

interface OptionAttributes extends VNodeProperties<HTMLOptionElement> {
	disabled?: boolean;
	label?: string;
	selected?: boolean;
}

interface OutputAttributes extends VNodeProperties<HTMLOutputElement> {
	form?: string;
	for?: string;
	name?: string;
}

interface ParamAttributes extends VNodeProperties<HTMLParamElement> {
	name?: string;
}

interface ProgressAttributes extends VNodeProperties<HTMLProgressElement> {
	max?: number | string;
}

interface QuoteAttributes extends VNodeProperties<HTMLQuoteElement> {
	cite?: string;
}

interface SlotAttributes extends VNodeProperties<HTMLSlotElement> {
	name?: string;
}

interface SelectAttributes extends VNodeProperties<HTMLSelectElement> {
	autoComplete?: string;
	autofocus?: boolean;
	disabled?: boolean;
	form?: string;
	multiple?: boolean;
	name?: string;
	required?: boolean;
	size?: number;
}

interface SourceAttributes extends VNodeProperties<HTMLSourceElement> {
	media?: string;
	sizes?: string;
	src?: string;
	srcSet?: string;
	type?: string;
}

interface StyleAttributes extends VNodeProperties<HTMLStyleElement> {
	media?: string;
	nonce?: string;
	type?: string;
}

interface TableAttributes extends VNodeProperties<HTMLTableElement> {
	cellPadding?: number | string;
	cellSpacing?: number | string;
	summary?: string;
}

interface TextareaAttributes extends VNodeProperties<HTMLTextAreaElement> {
	autoComplete?: string;
	autofocus?: boolean;
	cols?: number;
	dirName?: string;
	disabled?: boolean;
	form?: string;
	maxLength?: number;
	minLength?: number;
	name?: string;
	placeholder?: string;
	readOnly?: boolean;
	required?: boolean;
	rows?: number;
	wrap?: string;
}

interface TdAttributes extends VNodeProperties<HTMLTableDataCellElement> {
	align?: 'left' | 'center' | 'right' | 'justify' | 'char';
	colSpan?: number;
	headers?: string;
	rowSpan?: number;
	scope?: string;
	abbr?: string;
	valign?: 'top' | 'middle' | 'bottom' | 'baseline';
}

interface ThAttributes extends VNodeProperties<HTMLTableHeaderCellElement> {
	align?: 'left' | 'center' | 'right' | 'justify' | 'char';
	colSpan?: number;
	headers?: string;
	rowSpan?: number;
	scope?: string;
	abbr?: string;
}

interface TimeAttributes extends VNodeProperties<HTMLTimeElement> {
	dateTime?: string;
}

interface TrackAttributes extends VNodeProperties<HTMLTrackElement> {
	default?: boolean;
	kind?: string;
	label?: string;
	src?: string;
	srcLang?: string;
}

export interface VideoAttributes extends VNodeProperties<HTMLVideoElement> {
	autoPlay?: boolean;
	controls?: boolean;
	crossOrigin?: 'anonymous' | 'use-credentials';
	loop?: boolean;
	mediaGroup?: string;
	muted?: boolean;
	playsInline?: boolean;
	preload?: 'none' | 'metadata' | 'auto' | '';
	src?: string;
	height?: number | string;
	width?: number | string;
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
	 * The key for a widget. Used to uniquely identify child widgets for
	 * rendering and instance management
	 */
	key?: string | number;
}

/**
 * Widget properties that require a key
 */
export interface KeyedWidgetProperties extends WidgetProperties {
	/**
	 * The key for a widget. Used to uniquely identify child widgets for
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
	onUpdate?: () => void;
	onDetach?: () => void;
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
	withType: <Api extends ReturnValue, CustomProps = Props>() => MiddlewareResultFactory<
		CustomProps,
		Children,
		Middleware,
		Api
	>;
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
export type DNode<W extends WidgetBaseTypes = any> = VNode | WNode<W> | undefined | null | string | boolean | number;

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
