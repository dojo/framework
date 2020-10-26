import global from '../shim/global';
import has from '../core/has';
import WeakMap from '../shim/WeakMap';
import Set from '../shim/Set';
import Map from '../shim/Map';
import { flat } from '../shim/array';
import {
	WNode,
	VNode,
	DNode,
	VNodeProperties,
	TransitionStrategy,
	SupportedClassName,
	DomVNode,
	LazyDefine,
	Constructor,
	RenderResult,
	WidgetBaseInterface,
	Callback,
	MiddlewareMap,
	WNodeFactory,
	OptionalWNodeFactory,
	UnionToIntersection,
	WidgetProperties,
	MiddlewareResultFactory,
	WidgetBaseTypes,
	RegistryLabel,
	DeferredVirtualProperties,
	DomOptions,
	DefaultChildrenWNodeFactory,
	SVGAttributes,
	AnchorAttributes,
	AudioAttributes,
	BaseAttributes,
	BlockquoteAttributes,
	ButtonAttributes,
	CanvasAttributes,
	ColAttributes,
	ColgroupAttributes,
	DelAttributes,
	DetailsAttributes,
	DialogAttributes,
	EmbedAttributes,
	FieldsetAttributes,
	FormAttributes,
	IFrameAttributes,
	ImgAttributes,
	InsAttributes,
	InputAttributes,
	KeygenAttributes,
	LabelAttributes,
	LinkAttributes,
	MapAttributes,
	MenuAttributes,
	MetaAttributes,
	MeterAttributes,
	QuoteAttributes,
	ObjectAttributes,
	OlAttributes,
	OptgroupAttributes,
	OptionAttributes,
	OutputAttributes,
	ParamAttributes,
	ProgressAttributes,
	SlotAttributes,
	SelectAttributes,
	SourceAttributes,
	StyleAttributes,
	TableAttributes,
	TextareaAttributes,
	TdAttributes,
	ThAttributes,
	TimeAttributes,
	TrackAttributes,
	VideoAttributes
} from './interfaces';
import { Registry, isWidget, isWidgetBaseConstructor, isWidgetFunction, isWNodeFactory } from './Registry';
import { auto } from './diff';
import RegistryHandler from './RegistryHandler';
import { NodeHandler } from './NodeHandler';

export namespace tsx.JSX {
	export type Element = WNode;
	export interface ElementAttributesProperty {
		__properties__: {};
	}
	export interface IntrinsicElements {
		svg: SVGAttributes;
		a: AnchorAttributes;
		audio: AudioAttributes;
		base: BaseAttributes;
		blockquote: BlockquoteAttributes;
		button: ButtonAttributes;
		canvas: CanvasAttributes;
		col: ColAttributes;
		colgroup: ColgroupAttributes;
		del: DelAttributes;
		details: DetailsAttributes;
		dialog: DialogAttributes;
		embed: EmbedAttributes;
		fieldset: FieldsetAttributes;
		form: FormAttributes;
		iframe: IFrameAttributes;
		img: ImgAttributes;
		ins: InsAttributes;
		input: InputAttributes;
		keygen: KeygenAttributes;
		label: LabelAttributes;
		link: LinkAttributes;
		map: MapAttributes;
		menu: MenuAttributes;
		meta: MetaAttributes;
		meter: MeterAttributes;
		object: ObjectAttributes;
		ol: OlAttributes;
		optgroup: OptgroupAttributes;
		option: OptionAttributes;
		output: OutputAttributes;
		param: ParamAttributes;
		progress: ProgressAttributes;
		q: QuoteAttributes;
		slot: SlotAttributes;
		select: SelectAttributes;
		source: SourceAttributes;
		style: StyleAttributes;
		table: TableAttributes;
		td: TdAttributes;
		textarea: TextareaAttributes;
		th: ThAttributes;
		time: TimeAttributes;
		track: TrackAttributes;
		video: VideoAttributes;
		[key: string]: VNodeProperties;
	}
	export interface ElementChildrenAttribute {
		__children__: {};
	}
}

export interface BaseNodeWrapper {
	id: string;
	owningId: string;
	node: WNode<any> | VNode;
	domNode?: Node;
	depth: number;
	order: number;
	requiresInsertBefore?: boolean;
	hasPreviousSiblings?: boolean;
	hasParentWNode?: boolean;
	namespace?: string;
	hasAnimations?: boolean;
	parentId: string;
	childDomWrapperId?: string;
	reparent?: string;
}

export interface WNodeWrapper extends BaseNodeWrapper {
	node: WNode<any>;
	keys?: string[];
	instance?: any;
	mergeNodes?: Node[];
	nodeHandlerCalled?: boolean;
	registryItem?: Callback<any, any, any, RenderResult> | Constructor<any> | null;
	properties: any;
}

export interface WidgetMeta {
	widgetName: string;
	mountNode: HTMLElement;
	dirty: boolean;
	invalidator: () => void;
	middleware?: any;
	middlewareIds: string[];
	registryHandler?: RegistryHandler;
	registry: Registry;
	properties: any;
	originalProperties: any;
	children?: DNode[];
	rendering: boolean;
	nodeMap?: Map<string | number, HTMLElement>;
	destroyMap?: Map<string, () => void>;
	deferRefs: number;
	customDiffProperties?: Set<string>;
	customDiffMap?: Map<string, Map<string, (current: any, next: any) => any>>;
	propertiesCalled: boolean;
}

export interface WidgetData {
	onDetach: () => void;
	onAttach: () => void;
	dirty: boolean;
	nodeHandler: NodeHandler;
	invalidate?: Function;
	rendering: boolean;
	inputProperties: any;
	registry: RegistryHandler;
}

export interface VNodeWrapper extends BaseNodeWrapper {
	node: VNode | DomVNode;
	merged?: boolean;
	inserted?: boolean;
	deferredProperties?: VNodeProperties;
}

export type DNodeWrapper = VNodeWrapper | WNodeWrapper;

export interface MountOptions {
	sync: boolean;
	merge: boolean;
	transition?: TransitionStrategy;
	domNode: HTMLElement | null;
	registry: Registry;
}

export interface Renderer {
	invalidate(): void;
	mount(mountOptions?: Partial<MountOptions>): void;
	unmount(): void;
}

interface ProcessItem {
	current?: (WNodeWrapper | VNodeWrapper)[];
	next?: (WNodeWrapper | VNodeWrapper)[];
	meta: ProcessMeta;
}

interface ProcessResult {
	item?: ProcessItem;
	widget?: AttachApplication | DetachApplication;
	dom?: ApplicationInstruction;
}

interface ProcessMeta {
	mergeNodes?: Node[];
	oldIndex?: number;
	newIndex?: number;
	currentKeyMap?: Map<string, DNodeWrapper>;
}

interface InvalidationQueueItem {
	id: string;
	depth: number;
	order: number;
}

interface Instruction {
	current: undefined | DNodeWrapper;
	next: undefined | DNodeWrapper;
}

interface CreateWidgetInstruction {
	next: WNodeWrapper;
}

interface UpdateWidgetInstruction {
	current: WNodeWrapper;
	next: WNodeWrapper;
}

interface RemoveWidgetInstruction {
	current: WNodeWrapper;
}

interface CreateDomInstruction {
	next: VNodeWrapper;
}

interface UpdateDomInstruction {
	current: VNodeWrapper;
	next: VNodeWrapper;
}

interface RemoveDomInstruction {
	current: VNodeWrapper;
}

interface AttachApplication {
	type: 'attach';
	id: string;
	instance?: WidgetBaseInterface;
	attached?: boolean;
}

interface DetachApplication {
	type: 'detach';
	current: WNodeWrapper;
	instance?: WidgetBaseInterface;
}

interface CreateDomApplication {
	type: 'create';
	current?: VNodeWrapper;
	next: VNodeWrapper;
	parentDomNode: Node;
}

interface DeleteDomApplication {
	type: 'delete';
	current: VNodeWrapper;
}

interface UpdateDomApplication {
	type: 'update';
	current: VNodeWrapper;
	next: VNodeWrapper;
}

interface PreviousProperties {
	properties: any;
	attributes?: any;
	events?: any;
}

type ApplicationInstruction =
	| CreateDomApplication
	| UpdateDomApplication
	| DeleteDomApplication
	| Required<AttachApplication>
	| DetachApplication;

const EMPTY_ARRAY: DNodeWrapper[] = [];
const nodeOperations = ['focus', 'blur', 'scrollIntoView', 'click'];
const NAMESPACE_W3 = 'http://www.w3.org/';
const NAMESPACE_SVG = NAMESPACE_W3 + '2000/svg';
const NAMESPACE_XLINK = NAMESPACE_W3 + '1999/xlink';
const WNODE = '__WNODE_TYPE';
const VNODE = '__VNODE_TYPE';
const DOMVNODE = '__DOMVNODE_TYPE';

// @ts-ignore
const scope = typeof __DOJO_SCOPE === 'string' ? __DOJO_SCOPE : 'dojo_scope';

if (!global[scope]) {
	global[scope] = {};
}

export function setRendering(value: boolean) {
	global[scope].rendering = value;
}

export function incrementBlockCount() {
	const blocksPending = global[scope].blocksPending || 0;
	global[scope].blocksPending = blocksPending + 1;
}

export function decrementBlockCount() {
	const blocksPending = global[scope].blocksPending || 0;
	global[scope].blocksPending = blocksPending - 1;
}

export function isTextNode(item: any): item is Text {
	return item && item.nodeType === 3;
}

function isLazyDefine(item: any): item is LazyDefine<any> {
	return Boolean(item && item.label);
}

function isWNodeWrapper(child: DNodeWrapper): child is WNodeWrapper {
	return child && isWNode(child.node);
}

function isVNodeWrapper(child?: DNodeWrapper | null): child is VNodeWrapper {
	return !!child && isVNode(child.node);
}

function isVirtualWrapper(child?: DNodeWrapper | null): boolean {
	return isVNodeWrapper(child) && child.node.tag === 'virtual';
}

function isBodyWrapper(wrapper?: DNodeWrapper): boolean {
	return isVNodeWrapper(wrapper) && wrapper.node.tag === 'body';
}

function isHeadWrapper(wrapper?: DNodeWrapper): boolean {
	return isVNodeWrapper(wrapper) && wrapper.node.tag === 'head';
}

function isSpecialWrapper(wrapper?: DNodeWrapper): boolean {
	return isHeadWrapper(wrapper) || isBodyWrapper(wrapper) || isVirtualWrapper(wrapper);
}

function isAttachApplication(value: any): value is AttachApplication | DetachApplication {
	return !!value.type;
}

export function isWNode<W extends WidgetBaseTypes = any>(child: any): child is WNode<W> {
	return Boolean(child && child !== true && typeof child !== 'string' && child.type === WNODE);
}

