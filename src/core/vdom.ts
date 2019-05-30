import global from '../shim/global';
import has from '../has/has';
import { WeakMap } from '../shim/WeakMap';
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
	UnionToIntersection,
	WidgetProperties,
	MiddlewareResultFactory,
	WidgetBaseTypes,
	RegistryLabel,
	DeferredVirtualProperties,
	DomOptions
} from './interfaces';
import transitionStrategy from './animations/cssTransitions';
import { Registry, isWidget, isWidgetBaseConstructor, isWidgetFunction, isWNodeFactory } from './Registry';
import { auto } from './diff';
import RegistryHandler from './RegistryHandler';
import { NodeHandler } from './NodeHandler';

declare global {
	namespace JSX {
		type Element = WNode;
		interface ElementAttributesProperty {
			properties: {};
		}
		interface IntrinsicElements {
			[key: string]: VNodeProperties;
		}
	}
}

export interface BaseNodeWrapper {
	owningId: string;
	node: WNode<any> | VNode;
	domNode?: Node;
	childrenWrappers?: DNodeWrapper[];
	depth: number;
	order: number;
	requiresInsertBefore?: boolean;
	hasPreviousSiblings?: boolean;
	hasParentWNode?: boolean;
	namespace?: string;
	hasAnimations?: boolean;
}

export interface WNodeWrapper extends BaseNodeWrapper {
	id: string;
	node: WNode<any>;
	instance?: any;
	mergeNodes?: Node[];
	nodeHandlerCalled?: boolean;
	registryItem?: Callback<any, any, RenderResult> | Constructor<any> | null;
	properties: any;
}

export interface WidgetMeta {
	dirty: boolean;
	invalidator: () => void;
	middleware: any;
	registryHandler: any;
	properties: any;
	children?: DNode[];
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
	transition: TransitionStrategy;
	domNode: HTMLElement;
	registry: Registry | null;
}

export interface Renderer {
	invalidate(): void;
	mount(mountOptions?: Partial<MountOptions>): void;
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
	instance: WidgetBaseInterface;
	attached: boolean;
}

