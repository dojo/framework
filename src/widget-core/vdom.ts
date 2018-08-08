import global from '../shim/global';
import { from as arrayFrom } from '../shim/array';
import { WeakMap } from '../shim/WeakMap';
import {
	WNode,
	VNode,
	DNode,
	VNodeProperties,
	SupportedClassName,
	WidgetBaseConstructor,
	Constructor,
	TransitionStrategy,
	WidgetProperties,
	DefaultWidgetBaseInterface
} from './interfaces';
import transitionStrategy from './animations/cssTransitions';
import { isVNode, isWNode, WNODE, v, isDomVNode } from './d';
import { Registry, isWidgetBaseConstructor } from './Registry';
import { WidgetBase } from './WidgetBase';
import NodeHandler from './NodeHandler';

export interface WidgetData {
	onDetach: () => void;
	onAttach: () => void;
	dirty: boolean;
	nodeHandler: NodeHandler;
	invalidate?: Function;
	rendering: boolean;
}

export interface BaseNodeWrapper {
	node: WNode | VNode;
	domNode?: Node;
	childrenWrappers?: DNodeWrapper[];
	depth: number;
	requiresInsertBefore?: boolean;
	hasPreviousSiblings?: boolean;
	hasParentWNode?: boolean;
	nextWrapper?: DNodeWrapper;
	namespace?: string;
	hasAnimations?: boolean;
}

export interface WNodeWrapper extends BaseNodeWrapper {
	node: WNode;
	instance?: WidgetBase;
	mergeNodes?: Node[];
	nodeHandlerCalled?: boolean;
}

export interface VNodeWrapper extends BaseNodeWrapper {
	node: VNode;
	domNode?: Node;
	merged?: boolean;
	decoratedDeferredProperties?: VNodeProperties;
	inserted?: boolean;
}

export type DNodeWrapper = VNodeWrapper | WNodeWrapper;

interface RenderQueueItem {
	current?: (WNodeWrapper | VNodeWrapper)[];
	next?: (WNodeWrapper | VNodeWrapper)[];
	meta: ProcessMeta;
}

interface ProcessResult {
	renderItem?: RenderQueueItem;
	domInstruction?: DomApplicatorInstruction;
}

interface ProcessMeta {
	mergeNodes?: Node[];
	oldIndex?: number;
	newIndex?: number;
}