export function isVNode(child: DNode): child is VNode {
	return Boolean(
		child &&
			child !== true &&
			typeof child !== 'number' &&
			typeof child !== 'string' &&
			(child.type === VNODE || child.type === DOMVNODE)
	);
}

export function isDomVNode(child: DNode): child is DomVNode {
	return Boolean(
		child && child !== true && typeof child !== 'number' && typeof child !== 'string' && child.type === DOMVNODE
	);
}

export function isElementNode(value: any): value is Element {
	return !!value.tagName;
}

function toTextVNode(data: any): VNode {
	return {
		tag: '',
		properties: {},
		children: undefined,
		text: `${data}`,
		type: VNODE
	};
}

function updateAttributes(
	domNode: Element,
	previousAttributes: { [index: string]: string | undefined },
	attributes: { [index: string]: string | undefined },
	namespace?: string
) {
	const attrNames = Object.keys(attributes);
	const attrCount = attrNames.length;
	for (let i = 0; i < attrCount; i++) {
		const attrName = attrNames[i];
		const attrValue = attributes[attrName];
		const previousAttrValue = previousAttributes[attrName];
		if (attrValue !== previousAttrValue) {
			updateAttribute(domNode, attrName, attrValue, namespace);
		}
	}
}

/**
 * Wrapper function for calls to create a widget.
 */
export function w<W extends WidgetBaseTypes>(
	node: WNode<W>,
	properties: Partial<W['properties']>,
	children?: W['properties'] extends { __children__: any } ? W['properties']['__children__'] : W['children']
): WNode<W>;
export function w<W extends WidgetBaseTypes>(
	widgetConstructor: Constructor<W> | RegistryLabel | LazyDefine<W>,
	properties: W['properties'],
	children?: W['children']
): WNode<W>;
export function w<W extends WNodeFactory<any>>(
	widgetConstructor: W,
	properties: W['properties'],
	children: W['children'] extends any[] ? W['children'] : [W['children']]
): WNode<W>;
export function w<W extends DefaultChildrenWNodeFactory<any>>(
	widgetConstructor: W,
	properties: W['properties'],
	children?: W['children']
): WNode<W>;
export function w<W extends OptionalWNodeFactory<any>>(
	widgetConstructor: W,
	properties: W['properties'],
	children?: W['children'] extends any[] ? W['children'] : [W['children']]
): WNode<W>;
export function w<W extends WidgetBaseTypes>(
	widgetConstructorOrNode:
		| Constructor<W>
		| RegistryLabel
		| WNodeFactory<W>
		| WNode<W>
		| LazyDefine<W>
		| Callback<any, any, any, RenderResult>,
	properties: W['properties'],
	children?: any
): WNode<W> {
	if ((properties as any).__children__) {
		delete (properties as any).__children__;
	}

	if (isWNodeFactory<W>(widgetConstructorOrNode)) {
		return widgetConstructorOrNode(properties, children);
	}

	if (isWNode<W>(widgetConstructorOrNode)) {
		properties = { ...(widgetConstructorOrNode.properties as any), ...(properties as any) };
		children = children ? children : widgetConstructorOrNode.children;
		widgetConstructorOrNode = widgetConstructorOrNode.widgetConstructor;
	}

	return {
		children: children || [],
		widgetConstructor: widgetConstructorOrNode,
		properties,
		type: WNODE
	};
}

/**
 * Wrapper function for calls to create VNodes.
 */
export function v(node: VNode, properties: VNodeProperties, children: undefined | DNode[]): VNode;
export function v(node: VNode, properties: VNodeProperties): VNode;
export function v(tag: string, children: undefined | DNode[]): VNode;
export function v<K extends keyof HTMLElementTagNameMap>(
	tag: K,
	properties: DeferredVirtualProperties | VNodeProperties<HTMLElementTagNameMap[K]>,
	children?: DNode[]
): VNode;
export function v(tag: string, properties: DeferredVirtualProperties | VNodeProperties, children?: DNode[]): VNode;
export function v(tag: string): VNode;
export function v(
	tag: string | VNode,
	propertiesOrChildren: VNodeProperties | DeferredVirtualProperties | DNode[] = {},
	children: undefined | DNode[] = undefined
): VNode {
	let properties: VNodeProperties | DeferredVirtualProperties = propertiesOrChildren;
	let deferredPropertiesCallback;

	if (typeof (tag as any).tag === 'function') {
		return (tag as any).tag(properties, children);
	}

	if (Array.isArray(propertiesOrChildren)) {
		children = propertiesOrChildren;
		properties = {};
	}

	if (typeof properties === 'function') {
		deferredPropertiesCallback = properties;
		properties = {};
	}

	if (isVNode(tag)) {
		let { classes = [], styles = {}, ...newProperties } = properties;
		let { classes: nodeClasses = [], styles: nodeStyles = {}, ...nodeProperties } = tag.properties;
		nodeClasses = Array.isArray(nodeClasses) ? nodeClasses : [nodeClasses];
		classes = Array.isArray(classes) ? classes : [classes];
		styles = { ...nodeStyles, ...styles };
		properties = { ...nodeProperties, ...newProperties, classes: [...nodeClasses, ...classes], styles };
		children = children ? children : tag.children;
		tag = tag.tag;
	}

	return {
		tag,
		deferredPropertiesCallback,
		children,
		properties,
		type: VNODE
	};
}

/**
 * Create a VNode for an existing DOM Node.
 */
export function dom(
	{ node, attrs = {}, props = {}, on = {}, diffType = 'none', onAttach, onDetach, onUpdate }: DomOptions,
	children?: DNode[]
): DomVNode {
	return {
		tag: isElementNode(node) ? node.tagName.toLowerCase() : '',
		properties: props,
		attributes: attrs,
		events: on,
		children,
		type: DOMVNODE,
		domNode: node,
		text: isElementNode(node) ? undefined : node.data,
		diffType,
		onAttach,
		onUpdate,
		onDetach
	};
}

export const REGISTRY_ITEM = '__registry_item';

export class FromRegistry<P> {
	static type = REGISTRY_ITEM;
	/* tslint:disable-next-line:variable-name */
	__properties__: P = {} as P;
	name: string | undefined;
}

export function fromRegistry<P>(tag: string): Constructor<FromRegistry<P>> {
	return class extends FromRegistry<P> {
		properties: P = {} as P;
		static type = REGISTRY_ITEM;
		name = tag;
	};
}

export function tsx(tag: any, properties = {}, ...children: any[]): DNode {
	children = flat(children, Infinity);
	properties = properties === null ? {} : properties;
	if (typeof tag === 'string') {
		return v(tag, properties, children);
	} else if (tag.type === 'registry' && (properties as any).__autoRegistryItem) {
		const name = (properties as any).__autoRegistryItem;
		delete (properties as any).__autoRegistryItem;
		return w(name, properties, children);
	} else if (tag.type === REGISTRY_ITEM) {
		const registryItem = new tag();
		return w(registryItem.name, properties, children);
	} else {
		return w(tag, properties, children);
	}
}

export function propertiesDiff(current: any, next: any, invalidator: () => void, ignoreProperties: string[]) {
	const propertyNames = [...Object.keys(current), ...Object.keys(next)];
	for (let i = 0; i < propertyNames.length; i++) {
		if (ignoreProperties.indexOf(propertyNames[i]) > -1) {
			continue;
		}
		const result = auto(current[propertyNames[i]], next[propertyNames[i]]);
		if (result.changed) {
			invalidator();
			break;
		}
		ignoreProperties.push(propertyNames[i]);
	}
}

function buildPreviousProperties(domNode: any, current: VNodeWrapper) {
	const {
		node: { diffType, properties, attributes }
	} = current;
	if (!diffType || diffType === 'vdom') {
		return {
			properties: current.deferredProperties
				? { ...current.deferredProperties, ...current.node.properties }
				: current.node.properties,
			attributes: current.node.attributes,
			events: current.node.events
		};
	} else if (diffType === 'none') {
		return {
			properties: {},
			attributes: current.node.attributes ? {} : undefined,
			events: current.node.events
		};
	}
	let newProperties: any = {
		properties: {}
	};
	if (attributes) {
		newProperties.attributes = {};
		newProperties.events = current.node.events;
		Object.keys(properties).forEach((propName) => {
			newProperties.properties[propName] = domNode[propName];
		});
		Object.keys(attributes).forEach((attrName) => {
			newProperties.attributes[attrName] = domNode.getAttribute(attrName);
		});
		return newProperties;
	}
	newProperties.properties = Object.keys(properties).reduce(
		(props, property) => {
			props[property] = domNode.getAttribute(property) || domNode[property];
			return props;
		},
		{} as any
	);
	return newProperties;
}

function checkDistinguishable(wrappers: DNodeWrapper[], index: number, parentWNodeWrapper?: WNodeWrapper) {
	const wrapperToCheck = wrappers[index];
	if (isVNodeWrapper(wrapperToCheck) && !wrapperToCheck.node.tag) {
		return;
	}
	const { key } = wrapperToCheck.node.properties;
	let parentName = 'unknown';
	if (parentWNodeWrapper) {
		const {
			node: { widgetConstructor }
		} = parentWNodeWrapper;
		parentName = (widgetConstructor as any).name || 'unknown';
	}

	if (key === undefined || key === null) {
		for (let i = 0; i < wrappers.length; i++) {
			if (i !== index) {
				const wrapper = wrappers[i];
				if (same(wrapper, wrapperToCheck)) {
					let nodeIdentifier: string;
					if (isWNodeWrapper(wrapper)) {
						nodeIdentifier = (wrapper.node.widgetConstructor as any).name || 'unknown';
					} else {
						nodeIdentifier = wrapper.node.tag;
					}

					console.warn(
						`A widget (${parentName}) has had a child added or removed, but they were not able to uniquely identified. It is recommended to provide a unique 'key' property when using the same widget or element (${nodeIdentifier}) multiple times as siblings`
					);
					break;
				}
			}
		}
	}
}

function same(dnode1: DNodeWrapper, dnode2: DNodeWrapper): boolean {
	if (isVNodeWrapper(dnode1) && isVNodeWrapper(dnode2)) {
		if (isDomVNode(dnode1.node) && isDomVNode(dnode2.node)) {
			if (dnode1.node.domNode !== dnode2.node.domNode) {
				return false;
			}
		}
		if (dnode1.node.tag !== dnode2.node.tag) {
			return false;
		}
		if (dnode1.node.properties.key !== dnode2.node.properties.key) {
			return false;
		}
		return true;
	} else if (isWNodeWrapper(dnode1) && isWNodeWrapper(dnode2)) {
		const widgetConstructor1 = dnode1.registryItem || dnode1.node.widgetConstructor;
		const widgetConstructor2 = dnode2.registryItem || dnode2.node.widgetConstructor;
		const {
			node: { properties: props1 }
		} = dnode1;
		const {
			node: { properties: props2 }
		} = dnode2;
		if (dnode1.instance === undefined && typeof widgetConstructor2 === 'string') {
			return false;
		}
		if (widgetConstructor1 !== widgetConstructor2) {
			return false;
		}
		if (props1.key !== props2.key) {
			return false;
		}
		if (!((widgetConstructor1 as any).keys || []).every((key: string) => props1[key] === props2[key])) {
			return false;
		}
		return true;
	}
	return false;
}