interface DetachApplication {
	type: 'detach';
	current: WNodeWrapper;
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
	| AttachApplication
	| DetachApplication;

const EMPTY_ARRAY: DNodeWrapper[] = [];
const nodeOperations = ['focus', 'blur', 'scrollIntoView', 'click'];
const NAMESPACE_W3 = 'http://www.w3.org/';
const NAMESPACE_SVG = NAMESPACE_W3 + '2000/svg';
const NAMESPACE_XLINK = NAMESPACE_W3 + '1999/xlink';
const WNODE = '__WNODE_TYPE';
const VNODE = '__VNODE_TYPE';
const DOMVNODE = '__DOMVNODE_TYPE';

function isTextNode(item: any): item is Text {
	return item.nodeType === 3;
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

function isAttachApplication(value: any): value is AttachApplication | DetachApplication {
	return !!value.type;
}

export function isWNode<W extends WidgetBaseTypes = any>(child: any): child is WNode<W> {
	return Boolean(child && child !== true && typeof child !== 'string' && child.type === WNODE);
}

export function isVNode(child: DNode): child is VNode {
	return Boolean(
		child && child !== true && typeof child !== 'string' && (child.type === VNODE || child.type === DOMVNODE)
	);
}

export function isDomVNode(child: DNode): child is DomVNode {
	return Boolean(child && child !== true && typeof child !== 'string' && child.type === DOMVNODE);
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
	children?: W['children']
): WNode<W>;
export function w<W extends WidgetBaseTypes>(
	widgetConstructor: Constructor<W> | RegistryLabel | WNodeFactory<W> | LazyDefine<W>,
	properties: W['properties'],
	children?: W['children']
): WNode<W>;
export function w<W extends WidgetBaseTypes>(
	widgetConstructorOrNode:
		| Constructor<W>
		| RegistryLabel
		| WNodeFactory<W>
		| WNode<W>
		| LazyDefine<W>
		| Callback<any, any, RenderResult>,
	properties: W['properties'],
	children?: W['children']
): WNode<W> {
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
export function v(tag: string, properties: DeferredVirtualProperties | VNodeProperties, children?: DNode[]): VNode;
export function v(tag: string): VNode;
export function v(
	tag: string | VNode,
	propertiesOrChildren: VNodeProperties | DeferredVirtualProperties | DNode[] = {},
	children: undefined | DNode[] = undefined
): VNode {
	let properties: VNodeProperties | DeferredVirtualProperties = propertiesOrChildren;
	let deferredPropertiesCallback;

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
	{ node, attrs = {}, props = {}, on = {}, diffType = 'none', onAttach }: DomOptions,
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
		onAttach
	};
}

export const REGISTRY_ITEM = '__registry_item';

export class FromRegistry<P> {
	static type = REGISTRY_ITEM;
	properties: P = {} as P;
	name: string | undefined;
}

export function fromRegistry<P>(tag: string): Constructor<FromRegistry<P>> {
	return class extends FromRegistry<P> {
		properties: P = {} as P;
		static type = REGISTRY_ITEM;
		name = tag;
	};
}

function spreadChildren(children: any[], child: any): any[] {
	if (Array.isArray(child)) {
		return child.reduce(spreadChildren, children);
	} else {
		return [...children, child];
	}
}

export function tsx(tag: any, properties = {}, ...children: any[]): DNode {
	children = children.reduce(spreadChildren, []);
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

function diffProperties(current: any, next: any, invalidator: () => void) {
	const propertyNames = [...Object.keys(current), ...Object.keys(next)];
	let diffedProperties = [];
	for (let i = 0; i < propertyNames.length; i++) {
		if (diffedProperties.indexOf(propertyNames[i]) > -1) {
			continue;
		}
		const result = auto(current[propertyNames[i]], next[propertyNames[i]]);
		if (result.changed) {
			invalidator();
			break;
		}
		diffedProperties.push(propertyNames[i]);
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
		if (dnode1.instance === undefined && typeof widgetConstructor2 === 'string') {
			return false;
		}
		if (widgetConstructor1 !== widgetConstructor2) {
			return false;
		}
		if (dnode1.node.properties.key !== dnode2.node.properties.key) {
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

function runEnterAnimation(next: VNodeWrapper, transitions: TransitionStrategy) {
	const {
		domNode,
		node: { properties },
		node: {
			properties: { enterAnimation }
		}
	} = next;
	if (enterAnimation && enterAnimation !== true) {
		if (typeof enterAnimation === 'function') {
			return enterAnimation(domNode as Element, properties);
		}
		transitions.enter(domNode as Element, properties, enterAnimation);
	}
}

function runExitAnimation(current: VNodeWrapper, transitions: TransitionStrategy, exitAnimation: string | Function) {
	const {
		domNode,
		node: { properties }
	} = current;
	const removeDomNode = () => {
		domNode && domNode.parentNode && domNode.parentNode.removeChild(domNode);
		current.domNode = undefined;
	};
	if (typeof exitAnimation === 'function') {
		return exitAnimation(domNode as Element, removeDomNode, properties);
	}
	transitions.exit(domNode as Element, properties, exitAnimation, removeDomNode);
}

function arrayFrom(arr: any) {
	return Array.prototype.slice.call(arr);
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
let wrapperId = 0;
let metaId = 0;

export const invalidator = factory(({ id }) => {
	const [widgetId] = id.split('-');
	return () => {
		const widgetMeta = widgetMetaMap.get(widgetId);
		if (widgetMeta) {
			return widgetMeta.invalidator();
		}
	};
});

function createFactory(callback: any, middlewares: any): any {
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
	factory.isFactory = true;
	return factory;
}

export function create<T extends MiddlewareMap<any>, MiddlewareProps = ReturnType<T[keyof T]>['properties']>(
	middlewares: T = {} as T
) {
	function properties<Props extends {}>() {
		function returns<ReturnValue>(
			callback: Callback<WidgetProperties & Props & UnionToIntersection<MiddlewareProps>, T, ReturnValue>
		): ReturnValue extends RenderResult
			? WNodeFactory<{
					properties: Props & WidgetProperties & UnionToIntersection<MiddlewareProps>;
					children: DNode[];
			  }>
			: MiddlewareResultFactory<WidgetProperties & Props & UnionToIntersection<MiddlewareProps>, T, ReturnValue> {
			return createFactory(callback, middlewares);
		}
		return returns;
	}

	function returns<ReturnValue>(
		callback: Callback<WidgetProperties & UnionToIntersection<MiddlewareProps>, T, ReturnValue>
	): ReturnValue extends RenderResult
		? WNodeFactory<{
				properties: WidgetProperties & UnionToIntersection<MiddlewareProps>;
				children: DNode[];
		  }>
		: MiddlewareResultFactory<WidgetProperties & UnionToIntersection<MiddlewareProps>, T, ReturnValue> {
		return createFactory(callback, middlewares);
	}
	returns.properties = properties;
	return returns;
}

export function renderer(renderer: () => RenderResult): Renderer {
	let _mountOptions: MountOptions = {
		sync: false,
		merge: true,
		transition: transitionStrategy,
		domNode: global.document.body,
		registry: null
	};
	let _invalidationQueue: InvalidationQueueItem[] = [];
	let _processQueue: (ProcessItem | DetachApplication | AttachApplication)[] = [];
	let _deferredProcessQueue: (ProcessItem | DetachApplication | AttachApplication)[] = [];
	let _applicationQueue: ApplicationInstruction[] = [];
	let _eventMap = new WeakMap<Function, EventListener>();
	let _idToWrapperMap = new Map<string, WNodeWrapper>();
	let _parentWrapperMap = new WeakMap<DNodeWrapper, DNodeWrapper>();
	let _wrapperSiblingMap = new WeakMap<DNodeWrapper, DNodeWrapper>();
	let _insertBeforeMap: undefined | WeakMap<DNodeWrapper, Node> = new WeakMap<DNodeWrapper, Node>();
	let _nodeToWrapperMap = new WeakMap<VNode | WNode<any>, WNodeWrapper>();
	let _renderScheduled: number | undefined;
	let _idleCallbacks: Function[] = [];
	let _deferredRenderCallbacks: Function[] = [];
	let parentInvalidate: () => void;
	let _allMergedNodes: Node[] = [];

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
		previousValue?: Function
	) {
		if (previousValue) {
			const previousEvent = _eventMap.get(previousValue);
			previousEvent && domNode.removeEventListener(eventName, previousEvent);
		}

		let callback = currentValue;

		if (eventName === 'input') {
			callback = function(this: any, evt: Event) {
				currentValue.call(this, evt);
				(evt.target as any)['oninput-value'] = (evt.target as HTMLInputElement).value;
			};
		}

		domNode.addEventListener(eventName, callback);
		_eventMap.set(currentValue, callback);
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
				const eventCallback = _eventMap.get(previousProperties[propName]);
				if (eventCallback) {
					domNode.removeEventListener(eventName, eventCallback);
				}
			}
		});
	}

	function resolveRegistryItem(wrapper: WNodeWrapper, instance?: any, id?: string) {
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
				registry = widgetMeta.registryHandler;
			}
		}

		if (registry) {
			if (!isWidget(wrapper.node.widgetConstructor)) {
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
		let node: DNode;
		while ((node = nodes.pop())) {
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
		const currentParentChildren = (isVNodeWrapper(currentParent) && currentParent.childrenWrappers) || [];
		const hasCurrentParentChildren = currentParentChildren.length > 0;
		const insertBefore =
			((requiresInsertBefore || hasPreviousSiblings !== false) && hasParentWNode) ||
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
			if (typeof renderedItem === 'string') {
				renderedItem = toTextVNode(renderedItem);
			}
			const owningNode = _nodeToWrapperMap.get(renderedItem);
			const wrapper: DNodeWrapper = {
				node: renderedItem,
				depth: depth + 1,
				order: i,
				requiresInsertBefore: insertBefore,
				hasParentWNode,
				namespace: namespace
			} as DNodeWrapper;
			if (isVNode(renderedItem)) {
				if (renderedItem.deferredPropertiesCallback) {
					(wrapper as VNodeWrapper).deferredProperties = renderedItem.deferredPropertiesCallback(false);
				}
				if (renderedItem.properties.exitAnimation) {
					parent.hasAnimations = true;
					let nextParent = _parentWrapperMap.get(parent);
					while (nextParent) {
						if (nextParent.hasAnimations) {
							break;
						}
						nextParent.hasAnimations = true;
						nextParent = _parentWrapperMap.get(nextParent);
					}
				}
			}
			if (owningNode && isVNodeWrapper(wrapper)) {
				wrapper.owningId = owningNode.id;
			}
			if (isWNode(renderedItem)) {
				resolveRegistryItem(wrapper as WNodeWrapper, (parent as any).instance, (parent as any).id);
			}

			_parentWrapperMap.set(wrapper, parent);
			if (previousItem) {
				_wrapperSiblingMap.set(previousItem, wrapper);
			}
			wrappedRendered.push(wrapper);
			previousItem = wrapper;
		}
		return wrappedRendered;
	}

	function findParentWNodeWrapper(currentNode: DNodeWrapper): WNodeWrapper | undefined {
		let parentWNodeWrapper: WNodeWrapper | undefined;
		let parentWrapper = _parentWrapperMap.get(currentNode);

		while (!parentWNodeWrapper && parentWrapper) {
			if (!parentWNodeWrapper && isWNodeWrapper(parentWrapper)) {
				parentWNodeWrapper = parentWrapper;
			}
			parentWrapper = _parentWrapperMap.get(parentWrapper);
		}
		return parentWNodeWrapper;
	}

	function findParentDomNode(currentNode: DNodeWrapper): Node | undefined {
		let parentDomNode: Node | undefined;
		let parentWrapper = _parentWrapperMap.get(currentNode);

		while (!parentDomNode && parentWrapper) {
			if (!parentDomNode && isVNodeWrapper(parentWrapper) && parentWrapper.domNode) {
				parentDomNode = parentWrapper.domNode;
			}
			parentWrapper = _parentWrapperMap.get(parentWrapper);
		}
		return parentDomNode;
	}

	function runDeferredProperties(next: VNodeWrapper) {
		const { deferredPropertiesCallback } = next.node;
		if (deferredPropertiesCallback) {
			const properties = next.node.properties;
			_deferredRenderCallbacks.push(() => {
				const deferredProperties = next.deferredProperties;
				next.deferredProperties = deferredPropertiesCallback(true);
				processProperties(next, {
					properties: { ...deferredProperties, ...properties }
				});
			});
		}
	}

	function findInsertBefore(next: DNodeWrapper) {
		let insertBefore: Node | null = null;
		let searchNode: DNodeWrapper | undefined = next;
		while (!insertBefore) {
			const nextSibling = _wrapperSiblingMap.get(searchNode);
			if (nextSibling) {
				if (isVNodeWrapper(nextSibling)) {
					if (nextSibling.domNode && nextSibling.domNode.parentNode) {
						insertBefore = nextSibling.domNode;
						break;
					}
					searchNode = nextSibling;
					continue;
				}
				if (nextSibling.domNode && nextSibling.domNode.parentNode) {
					insertBefore = nextSibling.domNode;
					break;
				}
				searchNode = nextSibling;
				continue;
			}
			searchNode = _parentWrapperMap.get(searchNode);
			if (!searchNode || isVNodeWrapper(searchNode)) {
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
				} else if (propName !== 'key' && propValue !== previousValue) {
					const type = typeof propValue;
					if (type === 'function' && propName.lastIndexOf('on', 0) === 0 && includesEventsAndAttributes) {
						updateEvent(domNode, propName.substr(2), propValue, previousValue);
					} else if (type === 'string' && propName !== 'innerHTML' && includesEventsAndAttributes) {
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

	function runDeferredRenderCallbacks() {
		const { sync } = _mountOptions;
		const callbacks = _deferredRenderCallbacks;
		_deferredRenderCallbacks = [];
		if (callbacks.length) {
			const run = () => {
				let callback: Function | undefined;
				while ((callback = callbacks.shift())) {
					callback();
				}
			};
			if (sync) {
				run();
			} else {
				global.requestAnimationFrame(run);
			}
		}
	}

	function runAfterRenderCallbacks() {
		const { sync } = _mountOptions;
		const callbacks = _idleCallbacks;
		_idleCallbacks = [];
		if (callbacks.length) {
			const run = () => {
				let callback: Function | undefined;
				while ((callback = callbacks.shift())) {
					callback();
				}
			};
			if (sync) {
				run();
			} else {
				if (global.requestIdleCallback) {
					global.requestIdleCallback(run);
				} else {
					setTimeout(run);
				}
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
				updateEvent(next.domNode as HTMLElement, event, events[event], previousProperties.events[event]);
			});
		} else {
			setProperties(next.domNode as HTMLElement, previousProperties.properties, next);
		}
	}

	function mount(mountOptions: Partial<MountOptions> = {}) {
		_mountOptions = { ..._mountOptions, ...mountOptions };
		const { domNode } = _mountOptions;
		const renderResult = wrapNodes(renderer)({});
		const nextWrapper = {
			id: `${wrapperId++}`,
			node: renderResult,
			order: 0,
			depth: 1,
			owningId: '-1',
			properties: {}
		};
		_parentWrapperMap.set(nextWrapper, {
			id: `-1`,
			depth: 0,
			order: 0,
			owningId: '',
			domNode,
			node: v('fake')
		});
		_processQueue.push({
			current: [],
			next: [nextWrapper],
			meta: { mergeNodes: arrayFrom(domNode.childNodes) }
		});
		_runProcessQueue();
		_cleanUpMergedNodes();
		_runDomInstructionQueue();
		_insertBeforeMap = undefined;
		_runCallbacks();
	}

	function invalidate() {
		parentInvalidate && parentInvalidate();
	}

	function _schedule(): void {
		const { sync } = _mountOptions;
		if (sync) {
			_runInvalidationQueue();
		} else if (!_renderScheduled) {
			_renderScheduled = global.requestAnimationFrame(() => {
				_runInvalidationQueue();
			});
		}
	}

	function _runInvalidationQueue() {
		_renderScheduled = undefined;
		const invalidationQueue = [..._invalidationQueue];
		const previouslyRendered = [];
		_invalidationQueue = [];
		invalidationQueue.sort((a, b) => {
			let result = b.depth - a.depth;
			if (result === 0) {
				result = b.order - a.order;
			}
			return result;
		});
		let item: InvalidationQueueItem | undefined;
		while ((item = invalidationQueue.pop())) {
			let { id } = item;
			if (previouslyRendered.indexOf(id) === -1 && _idToWrapperMap.has(id!)) {
				previouslyRendered.push(id);
				const current = _idToWrapperMap.get(id)!;
				const parent = _parentWrapperMap.get(current);
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
					registryItem: current.registryItem
				};

				parent && _parentWrapperMap.set(next, parent);
				sibling && _wrapperSiblingMap.set(next, sibling);
				const { item } = _updateWidget({ current, next });
				if (item) {
					_processQueue.push(item);
					if (_deferredProcessQueue.length) {
						_processQueue = [..._processQueue, ..._deferredProcessQueue];
						_deferredProcessQueue = [];
					}
					_idToWrapperMap.set(id, next);
					_runProcessQueue();
				}
			}
		}
		_cleanUpMergedNodes();
		_runDomInstructionQueue();
		_runCallbacks();
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
				_applicationQueue.push(item);
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
				runEnterAnimation(next, _mountOptions.transition);
				const owningWrapper = _nodeToWrapperMap.get(next.node);
				if (owningWrapper && owningWrapper.instance && node.properties.key != null) {
					const instanceData = widgetInstanceMap.get(owningWrapper.instance);
					instanceData && instanceData.nodeHandler.add(domNode as HTMLElement, `${node.properties.key}`);
				}
				item.next.inserted = true;
			} else if (item.type === 'update') {
				const {
					next,
					next: { domNode },
					current
				} = item;
				const parent = _parentWrapperMap.get(next);
				if (parent && isWNodeWrapper(parent) && parent.instance) {
					const instanceData = widgetInstanceMap.get(parent.instance);
					instanceData && instanceData.nodeHandler.addRoot();
				}

				const previousProperties = buildPreviousProperties(domNode, current);
				processProperties(next, previousProperties);
				runDeferredProperties(next);

				const owningWrapper = _nodeToWrapperMap.get(next.node);
				if (owningWrapper && owningWrapper.instance) {
					const instanceData = widgetInstanceMap.get(owningWrapper.instance);
					if (instanceData && next.node.properties.key != null) {
						instanceData.nodeHandler.add(next.domNode as HTMLElement, `${next.node.properties.key}`);
					}
				}
			} else if (item.type === 'delete') {
				const { current } = item;
				const { exitAnimation } = current.node.properties;
				if (exitAnimation && exitAnimation !== true) {
					runExitAnimation(current, _mountOptions.transition, exitAnimation);
				} else {
					current.domNode!.parentNode!.removeChild(current.domNode!);
					current.domNode = undefined;
				}
			} else if (item.type === 'attach') {
				const { instance, attached } = item;
				const instanceData = widgetInstanceMap.get(instance);
				instanceData && instanceData.nodeHandler.addRoot();
				attached && instanceData && instanceData.onAttach();
			} else if (item.type === 'detach') {
				if (item.current.instance) {
					const instanceData = widgetInstanceMap.get(item.current.instance);
					instanceData && instanceData.onDetach();
				}
				item.current.domNode = undefined;
				item.current.instance = undefined;
			}
		}
		if (_deferredProcessQueue.length === 0) {
			_nodeToWrapperMap = new WeakMap();
		}
	}

	function _runCallbacks() {
		runAfterRenderCallbacks();
		runDeferredRenderCallbacks();
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
					if (tag.toUpperCase() === (domElement.tagName || '')) {
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

	function registerDistinguishableCallback(childNodes: DNodeWrapper[], index: number) {
		_idleCallbacks.push(() => {
			const parentWNodeWrapper = findParentWNodeWrapper(childNodes[index]);
			checkDistinguishable(childNodes, index, parentWNodeWrapper);
		});
	}

	function createKeyMap(wrappers: DNodeWrapper[]): (string | number)[] | false {
		const keys: (string | number)[] = [];
		for (let i = 0; i < wrappers.length; i++) {
			const wrapper = wrappers[i];
			if (wrapper.node.properties.key != null) {
				keys.push(wrapper.node.properties.key);
			} else {
				return false;
			}
		}
		return keys;
	}

	function _process(current: DNodeWrapper[], next: DNodeWrapper[], meta: ProcessMeta = {}): void {
		let { mergeNodes = [], oldIndex = 0, newIndex = 0 } = meta;
		const currentLength = current.length;
		const nextLength = next.length;
		const hasPreviousSiblings = currentLength > 1 || (currentLength > 0 && currentLength < nextLength);
		let instructions: Instruction[] = [];
		let replace = false;
		if (oldIndex === 0 && newIndex === 0 && currentLength) {
			const currentKeys = createKeyMap(current);
			if (currentKeys) {
				const nextKeys = createKeyMap(next);
				if (nextKeys) {
					for (let i = 0; i < currentKeys.length; i++) {
						if (nextKeys.indexOf(currentKeys[i]) !== -1) {
							instructions = [];
							replace = false;
							break;
						}
						replace = true;
						instructions.push({ current: current[i], next: undefined });
					}
				}
			}
		}

		if (replace || (currentLength === 0 && !_mountOptions.merge)) {
			for (let i = 0; i < next.length; i++) {
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
					instructions.push({ current: currentWrapper, next: nextWrapper });
				} else if (!currentWrapper || findIndexOfChild(current, nextWrapper, oldIndex + 1) === -1) {
					has('dojo-debug') && current.length && registerDistinguishableCallback(next, newIndex);
					instructions.push({ current: undefined, next: nextWrapper });
					newIndex++;
				} else if (findIndexOfChild(next, currentWrapper, newIndex + 1) === -1) {
					has('dojo-debug') && registerDistinguishableCallback(current, oldIndex);
					instructions.push({ current: currentWrapper, next: undefined });
					oldIndex++;
				} else {
					has('dojo-debug') && registerDistinguishableCallback(next, newIndex);
					has('dojo-debug') && registerDistinguishableCallback(current, oldIndex);
					instructions.push({ current: currentWrapper, next: undefined });
					instructions.push({ current: undefined, next: nextWrapper });
					oldIndex++;
					newIndex++;
				}
			}
			if (newIndex < nextLength) {
				_processQueue.push({ current, next, meta: { mergeNodes, oldIndex, newIndex } });
			}
			if (currentLength > oldIndex && newIndex >= nextLength) {
				for (let i = oldIndex; i < currentLength; i++) {
					has('dojo-debug') && registerDistinguishableCallback(current, i);
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

	function resolveMiddleware(middlewares: any, id: string): any {
		const keys = Object.keys(middlewares);
		const results: any = {};
		const uniqueId = `${id}-${metaId++}`;
		for (let i = 0; i < keys.length; i++) {
			const middleware = middlewares[keys[i]]();
			const payload: any = {
				id: uniqueId
			};
			Object.defineProperty(payload, 'properties', {
				get() {
					const widgetMeta = widgetMetaMap.get(id);
					if (widgetMeta) {
						return { ...widgetMeta.properties };
					}
				},
				enumerable: true,
				configurable: true
			});
			Object.defineProperty(payload, 'children', {
				get() {
					const widgetMeta = widgetMetaMap.get(id);
					if (widgetMeta) {
						return widgetMeta.children;
					}
				},
				enumerable: true,
				configurable: true
			});
			if (middleware.middlewares) {
				const resolvedMiddleware = resolveMiddleware(middleware.middlewares, id);
				payload.middleware = resolvedMiddleware;
				results[keys[i]] = middleware.callback(payload);
			} else {
				results[keys[i]] = middleware.callback(payload);
			}
		}
		return results;
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
		next.properties = next.node.properties;
		next.id = `${wrapperId++}`;
		_idToWrapperMap.set(next.id, next);
		let processResult: ProcessResult = {};
		if (!isWidgetBaseConstructor(Constructor)) {
			invalidate = () => {
				const widgetMeta = widgetMetaMap.get(next.id);
				if (widgetMeta) {
					widgetMeta.dirty = true;
				}
				_invalidationQueue.push({
					id: next.id,
					depth: next.depth,
					order: next.order
				});
				_schedule();
			};
			const registryHandler = new RegistryHandler();
			registryHandler.on('invalidate', invalidate);
			if (registry) {
				registryHandler.base = registry;
			}

			let widgetData = {
				dirty: false,
				invalidator: invalidate,
				registryHandler,
				middleware: {},
				properties: next.node.properties,
				children: next.node.children
			};
			widgetMetaMap.set(next.id, widgetData);
			widgetData.middleware = (Constructor as any).middlewares
				? resolveMiddleware((Constructor as any).middlewares, next.id)
				: {};

			rendered = Constructor({
				id: next.id,
				properties: next.node.properties,
				children: next.node.children,
				middleware: widgetData.middleware
			});
		} else {
			let instance = new Constructor() as WidgetBaseInterface & {
				invalidate: any;
				registry: any;
			};
			if (registry) {
				instance.registry.base = registry;
			}
			const instanceData = widgetInstanceMap.get(instance)!;
			invalidate = () => {
				instanceData.dirty = true;
				if (!instanceData.rendering && _idToWrapperMap.has(next.id)) {
					_invalidationQueue.push({
						id: next.id,
						depth: next.depth,
						order: next.order
					});
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
			processResult.widget = { type: 'attach', instance, attached: true };
		}

		if (rendered) {
			rendered = Array.isArray(rendered) ? rendered : [rendered];
			next.childrenWrappers = renderedToWrapper(rendered, next, null);
		}

		if (!parentInvalidate && !(Constructor as any).isWNodeWrapper) {
			parentInvalidate = invalidate;
		}

		processResult.item = {
			next: next.childrenWrappers,
			meta: { mergeNodes: next.mergeNodes }
		};
		return processResult;
	}

	function _updateWidget({ current, next }: UpdateWidgetInstruction): ProcessResult {
		current = _idToWrapperMap.get(current.id) || current;
		const { instance, domNode, hasAnimations } = current;
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
		next.hasAnimations = hasAnimations;
		next.id = current.id;
		next.properties = next.node.properties;
		next.childrenWrappers = current.childrenWrappers;
		if (domNode && domNode.parentNode) {
			next.domNode = domNode;
		}

		if (!isWidgetBaseConstructor(Constructor)) {
			const widgetMeta = widgetMetaMap.get(next.id);
			if (widgetMeta) {
				widgetMeta.properties = next.properties;
				diffProperties(current.properties, next.properties, () => {
					widgetMeta.dirty = true;
				});
				if (widgetMeta.dirty) {
					next.childrenWrappers = undefined;
					didRender = true;
					widgetMeta.dirty = false;
					rendered = Constructor({
						id: next.id,
						properties: next.node.properties,
						children: next.node.children,
						middleware: widgetMeta.middleware
					});
				}
			}
		} else {
			const instanceData = widgetInstanceMap.get(instance!)!;
			next.instance = instance;
			instanceData.rendering = true;
			instance!.__setProperties__(next.node.properties);
			instance!.__setChildren__(next.node.children);
			if (instanceData.dirty) {
				didRender = true;
				next.childrenWrappers = undefined;
				rendered = instance!.__render__();
			}
			processResult.widget = { type: 'attach', instance, attached: false };
			instanceData.rendering = false;
		}
		_idToWrapperMap.set(next.id, next);

		if (rendered) {
			rendered = Array.isArray(rendered) ? rendered : [rendered];
			next.childrenWrappers = renderedToWrapper(rendered, next, current);
		}

		if (didRender) {
			processResult.item = {
				current: current.childrenWrappers,
				next: next.childrenWrappers,
				meta: {}
			};
		}
		return processResult;
	}

	function _removeWidget({ current }: RemoveWidgetInstruction): ProcessResult {
		current = _idToWrapperMap.get(current.id) || current;
		_wrapperSiblingMap.delete(current);
		_parentWrapperMap.delete(current);
		_idToWrapperMap.delete(current.id);
		const meta = widgetMetaMap.get(current.id);
		if (meta) {
			meta.registryHandler.destroy();
			meta.invalidator = undefined as any;
			widgetMetaMap.delete(current.id);
		}

		return {
			item: { current: current.childrenWrappers, meta: {} },
			widget: { type: 'detach', current }
		};
	}

	function setDomNodeOnParentWrapper(next: VNodeWrapper) {
		let parentWNodeWrapper = findParentWNodeWrapper(next);
		while (parentWNodeWrapper && !parentWNodeWrapper.domNode) {
			parentWNodeWrapper.domNode = next.domNode;
			const nextParent = _parentWrapperMap.get(parentWNodeWrapper);
			if (nextParent && isWNodeWrapper(nextParent)) {
				parentWNodeWrapper = nextParent;
				continue;
			}
			parentWNodeWrapper = undefined;
		}
	}

	function _createDom({ next }: CreateDomInstruction): ProcessResult {
		let mergeNodes: Node[] = [];
		const parentDomNode = findParentDomNode(next)!;
		if (!next.domNode) {
			if ((next.node as any).domNode) {
				next.domNode = (next.node as any).domNode;
			} else {
				if (next.node.tag === 'svg') {
					next.namespace = NAMESPACE_SVG;
				}
				if (next.node.tag) {
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
		if (next.domNode) {
			if (next.node.children) {
				next.childrenWrappers = renderedToWrapper(next.node.children, next, null);
			}
		}
		setDomNodeOnParentWrapper(next);
		const dom: ApplicationInstruction = {
			next: next!,
			parentDomNode: parentDomNode,
			type: 'create'
		};
		if (next.childrenWrappers) {
			return {
				item: {
					current: [],
					next: next.childrenWrappers,
					meta: { mergeNodes }
				},
				dom
			};
		}
		return { dom };
	}

	function _updateDom({ current, next }: UpdateDomInstruction): ProcessResult {
		const parentDomNode = findParentDomNode(current);
		next.domNode = current.domNode;
		next.namespace = current.namespace;
		if (next.node.text && next.node.text !== current.node.text) {
			const updatedTextNode = parentDomNode!.ownerDocument!.createTextNode(next.node.text!);
			parentDomNode!.replaceChild(updatedTextNode, next.domNode!);
			next.domNode = updatedTextNode;
		} else if (next.node.children) {
			const children = renderedToWrapper(next.node.children, next, current);
			next.childrenWrappers = children;
		}
		return {
			item: {
				current: current.childrenWrappers,
				next: next.childrenWrappers,
				meta: {}
			},
			dom: { type: 'update', next, current }
		};
	}

	function _removeDom({ current }: RemoveDomInstruction): ProcessResult {
		_wrapperSiblingMap.delete(current);
		_parentWrapperMap.delete(current);
		if (current.hasAnimations) {
			return {
				item: { current: current.childrenWrappers, meta: {} },
				dom: { type: 'delete', current }
			};
		}

		if (current.childrenWrappers) {
			_deferredRenderCallbacks.push(() => {
				let wrappers = current.childrenWrappers || [];
				let wrapper: DNodeWrapper | undefined;
				while ((wrapper = wrappers.pop())) {
					if (isWNodeWrapper(wrapper)) {
						wrapper = _idToWrapperMap.get(wrapper.id) || wrapper;
						_idToWrapperMap.delete(wrapper.id);
						if (wrapper.instance) {
							const instanceData = widgetInstanceMap.get(wrapper.instance);
							instanceData && instanceData.onDetach();
							wrapper.instance = undefined;
						} else {
							const meta = widgetMetaMap.get(wrapper.id);
							if (meta) {
								meta.registryHandler.destroy();
								widgetMetaMap.delete(wrapper.id);
							}
						}
					}
					if (wrapper.childrenWrappers) {
						wrappers.push(...wrapper.childrenWrappers);
						wrapper.childrenWrappers = undefined;
					}
					_wrapperSiblingMap.delete(wrapper);
					_parentWrapperMap.delete(wrapper);
					wrapper.domNode = undefined;
				}
			});
		}

		return {
			dom: { type: 'delete', current }
		};
	}

	return {
		mount,
		invalidate
	};
}

export default renderer;