interface InvalidationQueueItem {
	current: WNodeWrapper;
	next: WNodeWrapper;
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

interface ParentNodes {
	parentDomNode?: Node;
	parentWNodeWrapper?: WNodeWrapper;
}

interface TraversalMaps {
	parent: WeakMap<DNodeWrapper, DNodeWrapper>;
	sibling: WeakMap<DNodeWrapper, DNodeWrapper>;
}

interface CreateDomApplication {
	type: 'create';
	current?: VNodeWrapper;
	next: VNodeWrapper;
	parentWNodeWrapper?: WNodeWrapper;
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

type DomApplicatorInstruction = CreateDomApplication | UpdateDomApplication | DeleteDomApplication;

export const widgetInstanceMap = new WeakMap<
	WidgetBase<WidgetProperties, DNode<DefaultWidgetBaseInterface>>,
	WidgetData
>();

const EMPTY_ARRAY: DNodeWrapper[] = [];
const nodeOperations = ['focus', 'blur', 'scrollIntoView', 'click'];
const NAMESPACE_W3 = 'http://www.w3.org/';
const NAMESPACE_SVG = NAMESPACE_W3 + '2000/svg';
const NAMESPACE_XLINK = NAMESPACE_W3 + '1999/xlink';

function isWNodeWrapper(child: DNodeWrapper): child is WNodeWrapper {
	return child && isWNode(child.node);
}

function isVNodeWrapper(child?: DNodeWrapper | null): child is VNodeWrapper {
	return !!child && isVNode(child.node);
}

function nodeOperation(
	propName: string,
	propValue: (() => boolean) | boolean,
	previousValue: boolean,
	domNode: HTMLElement & { [index: string]: any },
	afterRenderCallbacks: Function[]
): void {
	let result = propValue && !previousValue;
	if (typeof propValue === 'function') {
		result = propValue();
	}
	if (result === true) {
		afterRenderCallbacks.push(() => {
			domNode[propName]();
		});
	}
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

function buildPreviousProperties(domNode: any, current: VNodeWrapper, next: VNodeWrapper) {
	const {
		node: { diffType, properties, attributes }
	} = current;
	if (!diffType || diffType === 'vdom') {
		return {
			properties: current.node.properties,
			attributes: current.node.attributes,
			events: current.node.events
		};
	} else if (diffType === 'none') {
		return { properties: {}, attributes: current.node.attributes ? {} : undefined, events: current.node.events };
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

function updateEvent(
	domNode: Node,
	eventName: string,
	currentValue: Function,
	eventMap: WeakMap<Function, EventListener>,
	bind: any,
	previousValue?: Function
) {
	if (previousValue) {
		const previousEvent = eventMap.get(previousValue);
		domNode.removeEventListener(eventName, previousEvent);
	}

	let callback = currentValue.bind(bind);

	if (eventName === 'input') {
		callback = function(this: any, evt: Event) {
			currentValue.call(this, evt);
			(evt.target as any)['oninput-value'] = (evt.target as HTMLInputElement).value;
		}.bind(bind);
	}

	domNode.addEventListener(eventName, callback);
	eventMap.set(currentValue, callback);
}

function removeOrphanedEvents(
	domNode: Element,
	previousProperties: VNodeProperties,
	properties: VNodeProperties,
	eventMap: WeakMap<Function, EventListener>,
	onlyEvents: boolean = false
) {
	Object.keys(previousProperties).forEach((propName) => {
		const isEvent = propName.substr(0, 2) === 'on' || onlyEvents;
		const eventName = onlyEvents ? propName : propName.substr(2);
		if (isEvent && !properties[propName]) {
			const eventCallback = eventMap.get(previousProperties[propName]);
			if (eventCallback) {
				domNode.removeEventListener(eventName, eventCallback);
			}
		}
	});
}

function renderedToWrapper(
	rendered: DNode[],
	parent: DNodeWrapper,
	currentParent: DNodeWrapper | null,
	traversalMaps: TraversalMaps
): DNodeWrapper[] {
	const wrappedRendered: DNodeWrapper[] = [];
	const hasParentWNode = isWNodeWrapper(parent);
	const currentParentLength = isVNodeWrapper(currentParent) && (currentParent.childrenWrappers || []).length > 1;
	const requiresInsertBefore = (parent.hasPreviousSiblings !== false && hasParentWNode) || currentParentLength;
	let previousItem: DNodeWrapper | undefined;
	for (let i = 0; i < rendered.length; i++) {
		const renderedItem = rendered[i];
		const wrapper = {
			node: renderedItem,
			depth: parent.depth + 1,
			requiresInsertBefore,
			hasParentWNode,
			namespace: parent.namespace
		} as DNodeWrapper;
		if (isVNode(renderedItem) && renderedItem.properties.exitAnimation) {
			parent.hasAnimations = true;
			let nextParent = traversalMaps.parent.get(parent);
			while (nextParent) {
				if (nextParent.hasAnimations) {
					break;
				}
				nextParent.hasAnimations = true;
				nextParent = traversalMaps.parent.get(nextParent);
			}
		}
		traversalMaps.parent.set(wrapper, parent);
		if (previousItem) {
			traversalMaps.sibling.set(previousItem, wrapper);
		}
		wrappedRendered.push(wrapper);
		previousItem = wrapper;
	}
	return wrappedRendered;
}

function findParentNodes(currentNode: DNodeWrapper, { parent }: TraversalMaps): ParentNodes {
	let parentDomNode: Node | undefined;
	let parentWNodeWrapper: WNodeWrapper | undefined;
	let parentWrapper = parent.get(currentNode);

	while ((!parentDomNode || !parentWNodeWrapper) && parentWrapper) {
		if (!parentDomNode && isVNodeWrapper(parentWrapper) && parentWrapper.domNode) {
			parentDomNode = parentWrapper.domNode;
		} else if (!parentWNodeWrapper && isWNodeWrapper(parentWrapper)) {
			parentWNodeWrapper = parentWrapper;
		}
		parentWrapper = parent.get(parentWrapper);
	}
	return { parentDomNode, parentWNodeWrapper };
}

function addDeferredProperties(wrapper: VNodeWrapper, eventMap: any, afterRenderCallbacks: Function[]) {
	wrapper.decoratedDeferredProperties = wrapper.node.properties;
	const properties = wrapper.node.deferredPropertiesCallback!(!!wrapper.inserted);
	wrapper.node.properties = { ...properties, ...wrapper.decoratedDeferredProperties };
	afterRenderCallbacks.push(() => {
		const currentProperties = wrapper.node.properties;
		wrapper.node.properties = {
			...wrapper.node.deferredPropertiesCallback!(!!wrapper.inserted),
			...wrapper.decoratedDeferredProperties
		};

		setProperties(wrapper.domNode as HTMLElement, currentProperties, wrapper, eventMap, afterRenderCallbacks);
	});
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
		if (dnode1.instance === undefined && typeof dnode2.node.widgetConstructor === 'string') {
			return false;
		}
		if (dnode1.node.widgetConstructor !== dnode2.node.widgetConstructor) {
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

function findInsertBefore(next: DNodeWrapper, { sibling, parent }: TraversalMaps) {
	let insertBefore: Node | null = null;
	let searchNode: DNodeWrapper | undefined = next;
	while (!insertBefore) {
		const nextSibling = sibling.get(searchNode);
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
		searchNode = parent.get(searchNode);
		if (!searchNode || isVNodeWrapper(searchNode)) {
			break;
		}
	}
	return insertBefore;
}

function applyClasses(domNode: any, classes: SupportedClassName, op: string) {
	if (classes) {
		const classNames = classes.split(' ');
		for (let i = 0; i < classNames.length; i++) {
			domNode.classList[op](classNames[i]);
		}
	}
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
	if (enterAnimation) {
		if (typeof enterAnimation === 'function') {
			return enterAnimation(domNode as Element, properties);
		}
		transitions.enter(domNode as Element, properties, enterAnimation);
	}
}

function runExitAnimation(current: VNodeWrapper, transitions: TransitionStrategy) {
	const {
		domNode,
		node: { properties },
		node: {
			properties: { exitAnimation }
		}
	} = current;
	const removeDomNode = () => {
		domNode && domNode.parentNode && domNode.parentNode.removeChild(domNode);
		current.domNode = undefined;
	};
	if (typeof exitAnimation === 'function') {
		return exitAnimation(domNode as Element, removeDomNode, properties);
	}
	transitions.exit(domNode as Element, properties, exitAnimation as string, removeDomNode);
}

function setProperties(
	domNode: HTMLElement,
	currentProperties: VNodeProperties = {},
	nextWrapper: VNodeWrapper,
	eventMap: WeakMap<Function, EventListener>,
	afterRenderCallbacks: Function[],
	includesEventsAndAttributes = true
): void {
	const propNames = Object.keys(nextWrapper.node.properties);
	const propCount = propNames.length;
	if (propNames.indexOf('classes') === -1 && currentProperties.classes) {
		const classes = Array.isArray(currentProperties.classes)
			? currentProperties.classes
			: [currentProperties.classes];
		for (let i = 0; i < classes.length; i++) {
			applyClasses(domNode, classes[i], 'remove');
		}
	}

	includesEventsAndAttributes &&
		removeOrphanedEvents(domNode, currentProperties, nextWrapper.node.properties, eventMap);

	for (let i = 0; i < propCount; i++) {
		const propName = propNames[i];
		let propValue = nextWrapper.node.properties[propName];
		const previousValue = currentProperties[propName];
		if (propName === 'classes') {
			const previousClasses = Array.isArray(previousValue) ? previousValue : previousValue ? [previousValue] : [];
			const currentClasses = Array.isArray(propValue) ? propValue : [propValue];
			if (previousClasses && previousClasses.length > 0) {
				if (!propValue || propValue.length === 0) {
					for (let i = 0; i < previousClasses.length; i++) {
						applyClasses(domNode, previousClasses[i], 'remove');
					}
				} else {
					const newClasses: (null | undefined | string)[] = [...currentClasses];
					for (let i = 0; i < previousClasses.length; i++) {
						const previousClassName = previousClasses[i];
						if (previousClassName) {
							const classIndex = newClasses.indexOf(previousClassName);
							if (classIndex === -1) {
								applyClasses(domNode, previousClassName, 'remove');
								continue;
							}
							newClasses.splice(classIndex, 1);
						}
					}
					for (let i = 0; i < newClasses.length; i++) {
						applyClasses(domNode, newClasses[i], 'add');
					}
				}
			} else {
				if (nextWrapper.merged) {
					for (let i = 0; i < currentClasses.length; i++) {
						applyClasses(domNode, currentClasses[i], 'add');
					}
				} else {
					domNode.className = currentClasses.join(' ').trim();
				}
			}
		} else if (nodeOperations.indexOf(propName) !== -1) {
			nodeOperation(propName, propValue, previousValue, domNode, afterRenderCallbacks);
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
				const domValue = (domNode as any)[propName];
				if (
					domValue !== propValue &&
					((domNode as any)['oninput-value']
						? domValue === (domNode as any)['oninput-value']
						: propValue !== previousValue)
				) {
					(domNode as any)[propName] = propValue;
					(domNode as any)['oninput-value'] = undefined;
				}
			} else if (propName !== 'key' && propValue !== previousValue) {
				const type = typeof propValue;
				if (type === 'function' && propName.lastIndexOf('on', 0) === 0 && includesEventsAndAttributes) {
					updateEvent(domNode, propName.substr(2), propValue, eventMap, nextWrapper.node.bind, previousValue);
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

function runDeferredRenderCallbacks(callbacks: Function[], sync = false) {
	if (callbacks.length) {
		if (sync) {
			while (callbacks.length) {
				const callback = callbacks.shift();
				callback && callback();
			}
		} else {
			global.requestAnimationFrame(() => {
				while (callbacks.length) {
					const callback = callbacks.shift();
					callback && callback();
				}
			});
		}
	}
}

function runAfterRenderCallbacks(callbacks: Function[], sync = false) {
	if (sync) {
		while (callbacks.length) {
			const callback = callbacks.shift();
			callback && callback();
		}
	} else {
		if (global.requestIdleCallback) {
			global.requestIdleCallback(() => {
				while (callbacks.length) {
					const callback = callbacks.shift();
					callback && callback();
				}
			});
		} else {
			setTimeout(() => {
				while (callbacks.length) {
					const callback = callbacks.shift();
					callback && callback();
				}
			});
		}
	}
}

function processProperties(
	next: VNodeWrapper,
	previousProperties: any,
	eventMap: WeakMap<Function, EventListener>,
	deferredRenderCallbacks: Function[]
) {
	if (next.node.attributes && next.node.events) {
		updateAttributes(
			next.domNode as HTMLElement,
			previousProperties.attributes || {},
			next.node.attributes,
			next.namespace
		);
		setProperties(
			next.domNode as HTMLElement,
			previousProperties.properties,
			next,
			eventMap,
			deferredRenderCallbacks,
			false
		);
		const events = next.node.events || {};
		if (previousProperties.events) {
			removeOrphanedEvents(
				next.domNode as HTMLElement,
				previousProperties.events || {},
				next.node.events,
				eventMap,
				true
			);
		}
		previousProperties.events = previousProperties.events || {};
		Object.keys(events).forEach((event) => {
			updateEvent(
				next.domNode as HTMLElement,
				event,
				events[event],
				eventMap,
				next.node.bind,
				previousProperties.events[event]
			);
		});
	} else {
		setProperties(
			next.domNode as HTMLElement,
			previousProperties.properties,
			next,
			eventMap,
			deferredRenderCallbacks
		);
	}
}

export class Renderer {
	private _renderer: () => WNode;
	private _registry: Registry | undefined;
	private _merge = true;
	private _sync = false;
	private _transition: TransitionStrategy = transitionStrategy;
	private _rootNode: HTMLElement = global.document.body;
	private _invalidationQueue: InvalidationQueueItem[] = [];
	private _renderQueue: RenderQueueItem[] = [];
	private _domInstructionQueue: DomApplicatorInstruction[] = [];
	private _eventMap = new WeakMap<Function, EventListener>();
	private _parentWrapperMap = new WeakMap<DNodeWrapper, DNodeWrapper>();
	private _instanceToWrapperMap = new WeakMap<WidgetBase, WNodeWrapper>();
	private _wrapperSiblingMap = new WeakMap<DNodeWrapper, DNodeWrapper>();
	private _renderScheduled: number | undefined;
	private _invalidate?: () => void;
	private _afterRenderCallbacks: Function[] = [];
	private _deferredRenderCallbacks: Function[] = [];

	constructor(renderer: () => WNode) {
		this._renderer = renderer;
	}

	public set sync(sync: boolean) {
		this._sync = sync;
	}

	public set registry(registry: Registry) {
		this._registry = registry;
	}

	public set transition(transition: TransitionStrategy) {
		this._transition = transition;
	}

	public invalidate() {
		this._invalidate && this._invalidate();
	}

	public append(node?: HTMLElement): void {
		if (node) {
			this._rootNode = node;
		}
		const renderResult = this._renderer();
		const nextWrapper = {
			node: renderResult,
			depth: 1
		};
		this._parentWrapperMap.set(nextWrapper, { depth: 0, domNode: this._rootNode, node: v('fake') });
		this._queueInRender({
			current: [],
			next: [nextWrapper],
			meta: { mergeNodes: arrayFrom(this._rootNode.childNodes) }
		});
		this._runRenderQueue();
		this._merge = false;
		this._runCallbacks();
	}

	private _schedule(): void {
		if (this._sync) {
			this._runInvalidationQueue();
		} else if (!this._renderScheduled) {
			this._renderScheduled = global.requestAnimationFrame(() => {
				this._runInvalidationQueue();
			});
		}
	}

	private _runInvalidationQueue() {
		this._renderScheduled = undefined;
		const invalidationQueue = [...this._invalidationQueue];
		const previouslyRendered = [];
		this._invalidationQueue = [];
		invalidationQueue.sort((a, b) => a.next.depth - b.next.depth);
		while (invalidationQueue.length) {
			let { current, next } = invalidationQueue.pop()!;
			if (previouslyRendered.indexOf(next.instance) === -1) {
				previouslyRendered.push(next.instance);
				const sibling = this._wrapperSiblingMap.get(current);
				sibling && this._wrapperSiblingMap.set(next, sibling);
				const { renderItem } = this._updateWidget({ current, next });
				if (renderItem) {
					this._queueInRender(renderItem);
					next.instance && this._instanceToWrapperMap.set(next.instance, next);
					this._runRenderQueue();
				}
			}
		}
		this._runCallbacks();
	}

	private _runRenderQueue() {
		while (this._renderQueue.length) {
			const item = this._renderQueue.pop()!;
			this._process(item.current || EMPTY_ARRAY, item.next || EMPTY_ARRAY, item.meta);
		}
		this._runDomInstructionQueue();
	}

	private _runDomInstructionQueue(): void {
		this._domInstructionQueue.reverse();
		while (this._domInstructionQueue.length) {
			const item = this._domInstructionQueue.pop()!;
			if (item.type === 'create') {
				const {
					parentWNodeWrapper,
					next,
					next: { domNode, merged, requiresInsertBefore, node }
				} = item;

				processProperties(next, {}, this._eventMap, this._deferredRenderCallbacks);
				if (!merged) {
					let insertBefore: any;
					if (requiresInsertBefore) {
						insertBefore = findInsertBefore(next, this._getTraversalMaps());
					}
					item.parentDomNode.insertBefore(domNode!, insertBefore);
				}
				runEnterAnimation(next, this._transition);
				const instanceData = widgetInstanceMap.get(parentWNodeWrapper!.instance!);
				if (node.properties.key != null && instanceData) {
					instanceData.nodeHandler.add(domNode as HTMLElement, `${node.properties.key}`);
				}
				const parent = this._parentWrapperMap.get(next);
				if (parent && isWNodeWrapper(parent) && parent.instance) {
					const instanceData = widgetInstanceMap.get(parent.instance);
					if (instanceData) {
						!parent.nodeHandlerCalled && instanceData.nodeHandler.addRoot();
						parent.nodeHandlerCalled = true;
						instanceData.onAttach();
					}
				}
				item.next.inserted = true;
			} else if (item.type === 'update') {
				const { next, current } = item;
				const parent = this._parentWrapperMap.get(next);
				if (parent && isWNodeWrapper(parent) && parent.instance) {
					const instanceData = widgetInstanceMap.get(parent.instance);
					instanceData && instanceData.nodeHandler.addRoot();
				}

				const previousProperties = buildPreviousProperties(next.domNode, current, next);
				const { parentWNodeWrapper } = findParentNodes(next, this._getTraversalMaps());
				const instanceData = widgetInstanceMap.get(parentWNodeWrapper!.instance!);

				processProperties(next, previousProperties, this._eventMap, this._deferredRenderCallbacks);

				if (instanceData && next.node.properties.key != null) {
					instanceData.nodeHandler.add(next.domNode as HTMLElement, `${next.node.properties.key}`);
				}
			} else if (item.type === 'delete') {
				if (item.current.node.properties.exitAnimation) {
					runExitAnimation(item.current, this._transition);
				} else {
					item.current.domNode!.parentNode!.removeChild(item.current.domNode!);
					item.current.domNode = undefined;
				}
			}
		}
	}

	private _runCallbacks() {
		const afterRenderCallbacks = this._afterRenderCallbacks;
		const deferredRenderCallbacks = this._deferredRenderCallbacks;
		this._afterRenderCallbacks = [];
		this._deferredRenderCallbacks = [];
		runAfterRenderCallbacks(afterRenderCallbacks, this._sync);
		runDeferredRenderCallbacks(deferredRenderCallbacks, this._sync);
	}

	private _getTraversalMaps(): TraversalMaps {
		return {
			parent: this._parentWrapperMap,
			sibling: this._wrapperSiblingMap
		};
	}

	private _queueInvalidation(instance: WidgetBase): void {
		const current = this._instanceToWrapperMap.get(instance)!;
		const next = {
			node: {
				type: WNODE,
				widgetConstructor: instance.constructor as WidgetBaseConstructor,
				properties: instance.properties,
				children: instance.children
			},
			instance,
			depth: current.depth
		};

		const parent = this._parentWrapperMap.get(current)!;
		this._parentWrapperMap.set(next, parent);
		this._invalidationQueue.push({ current, next });
	}

	private _queueInRender(item: RenderQueueItem) {
		this._renderQueue.push(item);
	}

	private _queueDomInstruction(instruction: DomApplicatorInstruction) {
		this._domInstructionQueue.push(instruction);
	}

	private _process(current: DNodeWrapper[], next: DNodeWrapper[], meta: ProcessMeta = {}): void {
		let { mergeNodes = [], oldIndex = 0, newIndex = 0 } = meta;
		const currentLength = current.length;
		const nextLength = next.length;
		const hasPreviousSiblings = current.length > 1;
		const instructions: Instruction[] = [];
		if (newIndex < nextLength) {
			let currentWrapper = oldIndex < currentLength ? current[oldIndex] : undefined;
			const nextWrapper = next[newIndex];
			nextWrapper.hasPreviousSiblings = hasPreviousSiblings;

			if (this._merge && mergeNodes.length) {
				if (isVNodeWrapper(nextWrapper)) {
					let {
						node: { tag }
					} = nextWrapper;
					for (let i = 0; i < mergeNodes.length; i++) {
						const domElement = mergeNodes[i] as Element;
						if (tag.toUpperCase() === (domElement.tagName || '')) {
							mergeNodes.splice(i, 1);
							nextWrapper.domNode = domElement;
							break;
						}
					}
				} else {
					nextWrapper.mergeNodes = mergeNodes;
				}
			}

			if (isVNodeWrapper(nextWrapper) && typeof nextWrapper.node.deferredPropertiesCallback === 'function') {
				addDeferredProperties(nextWrapper, this._eventMap, this._deferredRenderCallbacks);
			}

			if (currentWrapper && same(currentWrapper, nextWrapper)) {
				oldIndex++;
				newIndex++;
				if (isVNodeWrapper(currentWrapper) && isVNodeWrapper(nextWrapper)) {
					nextWrapper.inserted = currentWrapper.inserted;
				}
				instructions.push({ current: currentWrapper, next: nextWrapper });
			} else if (!currentWrapper || findIndexOfChild(current, nextWrapper, oldIndex + 1) === -1) {
				newIndex++;
				instructions.push({ current: undefined, next: nextWrapper });
			} else if (findIndexOfChild(next, currentWrapper, newIndex + 1) === -1) {
				instructions.push({ current: currentWrapper, next: undefined });
				oldIndex++;
			} else {
				instructions.push({ current: currentWrapper, next: undefined });
				instructions.push({ current: undefined, next: nextWrapper });
				oldIndex++;
				newIndex++;
			}
		}

		if (newIndex < nextLength) {
			this._queueInRender({ current, next, meta: { mergeNodes, oldIndex, newIndex } });
		}

		if (currentLength > oldIndex && newIndex >= nextLength) {
			for (let i = oldIndex; i < currentLength; i++) {
				instructions.push({ current: current[i], next: undefined });
			}
		}

		for (let i = 0; i < instructions.length; i++) {
			const { renderItem, domInstruction } = this._processOne(instructions[i]);
			renderItem && this._queueInRender(renderItem);
			domInstruction && this._queueDomInstruction(domInstruction);
		}
	}

	private _processOne({ current, next }: Instruction): ProcessResult {
		if (current !== next) {
			if (!current && next) {
				if (isVNodeWrapper(next)) {
					return this._createDom({ next }, this._getTraversalMaps());
				} else {
					return this._createWidget({ next }, this._getTraversalMaps(), this._registry);
				}
			} else if (current && next) {
				if (isVNodeWrapper(current) && isVNodeWrapper(next)) {
					return this._updateDom({ current, next }, this._getTraversalMaps());
				} else if (isWNodeWrapper(current) && isWNodeWrapper(next)) {
					return this._updateWidget({ current, next });
				}
			} else if (current && !next) {
				if (isVNodeWrapper(current)) {
					return this._removeDom({ current }, this._getTraversalMaps());
				} else if (isWNodeWrapper(current)) {
					return this._removeWidget({ current });
				}
			}
		}
		return {};
	}

	private _createWidget(
		{ next }: CreateWidgetInstruction,
		traversalMaps: TraversalMaps,
		registry: Registry | null = null
	): ProcessResult {
		let {
			node: { widgetConstructor }
		} = next;
		const { parentWNodeWrapper } = findParentNodes(next, traversalMaps);
		if (typeof widgetConstructor !== 'function') {
			let item: Constructor<WidgetBase> | null = null;
			if (!parentWNodeWrapper) {
				item = registry && registry.get<WidgetBase>(widgetConstructor);
			} else {
				item = parentWNodeWrapper!.instance!.registry.get<WidgetBase>(widgetConstructor);
			}
			if (item) {
				widgetConstructor = item;
			}
		}
		if (isWidgetBaseConstructor(widgetConstructor)) {
			const instance = new widgetConstructor() as WidgetBase;
			if (registry) {
				instance.registry.base = registry;
			}
			const instanceData = widgetInstanceMap.get(instance)!;
			instance.__setInvalidate__(() => {
				instanceData.dirty = true;
				if (!instanceData.rendering && this._instanceToWrapperMap.has(instance)) {
					this._queueInvalidation(instance);
					this._schedule();
				}
			});
			instanceData.rendering = true;
			instance.__setProperties__(next.node.properties);
			instance.__setChildren__(next.node.children);
			next.instance = instance;
			let rendered = instance.__render__();
			instanceData.rendering = false;
			if (rendered) {
				rendered = Array.isArray(rendered) ? rendered : [rendered];
				next.childrenWrappers = renderedToWrapper(rendered, next, null, traversalMaps);
			}
		}
		if (next.instance) {
			this._instanceToWrapperMap.set(next.instance, next);
			if (!this._invalidate) {
				this._invalidate = next.instance.invalidate.bind(next.instance);
			}
		}
		return {
			renderItem: { next: next.childrenWrappers, meta: { mergeNodes: next.mergeNodes } }
		};
	}

	private _updateWidget({ current, next }: UpdateWidgetInstruction): ProcessResult {
		const { instance, domNode, hasAnimations } = current;
		const instanceData = widgetInstanceMap.get(instance!)!;
		next.instance = instance;
		next.domNode = domNode;
		next.hasAnimations = hasAnimations;
		instanceData.rendering = true;
		instance!.__setProperties__(next.node.properties, next.node.bind);
		instance!.__setChildren__(next.node.children);
		this._instanceToWrapperMap.set(next.instance!, next);
		if (instanceData.dirty) {
			let rendered = instance!.__render__();
			instanceData.rendering = false;
			if (rendered) {
				rendered = Array.isArray(rendered) ? rendered : [rendered];
				next.childrenWrappers = renderedToWrapper(rendered, next, current, this._getTraversalMaps());
			}
			return {
				renderItem: { current: current.childrenWrappers, next: next.childrenWrappers, meta: {} }
			};
		}
		instanceData.rendering = false;
		next.childrenWrappers = current.childrenWrappers;
		return {};
	}

	private _removeWidget({ current }: RemoveWidgetInstruction): ProcessResult {
		current = current.instance ? this._instanceToWrapperMap.get(current.instance)! : current;
		this._wrapperSiblingMap.delete(current);
		this._parentWrapperMap.delete(current);
		this._instanceToWrapperMap.delete(current.instance!);
		if (current.instance) {
			const instanceData = widgetInstanceMap.get(current.instance);
			instanceData && instanceData.onDetach();
		}
		current.domNode = undefined;
		current.node.bind = undefined;
		current.instance = undefined;

		return {
			renderItem: { current: current.childrenWrappers, meta: {} }
		};
	}

	private _createDom({ next }: CreateDomInstruction, traversalMaps: TraversalMaps): ProcessResult {
		let mergeNodes: Node[] = [];
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
		} else {
			next.merged = true;
		}
		if (next.domNode) {
			if (this._merge) {
				mergeNodes = arrayFrom(next.domNode.childNodes);
			}
			if (next.node.children) {
				const children = renderedToWrapper(next.node.children, next, null, traversalMaps);
				next.childrenWrappers = children;
			}
		}
		const { parentDomNode, parentWNodeWrapper } = findParentNodes(next, this._getTraversalMaps());
		if (parentWNodeWrapper && !parentWNodeWrapper.domNode) {
			parentWNodeWrapper.domNode = next.domNode;
		}
		const domInstruction: DomApplicatorInstruction = {
			next: next!,
			parentDomNode: parentDomNode!,
			parentWNodeWrapper,
			type: 'create'
		};
		if (next.childrenWrappers) {
			return {
				renderItem: { current: [], next: next.childrenWrappers, meta: { mergeNodes } },
				domInstruction
			};
		}
		return { domInstruction };
	}

	private _updateDom({ current, next }: UpdateDomInstruction, traversalMaps: TraversalMaps): ProcessResult {
		const parentDomNode = findParentNodes(current, traversalMaps).parentDomNode;
		next.domNode = current.domNode;
		next.namespace = current.namespace;
		if (next.node.text && next.node.text !== current.node.text) {
			const updatedTextNode = parentDomNode!.ownerDocument.createTextNode(next.node.text!);
			parentDomNode!.replaceChild(updatedTextNode, next.domNode!);
			next.domNode = updatedTextNode;
		} else {
			if (next.node.children) {
				const children = renderedToWrapper(next.node.children, next, current, traversalMaps);
				next.childrenWrappers = children;
			}
		}
		return {
			renderItem: { current: current.childrenWrappers, next: next.childrenWrappers, meta: {} },
			domInstruction: { type: 'update', next, current }
		};
	}

	private _removeDom({ current }: RemoveDomInstruction, { sibling, parent }: TraversalMaps): ProcessResult {
		sibling.delete(current);
		parent.delete(current);
		current.node.bind = undefined;
		if (current.hasAnimations) {
			return {
				renderItem: { current: current.childrenWrappers, meta: {} },
				domInstruction: { type: 'delete', current }
			};
		}

		if (current.childrenWrappers) {
			this._afterRenderCallbacks.push(() => {
				let wrappers = current.childrenWrappers || [];
				while (wrappers.length) {
					let wrapper = wrappers.pop()!;
					if (wrapper.childrenWrappers) {
						wrappers.push(...wrapper.childrenWrappers);
						wrapper.childrenWrappers = undefined;
					}
					if (isWNodeWrapper(wrapper)) {
						if (wrapper.instance) {
							this._instanceToWrapperMap.delete(wrapper.instance);
							const instanceData = widgetInstanceMap.get(wrapper.instance);
							instanceData && instanceData.onDetach();
						}
						wrapper.instance = undefined;
					}
					this._wrapperSiblingMap.delete(wrapper);
					this._parentWrapperMap.delete(wrapper);
					wrapper.domNode = undefined;
					wrapper.node.bind = undefined;
				}
			});
		}

		return {
			domInstruction: { type: 'delete', current }
		};
	}
}

export function renderer(render: () => WNode): Renderer {
	const r = new Renderer(render);
	return r;
}