function findIndexOfChild(children: DNodeWrapper[], sameAs: DNodeWrapper, start: number) {
	for (let i = start; i < children.length; i++) {
		if (same(children[i], sameAs)) {
			return i;
		}
	}
	return -1;
}

function createClassPropValue(classes: SupportedClassName | SupportedClassName[] = []) {
	let classNames = '';
	if (Array.isArray(classes)) {
		for (let i = 0; i < classes.length; i++) {
			let className = classes[i];
			if (className && className !== true) {
				classNames = classNames ? `${classNames} ${className}` : className;
			}
		}
		return classNames;
	}
	if (classes && classes !== true) {
		classNames = classes;
	}
	return classNames;
}

function updateAttribute(domNode: Element, attrName: string, attrValue: string | undefined, namespace?: string) {
	if (namespace === NAMESPACE_SVG && attrName === 'href' && attrValue) {
		domNode.setAttributeNS(NAMESPACE_XLINK, attrName, attrValue);
	} else if ((attrName === 'role' && attrValue === '') || attrValue === undefined) {
		domNode.removeAttribute(attrName);
	} else {
		domNode.setAttribute(attrName, attrValue);
	}
}

function arrayFrom(arr: any) {
	return Array.prototype.slice.call(arr);
}

function createFactory(callback: any, middlewares: any, key?: any): any {
	const factory = (properties: any, children?: any) => {
		if (properties) {
			const result = w(callback, properties, children);
			callback.isWidget = true;
			callback.middlewares = middlewares;
			return result;
		}
		return {
			middlewares,
			callback
		};
	};
	const keys = Object.keys(middlewares).reduce((keys: string[], middlewareName: any) => {
		const middleware = middlewares[middlewareName];
		if (middleware.keys) {
			keys = [...keys, ...middleware.keys];
		}
		return keys;
	}, key ? [key] : []);

	factory.withType = () => {
		return factory;
	};
	callback.keys = keys;
	factory.keys = keys;
	factory.isFactory = true;
	return factory;
}

type KeysMatching<T, V> = { [K in keyof T]: T[K] extends V ? K : never }[keyof T];

export function create<T extends MiddlewareMap, MiddlewareProps = ReturnType<T[keyof T]>['properties']>(
	middlewares: T = {} as T
) {
	function properties<Props>() {
		function returns<ReturnValue>(
			callback: Callback<WidgetProperties & Props & UnionToIntersection<MiddlewareProps>, DNode[], T, ReturnValue>
		): ReturnValue extends RenderResult
			? DefaultChildrenWNodeFactory<{
					properties: Props & WidgetProperties & UnionToIntersection<MiddlewareProps>;
					children: DNode[];
			  }>
			: MiddlewareResultFactory<
					WidgetProperties & Props & UnionToIntersection<MiddlewareProps>,
					DNode[],
					T,
					ReturnValue
			  > {
			return createFactory(callback, middlewares);
		}

		function key(key: KeysMatching<Props, string | number>) {
			function returns<ReturnValue>(
				callback: Callback<
					WidgetProperties & Props & UnionToIntersection<MiddlewareProps>,
					DNode[],
					T,
					ReturnValue
				>
			): ReturnValue extends RenderResult
				? DefaultChildrenWNodeFactory<{
						properties: Props & WidgetProperties & UnionToIntersection<MiddlewareProps>;
						children: DNode[];
				  }>
				: MiddlewareResultFactory<
						WidgetProperties & Props & UnionToIntersection<MiddlewareProps>,
						DNode[],
						T,
						ReturnValue
				  > {
				return createFactory(callback, middlewares, key);
			}
			return returns;
		}

		function children<Children>() {
			function returns<ReturnValue>(
				callback: Callback<
					WidgetProperties & Props & UnionToIntersection<MiddlewareProps>,
					Children,
					T,
					ReturnValue
				>
			): ReturnValue extends RenderResult
				? UnionToIntersection<Children> extends undefined
					? OptionalWNodeFactory<{
							properties: Props & WidgetProperties & UnionToIntersection<MiddlewareProps>;
							children: NonNullable<Children>;
					  }>
					: WNodeFactory<{
							properties: Props & WidgetProperties & UnionToIntersection<MiddlewareProps>;
							children: Children;
					  }>
				: MiddlewareResultFactory<
						WidgetProperties & Props & UnionToIntersection<MiddlewareProps>,
						Children,
						T,
						ReturnValue
				  > {
				return createFactory(callback, middlewares);
			}

			function key(key: KeysMatching<Props, string | number>) {
				function returns<ReturnValue>(
					callback: Callback<
						WidgetProperties & Props & UnionToIntersection<MiddlewareProps>,
						Children,
						T,
						ReturnValue
					>
				): ReturnValue extends RenderResult
					? UnionToIntersection<Children> extends undefined
						? OptionalWNodeFactory<{
								properties: Props & WidgetProperties & UnionToIntersection<MiddlewareProps>;
								children: NonNullable<Children>;
						  }>
						: WNodeFactory<{
								properties: Props & WidgetProperties & UnionToIntersection<MiddlewareProps>;
								children: Children;
						  }>
					: MiddlewareResultFactory<
							WidgetProperties & Props & UnionToIntersection<MiddlewareProps>,
							Children,
							T,
							ReturnValue
					  > {
					return createFactory(callback, middlewares, key);
				}
				return returns;
			}
			returns.key = key;
			return returns;
		}
		returns.children = children;
		returns.key = key;
		return returns;
	}

	function children<Children>() {
		function properties<Props>() {
			function returns<ReturnValue>(
				callback: Callback<
					WidgetProperties & Props & UnionToIntersection<MiddlewareProps>,
					Children,
					T,
					ReturnValue
				>
			): ReturnValue extends RenderResult
				? UnionToIntersection<Children> extends undefined
					? OptionalWNodeFactory<{
							properties: Props & WidgetProperties & UnionToIntersection<MiddlewareProps>;
							children: NonNullable<Children>;
					  }>
					: WNodeFactory<{
							properties: Props & WidgetProperties & UnionToIntersection<MiddlewareProps>;
							children: Children;
					  }>
				: MiddlewareResultFactory<
						WidgetProperties & Props & UnionToIntersection<MiddlewareProps>,
						Children,
						T,
						ReturnValue
				  > {
				return createFactory(callback, middlewares);
			}
			function key(key: KeysMatching<Props, string | number>) {
				function returns<ReturnValue>(
					callback: Callback<
						WidgetProperties & Props & UnionToIntersection<MiddlewareProps>,
						Children,
						T,
						ReturnValue
					>
				): ReturnValue extends RenderResult
					? UnionToIntersection<Children> extends undefined
						? OptionalWNodeFactory<{
								properties: Props & WidgetProperties & UnionToIntersection<MiddlewareProps>;
								children: NonNullable<Children>;
						  }>
						: WNodeFactory<{
								properties: Props & WidgetProperties & UnionToIntersection<MiddlewareProps>;
								children: Children;
						  }>
					: MiddlewareResultFactory<
							WidgetProperties & Props & UnionToIntersection<MiddlewareProps>,
							Children,
							T,
							ReturnValue
					  > {
					return createFactory(callback, middlewares, key);
				}
				return returns;
			}
			returns.key = key;
			return returns;
		}

		function returns<ReturnValue>(
			callback: Callback<WidgetProperties & UnionToIntersection<MiddlewareProps>, Children, T, ReturnValue>
		): ReturnValue extends RenderResult
			? UnionToIntersection<Children> extends undefined
				? OptionalWNodeFactory<{
						properties: WidgetProperties & UnionToIntersection<MiddlewareProps>;
						children: NonNullable<Children>;
				  }>
				: WNodeFactory<{
						properties: WidgetProperties & UnionToIntersection<MiddlewareProps>;
						children: Children;
				  }>
			: MiddlewareResultFactory<
					WidgetProperties & UnionToIntersection<MiddlewareProps>,
					NonNullable<Children>,
					T,
					ReturnValue
			  > {
			return createFactory(callback, middlewares);
		}
		returns.properties = properties;
		return returns;
	}

	function returns<ReturnValue>(
		callback: Callback<WidgetProperties & UnionToIntersection<MiddlewareProps>, DNode[], T, ReturnValue>
	): ReturnValue extends RenderResult
		? DefaultChildrenWNodeFactory<{
				properties: WidgetProperties & UnionToIntersection<MiddlewareProps>;
				children: DNode[];
		  }>
		: MiddlewareResultFactory<WidgetProperties & UnionToIntersection<MiddlewareProps>, DNode[], T, ReturnValue> {
		return createFactory(callback, middlewares);
	}
	returns.children = children;
	returns.properties = properties;
	return returns;
}

const factory = create();

function wrapNodes(renderer: () => RenderResult) {
	const result = renderer();
	const isWNodeWrapper = isWNode(result);
	const callback = () => {
		return result;
	};
	callback.isWNodeWrapper = isWNodeWrapper;
	return factory(callback);
}

export const widgetInstanceMap = new WeakMap<WidgetBaseInterface, WidgetData>();
const widgetMetaMap = new Map<string, WidgetMeta>();
const requestedDomNodes = new Set();
let wrapperId = 0;
let metaId = 0;

function addNodeToMap(id: string, key: string | number, node: HTMLElement) {
	const widgetMeta = widgetMetaMap.get(id);
	if (widgetMeta) {
		widgetMeta.nodeMap = widgetMeta.nodeMap || new Map();
		widgetMeta.nodeMap.set(key, node);
		if (requestedDomNodes.has(`${id}-${key}`)) {
			widgetMeta.invalidator();
			requestedDomNodes.delete(`${id}-${key}`);
		}
	}
}

function destroyHandles(meta: WidgetMeta) {
	const { destroyMap, middlewareIds } = meta;
	if (!destroyMap) {
		return;
	}
	for (let i = 0; i < middlewareIds.length; i++) {
		const id = middlewareIds[i];
		const destroy = destroyMap.get(id);
		destroy && destroy();
		destroyMap.delete(id);
		if (destroyMap.size === 0) {
			break;
		}
	}
	destroyMap.clear();
}

function runDiffs(meta: WidgetMeta, current: any, next: any) {
	let customProperties: any = {};
	meta.customDiffMap = meta.customDiffMap || new Map();
	if (meta.customDiffMap.size) {
		meta.customDiffMap.forEach((diffMap) => {
			diffMap.forEach((diff, propertyName) => {
				const result = diff({ ...current }, { ...next });
				if (result) {
					customProperties[propertyName] = result;
				}
			});
		});
	}
	return customProperties;
}

