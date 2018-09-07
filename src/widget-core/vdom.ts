import global from '../shim/global';
import has from '../has/has';
import { WeakMap } from '../shim/WeakMap';
import {
	WNode,
	VNode,
	DNode,
	VNodeProperties,
	SupportedClassName,
	WidgetBaseConstructor,
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
	inputProperties: any;
}

export interface BaseNodeWrapper {
	node: WNode | VNode;
	domNode?: Node;
	childrenWrappers?: DNodeWrapper[];
	depth: number;
	requiresInsertBefore?: boolean;
	hasPreviousSiblings?: boolean;
	hasParentWNode?: boolean;
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
	merged?: boolean;
	decoratedDeferredProperties?: VNodeProperties;
	inserted?: boolean;
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
	widget?: AttachApplication;
	dom?: ApplicationInstruction;
}

interface ProcessMeta {
	mergeNodes?: Node[];
	oldIndex?: number;
	newIndex?: number;
}

interface InvalidationQueueItem {
	instance: WidgetBase;
	depth: number;
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
	instance: WidgetBase;
	attached: boolean;
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

type ApplicationInstruction = CreateDomApplication | UpdateDomApplication | DeleteDomApplication | AttachApplication;

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

function isAttachApplication(value: any): value is AttachApplication {
	return !!value.type;
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

function arrayFrom(arr: any) {
	return Array.prototype.slice.call(arr);
}

export function renderer(renderer: () => WNode): Renderer {
	let _mountOptions: MountOptions = {
		sync: false,
		merge: true,
		transition: transitionStrategy,
		domNode: global.document.body,
		registry: null
	};
	let _invalidationQueue: InvalidationQueueItem[] = [];
	let _processQueue: (ProcessItem | AttachApplication)[] = [];
	let _applicationQueue: ApplicationInstruction[] = [];
	let _eventMap = new WeakMap<Function, EventListener>();
	let _instanceToWrapperMap = new WeakMap<WidgetBase, WNodeWrapper>();
	let _parentWrapperMap = new WeakMap<DNodeWrapper, DNodeWrapper>();
	let _wrapperSiblingMap = new WeakMap<DNodeWrapper, DNodeWrapper>();
	let _renderScheduled: number | undefined;
	let _afterRenderCallbacks: Function[] = [];
	let _deferredRenderCallbacks: Function[] = [];
	let parentInvalidate: () => void;

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
			_afterRenderCallbacks.push(() => {
				domNode[propName]();
			});
		}
	}

