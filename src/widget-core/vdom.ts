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
	DefaultWidgetBaseInterface,
	Constructor,
	TransitionStrategy,
	WidgetProperties
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
	nextWrapper?: DNodeWrapper;
	namespace?: string;
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
}

export type DNodeWrapper = VNodeWrapper | WNodeWrapper;

interface RenderQueueItem {
	current?: (WNodeWrapper | VNodeWrapper)[];
	next?: (WNodeWrapper | VNodeWrapper)[];
	mergeNodes?: Node[];
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
	parent: WeakMap<any, DNodeWrapper>;
	sibling: WeakMap<DNodeWrapper, DNodeWrapper>;
}

export interface CreateDomApplication {
	type: 'create';
	current?: VNodeWrapper;
	next: VNodeWrapper;
	parentWNodeWrapper?: WNodeWrapper;
	parentDomNode: Node;
}

export interface DeleteDomApplication {
	type: 'delete';
	current: VNodeWrapper;
}

export type DomApplicatorInstruction = CreateDomApplication | DeleteDomApplication;

export const widgetInstanceMap = new WeakMap<WidgetBase<WidgetProperties>, WidgetData>();

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

function isDomApplicatorInstruction(value: any): value is DomApplicatorInstruction {
	return (value && value.type === 'create') || value.type === 'update' || value.type === 'delete';
}

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
		global.requestAnimationFrame(() => {
			domNode[propName]();
		});
	}
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
		traversalMaps.parent.set(renderedItem, parent);
		if (previousItem) {
			traversalMaps.sibling.set(previousItem, wrapper);
		}
		wrappedRendered.push(wrapper);
		previousItem = wrapper;
	}
	return wrappedRendered;
}

function findParentNodes(currentNode: VNode | WNode, { parent }: TraversalMaps): ParentNodes {
	let parentDomNode: Node | undefined;
	let parentWNodeWrapper: WNodeWrapper | undefined;
	let parentWrapper = parent.get(currentNode)!;

	while ((!parentDomNode || !parentWNodeWrapper) && parentWrapper) {
		if (!parentDomNode && isVNodeWrapper(parentWrapper) && parentWrapper.domNode) {
			parentDomNode = parentWrapper.domNode;
		} else if (!parentWNodeWrapper && isWNodeWrapper(parentWrapper)) {
			parentWNodeWrapper = parentWrapper;
		}
		parentWrapper = parent.get(parentWrapper.node)!;
	}
	return { parentDomNode, parentWNodeWrapper };
}

function same(dnode1: DNode, dnode2: DNode): boolean {
	if (isVNode(dnode1) && isVNode(dnode2)) {
		if (isDomVNode(dnode1) && isDomVNode(dnode2)) {
			if (dnode1.domNode !== dnode2.domNode) {
				return false;
			}
		}
		if (isDomVNode(dnode1) || isDomVNode(dnode2)) {
			return false;
		}
		if (dnode1.tag !== dnode2.tag) {
			return false;
		}
		if (dnode1.properties.key !== dnode2.properties.key) {
			return false;
		}
		return true;
	} else if (isWNode(dnode1) && isWNode(dnode2)) {
		if (typeof dnode2.widgetConstructor === 'string') {
			return false;
		}
		if (dnode1.widgetConstructor !== dnode2.widgetConstructor) {
			return false;
		}
		if (dnode1.properties.key !== dnode2.properties.key) {
			return false;
		}
		return true;
	}
	return false;
}

function findIndexOfChild(children: DNodeWrapper[], sameAs: DNode, start: number) {
	for (let i = start; i < children.length; i++) {
		if (same(children[i].node, sameAs)) {
			return i;
		}
	}
	return -1;
}

function findInsertBefore(next: DNodeWrapper, { sibling, parent }: TraversalMaps) {
	let insertBefore: Node | null = null;
	let searchNode = next;
	while (!insertBefore) {
		const nextSibling = sibling.get(searchNode);
		if (nextSibling) {
			if (isVNodeWrapper(nextSibling)) {
				if (nextSibling.domNode && nextSibling.domNode.parentNode) {
					insertBefore = nextSibling.domNode;
					break;
				}
				searchNode = nextSibling;
			} else if (isWNodeWrapper(nextSibling)) {
				if (nextSibling.domNode && nextSibling.domNode.parentNode) {
					insertBefore = nextSibling.domNode;
					break;
				}
				searchNode = nextSibling;
			}
		} else {
			searchNode = parent.get(searchNode.node)!;
			if (!searchNode || isVNodeWrapper(searchNode)) {
				break;
			}
		}
	}
	return insertBefore;
}