export const invalidator = factory(({ id }) => {
	const [widgetId] = id.split('-');
	return () => {
		const widgetMeta = widgetMetaMap.get(widgetId);
		if (widgetMeta) {
			return widgetMeta.invalidator();
		}
	};
});

export const node = factory(({ id }) => {
	return {
		get(key: string | number): HTMLElement | null {
			const [widgetId] = id.split('-');
			const widgetMeta = widgetMetaMap.get(widgetId);
			if (widgetMeta) {
				widgetMeta.nodeMap = widgetMeta.nodeMap || new Map();
				const mountNode = widgetMeta.mountNode;
				const node = widgetMeta.nodeMap.get(key);
				if (
					node &&
					(mountNode.contains(node) ||
						(global.document.body !== mountNode && global.document.body.contains(node)))
				) {
					return node;
				}
				requestedDomNodes.add(`${widgetId}-${key}`);
			}
			return null;
		}
	};
});

export const diffProperty = factory(({ id }) => {
	function callback<T extends (...args: any) => any, K extends keyof ReturnType<T>>(
		property: K,
		properties: T,
		diff: (current: ReturnType<T>, next: ReturnType<T>) => void | ReturnType<T>[K]
	): void;
	function callback(propertyName: string, diff: (current: any, next: any) => void): void;
	function callback(propertyName: string, propertiesOrDiff: any, diff?: any) {
		const [widgetId] = id.split('-');
		const widgetMeta = widgetMetaMap.get(widgetId);
		if (!diff) {
			diff = propertiesOrDiff;
		}
		if (widgetMeta) {
			widgetMeta.customDiffMap = widgetMeta.customDiffMap || new Map();
			widgetMeta.customDiffProperties = widgetMeta.customDiffProperties || new Set();
			const propertyDiffMap = widgetMeta.customDiffMap.get(id) || new Map();
			if (!propertyDiffMap.has(propertyName)) {
				const result = diff({}, widgetMeta.originalProperties);
				if (result !== undefined) {
					if (has('dojo-debug')) {
						if (widgetMeta.propertiesCalled) {
							console.warn(
								`Calling "propertyDiff" middleware after accessing properties in "${
									widgetMeta.widgetName
								}", can result in referencing stale properties.`
							);
						}
					}
					widgetMeta.properties = { ...widgetMeta.properties, [propertyName]: result };
				}
				propertyDiffMap.set(propertyName, diff);
				widgetMeta.customDiffProperties.add(propertyName);
			}
			widgetMeta.customDiffMap.set(id, propertyDiffMap);
		}
	}

	return callback;
});

export const destroy = factory(({ id }) => {
	return (destroyFunction: () => void): void => {
		const [widgetId] = id.split('-');
		const widgetMeta = widgetMetaMap.get(widgetId);
		if (widgetMeta) {
			widgetMeta.destroyMap = widgetMeta.destroyMap || new Map();
			if (!widgetMeta.destroyMap.has(id)) {
				widgetMeta.destroyMap.set(id, destroyFunction);
			}
		}
	};
});

export const getRegistry = factory(({ id }) => {
	const [widgetId] = id.split('-');
	return (): RegistryHandler | null => {
		const widgetMeta = widgetMetaMap.get(widgetId);
		if (widgetMeta) {
			if (!widgetMeta.registryHandler) {
				widgetMeta.registryHandler = new RegistryHandler();
				widgetMeta.registryHandler.base = widgetMeta.registry;
				widgetMeta.registryHandler.on('invalidate', widgetMeta.invalidator);
			}
			widgetMeta.registryHandler = widgetMeta.registryHandler || new RegistryHandler();
			return widgetMeta.registryHandler;
		}
		return null;
	};
});

export const defer = factory(({ id }) => {
	const [widgetId] = id.split('-');
	let isDeferred = false;
	return {
		pause() {
			const widgetMeta = widgetMetaMap.get(widgetId);
			if (!isDeferred && widgetMeta) {
				widgetMeta.deferRefs = widgetMeta.deferRefs + 1;
				isDeferred = true;
			}
		},
		resume() {
			const widgetMeta = widgetMetaMap.get(widgetId);
			if (isDeferred && widgetMeta) {
				widgetMeta.deferRefs = widgetMeta.deferRefs - 1;
				isDeferred = false;
			}
		}
	};
});

function wrapFunctionProperties(id: string, properties: any) {
	const props: any = {};
	const propertyNames = Object.keys(properties);
	for (let i = 0; i < propertyNames.length; i++) {
		const propertyName = propertyNames[i];
		if (typeof properties[propertyName] === 'function') {
			props[propertyName] = function WrappedProperty(...args: any[]) {
				const widgetMeta = widgetMetaMap.get(id);
				if (widgetMeta) {
					return widgetMeta.originalProperties[propertyName](...args);
				}
				return properties[propertyName](...args);
			};
			props[propertyName].unwrap = () => {
				const widgetMeta = widgetMetaMap.get(id);
				if (widgetMeta) {
					return widgetMeta.originalProperties[propertyName];
				}
				return properties[propertyName];
			};
		} else {
			props[propertyName] = properties[propertyName];
		}
	}
	return props;
}

type EventMapValue = { proxy: EventListener; callback: Function; options: { passive: boolean } } | undefined;