	function updateEvent(
		domNode: Node,
		eventName: string,
		currentValue: Function,
		bind: any,
		previousValue?: Function
	) {
		if (previousValue) {
			const previousEvent = _eventMap.get(previousValue);
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

	function renderedToWrapper(
		rendered: DNode[],
		parent: DNodeWrapper,
		currentParent: DNodeWrapper | null
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
				let nextParent = _parentWrapperMap.get(parent);
				while (nextParent) {
					if (nextParent.hasAnimations) {
						break;
					}
					nextParent.hasAnimations = true;
					nextParent = _parentWrapperMap.get(nextParent);
				}
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
		if (next.node.deferredPropertiesCallback) {
			const properties = next.node.properties;
			next.node.properties = { ...next.node.deferredPropertiesCallback(true), ...next.node.originalProperties };
			_afterRenderCallbacks.push(() => {
				processProperties(next, properties);
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

	function setProperties(
		domNode: HTMLElement,
		currentProperties: VNodeProperties = {},
		nextWrapper: VNodeWrapper,
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

		includesEventsAndAttributes && removeOrphanedEvents(domNode, currentProperties, nextWrapper.node.properties);

		for (let i = 0; i < propCount; i++) {
			const propName = propNames[i];
			let propValue = nextWrapper.node.properties[propName];
			const previousValue = currentProperties[propName];
			if (propName === 'classes') {
				const previousClasses = Array.isArray(previousValue)
					? previousValue
					: previousValue
						? [previousValue]
						: [];
				const currentClasses = Array.isArray(propValue) ? propValue : [propValue];
				const prevClassesLength = previousClasses.length;
				if (previousClasses && prevClassesLength > 0) {
					if (!propValue || propValue.length === 0) {
						for (let i = 0; i < prevClassesLength; i++) {
							applyClasses(domNode, previousClasses[i], 'remove');
						}
					} else {
						const newClasses: (null | undefined | string)[] = [...currentClasses];
						for (let i = 0; i < prevClassesLength; i++) {
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
						updateEvent(domNode, propName.substr(2), propValue, nextWrapper.node.bind, previousValue);
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
		const callbacks = _afterRenderCallbacks;
		_afterRenderCallbacks = [];
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

	function processProperties(next: VNodeWrapper, previousProperties: any) {
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
				updateEvent(
					next.domNode as HTMLElement,
					event,
					events[event],
					next.node.bind,
					previousProperties.events[event]
				);
			});
		} else {
			setProperties(next.domNode as HTMLElement, previousProperties.properties, next);
		}
	}

	function mount(mountOptions: Partial<MountOptions> = {}) {
		_mountOptions = { ..._mountOptions, ...mountOptions };
		const { domNode } = _mountOptions;
		const renderResult = renderer();
		const nextWrapper = {
			node: renderResult,
			depth: 1
		};
		_parentWrapperMap.set(nextWrapper, { depth: 0, domNode, node: v('fake') });
		_processQueue.push({
			current: [],
			next: [nextWrapper],
			meta: { mergeNodes: arrayFrom(domNode.childNodes) }
		});
		_runProcessQueue();
		_mountOptions.merge = false;
		_runDomInstructionQueue();
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
		invalidationQueue.sort((a, b) => b.depth - a.depth);
		let item: InvalidationQueueItem | undefined;
		while ((item = invalidationQueue.pop())) {
			let { instance } = item;
			if (previouslyRendered.indexOf(instance) === -1 && _instanceToWrapperMap.has(instance!)) {
				previouslyRendered.push(instance);
				const current = _instanceToWrapperMap.get(instance)!;
				const instanceData = widgetInstanceMap.get(instance)!;
				const parent = _parentWrapperMap.get(current);
				const sibling = _wrapperSiblingMap.get(current);
				const { constructor, children } = instance;
				const next = {
					node: {
						type: WNODE,
						widgetConstructor: constructor as WidgetBaseConstructor,
						properties: instanceData.inputProperties,
						children: children,
						bind: current.node.bind
					},
					instance,
					depth: current.depth
				};

				parent && _parentWrapperMap.set(next, parent);
				sibling && _wrapperSiblingMap.set(next, sibling);
				const { item } = _updateWidget({ current, next });
				if (item) {
					_processQueue.push(item);
					instance && _instanceToWrapperMap.set(instance, next);
					_runProcessQueue();
				}
			}
		}
		_runDomInstructionQueue();
		_runCallbacks();
	}

	function _runProcessQueue() {
		let item: AttachApplication | ProcessItem | undefined;
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
					next: {
						domNode,
						merged,
						requiresInsertBefore,
						node: { properties }
					}
				} = item;

				processProperties(next, {});
				runDeferredProperties(next);
				if (!merged) {
					let insertBefore: any;
					if (requiresInsertBefore) {
						insertBefore = findInsertBefore(next);
					}
					parentDomNode.insertBefore(domNode!, insertBefore);
				}
				runEnterAnimation(next, _mountOptions.transition);
				const instanceData = widgetInstanceMap.get(next.node.bind as WidgetBase);
				if (properties.key != null && instanceData) {
					instanceData.nodeHandler.add(domNode as HTMLElement, `${properties.key}`);
				}
				item.next.inserted = true;
			} else if (item.type === 'update') {
				const {
					next,
					next: { domNode, node },
					current
				} = item;
				const parent = _parentWrapperMap.get(next);
				if (parent && isWNodeWrapper(parent) && parent.instance) {
					const instanceData = widgetInstanceMap.get(parent.instance);
					instanceData && instanceData.nodeHandler.addRoot();
				}

				const previousProperties = buildPreviousProperties(domNode, current, next);
				const instanceData = widgetInstanceMap.get(next.node.bind as WidgetBase);

				processProperties(next, previousProperties);
				runDeferredProperties(next);

				if (instanceData && node.properties.key != null) {
					instanceData.nodeHandler.add(next.domNode as HTMLElement, `${node.properties.key}`);
				}
			} else if (item.type === 'delete') {
				const { current } = item;
				if (current.node.properties.exitAnimation) {
					runExitAnimation(current, _mountOptions.transition);
				} else {
					current.domNode!.parentNode!.removeChild(current.domNode!);
					current.domNode = undefined;
				}
			} else {
				const { instance, attached } = item;
				const instanceData = widgetInstanceMap.get(instance)!;
				instanceData.nodeHandler.addRoot();
				attached && instanceData.onAttach();
			}
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
		_afterRenderCallbacks.push(() => {
			const parentWNodeWrapper = findParentWNodeWrapper(childNodes[index]);
			checkDistinguishable(childNodes, index, parentWNodeWrapper);
		});
	}

	function _process(current: DNodeWrapper[], next: DNodeWrapper[], meta: ProcessMeta = {}): void {
		let { mergeNodes = [], oldIndex = 0, newIndex = 0 } = meta;
		const currentLength = current.length;
		const nextLength = next.length;
		const hasPreviousSiblings = currentLength > 1 || (currentLength > 0 && currentLength < nextLength);
		const instructions: Instruction[] = [];
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

		for (let i = 0; i < instructions.length; i++) {
			const { item, dom, widget } = _processOne(instructions[i]);
			widget && _processQueue.push(widget);
			item && _processQueue.push(item);
			dom && _applicationQueue.push(dom);
		}
	}

	function _processOne({ current, next }: Instruction): ProcessResult {
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

	function _createWidget({ next }: CreateWidgetInstruction): ProcessResult {
		let {
			node: { widgetConstructor }
		} = next;
		let { registry } = _mountOptions;
		if (!isWidgetBaseConstructor(widgetConstructor)) {
			return {};
		}
		const instance = new widgetConstructor() as WidgetBase;
		if (registry) {
			instance.registry.base = registry;
		}
		const instanceData = widgetInstanceMap.get(instance)!;
		instanceData.invalidate = () => {
			instanceData.dirty = true;
			if (!instanceData.rendering && _instanceToWrapperMap.has(instance)) {
				_invalidationQueue.push({ instance, depth: next.depth });
				_schedule();
			}
		};
		instanceData.rendering = true;
		instance.__setProperties__(next.node.properties, next.node.bind);
		instance.__setChildren__(next.node.children);
		next.instance = instance;
		let rendered = instance.__render__();
		instanceData.rendering = false;
		if (rendered) {
			rendered = Array.isArray(rendered) ? rendered : [rendered];
			next.childrenWrappers = renderedToWrapper(rendered, next, null);
		}
		if (next.instance) {
			_instanceToWrapperMap.set(next.instance, next);
			if (!parentInvalidate) {
				parentInvalidate = next.instance.invalidate.bind(next.instance);
			}
		}
		return {
			item: { next: next.childrenWrappers, meta: { mergeNodes: next.mergeNodes } },
			widget: { type: 'attach', instance, attached: true }
		};
	}

	function _updateWidget({ current, next }: UpdateWidgetInstruction): ProcessResult {
		current = (current.instance && _instanceToWrapperMap.get(current.instance)) || current;
		const { instance, domNode, hasAnimations } = current;
		if (!instance) {
			return [] as ProcessResult;
		}
		const instanceData = widgetInstanceMap.get(instance)!;
		next.instance = instance;
		next.domNode = domNode;
		next.hasAnimations = hasAnimations;
		instanceData.rendering = true;
		instance!.__setProperties__(next.node.properties, next.node.bind);
		instance!.__setChildren__(next.node.children);
		_instanceToWrapperMap.set(next.instance!, next);
		if (instanceData.dirty) {
			let rendered = instance!.__render__();
			instanceData.rendering = false;
			if (rendered) {
				rendered = Array.isArray(rendered) ? rendered : [rendered];
				next.childrenWrappers = renderedToWrapper(rendered, next, current);
			}
			return {
				item: { current: current.childrenWrappers, next: next.childrenWrappers, meta: {} },
				widget: { type: 'attach', instance, attached: false }
			};
		}
		instanceData.rendering = false;
		next.childrenWrappers = current.childrenWrappers;
		return {
			widget: { type: 'attach', instance, attached: false }
		};
	}

	function _removeWidget({ current }: RemoveWidgetInstruction): ProcessResult {
		current = current.instance ? _instanceToWrapperMap.get(current.instance)! : current;
		_wrapperSiblingMap.delete(current);
		_parentWrapperMap.delete(current);
		_instanceToWrapperMap.delete(current.instance!);
		if (current.instance) {
			const instanceData = widgetInstanceMap.get(current.instance!);
			instanceData && instanceData.onDetach();
		}
		current.domNode = undefined;
		current.node.bind = undefined;
		current.instance = undefined;

		return {
			item: { current: current.childrenWrappers, meta: {} }
		};
	}

	function _createDom({ next }: CreateDomInstruction): ProcessResult {
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
			if (_mountOptions.merge) {
				mergeNodes = arrayFrom(next.domNode.childNodes);
			}
			if (next.node.children) {
				next.childrenWrappers = renderedToWrapper(next.node.children, next, null);
			}
		}
		const parentWNodeWrapper = findParentWNodeWrapper(next);
		if (parentWNodeWrapper && !parentWNodeWrapper.domNode) {
			parentWNodeWrapper.domNode = next.domNode;
		}
		const dom: ApplicationInstruction = {
			next: next!,
			parentDomNode: findParentDomNode(next)!,
			type: 'create'
		};
		if (next.childrenWrappers) {
			return {
				item: { current: [], next: next.childrenWrappers, meta: { mergeNodes } },
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
			const updatedTextNode = parentDomNode!.ownerDocument.createTextNode(next.node.text!);
			parentDomNode!.replaceChild(updatedTextNode, next.domNode!);
			next.domNode = updatedTextNode;
		} else if (next.node.children) {
			const children = renderedToWrapper(next.node.children, next, current);
			next.childrenWrappers = children;
		}
		return {
			item: { current: current.childrenWrappers, next: next.childrenWrappers, meta: {} },
			dom: { type: 'update', next, current }
		};
	}

	function _removeDom({ current }: RemoveDomInstruction): ProcessResult {
		_wrapperSiblingMap.delete(current);
		_parentWrapperMap.delete(current);
		current.node.bind = undefined;
		if (current.hasAnimations) {
			return {
				item: { current: current.childrenWrappers, meta: {} },
				dom: { type: 'delete', current }
			};
		}

		if (current.childrenWrappers) {
			_afterRenderCallbacks.push(() => {
				let wrappers = current.childrenWrappers || [];
				let wrapper: DNodeWrapper | undefined;
				while ((wrapper = wrappers.pop())) {
					if (wrapper.childrenWrappers) {
						wrappers.push(...wrapper.childrenWrappers);
						wrapper.childrenWrappers = undefined;
					}
					if (isWNodeWrapper(wrapper)) {
						if (wrapper.instance) {
							_instanceToWrapperMap.delete(wrapper.instance);
							const instanceData = widgetInstanceMap.get(wrapper.instance);
							instanceData && instanceData.onDetach();
						}
						wrapper.instance = undefined;
					}
					_wrapperSiblingMap.delete(wrapper);
					_parentWrapperMap.delete(wrapper);
					wrapper.domNode = undefined;
					wrapper.node.bind = undefined;
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