function classes(domNode: any, classes: SupportedClassName, op: string) {
	if (classes) {
		const classNames = classes.split(' ');
		for (let i = 0; i < classNames.length; i++) {
			domNode.classList[op](classNames[i]);
		}
	}
}

function updateAttribute(domNode: Element, attrName: string, attrValue: string, namespace?: string) {
	if (namespace === NAMESPACE_SVG && attrName === 'href') {
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
			enterAnimation(domNode as Element, properties);
		} else {
			transitions.enter(domNode as Element, properties, enterAnimation);
		}
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
		exitAnimation(domNode as Element, removeDomNode, properties);
		return;
	} else {
		transitions.exit(domNode as Element, properties, exitAnimation as string, removeDomNode);
		return;
	}
}

function setProperties(
	domNode: HTMLElement,
	currentProperties: VNodeProperties = {},
	nextWrapper: VNodeWrapper,
	eventMap: WeakMap<Function, EventListener>
): boolean {
	let updated = false;
	const propNames = Object.keys(nextWrapper.node.properties);
	const propCount = propNames.length;
	if (propNames.indexOf('classes') === -1 && currentProperties.classes) {
		if (Array.isArray(currentProperties.classes)) {
			for (let i = 0; i < currentProperties.classes.length; i++) {
				classes(domNode, currentProperties.classes[i], 'remove');
			}
		} else {
			classes(domNode, currentProperties.classes, 'remove');
		}
	}

	removeOrphanedEvents(domNode, currentProperties, nextWrapper.node.properties, eventMap);

	for (let i = 0; i < propCount; i++) {
		const propName = propNames[i];
		let propValue = nextWrapper.node.properties[propName];
		const previousValue = currentProperties[propName];
		if (propName === 'classes') {
			const previousClasses = Array.isArray(previousValue) ? previousValue : [previousValue];
			const currentClasses = Array.isArray(propValue) ? propValue : [propValue];
			if (previousClasses && previousClasses.length > 0) {
				if (!propValue || propValue.length === 0) {
					for (let i = 0; i < previousClasses.length; i++) {
						classes(domNode, previousClasses[i], 'remove');
						updated = true;
					}
				} else {
					const newClasses: (null | undefined | string)[] = [...currentClasses];
					for (let i = 0; i < previousClasses.length; i++) {
						const previousClassName = previousClasses[i];
						if (previousClassName) {
							const classIndex = newClasses.indexOf(previousClassName);
							if (classIndex === -1) {
								classes(domNode, previousClassName, 'remove');
								updated = true;
							} else {
								newClasses.splice(classIndex, 1);
							}
						}
					}
					for (let i = 0; i < newClasses.length; i++) {
						classes(domNode, newClasses[i], 'add');
						updated = true;
					}
				}
			} else {
				for (let i = 0; i < currentClasses.length; i++) {
					classes(domNode, currentClasses[i], 'add');
					updated = true;
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
				updated = true;
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
				if (type === 'function' && propName.lastIndexOf('on', 0) === 0) {
					updateEvent(domNode, propName.substr(2), propValue, eventMap, nextWrapper.node.bind, previousValue);
				} else if (type === 'string' && propName !== 'innerHTML') {
					updateAttribute(domNode, propName, propValue, nextWrapper.namespace);
				} else if (propName === 'scrollLeft' || propName === 'scrollTop') {
					if ((domNode as any)[propName] !== propValue) {
						(domNode as any)[propName] = propValue;
					}
				} else {
					(domNode as any)[propName] = propValue;
				}
				updated = true;
			}
		}
	}
	return updated;
}

export class Renderer {
	private _renderer: () => WNode;
	private _registry: Registry | undefined;
	private _merge = true;
	private _sync = false;
	private _transition: TransitionStrategy = transitionStrategy;
	private _rootNode: HTMLElement = global.document.body;
	private _invalidationQueue: InvalidationQueueItem[] = [];
	private _renderQueue: (RenderQueueItem | DomApplicatorInstruction)[] = [];
	private _domInstructionQueue: DomApplicatorInstruction[] = [];
	private _eventMap = new WeakMap<Function, EventListener>();
	private _dnodeToParentWrapperMap = new WeakMap<any, DNodeWrapper>();
	private _instanceToWrapperMap = new WeakMap<WidgetBase, WNodeWrapper>();
	private _domNodeToWrapperMap = new WeakMap<Node, VNodeWrapper>();
	private _wrapperSiblingMap = new WeakMap<DNodeWrapper, DNodeWrapper>();
	private _renderScheduled: number | undefined;
	private _invalidate?: () => void;

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
		this._dnodeToParentWrapperMap.set(renderResult, { depth: 0, domNode: this._rootNode, node: v('fake') });
		this._queueInRender([
			{
				current: [],
				next: [
					{
						node: renderResult,
						depth: 1
					}
				],
				mergeNodes: arrayFrom(this._rootNode.childNodes)
			}
		]);
		this._runRenderQueue();
		this._merge = false;
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

	/**
	 * This is messy now
	 */
	private _runInvalidationQueue() {
		this._renderScheduled = undefined;
		while (this._invalidationQueue.length) {
			let { current, next } = this._invalidationQueue.pop()!;
			const sibling = this._wrapperSiblingMap.get(current);
			sibling && this._wrapperSiblingMap.set(next, sibling);
			next = this._updateWidget({ current, next });
			this._queueInRender([{ current: current.childrenWrappers, next: next.childrenWrappers }]);
			next.instance && this._instanceToWrapperMap.set(next.instance, next);
			this._runRenderQueue();
		}
	}

	private _runRenderQueue() {
		while (this._renderQueue.length) {
			const item = this._renderQueue.pop()!;
			if (isDomApplicatorInstruction(item)) {
				this._process(item);
			} else {
				this._process(item.current || EMPTY_ARRAY, item.next || EMPTY_ARRAY, item.mergeNodes);
			}
		}
		this._runDomInstructionQueue();
	}

	private _runDomInstructionQueue(): void {
		while (this._domInstructionQueue.length) {
			const item = this._domInstructionQueue.pop()!;
			if (item.type === 'create') {
				const {
					parentWNodeWrapper,
					next,
					next: { domNode, merged, requiresInsertBefore, node }
				} = item;
				setProperties(domNode as HTMLElement, undefined, next, this._eventMap);
				if (!merged) {
					let insertBefore: any;
					if (requiresInsertBefore) {
						insertBefore = findInsertBefore(next, this._getTraversalMaps());
					}
					item.parentDomNode.insertBefore(domNode!, insertBefore);
				}
				runEnterAnimation(next, this._transition);
				const instanceData = widgetInstanceMap.get(parentWNodeWrapper!.instance!)!;
				if (node.properties.key != null) {
					instanceData.nodeHandler.add(domNode as HTMLElement, `${node.properties.key}`);
				}
				const parent = this._dnodeToParentWrapperMap.get(node);
				if (parent && isWNodeWrapper(parent) && parent.instance) {
					const instanceData = widgetInstanceMap.get(parent.instance)!;
					!parent.nodeHandlerCalled && instanceData.nodeHandler.addRoot();
					parent.nodeHandlerCalled = true;
					instanceData.onAttach();
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

	private _getTraversalMaps(): TraversalMaps {
		return {
			parent: this._dnodeToParentWrapperMap,
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

		const parent = this._dnodeToParentWrapperMap.get(current.node)!;
		this._dnodeToParentWrapperMap.set(next.node, parent);
		this._invalidationQueue.push({ current, next });
	}

	private _queueInRender(item: (DomApplicatorInstruction | RenderQueueItem)[]) {
		this._renderQueue.push(...item);
	}

	private _queueDomInstruction(instruction: DomApplicatorInstruction) {
		this._domInstructionQueue.push(instruction);
	}

	private _process(current: DomApplicatorInstruction): void;
	private _process(current: DNodeWrapper[], next: DNodeWrapper[], mergeNodes?: Node[]): void;
	private _process(
		current: DomApplicatorInstruction | DNodeWrapper[],
		next: DNodeWrapper[] = [],
		mergeNodes: Node[] = []
	): void {
		if (isDomApplicatorInstruction(current)) {
			this._queueDomInstruction(current);
		} else {
			const currentLength = current.length;
			const nextLength = next.length;
			let oldIndex = 0;
			let newIndex = 0;
			const hasPreviousSiblings = current.length > 1;
			const instructions: Instruction[] = [];
			while (newIndex < nextLength) {
				let currentWrapper = oldIndex < currentLength ? current[oldIndex] : undefined;
				const nextWrapper = next[newIndex];
				nextWrapper.hasPreviousSiblings = hasPreviousSiblings;

				if (this._merge && mergeNodes) {
					if (isVNodeWrapper(nextWrapper)) {
						let domElement: Element | undefined = undefined;
						let firstNode: any;
						while (nextWrapper.domNode === undefined && mergeNodes.length > 0) {
							domElement = mergeNodes.shift() as Element;
							if (domElement === firstNode) {
								break;
							}
							if (
								domElement &&
								domElement.tagName === (nextWrapper.node.tag.toUpperCase() || undefined)
							) {
								nextWrapper.domNode = domElement;
							} else {
								if (!firstNode) {
									firstNode = domElement;
								}
								mergeNodes.push(domElement);
							}
						}
					} else {
						nextWrapper.mergeNodes = mergeNodes;
					}
				}

				if (currentWrapper !== undefined && same(currentWrapper.node, nextWrapper.node)) {
					oldIndex++;
					newIndex++;
					instructions.push({ current: currentWrapper, next: nextWrapper });
					continue;
				}
				const findOldIndex = findIndexOfChild(current, nextWrapper.node, oldIndex + 1);
				if (!currentWrapper || findOldIndex === -1) {
					newIndex++;
					instructions.push({ current: undefined, next: nextWrapper });
					continue;
				}
				const findNewIndex = findIndexOfChild(next, currentWrapper.node, newIndex + 1);
				if (findNewIndex === -1) {
					instructions.push({ current: currentWrapper, next: undefined });
					oldIndex++;
					continue;
				}

				instructions.push({ current: currentWrapper, next: undefined });
				instructions.push({ current: undefined, next: nextWrapper });
				oldIndex++;
				newIndex++;
			}
			if (currentLength > oldIndex) {
				for (let i = oldIndex; i < currentLength; i++) {
					instructions.push({ current: current[i], next: undefined });
				}
			}

			let applicationInstructions: (DomApplicatorInstruction | RenderQueueItem)[] = [];
			for (let i = 0; i < instructions.length; i++) {
				const result = this._processOne(instructions[i]);
				if (result && result.length) {
					applicationInstructions.push(...result);
				}
			}
			if (applicationInstructions.length) {
				this._queueInRender(applicationInstructions);
			}
		}
	}

	private _processOne({ current, next }: Instruction): undefined | (RenderQueueItem | DomApplicatorInstruction)[] {
		if (current !== next) {
			if (!current && next) {
				if (isVNodeWrapper(next)) {
					next = this._createDom({ next }, this._getTraversalMaps());
					this._domNodeToWrapperMap.set(next.domNode!, next);
					const { parentDomNode, parentWNodeWrapper } = findParentNodes(next.node, this._getTraversalMaps());
					if (parentWNodeWrapper) {
						if (parentWNodeWrapper && !parentWNodeWrapper.domNode) {
							parentWNodeWrapper.domNode = next.domNode;
						}
					}
					const domInstruction: DomApplicatorInstruction = {
						next: next!,
						parentDomNode: parentDomNode!,
						parentWNodeWrapper,
						type: 'create'
					};
					let mergeNodes: Node[] = [];
					if (this._merge) {
						mergeNodes = arrayFrom(next.domNode!.childNodes);
					}
					if (next.childrenWrappers) {
						return [{ current: [], next: next.childrenWrappers, mergeNodes }, domInstruction];
					}
					return [domInstruction];
				} else {
					next = this._createWidget({ next }, this._getTraversalMaps(), this._registry);
					if (!this._invalidate && next.instance) {
						this._invalidate = next.instance.invalidate.bind(next.instance);
					}
					next.instance && this._instanceToWrapperMap.set(next.instance, next);
					return [{ next: next.childrenWrappers, mergeNodes: next.mergeNodes }];
				}
			} else if (current && next) {
				if (isVNodeWrapper(current) && isVNodeWrapper(next)) {
					this._updateDom({ current, next }, this._getTraversalMaps());
					this._domNodeToWrapperMap.set(next.domNode!, next);
					const { parentWNodeWrapper } = findParentNodes(next.node, this._getTraversalMaps());
					const instanceData = widgetInstanceMap.get(parentWNodeWrapper!.instance!)!;
					if (next.node.properties.key != null) {
						instanceData.nodeHandler.add(next.domNode as HTMLElement, `${next.node.properties.key}`);
					}
					return [{ current: current.childrenWrappers, next: next.childrenWrappers }];
				} else if (isWNodeWrapper(current) && isWNodeWrapper(next)) {
					next = this._updateWidget({ current, next });
					this._instanceToWrapperMap.set(next.instance!, next);
					return [{ current: current.childrenWrappers, next: next.childrenWrappers }];
				}
			} else if (current && !next) {
				if (isVNodeWrapper(current)) {
					current = this._removeDom({ current }, this._getTraversalMaps());
					if (current.domNode!.parentNode) {
						return [
							{ current: current.childrenWrappers },
							{
								type: 'delete',
								current
							}
						];
					}
					return [{ current: current.childrenWrappers }];
				} else if (isWNodeWrapper(current)) {
					current = current.instance ? this._instanceToWrapperMap.get(current.instance)! : current;
					this._removeWidget({ current });
					return [{ current: current.childrenWrappers }];
				}
			}
		}
	}

	private _createWidget(
		{ next }: CreateWidgetInstruction,
		traversalMaps: TraversalMaps,
		registry: Registry | null = null
	): WNodeWrapper {
		let {
			node: { widgetConstructor }
		} = next;
		const { parentWNodeWrapper } = findParentNodes(next.node, traversalMaps);
		if (!isWidgetBaseConstructor<DefaultWidgetBaseInterface>(widgetConstructor)) {
			let item: Constructor<WidgetBase> | null = null;
			if (!parentWNodeWrapper) {
				item = registry && registry.get<WidgetBase>(widgetConstructor);
			} else {
				item = parentWNodeWrapper!.instance!.registry.get<WidgetBase>(widgetConstructor);
			}
			if (item) {
				widgetConstructor = item;
			} else {
				return next;
			}
		}
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
		return next;
	}

	private _updateWidget({ current, next }: UpdateWidgetInstruction): WNodeWrapper {
		const { instance, domNode } = current;
		const instanceData = widgetInstanceMap.get(instance!)!;
		next.instance = instance;
		next.domNode = domNode;
		instanceData.rendering = true;
		instance!.__setProperties__(next.node.properties, next.node.bind);
		instance!.__setChildren__(next.node.children);
		if (instanceData.dirty) {
			let rendered = instance!.__render__();
			instanceData.rendering = false;
			if (rendered) {
				rendered = Array.isArray(rendered) ? rendered : [rendered];
				next.childrenWrappers = renderedToWrapper(rendered, next, current, this._getTraversalMaps());
			}
		} else {
			next.childrenWrappers = current.childrenWrappers;
		}
		instanceData.rendering = false;
		return next;
	}

	private _removeWidget({ current }: RemoveWidgetInstruction): WNodeWrapper {
		this._wrapperSiblingMap.delete(current);
		this._dnodeToParentWrapperMap.delete(current.node);
		this._instanceToWrapperMap.delete(current.instance!);
		if (current.instance) {
			const instanceData = widgetInstanceMap.get(current.instance)!;
			instanceData.onDetach();
		}
		return current;
	}

	private _createDom({ next }: CreateDomInstruction, traversalMaps: TraversalMaps): VNodeWrapper {
		if (!next.domNode) {
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
		} else {
			next.merged = true;
		}
		if (next.domNode) {
			if (next.node.children) {
				const children = renderedToWrapper(next.node.children, next, null, traversalMaps);
				next.childrenWrappers = children;
			}
		}
		return next;
	}

	private _updateDom({ current, next }: UpdateDomInstruction, traversalMaps: TraversalMaps): VNodeWrapper {
		const parentDomNode = findParentNodes(current.node, traversalMaps).parentDomNode;
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
			// TODO move to dom instruction
			const parent = this._dnodeToParentWrapperMap.get(next.node);
			if (parent && isWNodeWrapper(parent) && parent.instance) {
				const instanceData = widgetInstanceMap.get(parent.instance)!;
				instanceData.nodeHandler.addRoot();
			}
			const updated = setProperties(next.domNode as HTMLElement, current.node.properties, next, this._eventMap);
			if (updated && next.node.properties.updateAnimation) {
				next.node.properties.updateAnimation(
					next.domNode as HTMLElement,
					next.node.properties,
					current.node.properties
				);
			}
		}
		return next;
	}

	private _removeDom({ current }: RemoveDomInstruction, { sibling, parent }: TraversalMaps): VNodeWrapper {
		sibling.delete(current);
		parent.delete(current.node);
		current.domNode && this._domNodeToWrapperMap.delete(current.domNode);
		return current;
	}
}

export function renderer(render: () => WNode): Renderer {
	const r = new Renderer(render);
	return r;
}