export function renderer(renderer: () => RenderResult): Renderer {
	let _mountOptions: MountOptions & { domNode: HTMLElement } = {
		sync: false,
		merge: true,
		transition: undefined,
		domNode: global.document.body,
		registry: new Registry()
	};
	let _invalidationQueue: InvalidationQueueItem[] = [];
	let _processQueue: (ProcessItem | DetachApplication | AttachApplication)[] = [];
	let _deferredProcessQueue: (ProcessItem | DetachApplication | AttachApplication)[] = [];
	let _applicationQueue: ApplicationInstruction[] = [];
	let _eventMap = new WeakMap<Node, { [index: string]: EventMapValue }>();
	let _idToWrapperMap = new Map<string, DNodeWrapper>();
	let _wrapperSiblingMap = new WeakMap<DNodeWrapper, DNodeWrapper>();
	let _idToChildrenWrappers = new Map<string, DNodeWrapper[]>();
	let _insertBeforeMap: undefined | WeakMap<DNodeWrapper, Node> = new WeakMap<DNodeWrapper, Node>();
	let _nodeToWrapperMap = new WeakMap<VNode | WNode<any>, WNodeWrapper>();
	let _renderScheduled: number | undefined;
	let _deferredRenderCallbacks: Function[] = [];
	let parentInvalidate: () => void;
	let _allMergedNodes: Node[] = [];
	let _appWrapperId: string | undefined;
	let _deferredProcessIds = new Map<number, Function>();

	function nodeOperation(
		propName: string,
		propValue: (() => boolean) | boolean,
		previousValue: boolean,
		domNode: HTMLElement & { [index: string]: any }
	): void {
		let result = propValue && !previousValue;
		if (typeof propValue === 'function') {
			result = propValue();
		}
		if (result === true) {
			_deferredRenderCallbacks.push(() => {
				domNode[propName]();
			});
		}
	}

	function updateEvent(
		domNode: Node,
		eventName: string,
		currentValue: (event: Event) => void,
		eventOptions?: { passive: string[] }
	) {
		const proxyEvents = _eventMap.get(domNode) || {};
		let proxyEvent = proxyEvents[eventName];

		let callback = currentValue;

		if (eventName === 'input') {
			callback = function(this: any, evt: Event) {
				currentValue.call(this, evt);
				(evt.target as any)['oninput-value'] = (evt.target as HTMLInputElement).value;
			};
		}

		const { passive: currentPassive = [] } = eventOptions || {};

		const isPassive = currentPassive.indexOf(`on${eventName}`) !== -1;

		const options = { passive: isPassive };

		if (proxyEvent && proxyEvent.options.passive !== isPassive) {
			domNode.removeEventListener(eventName, proxyEvent.proxy);
			proxyEvent = undefined;
		}

		if (proxyEvent) {
			proxyEvents[eventName] = { ...proxyEvent, callback };
			_eventMap.set(domNode, proxyEvents);
		} else {
			const proxy = (...args: any[]) => {
				const proxyEvents = _eventMap.get(domNode) || {};
				const proxyEvent = proxyEvents[eventName];
				proxyEvent && proxyEvent.callback(...args);
			};
			proxyEvents[eventName] = { callback, proxy, options };
			has('dom-passive-event')
				? domNode.addEventListener(eventName, proxy, options)
				: domNode.addEventListener(eventName, proxy);

			_eventMap.set(domNode, proxyEvents);
		}
	}

	function removeOrphanedEvents(
		domNode: Element,
		previousProperties: VNodeProperties,
		properties: VNodeProperties,
		onlyEvents: boolean = false
	) {
		Object.keys(previousProperties).forEach((propName) => {
			const isEvent = propName.substr(0, 2) === 'on' || onlyEvents;
			const eventName = onlyEvents ? propName : propName.substr(2);
			if (isEvent && !properties[propName]) {
				const proxyEvents = _eventMap.get(domNode) || {};
				let proxyEvent = proxyEvents[eventName];
				if (proxyEvent) {
					domNode.removeEventListener(eventName, proxyEvent.proxy);
					delete proxyEvents[eventName];
					_eventMap.set(domNode, proxyEvents);
				}
			}
		});
	}

	function resolveRegistryItem(wrapper: WNodeWrapper, instance?: any, id?: string) {
		if (!isWidget(wrapper.node.widgetConstructor)) {
			const owningNode = _nodeToWrapperMap.get(wrapper.node);
			if (owningNode) {
				if (owningNode.instance) {
					instance = owningNode.instance;
				} else {
					id = owningNode.id;
				}
			}
			let registry: RegistryHandler | undefined;
			if (instance) {
				const instanceData = widgetInstanceMap.get(instance);
				if (instanceData) {
					registry = instanceData.registry;
				}
			} else if (id !== undefined) {
				const widgetMeta = widgetMetaMap.get(id);
				if (widgetMeta) {
					if (!widgetMeta.registryHandler) {
						widgetMeta.registryHandler = new RegistryHandler();
						widgetMeta.registryHandler.base = widgetMeta.registry;
						widgetMeta.registryHandler.on('invalidate', widgetMeta.invalidator);
					}
					registry = widgetMeta.registryHandler;
				}
			}

			if (registry) {
				let registryLabel: symbol | string;
				if (isLazyDefine(wrapper.node.widgetConstructor)) {
					const { label, registryItem } = wrapper.node.widgetConstructor;
					if (!registry.has(label)) {
						registry.define(label, registryItem);
					}
					registryLabel = label;
				} else {
					registryLabel = wrapper.node.widgetConstructor as any;
				}
				let item = registry.get(registryLabel) as any;
				if (isWNodeFactory(item)) {
					const node = item(wrapper.node.properties, wrapper.node.children);
					if (isWidgetFunction(node.widgetConstructor)) {
						wrapper.registryItem = node.widgetConstructor;
					}
				} else {
					wrapper.registryItem = item;
				}
			}
		}
	}

	function mapNodeToInstance(nodes: DNode[], wrapper: WNodeWrapper) {
		while (nodes.length) {
			let node = nodes.pop();
			if (isWNode(node) || isVNode(node)) {
				if (!_nodeToWrapperMap.has(node)) {
					_nodeToWrapperMap.set(node, wrapper);
					if (node.children && node.children.length) {
						nodes = [...nodes, ...node.children];
					}
				}
			}
		}
	}

	function renderedToWrapper(
		rendered: DNode[],
		parent: DNodeWrapper,
		currentParent: DNodeWrapper | null
	): DNodeWrapper[] {
		const { requiresInsertBefore, hasPreviousSiblings, namespace, depth } = parent;
		const wrappedRendered: DNodeWrapper[] = [];
		const hasParentWNode = isWNodeWrapper(parent);
		const hasVirtualParentNode = isVirtualWrapper(parent);
		const currentParentChildren =
			(isVNodeWrapper(currentParent) && _idToChildrenWrappers.get(currentParent.id)) || [];
		const hasCurrentParentChildren = currentParentChildren.length > 0;
		const insertBefore =
			((requiresInsertBefore || hasPreviousSiblings !== false) && (hasParentWNode || hasVirtualParentNode)) ||
			(hasCurrentParentChildren && rendered.length > 1);
		let previousItem: DNodeWrapper | undefined;
		if (isWNodeWrapper(parent) && rendered.length) {
			mapNodeToInstance([...rendered], parent);
		}
		for (let i = 0; i < rendered.length; i++) {
			let renderedItem = rendered[i];
			if (!renderedItem || renderedItem === true) {
				continue;
			}
			if (typeof renderedItem === 'string' || typeof renderedItem === 'number') {
				renderedItem = toTextVNode(renderedItem);
			}
			const owningNode = _nodeToWrapperMap.get(renderedItem);
			const wrapper: DNodeWrapper = {
				node: renderedItem,
				depth: depth + 1,
				order: i,
				parentId: parent.id,
				requiresInsertBefore: insertBefore,
				hasParentWNode,
				namespace: namespace,
				reparent: hasParentWNode ? parent.reparent : undefined
			} as DNodeWrapper;
			if (isVNode(renderedItem)) {
				if (renderedItem.deferredPropertiesCallback) {
					(wrapper as VNodeWrapper).deferredProperties = renderedItem.deferredPropertiesCallback(false);
				}
				if (renderedItem.properties.exitAnimation) {
					parent.hasAnimations = true;
					let nextParent = _idToWrapperMap.get(parent.parentId);
					while (nextParent) {
						if (nextParent.hasAnimations) {
							break;
						}
						nextParent.hasAnimations = true;
						nextParent = _idToWrapperMap.get(nextParent.parentId);
					}
				}
			}
			if (owningNode) {
				wrapper.owningId = owningNode.id;
			}
			if (isWNode(renderedItem)) {
				resolveRegistryItem(wrapper as WNodeWrapper, (parent as any).instance, (parent as any).id);
			}
			if (previousItem) {
				_wrapperSiblingMap.set(previousItem, wrapper);
			}
			wrappedRendered.push(wrapper);
			previousItem = wrapper;
		}
		return wrappedRendered;
	}

	function findParentDomNode(currentNode: DNodeWrapper): Node | undefined {
		let parentDomNode: Node | undefined;
		let parentWrapper = _idToWrapperMap.get(currentNode.parentId);

		while (!parentDomNode && parentWrapper) {
			if (
				!parentDomNode &&
				isVNodeWrapper(parentWrapper) &&
				!isVirtualWrapper(parentWrapper) &&
				parentWrapper.domNode
			) {
				parentDomNode = parentWrapper.domNode;
			}
			parentWrapper = _idToWrapperMap.get(parentWrapper.parentId);
		}
		return parentDomNode;
	}

	function runDeferredProperties(next: VNodeWrapper) {
		const { deferredPropertiesCallback } = next.node;
		if (deferredPropertiesCallback) {
			const properties = next.node.properties;
			_deferredRenderCallbacks.push(() => {
				if (_idToWrapperMap.has(next.owningId)) {
					const deferredProperties = next.deferredProperties;
					next.deferredProperties = deferredPropertiesCallback(true);
					processProperties(next, {
						properties: { ...deferredProperties, ...properties }
					});
				}
			});
		}
	}

	function findInsertBefore(next: DNodeWrapper) {
		let insertBefore: Node | null = null;
		let searchNode: DNodeWrapper | undefined = next;
		while (!insertBefore) {
			const nextSibling = _wrapperSiblingMap.get(searchNode);
			if (nextSibling) {
				if (isBodyWrapper(nextSibling) || isHeadWrapper(nextSibling)) {
					searchNode = nextSibling;
					continue;
				}
				let domNode = nextSibling.domNode;
				if (isWNodeWrapper(nextSibling) || isVirtualWrapper(nextSibling)) {
					if (!nextSibling.childDomWrapperId) {
						nextSibling.childDomWrapperId = findDomNodeOnParentWrapper(nextSibling.id);
					}
					if (nextSibling.childDomWrapperId) {
						const childWrapper = _idToWrapperMap.get(nextSibling.childDomWrapperId);
						if (
							childWrapper &&
							!childWrapper.reparent &&
							!isBodyWrapper(childWrapper) &&
							!isHeadWrapper(childWrapper)
						) {
							domNode = childWrapper.domNode;
						}
					}
				}
				if (!nextSibling.reparent && domNode && domNode.parentNode) {
					insertBefore = domNode;
					break;
				}
				searchNode = nextSibling;
				continue;
			}
			searchNode = searchNode && _idToWrapperMap.get(searchNode.parentId);
			if (!searchNode || (isVNodeWrapper(searchNode) && !isVirtualWrapper(searchNode))) {
				break;
			}
		}
		return insertBefore;
	}

	function setValue(domNode: any, propValue?: any, previousValue?: any) {
		const domValue = domNode.value;
		const onInputValue = domNode['oninput-value'];
		const onSelectValue = domNode['select-value'];

		if (onSelectValue && domValue !== onSelectValue) {
			domNode.value = onSelectValue;
			if (domNode.value === onSelectValue) {
				domNode['select-value'] = undefined;
			}
		} else if ((onInputValue && domValue === onInputValue) || propValue !== previousValue) {
			domNode.value = propValue;
			domNode['oninput-value'] = undefined;
		}
	}

	function setProperties(
		domNode: HTMLElement,
		currentProperties: VNodeProperties = {},
		nextWrapper: VNodeWrapper,
		includesEventsAndAttributes = true
	): void {
		const properties = nextWrapper.deferredProperties
			? { ...nextWrapper.deferredProperties, ...nextWrapper.node.properties }
			: nextWrapper.node.properties;
		const propNames = Object.keys(properties);
		const propCount = propNames.length;
		if (propNames.indexOf('classes') === -1 && currentProperties.classes) {
			domNode.removeAttribute('class');
		}

		includesEventsAndAttributes && removeOrphanedEvents(domNode, currentProperties, properties);

		for (let i = 0; i < propCount; i++) {
			const propName = propNames[i];
			let propValue = properties[propName];
			const previousValue = currentProperties[propName];
			if (propName === 'classes') {
				const previousClassString = createClassPropValue(previousValue);
				let currentClassString = createClassPropValue(propValue);
				if (previousClassString !== currentClassString) {
					if (currentClassString) {
						if (nextWrapper.merged) {
							const domClasses = (domNode.getAttribute('class') || '').split(' ');
							for (let i = 0; i < domClasses.length; i++) {
								if (currentClassString.indexOf(domClasses[i]) === -1) {
									currentClassString = `${domClasses[i]} ${currentClassString}`;
								}
							}
						}
						domNode.setAttribute('class', currentClassString);
					} else {
						domNode.removeAttribute('class');
					}
				}
			} else if (nodeOperations.indexOf(propName) !== -1) {
				nodeOperation(propName, propValue, previousValue, domNode);
			} else if (propName === 'styles') {
				const styleNames = Object.keys(propValue);
				const styleCount = styleNames.length;
				for (let j = 0; j < styleCount; j++) {
					const styleName = styleNames[j];
					const newStyleValue = propValue[styleName];
					const oldStyleValue = previousValue && previousValue[styleName];
					if (newStyleValue === oldStyleValue) {
						continue;
					}
					(domNode.style as any)[styleName] = newStyleValue || '';
				}
			} else {
				if (!propValue && typeof previousValue === 'string') {
					propValue = '';
				}
				if (propName === 'value') {
					if ((domNode as HTMLElement).tagName === 'SELECT') {
						(domNode as any)['select-value'] = propValue;
					}
					setValue(domNode, propValue, previousValue);
				} else if (propName !== 'key') {
					const type = typeof propValue;
					if (
						type === 'function' &&
						propName.lastIndexOf('on', 0) === 0 &&
						includesEventsAndAttributes &&
						(propValue !== previousValue || properties.oneventoptions)
					) {
						updateEvent(domNode, propName.substr(2), propValue, properties.oneventoptions);
					} else if (propName === 'oneventoptions') {
					} else if (propValue !== previousValue) {
						if (type === 'string' && propName !== 'innerHTML' && includesEventsAndAttributes) {
							updateAttribute(domNode, propName, propValue, nextWrapper.namespace);
						} else if (propName === 'scrollLeft' || propName === 'scrollTop') {
							if ((domNode as any)[propName] !== propValue) {
								(domNode as any)[propName] = propValue;
							}
						} else {
							(domNode as any)[propName] = propValue;
						}
					}
				}
			}
		}
	}

	function _createDeferredRenderCallback(): (() => void) | undefined {
		const callbacks = _deferredRenderCallbacks;
		_deferredRenderCallbacks = [];
		if (callbacks.length) {
			return () => {
				let callback: Function | undefined;
				while ((callback = callbacks.shift())) {
					callback();
				}
			};
		}
	}

	function _scheduleDeferredRenderCallbacks() {
		const { sync } = _mountOptions;
		const run = _createDeferredRenderCallback();
		if (run) {
			if (sync) {
				run();
			} else {
				let id: number;
				id = global.requestAnimationFrame(() => {
					_deferredProcessIds.delete(id);
					run();
				});
				_deferredProcessIds.set(id, run);
			}
		}
	}

	function processProperties(next: VNodeWrapper, previousProperties: PreviousProperties) {
		if (next.node.attributes && next.node.events) {
			updateAttributes(
				next.domNode as HTMLElement,
				previousProperties.attributes || {},
				next.node.attributes,
				next.namespace
			);
			setProperties(next.domNode as HTMLElement, previousProperties.properties, next, false);
			const events = next.node.events || {};
			if (previousProperties.events) {
				removeOrphanedEvents(
					next.domNode as HTMLElement,
					previousProperties.events || {},
					next.node.events,
					true
				);
			}
			previousProperties.events = previousProperties.events || {};
			Object.keys(events).forEach((event) => {
				updateEvent(next.domNode as HTMLElement, event, events[event]);
			});
		} else {
			setProperties(next.domNode as HTMLElement, previousProperties.properties, next);
		}
	}

	function unmount() {
		_processQueue.push({
			current: [_idToWrapperMap.get(_appWrapperId!)!],
			next: [],
			meta: {}
		});
		if (_renderScheduled) {
			global.cancelAnimationFrame(_renderScheduled);
		}
		_runProcessQueue();
		_runDomInstructionQueue();
		_deferredProcessIds.forEach((callback, id) => {
			global.cancelAnimationFrame(id);
			callback();
		});
		const run = _createDeferredRenderCallback();
		run && run();
		_invalidationQueue = [];
		_processQueue = [];
		_deferredProcessQueue = [];
		_applicationQueue = [];
		_deferredRenderCallbacks = [];
		_allMergedNodes = [];
		_eventMap = new WeakMap();
		_idToWrapperMap.clear();
		_idToChildrenWrappers.clear();
		_wrapperSiblingMap = new WeakMap();
		_nodeToWrapperMap = new WeakMap();
		_insertBeforeMap = undefined;
	}

	function mount(mountOptions: Partial<MountOptions> = {}) {
		let domNode = mountOptions.domNode;
		if (!domNode) {
			if (has('dojo-debug') && domNode === null) {
				console.warn('Unable to find node to mount the application, defaulting to the document body.');
			}
			domNode = global.document.body as HTMLElement;
		}
		_mountOptions = { ..._mountOptions, ...mountOptions, domNode };
		const renderResult = wrapNodes(renderer)({}, []);
		_appWrapperId = `${wrapperId++}`;
		const nextWrapper = {
			id: _appWrapperId,
			node: renderResult,
			order: 0,
			depth: 1,
			owningId: '-1',
			parentId: '-1',
			siblingId: '-1',
			properties: {}
		};
		_idToWrapperMap.set('-1', {
			id: `-1`,
			depth: 0,
			order: 0,
			owningId: '',
			domNode,
			node: v('fake'),
			parentId: '-1'
		});
		_processQueue.push({
			current: [],
			next: [nextWrapper],
			meta: { mergeNodes: arrayFrom(domNode.childNodes) }
		});
		_runProcessQueue();
		_runDomInstructionQueue();
		_cleanUpMergedNodes();
		_insertBeforeMap = undefined;
		_scheduleDeferredRenderCallbacks();
		if (!_renderScheduled) {
			setRendering(false);
		}
	}

	function invalidate() {
		parentInvalidate && parentInvalidate();
	}

	function _schedule(): void {
		const { sync } = _mountOptions;
		if (sync) {
			_runInvalidationQueue();
		} else if (!_renderScheduled) {
			setRendering(true);
			_renderScheduled = global.requestAnimationFrame(() => {
				_runInvalidationQueue();
			});
		}
	}

	function getWNodeWrapper(id: string) {
		const wrapper = _idToWrapperMap.get(id);
		if (wrapper && isWNodeWrapper(wrapper)) {
			return wrapper;
		}
	}

	function _runInvalidationQueue() {
		_renderScheduled = undefined;
		let invalidationQueue = [..._invalidationQueue];
		const previouslyRendered = [];
		_invalidationQueue = [];
		invalidationQueue.sort((a, b) => {
			let result = b.depth - a.depth;
			if (result === 0) {
				result = b.order - a.order;
			}
			return result;
		});
		if (_deferredProcessQueue.length) {
			_processQueue = [..._deferredProcessQueue];
			_deferredProcessQueue = [];
			_runProcessQueue();
			if (_deferredProcessQueue.length) {
				_invalidationQueue = [...invalidationQueue];
				invalidationQueue = [];
			}
		}
		let item: InvalidationQueueItem | undefined;
		while ((item = invalidationQueue.pop())) {
			let { id } = item;
			const current = getWNodeWrapper(id);
			if (!current || previouslyRendered.indexOf(id) !== -1 || !_idToWrapperMap.has(current.parentId)) {
				continue;
			}
			previouslyRendered.push(id);
			const sibling = _wrapperSiblingMap.get(current);
			const next = {
				node: {
					type: WNODE,
					widgetConstructor: current.node.widgetConstructor,
					properties: current.properties || {},
					children: current.node.children || []
				},
				instance: current.instance,
				id: current.id,
				properties: current.properties,
				depth: current.depth,
				order: current.order,
				owningId: current.owningId,
				parentId: current.parentId,
				registryItem: current.registryItem
			};

			sibling && _wrapperSiblingMap.set(next, sibling);
			const result = _updateWidget({ current, next });
			if (result && result.item) {
				_processQueue.push(result.item);
				_idToWrapperMap.set(id, next);
				_runProcessQueue();
			}
		}
		_runDomInstructionQueue();
		_cleanUpMergedNodes();
		_scheduleDeferredRenderCallbacks();
		if (!_renderScheduled) {
			setRendering(false);
		}
	}

	function _cleanUpMergedNodes() {
		if (_deferredProcessQueue.length === 0) {
			let mergedNode: Node | undefined;
			while ((mergedNode = _allMergedNodes.pop())) {
				mergedNode.parentNode && mergedNode.parentNode.removeChild(mergedNode);
			}
			_mountOptions.merge = false;
		}
	}

	function _runProcessQueue() {
		let item: DetachApplication | AttachApplication | ProcessItem | undefined;
		while ((item = _processQueue.pop())) {
			if (isAttachApplication(item)) {
				item.instance && _applicationQueue.push(item as any);
			} else {
				const { current, next, meta } = item;
				_process(current || EMPTY_ARRAY, next || EMPTY_ARRAY, meta);
			}
		}
	}

	function _runDomInstructionQueue(): void {
		_applicationQueue.reverse();
		let item: ApplicationInstruction | undefined;
		while ((item = _applicationQueue.pop())) {
			if (item.type === 'create') {
				const {
					parentDomNode,
					next,
					next: { domNode, merged, requiresInsertBefore, node }
				} = item;

				processProperties(next, { properties: {} });
				runDeferredProperties(next);
				if (!merged) {
					let insertBefore: any;
					if (requiresInsertBefore) {
						insertBefore = findInsertBefore(next);
					} else if (_insertBeforeMap) {
						insertBefore = _insertBeforeMap.get(next);
					}
					parentDomNode.insertBefore(domNode!, insertBefore);
					if (isDomVNode(next.node) && next.node.onAttach) {
						next.node.onAttach();
					}
				}
				if ((domNode as HTMLElement).tagName === 'OPTION' && domNode!.parentElement) {
					setValue(domNode!.parentElement);
				}
				const { enterAnimation, enterAnimationActive } = node.properties;
				if (_mountOptions.transition && enterAnimation && enterAnimation !== true) {
					_mountOptions.transition.enter(domNode as HTMLElement, enterAnimation, enterAnimationActive);
				}
				const owningWrapper = _nodeToWrapperMap.get(next.node);
				if (owningWrapper && node.properties.key != null) {
					if (owningWrapper.instance) {
						const instanceData = widgetInstanceMap.get(owningWrapper.instance);
						instanceData && instanceData.nodeHandler.add(domNode as HTMLElement, `${node.properties.key}`);
					} else {
						addNodeToMap(owningWrapper.id, node.properties.key, domNode as HTMLElement);
					}
				}
				item.next.inserted = true;
				item.next.reparent = undefined;
			} else if (item.type === 'update') {
				const {
					next,
					next: { domNode },
					current,
					current: { domNode: currentDomNode }
				} = item;
				if (isTextNode(domNode) && isTextNode(currentDomNode) && domNode !== currentDomNode) {
					currentDomNode.parentNode && currentDomNode.parentNode.replaceChild(domNode, currentDomNode);
				} else {
					const previousProperties = buildPreviousProperties(domNode, current);
					processProperties(next, previousProperties);
					runDeferredProperties(next);
				}
				if (isDomVNode(next.node) && next.node.onUpdate) {
					next.node.onUpdate();
				}
			} else if (item.type === 'delete') {
				const { current } = item;
				const { exitAnimation, exitAnimationActive } = current.node.properties;
				if (_mountOptions.transition && exitAnimation && exitAnimation !== true) {
					_mountOptions.transition.exit(current.domNode as HTMLElement, exitAnimation, exitAnimationActive);
				} else {
					current.domNode!.parentNode!.removeChild(current.domNode!);
				}
				if (isDomVNode(current.node) && current.node.onDetach) {
					current.node.onDetach();
				}
			} else if (item.type === 'attach') {
				const { instance, attached } = item;
				const instanceData = widgetInstanceMap.get(instance);
				if (instanceData) {
					instanceData.nodeHandler.addRoot();
					attached && instanceData.onAttach();
				}
			} else if (item.type === 'detach') {
				if (item.current.instance) {
					const instanceData = widgetInstanceMap.get(item.current.instance);
					instanceData && instanceData.onDetach();
				}
				item.current.instance = undefined;
			}
		}
		if (_deferredProcessQueue.length === 0) {
			_nodeToWrapperMap = new WeakMap();
		}
	}

	function _processMergeNodes(next: DNodeWrapper, mergeNodes: Node[]) {
		const { merge } = _mountOptions;
		if (merge && mergeNodes.length) {
			if (isVNodeWrapper(next)) {
				let {
					node: { tag }
				} = next;
				for (let i = 0; i < mergeNodes.length; i++) {
					const domElement = mergeNodes[i] as Element;
					const tagName = domElement.tagName || '';
					if (tag.toUpperCase() === tagName.toUpperCase()) {
						const mergeNodeIndex = _allMergedNodes.indexOf(domElement);
						if (mergeNodeIndex !== -1) {
							_allMergedNodes.splice(mergeNodeIndex, 1);
						}
						mergeNodes.splice(i, 1);
						next.domNode = domElement;
						break;
					}
				}
			} else {
				next.mergeNodes = mergeNodes;
			}
		}
	}

	function distinguishableCheck(childNodes: DNodeWrapper[], index: number) {
		const parentWNodeWrapper = getWNodeWrapper(childNodes[index].owningId);
		checkDistinguishable(childNodes, index, parentWNodeWrapper);
	}

	function createKeyMap(wrappers: DNodeWrapper[]): Map<string, DNodeWrapper> {
		const keys = new Map();
		for (let i = 0; i < wrappers.length; i++) {
			const wrapper = wrappers[i];
			if (wrapper.node.properties.key != null) {
				keys.set(wrapper.node.properties.key, wrapper);
			}
		}
		return keys;
	}

	function _process(current: DNodeWrapper[], next: DNodeWrapper[], meta: ProcessMeta = {}): void {
		let { mergeNodes = [], oldIndex = 0, newIndex = 0, currentKeyMap } = meta;
		const currentLength = current.length;
		const nextLength = next.length;
		const hasPreviousSiblings = currentLength > 1 || (currentLength > 0 && currentLength < nextLength);
		let instructions: Instruction[] = [];
		let replace = false;
		if (!currentKeyMap) {
			currentKeyMap = createKeyMap(current);
			if (currentKeyMap.size === currentLength) {
				const nextKeyMap = createKeyMap(next);
				if (nextKeyMap.size === nextLength) {
					const currentEntries = [...currentKeyMap.entries()];
					for (let i = 0; i < currentEntries.length; i++) {
						const [key, value] = currentEntries[i];
						if (nextKeyMap.has(key)) {
							instructions = [];
							replace = false;
							break;
						}
						replace = true;
						instructions.push({ current: value, next: undefined });
					}
				}
			}
		}

		if (replace || (currentLength === 0 && !_mountOptions.merge)) {
			for (let i = 0; i < nextLength; i++) {
				instructions.push({ current: undefined, next: next[i] });
			}
		} else {
			if (newIndex < nextLength) {
				let currentWrapper = oldIndex < currentLength ? current[oldIndex] : undefined;
				const nextWrapper = next[newIndex];
				nextWrapper.hasPreviousSiblings = hasPreviousSiblings;
				_processMergeNodes(nextWrapper, mergeNodes);
				if (currentWrapper && same(currentWrapper, nextWrapper)) {
					oldIndex++;
					newIndex++;
					if (isVNodeWrapper(currentWrapper) && isVNodeWrapper(nextWrapper)) {
						nextWrapper.inserted = currentWrapper.inserted;
					}
					if (isVNodeWrapper(currentWrapper) && isVNodeWrapper(nextWrapper) && nextWrapper.reparent) {
						nextWrapper.domNode = currentWrapper.domNode;
						nextWrapper.reparent = currentWrapper.id;
						currentWrapper.reparent = currentWrapper.id;
						instructions.push({ current: currentWrapper, next: undefined });
						instructions.push({ current: undefined, next: nextWrapper });
					} else {
						instructions.push({ current: currentWrapper, next: nextWrapper });
					}
				} else if (!currentWrapper || findIndexOfChild(current, nextWrapper, oldIndex + 1) === -1) {
					has('dojo-debug') && currentLength && distinguishableCheck(next, newIndex);
					const foundWrapper = currentKeyMap.get(nextWrapper.node.properties.key);
					if (foundWrapper && same(foundWrapper, nextWrapper)) {
						const { domNode, id } = foundWrapper;
						nextWrapper.domNode = domNode;
						nextWrapper.reparent = id;
						currentKeyMap.delete(nextWrapper.node.properties.key);
					}
					instructions.push({ current: undefined, next: nextWrapper });
					newIndex++;
				} else if (findIndexOfChild(next, currentWrapper, newIndex + 1) === -1) {
					has('dojo-debug') && distinguishableCheck(current, oldIndex);
					instructions.push({ current: currentWrapper, next: undefined });
					oldIndex++;
				} else {
					has('dojo-debug') && distinguishableCheck(next, newIndex);
					has('dojo-debug') && distinguishableCheck(current, oldIndex);
					const foundWrapper = currentKeyMap.get(nextWrapper.node.properties.key);
					if (foundWrapper && same(foundWrapper, nextWrapper)) {
						const { domNode, id } = foundWrapper;
						nextWrapper.domNode = domNode;
						nextWrapper.reparent = id;
						foundWrapper.reparent = id;
						currentWrapper.reparent = id;
						currentKeyMap.delete(nextWrapper.node.properties.key);
						instructions.push({ current: foundWrapper, next: undefined });
					}
					instructions.push({ current: currentWrapper, next: undefined });
					instructions.push({ current: undefined, next: nextWrapper });
					oldIndex++;
					newIndex++;
				}
			}
			if (newIndex < nextLength) {
				_processQueue.push({
					current,
					next,
					meta: { mergeNodes, oldIndex, newIndex, currentKeyMap }
				});
			}
			if (currentLength > oldIndex && newIndex >= nextLength) {
				currentKeyMap.clear();
				for (let i = oldIndex; i < currentLength; i++) {
					has('dojo-debug') && distinguishableCheck(current, i);
					instructions.push({ current: current[i], next: undefined });
				}
			}
		}

		for (let i = 0; i < instructions.length; i++) {
			const result = _processOne(instructions[i]);
			if (result === false) {
				if (_mountOptions.merge && mergeNodes.length) {
					if (newIndex < nextLength) {
						_processQueue.pop();
					}
					_processQueue.push({ next, current, meta });
					_deferredProcessQueue = _processQueue;
					_processQueue = [];
					break;
				}
				continue;
			}
			const { widget, item, dom } = result;
			widget && _processQueue.push(widget);
			item && _processQueue.push(item);
			dom && _applicationQueue.push(dom);
		}
	}

	function _processOne({ current, next }: Instruction): ProcessResult | false {
		if (current !== next) {
			if (!current && next) {
				if (isVNodeWrapper(next)) {
					return _createDom({ next });
				} else {
					return _createWidget({ next });
				}
			} else if (current && next) {
				if (isVNodeWrapper(current) && isVNodeWrapper(next)) {
					return _updateDom({ current, next });
				} else if (isWNodeWrapper(current) && isWNodeWrapper(next)) {
					return _updateWidget({ current, next });
				}
			} else if (current && !next) {
				if (isVNodeWrapper(current)) {
					return _removeDom({ current });
				} else if (isWNodeWrapper(current)) {
					return _removeWidget({ current });
				}
			}
		}
		return {};
	}

	function createWidgetOptions(id: string, widgetId: string, middleware?: any) {
		return {
			id,
			properties: () => {
				const widgetMeta = widgetMetaMap.get(widgetId);
				if (widgetMeta) {
					widgetMeta.propertiesCalled = true;
					return { ...widgetMeta.properties };
				}
				return {};
			},
			children: () => {
				const widgetMeta = widgetMetaMap.get(widgetId);
				if (widgetMeta) {
					return widgetMeta.children;
				}
				return [];
			},
			middleware
		};
	}

	function resolveMiddleware(
		middlewares: any,
		id: string,
		middlewareIds: string[] = []
	): { middlewares: any; ids: string[] } {
		const keys = Object.keys(middlewares);
		const results: any = {};
		const uniqueId = `${id}-${metaId++}`;
		for (let i = 0; i < keys.length; i++) {
			const middleware = middlewares[keys[i]]();
			const payload = createWidgetOptions(uniqueId, id);
			if (middleware.middlewares) {
				const { middlewares: resolvedMiddleware } = resolveMiddleware(
					middleware.middlewares,
					id,
					middlewareIds
				);
				payload.middleware = resolvedMiddleware;
				results[keys[i]] = middleware.callback(payload);
			} else {
				results[keys[i]] = middleware.callback(payload);
			}
		}
		middlewareIds.push(uniqueId);
		return { middlewares: results, ids: middlewareIds };
	}

	function _createWidget({ next }: CreateWidgetInstruction): ProcessResult | false {
		let {
			node: { widgetConstructor }
		} = next;
		let { registry } = _mountOptions;
		let Constructor = next.registryItem || widgetConstructor;
		if (!isWidget(Constructor)) {
			resolveRegistryItem(next);
			if (!next.registryItem) {
				return false;
			}
			Constructor = next.registryItem;
		}

		let rendered: RenderResult;
		let invalidate: () => void;
		next.properties = { ...next.node.properties };
		next.id = next.id || `${wrapperId++}`;
		_idToWrapperMap.set(next.id, next);
		const { id, depth, order } = next;
		if (!isWidgetBaseConstructor(Constructor)) {
			let widgetMeta = widgetMetaMap.get(id);
			if (!widgetMeta) {
				invalidate = () => {
					const widgetMeta = widgetMetaMap.get(id);
					if (widgetMeta) {
						widgetMeta.dirty = true;
						if (!widgetMeta.rendering && _idToWrapperMap.has(id)) {
							_invalidationQueue.push({ id, depth, order });
							_schedule();
						}
					}
				};

				widgetMeta = {
					widgetName: Constructor.name || 'unknown',
					mountNode: _mountOptions.domNode,
					dirty: false,
					invalidator: invalidate,
					properties: wrapFunctionProperties(id, next.node.properties),
					originalProperties: { ...next.node.properties },
					children: next.node.children,
					deferRefs: 0,
					rendering: true,
					middleware: {},
					middlewareIds: [],
					registry: _mountOptions.registry,
					propertiesCalled: false
				};

				widgetMetaMap.set(next.id, widgetMeta);
				if ((Constructor as any).middlewares && Object.keys((Constructor as any).middlewares).length) {
					const { middlewares, ids } = resolveMiddleware((Constructor as any).middlewares, id);
					widgetMeta.middleware = middlewares;
					widgetMeta.middlewareIds = ids;
				}
			} else {
				invalidate = widgetMeta.invalidator;
			}

			rendered = Constructor(createWidgetOptions(id, id, widgetMeta.middleware));
			widgetMeta.rendering = false;
			widgetMeta.propertiesCalled = false;
			if (widgetMeta.deferRefs > 0) {
				return false;
			}
		} else {
			let instance = new Constructor() as WidgetBaseInterface & {
				invalidate: any;
				registry: any;
			};
			instance.registry.base = registry;
			const instanceData = widgetInstanceMap.get(instance)!;
			invalidate = () => {
				instanceData.dirty = true;
				if (!instanceData.rendering && _idToWrapperMap.has(id)) {
					_invalidationQueue.push({ id, depth, order });
					_schedule();
				}
			};
			instanceData.invalidate = invalidate;
			instanceData.rendering = true;
			instance.__setProperties__(next.node.properties);
			instance.__setChildren__(next.node.children);
			next.instance = instance;
			rendered = instance.__render__();
			instanceData.rendering = false;
		}

		let children: DNodeWrapper[] | undefined;
		if (rendered) {
			rendered = Array.isArray(rendered) ? rendered : [rendered];
			children = renderedToWrapper(rendered, next, null);
			_idToChildrenWrappers.set(id, children);
		}

		if (!parentInvalidate && !(Constructor as any).isWNodeWrapper) {
			parentInvalidate = invalidate;
		}
		let currentChildren: undefined | DNodeWrapper[] = undefined;
		if (next.reparent) {
			currentChildren = _idToChildrenWrappers.get(next.reparent);
			_idToChildrenWrappers.delete(next.reparent);
			next.reparent = undefined;
		}

		return {
			item: {
				current: currentChildren,
				next: children,
				meta: { mergeNodes: next.mergeNodes }
			},
			widget: { type: 'attach', instance: next.instance, id, attached: true }
		};
	}

	function _updateWidget({ current, next }: UpdateWidgetInstruction): ProcessResult {
		current = getWNodeWrapper(current.id) || current;
		const { instance, domNode, hasAnimations, id } = current;
		let {
			node: { widgetConstructor }
		} = next;
		const Constructor = next.registryItem || widgetConstructor;

		if (!isWidget(Constructor)) {
			return {};
		}
		let rendered: RenderResult;
		let processResult: ProcessResult = {};
		let didRender = false;
		let currentChildren = _idToChildrenWrappers.get(current.id);
		next.hasAnimations = hasAnimations;
		next.id = id;
		next.properties = { ...next.node.properties };
		_wrapperSiblingMap.delete(current);
		if (domNode && domNode.parentNode) {
			next.domNode = domNode;
		}

		if (!isWidgetBaseConstructor(Constructor)) {
			const widgetMeta = widgetMetaMap.get(id);
			if (widgetMeta) {
				widgetMeta.originalProperties = { ...next.properties };
				widgetMeta.properties = wrapFunctionProperties(id, widgetMeta.originalProperties);
				widgetMeta.children = next.node.children;
				widgetMeta.rendering = true;
				const customProperties = runDiffs(widgetMeta, current.properties, widgetMeta.originalProperties);
				widgetMeta.properties = { ...widgetMeta.properties, ...customProperties };
				if (current.node.children.length > 0 || next.node.children.length > 0) {
					widgetMeta.dirty = true;
				}
				if (!widgetMeta.dirty) {
					propertiesDiff(
						current.properties,
						next.properties,
						() => {
							widgetMeta.dirty = true;
						},
						widgetMeta.customDiffProperties ? [...widgetMeta.customDiffProperties.values()] : []
					);
				}
				if (widgetMeta.dirty) {
					_idToChildrenWrappers.delete(id);
					didRender = true;
					rendered = Constructor(createWidgetOptions(id, id, widgetMeta.middleware));
					widgetMeta.dirty = false;
					if (widgetMeta.deferRefs > 0) {
						rendered = null;
					}
				}
				widgetMeta.rendering = false;
				widgetMeta.propertiesCalled = false;
			}
		} else {
			const instanceData = widgetInstanceMap.get(instance!)!;
			next.instance = instance;
			instanceData.rendering = true;
			instance!.__setProperties__(next.node.properties);
			instance!.__setChildren__(next.node.children);
			if (instanceData.dirty) {
				didRender = true;
				_idToChildrenWrappers.delete(id);
				rendered = instance!.__render__();
			}
			instanceData.rendering = false;
		}
		_idToWrapperMap.set(next.id, next);
		processResult.widget = { type: 'attach', instance, id, attached: false };

		let children: DNodeWrapper[] | undefined;
		if (rendered) {
			rendered = Array.isArray(rendered) ? rendered : [rendered];
			children = renderedToWrapper(rendered, next, current);
			_idToChildrenWrappers.set(id, children);
		}

		if (didRender) {
			processResult.item = {
				current: currentChildren,
				next: children,
				meta: {}
			};
		}
		return processResult;
	}

	function _removeWidget({ current }: RemoveWidgetInstruction): ProcessResult {
		current = getWNodeWrapper(current.id) || current;
		_idToWrapperMap.delete(current.id);
		const meta = widgetMetaMap.get(current.id);
		let currentChildren = _idToChildrenWrappers.get(current.id);
		_wrapperSiblingMap.delete(current);
		let processResult: ProcessResult = {};
		if (!current.reparent) {
			_idToChildrenWrappers.delete(current.id);
			processResult = {
				item: {
					current: currentChildren,
					meta: {}
				}
			};
		}
		if (meta) {
			meta.registryHandler && meta.registryHandler.destroy();
			destroyHandles(meta);
			widgetMetaMap.delete(current.id);
		} else {
			processResult.widget = { type: 'detach', current, instance: current.instance };
		}

		return processResult;
	}

	function findDomNodeOnParentWrapper(id: string): string | undefined {
		const children = _idToChildrenWrappers.get(id) || [];
		for (let i = 0; i < children.length; i++) {
			const child = children[i];
			if (child.domNode) {
				return child.id;
			}
			const childId = findDomNodeOnParentWrapper(child.id);
			if (childId) {
				return childId;
			}
		}
	}

	function _createDom({ next }: CreateDomInstruction): ProcessResult {
		const parentDomNode = findParentDomNode(next)!;
		const isVirtual = isVirtualWrapper(next);
		const isBody = isBodyWrapper(next);
		const isHead = isHeadWrapper(next);
		let mergeNodes: Node[] = [];
		next.id = `${wrapperId++}`;
		_idToWrapperMap.set(next.id, next);
		if (!next.domNode) {
			if ((next.node as any).domNode) {
				next.domNode = (next.node as any).domNode;
			} else {
				if (next.node.tag === 'svg') {
					next.namespace = NAMESPACE_SVG;
				}
				if (isBody) {
					next.domNode = global.document.body;
				} else if (isHead) {
					next.domNode = global.document.head;
				} else if (next.node.tag && !isVirtual) {
					if (next.namespace) {
						next.domNode = global.document.createElementNS(next.namespace, next.node.tag);
					} else {
						next.domNode = global.document.createElement(next.node.tag);
					}
				} else if (next.node.text != null) {
					next.domNode = global.document.createTextNode(next.node.text);
				}
			}
			if (_insertBeforeMap && _allMergedNodes.length) {
				if (parentDomNode === _allMergedNodes[0].parentNode) {
					_insertBeforeMap.set(next, _allMergedNodes[0]);
				}
			}
		} else if (_mountOptions.merge) {
			next.merged = true;
			if (isTextNode(next.domNode)) {
				if (next.domNode.data !== next.node.text) {
					_allMergedNodes = [next.domNode, ..._allMergedNodes];
					next.domNode = global.document.createTextNode(next.node.text);
					next.merged = false;
				}
			} else {
				mergeNodes = arrayFrom(next.domNode.childNodes);
				_allMergedNodes = [..._allMergedNodes, ...mergeNodes];
			}
		}
		let children: DNodeWrapper[] | undefined;
		if (next.domNode || isVirtual) {
			if (next.node.children && next.node.children.length) {
				children = renderedToWrapper(next.node.children, next, null);
				_idToChildrenWrappers.set(next.id, children);
			}
		}
		const dom: ApplicationInstruction | undefined = isSpecialWrapper(next)
			? undefined
			: {
					next: next!,
					parentDomNode: parentDomNode,
					type: 'create'
			  };

		let currentChildren: DNodeWrapper[] | undefined = undefined;
		if (next.reparent) {
			currentChildren = _idToChildrenWrappers.get(next.reparent);
			_idToChildrenWrappers.delete(next.reparent);
		}

		if (children || currentChildren) {
			return {
				item: {
					current: currentChildren,
					next: children,
					meta: { mergeNodes }
				},
				dom,
				widget: isVirtual ? { type: 'attach', id: next.id, attached: false } : undefined
			};
		}
		return { dom };
	}

	function _updateDom({ current, next }: UpdateDomInstruction): ProcessResult {
		next.domNode = current.domNode;
		next.namespace = current.namespace;
		next.id = current.id;
		next.childDomWrapperId = current.childDomWrapperId;
		let children: DNodeWrapper[] | undefined;
		let currentChildren = _idToChildrenWrappers.get(next.id);
		if (next.node.text != null && next.node.text !== current.node.text) {
			next.domNode = global.document.createTextNode(next.node.text);
		} else if (next.node.children) {
			children = renderedToWrapper(next.node.children, next, current);
			_idToChildrenWrappers.set(next.id, children);
		}
		_wrapperSiblingMap.delete(current);
		_idToWrapperMap.set(next.id, next);
		return {
			item: {
				current: currentChildren,
				next: children,
				meta: {}
			},
			dom: { type: 'update', next, current }
		};
	}

	function _removeDom({ current }: RemoveDomInstruction): ProcessResult {
		if (current.reparent) {
			return {};
		}
		const isSpecial = isSpecialWrapper(current);
		const children = _idToChildrenWrappers.get(current.id);
		_idToChildrenWrappers.delete(current.id);
		_idToWrapperMap.delete(current.id);
		_wrapperSiblingMap.delete(current);
		if (current.node.properties.key) {
			const widgetMeta = widgetMetaMap.get(current.owningId);
			const parentWrapper = getWNodeWrapper(current.owningId);
			if (widgetMeta) {
				widgetMeta.nodeMap && widgetMeta.nodeMap.delete(current.node.properties.key);
			} else if (parentWrapper && parentWrapper.instance) {
				const instanceData = widgetInstanceMap.get(parentWrapper.instance);
				instanceData && instanceData.nodeHandler.remove(current.node.properties.key);
			}
		}
		if (current.hasAnimations || isSpecial) {
			return {
				item: { current: children, meta: {} },
				dom: isSpecial ? undefined : { type: 'delete', current }
			};
		}

		if (children) {
			_deferredRenderCallbacks.push(() => {
				let wrappers = children || [];
				let wrapper: DNodeWrapper | undefined;
				let specialIds = [];
				while ((wrapper = wrappers.pop())) {
					if (isWNodeWrapper(wrapper)) {
						wrapper = getWNodeWrapper(wrapper.id) || wrapper;
						if (wrapper.instance) {
							const instanceData = widgetInstanceMap.get(wrapper.instance);
							instanceData && instanceData.onDetach();
							wrapper.instance = undefined;
						} else {
							const meta = widgetMetaMap.get(wrapper.id);
							if (meta) {
								meta.registryHandler && meta.registryHandler.destroy();
								destroyHandles(meta);
								widgetMetaMap.delete(wrapper.id);
							}
						}
					}
					let wrapperChildren = _idToChildrenWrappers.get(wrapper.id);
					if (wrapperChildren) {
						wrappers.push(...wrapperChildren);
					}
					if (isBodyWrapper(wrapper) || isHeadWrapper(wrapper)) {
						specialIds.push(wrapper.id);
					} else if (specialIds.indexOf(wrapper.parentId) !== -1) {
						if (isWNodeWrapper(wrapper) || isVirtualWrapper(wrapper)) {
							specialIds.push(wrapper.id);
						} else if (wrapper.domNode && wrapper.domNode.parentNode) {
							wrapper.domNode.parentNode.removeChild(wrapper.domNode);
						}
					} else if (isDomVNode(wrapper.node) && wrapper.node.onDetach) {
						wrapper.node.onDetach();
					}
					_idToChildrenWrappers.delete(wrapper.id);
					_idToWrapperMap.delete(wrapper.id);
				}
			});
		}

		return {
			dom: { type: 'delete', current }
		};
	}

	return {
		mount,
		unmount,
		invalidate
	};
}

export default renderer;
