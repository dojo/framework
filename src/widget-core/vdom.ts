import global from '@dojo/shim/global';
import {
	CoreProperties,
	DefaultWidgetBaseInterface,
	DNode,
	VNode,
	WNode,
	ProjectionOptions,
	Projection,
	SupportedClassName,
	TransitionStrategy,
	VNodeProperties
} from './interfaces';
import { from as arrayFrom } from '@dojo/shim/array';
import { isWNode, isVNode, VNODE, WNODE } from './d';
import { isWidgetBaseConstructor } from './Registry';
import WeakMap from '@dojo/shim/WeakMap';
import NodeHandler from './NodeHandler';
import RegistryHandler from './RegistryHandler';

const NAMESPACE_W3 = 'http://www.w3.org/';
const NAMESPACE_SVG = NAMESPACE_W3 + '2000/svg';
const NAMESPACE_XLINK = NAMESPACE_W3 + '1999/xlink';

const emptyArray: (InternalWNode | InternalVNode)[] = [];

export type RenderResult = DNode<any> | DNode<any>[];

interface InstanceMapData {
	parentVNode: InternalVNode;
	dnode: InternalWNode;
}

export interface InternalWNode extends WNode<DefaultWidgetBaseInterface> {
	/**
	 * The instance of the widget
	 */
	instance: DefaultWidgetBaseInterface;

	/**
	 * The rendered DNodes from the instance
	 */
	rendered: InternalDNode[];

	/**
	 * Core properties that are used by the widget core system
	 */
	coreProperties: CoreProperties;

	/**
	 * Children for the WNode
	 */
	children: InternalDNode[];
}

export interface InternalVNode extends VNode {
	/**
	 * Children for the VNode
	 */
	children?: InternalDNode[];

	inserted?: boolean;

	/**
	 * Bag used to still decorate properties on a deferred properties callback
	 */
	decoratedDeferredProperties?: VNodeProperties;

	/**
	 * DOM element
	 */
	domNode?: Element | Text;
}

export type InternalDNode = InternalVNode | InternalWNode;

export interface RenderQueue {
	instance: DefaultWidgetBaseInterface;
	depth: number;
}

export interface WidgetData {
	onDetach: () => void;
	onAttach: () => void;
	dirty: boolean;
	registry: () => RegistryHandler;
	nodeHandler: NodeHandler;
	coreProperties: CoreProperties;
	invalidate?: Function;
	rendering: boolean;
	inputProperties: any;
}

export const widgetInstanceMap = new WeakMap<any, WidgetData>();

const instanceMap = new WeakMap<DefaultWidgetBaseInterface, InstanceMapData>();
const renderQueueMap = new WeakMap<DefaultWidgetBaseInterface, RenderQueue[]>();

function same(dnode1: InternalDNode, dnode2: InternalDNode) {
	if (isVNode(dnode1) && isVNode(dnode2)) {
		if (dnode1.tag !== dnode2.tag) {
			return false;
		}
		if (dnode1.properties.key !== dnode2.properties.key) {
			return false;
		}
		return true;
	} else if (isWNode(dnode1) && isWNode(dnode2)) {
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

const missingTransition = function() {
	throw new Error('Provide a transitions object to the projectionOptions to do animations');
};

function getProjectionOptions(
	projectorOptions: Partial<ProjectionOptions>,
	projectorInstance: DefaultWidgetBaseInterface
): ProjectionOptions {
	const defaults = {
		namespace: undefined,
		styleApplyer: function(domNode: HTMLElement, styleName: string, value: string) {
			(domNode.style as any)[styleName] = value;
		},
		transitions: {
			enter: missingTransition,
			exit: missingTransition
		},
		deferredRenderCallbacks: [],
		afterRenderCallbacks: [],
		nodeMap: new WeakMap(),
		depth: 0,
		merge: false,
		renderScheduled: undefined,
		renderQueue: [],
		projectorInstance
	};
	return { ...defaults, ...projectorOptions } as ProjectionOptions;
}

function checkStyleValue(styleValue: Object) {
	if (typeof styleValue !== 'string') {
		throw new Error('Style values must be strings');
	}
}

function updateEvent(
	domNode: Node,
	eventName: string,
	currentValue: Function,
	projectionOptions: ProjectionOptions,
	bind: any,
	previousValue?: Function
) {
	const eventMap = projectionOptions.nodeMap.get(domNode) || new WeakMap();

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
	projectionOptions.nodeMap.set(domNode, eventMap);
}

function addClasses(domNode: Element, classes: SupportedClassName) {
	if (classes) {
		const classNames = classes.split(' ');
		for (let i = 0; i < classNames.length; i++) {
			domNode.classList.add(classNames[i]);
		}
	}
}

function removeClasses(domNode: Element, classes: SupportedClassName) {
	if (classes) {
		const classNames = classes.split(' ');
		for (let i = 0; i < classNames.length; i++) {
			domNode.classList.remove(classNames[i]);
		}
	}
}

function buildPreviousProperties(domNode: any, previous: InternalVNode, current: InternalVNode) {
	const { diffType, properties, attributes } = current;
	if (!diffType || diffType === 'vdom') {
		return { properties: previous.properties, attributes: previous.attributes, events: previous.events };
	} else if (diffType === 'none') {
		return { properties: {}, attributes: previous.attributes ? {} : undefined, events: previous.events };
	}
	let newProperties: any = {
		properties: {}
	};
	if (attributes) {
		newProperties.attributes = {};
		newProperties.events = previous.events;
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

function focusNode(propValue: any, previousValue: any, domNode: Element, projectionOptions: ProjectionOptions): void {
	let result;
	if (typeof propValue === 'function') {
		result = propValue();
	} else {
		result = propValue && !previousValue;
	}
	if (result === true) {
		projectionOptions.deferredRenderCallbacks.push(() => {
			(domNode as HTMLElement).focus();
		});
	}
}

function removeOrphanedEvents(
	domNode: Element,
	previousProperties: VNodeProperties,
	properties: VNodeProperties,
	projectionOptions: ProjectionOptions,
	onlyEvents: boolean = false
) {
	const eventMap = projectionOptions.nodeMap.get(domNode);
	if (eventMap) {
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
}

function updateAttribute(domNode: Element, attrName: string, attrValue: string, projectionOptions: ProjectionOptions) {
	if (projectionOptions.namespace === NAMESPACE_SVG && attrName === 'href') {
		domNode.setAttributeNS(NAMESPACE_XLINK, attrName, attrValue);
	} else if ((attrName === 'role' && attrValue === '') || attrValue === undefined) {
		domNode.removeAttribute(attrName);
	} else {
		domNode.setAttribute(attrName, attrValue);
	}
}

function updateAttributes(
	domNode: Element,
	previousAttributes: { [index: string]: string },
	attributes: { [index: string]: string },
	projectionOptions: ProjectionOptions
) {
	const attrNames = Object.keys(attributes);
	const attrCount = attrNames.length;
	for (let i = 0; i < attrCount; i++) {
		const attrName = attrNames[i];
		const attrValue = attributes[attrName];
		const previousAttrValue = previousAttributes[attrName];
		if (attrValue !== previousAttrValue) {
			updateAttribute(domNode, attrName, attrValue, projectionOptions);
		}
	}
}

function updateProperties(
	domNode: Element,
	previousProperties: VNodeProperties,
	properties: VNodeProperties,
	projectionOptions: ProjectionOptions,
	includesEventsAndAttributes = true
) {
	let propertiesUpdated = false;
	const propNames = Object.keys(properties);
	const propCount = propNames.length;
	if (propNames.indexOf('classes') === -1 && previousProperties.classes) {
		if (Array.isArray(previousProperties.classes)) {
			for (let i = 0; i < previousProperties.classes.length; i++) {
				removeClasses(domNode, previousProperties.classes[i]);
			}
		} else {
			removeClasses(domNode, previousProperties.classes);
		}
	}

	includesEventsAndAttributes && removeOrphanedEvents(domNode, previousProperties, properties, projectionOptions);

	for (let i = 0; i < propCount; i++) {
		const propName = propNames[i];
		let propValue = properties[propName];
		const previousValue = previousProperties![propName];
		if (propName === 'classes') {
			const previousClasses = Array.isArray(previousValue) ? previousValue : [previousValue];
			const currentClasses = Array.isArray(propValue) ? propValue : [propValue];
			if (previousClasses && previousClasses.length > 0) {
				if (!propValue || propValue.length === 0) {
					for (let i = 0; i < previousClasses.length; i++) {
						removeClasses(domNode, previousClasses[i]);
					}
				} else {
					const newClasses: (null | undefined | string)[] = [...currentClasses];
					for (let i = 0; i < previousClasses.length; i++) {
						const previousClassName = previousClasses[i];
						if (previousClassName) {
							const classIndex = newClasses.indexOf(previousClassName);
							if (classIndex === -1) {
								removeClasses(domNode, previousClassName);
							} else {
								newClasses.splice(classIndex, 1);
							}
						}
					}
					for (let i = 0; i < newClasses.length; i++) {
						addClasses(domNode, newClasses[i]);
					}
				}
			} else {
				for (let i = 0; i < currentClasses.length; i++) {
					addClasses(domNode, currentClasses[i]);
				}
			}
		} else if (propName === 'focus') {
			focusNode(propValue, previousValue, domNode, projectionOptions);
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
				propertiesUpdated = true;
				if (newStyleValue) {
					checkStyleValue(newStyleValue);
					projectionOptions.styleApplyer!(domNode as HTMLElement, styleName, newStyleValue);
				} else {
					projectionOptions.styleApplyer!(domNode as HTMLElement, styleName, '');
				}
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
				if (propValue !== previousValue) {
					propertiesUpdated = true;
				}
			} else if (propValue !== previousValue) {
				const type = typeof propValue;
				if (type === 'function' && propName.lastIndexOf('on', 0) === 0 && includesEventsAndAttributes) {
					updateEvent(
						domNode,
						propName.substr(2),
						propValue,
						projectionOptions,
						properties.bind,
						previousValue
					);
				} else if (type === 'string' && propName !== 'innerHTML' && includesEventsAndAttributes) {
					updateAttribute(domNode, propName, propValue, projectionOptions);
				} else {
					if ((domNode as any)[propName] !== propValue) {
						// Comparison is here for side-effects in Edge with scrollLeft and scrollTop
						(domNode as any)[propName] = propValue;
					}
				}
				propertiesUpdated = true;
			}
		}
	}
	return propertiesUpdated;
}

function findIndexOfChild(children: InternalDNode[], sameAs: InternalDNode, start: number) {
	for (let i = start; i < children.length; i++) {
		if (same(children[i], sameAs)) {
			return i;
		}
	}
	return -1;
}

export function toParentVNode(domNode: Element): InternalVNode {
	return {
		tag: '',
		properties: {},
		children: undefined,
		domNode,
		type: VNODE
	};
}

export function toTextVNode(data: any): InternalVNode {
	return {
		tag: '',
		properties: {},
		children: undefined,
		text: `${data}`,
		domNode: undefined,
		type: VNODE
	};
}

function toInternalWNode(instance: DefaultWidgetBaseInterface, instanceData: WidgetData): InternalWNode {
	return {
		instance,
		rendered: [],
		coreProperties: instanceData.coreProperties,
		children: instance.children as any,
		widgetConstructor: instance.constructor as any,
		properties: instanceData.inputProperties,
		type: WNODE
	};
}

export function filterAndDecorateChildren(
	children: undefined | DNode | DNode[],
	instance: DefaultWidgetBaseInterface
): InternalDNode[] {
	if (children === undefined) {
		return emptyArray;
	}
	children = Array.isArray(children) ? children : [children];

	for (let i = 0; i < children.length; ) {
		const child = children[i] as InternalDNode;
		if (child === undefined || child === null) {
			children.splice(i, 1);
			continue;
		} else if (typeof child === 'string') {
			children[i] = toTextVNode(child);
		} else {
			if (isVNode(child)) {
				if (child.properties.bind === undefined) {
					(child.properties as any).bind = instance;
					if (child.children && child.children.length > 0) {
						filterAndDecorateChildren(child.children, instance);
					}
				}
			} else {
				if (!child.coreProperties) {
					const instanceData = widgetInstanceMap.get(instance)!;
					child.coreProperties = {
						bind: instance,
						baseRegistry: instanceData.coreProperties.baseRegistry
					};
				}
				if (child.children && child.children.length > 0) {
					filterAndDecorateChildren(child.children, instance);
				}
			}
		}
		i++;
	}
	return children as InternalDNode[];
}

function nodeAdded(dnode: InternalDNode, transitions: TransitionStrategy) {
	if (isVNode(dnode) && dnode.properties) {
		const enterAnimation = dnode.properties.enterAnimation;
		if (enterAnimation) {
			if (typeof enterAnimation === 'function') {
				enterAnimation(dnode.domNode as Element, dnode.properties);
			} else {
				transitions.enter(dnode.domNode as Element, dnode.properties, enterAnimation as string);
			}
		}
	}
}

function callOnDetach(dNodes: InternalDNode | InternalDNode[], parentInstance: DefaultWidgetBaseInterface): void {
	dNodes = Array.isArray(dNodes) ? dNodes : [dNodes];
	for (let i = 0; i < dNodes.length; i++) {
		const dNode = dNodes[i];
		if (isWNode(dNode)) {
			if (dNode.rendered) {
				callOnDetach(dNode.rendered, dNode.instance);
			}
			if (dNode.instance) {
				const instanceData = widgetInstanceMap.get(dNode.instance)!;
				instanceData.onDetach();
			}
		} else {
			if (dNode.children) {
				callOnDetach(dNode.children as InternalDNode[], parentInstance);
			}
		}
	}
}

function nodeToRemove(dnode: InternalDNode, transitions: TransitionStrategy, projectionOptions: ProjectionOptions) {
	if (isWNode(dnode)) {
		const rendered = dnode.rendered || emptyArray;
		for (let i = 0; i < rendered.length; i++) {
			const child = rendered[i];
			if (isVNode(child)) {
				child.domNode!.parentNode!.removeChild(child.domNode!);
			} else {
				nodeToRemove(child, transitions, projectionOptions);
			}
		}
	} else {
		const domNode = dnode.domNode;
		const properties = dnode.properties;
		const exitAnimation = properties.exitAnimation;
		if (properties && exitAnimation) {
			(domNode as HTMLElement).style.pointerEvents = 'none';
			const removeDomNode = function() {
				domNode && domNode.parentNode && domNode.parentNode.removeChild(domNode);
			};
			if (typeof exitAnimation === 'function') {
				exitAnimation(domNode as Element, removeDomNode, properties);
				return;
			} else {
				transitions.exit(dnode.domNode as Element, properties, exitAnimation as string, removeDomNode);
				return;
			}
		}
		domNode && domNode.parentNode && domNode.parentNode.removeChild(domNode);
	}
}

function checkDistinguishable(
	childNodes: InternalDNode[],
	indexToCheck: number,
	parentInstance: DefaultWidgetBaseInterface
) {
	const childNode = childNodes[indexToCheck];
	if (isVNode(childNode) && !childNode.tag) {
		return; // Text nodes need not be distinguishable
	}
	const { key } = childNode.properties;

	if (key === undefined || key === null) {
		for (let i = 0; i < childNodes.length; i++) {
			if (i !== indexToCheck) {
				const node = childNodes[i];
				if (same(node, childNode)) {
					let nodeIdentifier: string;
					const parentName = (parentInstance as any).constructor.name || 'unknown';
					if (isWNode(childNode)) {
						nodeIdentifier = (childNode.widgetConstructor as any).name || 'unknown';
					} else {
						nodeIdentifier = childNode.tag;
					}

					console.warn(
						`A widget (${parentName}) has had a child addded or removed, but they were not able to uniquely identified. It is recommended to provide a unique 'key' property when using the same widget or element (${nodeIdentifier}) multiple times as siblings`
					);
					break;
				}
			}
		}
	}
}

function updateChildren(
	parentVNode: InternalVNode,
	oldChildren: InternalDNode[],
	newChildren: InternalDNode[],
	parentInstance: DefaultWidgetBaseInterface,
	projectionOptions: ProjectionOptions
) {
	oldChildren = oldChildren || emptyArray;
	newChildren = newChildren;
	const oldChildrenLength = oldChildren.length;
	const newChildrenLength = newChildren.length;
	const transitions = projectionOptions.transitions!;
	projectionOptions = { ...projectionOptions, depth: projectionOptions.depth + 1 };
	let oldIndex = 0;
	let newIndex = 0;
	let i: number;
	let textUpdated = false;
	while (newIndex < newChildrenLength) {
		const oldChild = oldIndex < oldChildrenLength ? oldChildren[oldIndex] : undefined;
		const newChild = newChildren[newIndex];
		if (isVNode(newChild) && typeof newChild.deferredPropertiesCallback === 'function') {
			newChild.inserted = isVNode(oldChild) && oldChild.inserted;
			addDeferredProperties(newChild, projectionOptions);
		}
		if (oldChild !== undefined && same(oldChild, newChild)) {
			textUpdated = updateDom(oldChild, newChild, projectionOptions, parentVNode, parentInstance) || textUpdated;
			oldIndex++;
		} else {
			const findOldIndex = findIndexOfChild(oldChildren, newChild, oldIndex + 1);
			if (findOldIndex >= 0) {
				for (i = oldIndex; i < findOldIndex; i++) {
					const oldChild = oldChildren[i];
					const indexToCheck = i;
					projectionOptions.afterRenderCallbacks.push(() => {
						callOnDetach(oldChild, parentInstance);
						checkDistinguishable(oldChildren, indexToCheck, parentInstance);
					});
					nodeToRemove(oldChildren[i], transitions, projectionOptions);
				}
				textUpdated =
					updateDom(oldChildren[findOldIndex], newChild, projectionOptions, parentVNode, parentInstance) ||
					textUpdated;
				oldIndex = findOldIndex + 1;
			} else {
				let insertBefore: Element | Text | undefined = undefined;
				let child: InternalDNode = oldChildren[oldIndex];
				if (child) {
					let nextIndex = oldIndex + 1;
					while (insertBefore === undefined) {
						if (isWNode(child)) {
							if (child.rendered) {
								child = child.rendered[0];
							} else if (oldChildren[nextIndex]) {
								child = oldChildren[nextIndex];
								nextIndex++;
							} else {
								break;
							}
						} else {
							insertBefore = child.domNode;
						}
					}
				}

				createDom(newChild, parentVNode, insertBefore, projectionOptions, parentInstance);
				nodeAdded(newChild, transitions);
				const indexToCheck = newIndex;
				projectionOptions.afterRenderCallbacks.push(() => {
					checkDistinguishable(newChildren, indexToCheck, parentInstance);
				});
			}
		}
		newIndex++;
	}
	if (oldChildrenLength > oldIndex) {
		// Remove child fragments
		for (i = oldIndex; i < oldChildrenLength; i++) {
			const oldChild = oldChildren[i];
			const indexToCheck = i;
			projectionOptions.afterRenderCallbacks.push(() => {
				callOnDetach(oldChild, parentInstance);
				checkDistinguishable(oldChildren, indexToCheck, parentInstance);
			});
			nodeToRemove(oldChildren[i], transitions, projectionOptions);
		}
	}
	return textUpdated;
}

function addChildren(
	parentVNode: InternalVNode,
	children: InternalDNode[] | undefined,
	projectionOptions: ProjectionOptions,
	parentInstance: DefaultWidgetBaseInterface,
	insertBefore: Element | Text | undefined = undefined,
	childNodes?: (Element | Text)[]
) {
	if (children === undefined) {
		return;
	}

	if (projectionOptions.merge && childNodes === undefined) {
		childNodes = arrayFrom(parentVNode.domNode!.childNodes) as (Element | Text)[];
	}

	projectionOptions = { ...projectionOptions, depth: projectionOptions.depth + 1 };

	for (let i = 0; i < children.length; i++) {
		const child = children[i];

		if (isVNode(child)) {
			if (projectionOptions.merge && childNodes) {
				let domElement: Element | undefined = undefined;
				while (child.domNode === undefined && childNodes.length > 0) {
					domElement = childNodes.shift() as Element;
					if (domElement && domElement.tagName === (child.tag.toUpperCase() || undefined)) {
						child.domNode = domElement;
					}
				}
			}
			createDom(child, parentVNode, insertBefore, projectionOptions, parentInstance);
		} else {
			createDom(child, parentVNode, insertBefore, projectionOptions, parentInstance, childNodes);
		}
	}
}

function initPropertiesAndChildren(
	domNode: Element,
	dnode: InternalVNode,
	parentInstance: DefaultWidgetBaseInterface,
	projectionOptions: ProjectionOptions
) {
	addChildren(dnode, dnode.children, projectionOptions, parentInstance, undefined);
	if (typeof dnode.deferredPropertiesCallback === 'function' && dnode.inserted === undefined) {
		addDeferredProperties(dnode, projectionOptions);
	}

	if (dnode.attributes && dnode.events) {
		updateAttributes(domNode, {}, dnode.attributes, projectionOptions);
		updateProperties(domNode, {}, dnode.properties, projectionOptions, false);
		removeOrphanedEvents(domNode, {}, dnode.events, projectionOptions, true);
		const events = dnode.events;
		Object.keys(events).forEach((event) => {
			updateEvent(domNode, event, events[event], projectionOptions, dnode.properties.bind);
		});
	} else {
		updateProperties(domNode, {}, dnode.properties, projectionOptions);
	}
	if (dnode.properties.key !== null && dnode.properties.key !== undefined) {
		const instanceData = widgetInstanceMap.get(parentInstance)!;
		instanceData.nodeHandler.add(domNode as HTMLElement, `${dnode.properties.key}`);
	}
	dnode.inserted = true;
}

function createDom(
	dnode: InternalDNode,
	parentVNode: InternalVNode,
	insertBefore: Element | Text | undefined,
	projectionOptions: ProjectionOptions,
	parentInstance: DefaultWidgetBaseInterface,
	childNodes?: (Element | Text)[]
) {
	let domNode: Element | Text | undefined;
	if (isWNode(dnode)) {
		let { widgetConstructor } = dnode;
		const parentInstanceData = widgetInstanceMap.get(parentInstance)!;
		if (!isWidgetBaseConstructor<DefaultWidgetBaseInterface>(widgetConstructor)) {
			const item = parentInstanceData.registry().get<DefaultWidgetBaseInterface>(widgetConstructor);
			if (item === null) {
				return;
			}
			widgetConstructor = item;
		}
		const instance = new widgetConstructor();
		dnode.instance = instance;
		const instanceData = widgetInstanceMap.get(instance)!;
		instanceData.invalidate = () => {
			instanceData.dirty = true;
			if (instanceData.rendering === false) {
				const renderQueue = renderQueueMap.get(projectionOptions.projectorInstance)!;
				renderQueue.push({ instance, depth: projectionOptions.depth });
				scheduleRender(projectionOptions);
			}
		};
		instanceData.rendering = true;
		instance.__setCoreProperties__(dnode.coreProperties);
		instance.__setChildren__(dnode.children);
		instance.__setProperties__(dnode.properties);
		instanceData.rendering = false;
		const rendered = instance.__render__();
		if (rendered) {
			const filteredRendered = filterAndDecorateChildren(rendered, instance);
			dnode.rendered = filteredRendered;
			addChildren(parentVNode, filteredRendered, projectionOptions, instance, insertBefore, childNodes);
		}
		instanceMap.set(instance, { dnode, parentVNode });
		instanceData.nodeHandler.addRoot();
		projectionOptions.afterRenderCallbacks.push(() => {
			instanceData.onAttach();
		});
	} else {
		if (projectionOptions.merge && projectionOptions.mergeElement !== undefined) {
			domNode = dnode.domNode = projectionOptions.mergeElement;
			projectionOptions.mergeElement = undefined;
			initPropertiesAndChildren(domNode!, dnode, parentInstance, projectionOptions);
			return;
		}
		const doc = parentVNode.domNode!.ownerDocument;
		if (!dnode.tag && typeof dnode.text === 'string') {
			if (dnode.domNode !== undefined && parentVNode.domNode) {
				const newDomNode = dnode.domNode.ownerDocument.createTextNode(dnode.text!);
				if (parentVNode.domNode === dnode.domNode.parentNode) {
					parentVNode.domNode.replaceChild(newDomNode, dnode.domNode);
				} else {
					parentVNode.domNode.appendChild(newDomNode);
					dnode.domNode.parentNode && dnode.domNode.parentNode.removeChild(dnode.domNode);
				}
				dnode.domNode = newDomNode;
			} else {
				domNode = dnode.domNode = doc.createTextNode(dnode.text!);
				if (insertBefore !== undefined) {
					parentVNode.domNode!.insertBefore(domNode, insertBefore);
				} else {
					parentVNode.domNode!.appendChild(domNode);
				}
			}
		} else {
			if (dnode.domNode === undefined) {
				if (dnode.tag === 'svg') {
					projectionOptions = { ...projectionOptions, ...{ namespace: NAMESPACE_SVG } };
				}
				if (projectionOptions.namespace !== undefined) {
					domNode = dnode.domNode = doc.createElementNS(projectionOptions.namespace, dnode.tag);
				} else {
					domNode = dnode.domNode = dnode.domNode || doc.createElement(dnode.tag);
				}
			} else {
				domNode = dnode.domNode;
			}
			initPropertiesAndChildren(domNode! as Element, dnode, parentInstance, projectionOptions);
			if (insertBefore !== undefined) {
				parentVNode.domNode!.insertBefore(domNode, insertBefore);
			} else if (domNode!.parentNode !== parentVNode.domNode!) {
				parentVNode.domNode!.appendChild(domNode);
			}
		}
	}
}

function updateDom(
	previous: any,
	dnode: InternalDNode,
	projectionOptions: ProjectionOptions,
	parentVNode: InternalVNode,
	parentInstance: DefaultWidgetBaseInterface
) {
	if (isWNode(dnode)) {
		const { instance } = previous;
		if (instance) {
			const { parentVNode, dnode: node } = instanceMap.get(instance)!;
			const previousRendered = node ? node.rendered : previous.rendered;
			const instanceData = widgetInstanceMap.get(instance)!;
			instanceData.rendering = true;
			instance.__setCoreProperties__(dnode.coreProperties);
			instance.__setChildren__(dnode.children);
			instance.__setProperties__(dnode.properties);
			instanceData.rendering = false;
			dnode.instance = instance;
			instanceMap.set(instance, { dnode, parentVNode });
			if (instanceData.dirty === true) {
				const rendered = instance.__render__();
				dnode.rendered = filterAndDecorateChildren(rendered, instance);
				updateChildren(parentVNode, previousRendered, dnode.rendered, instance, projectionOptions);
			} else {
				dnode.rendered = previousRendered;
			}
			instanceData.nodeHandler.addRoot();
		} else {
			createDom(dnode, parentVNode, undefined, projectionOptions, parentInstance);
		}
	} else {
		if (previous === dnode) {
			return false;
		}
		const domNode = (dnode.domNode = previous.domNode);
		let textUpdated = false;
		let updated = false;
		if (!dnode.tag && typeof dnode.text === 'string') {
			if (dnode.text !== previous.text) {
				const newDomNode = domNode.ownerDocument.createTextNode(dnode.text!);
				domNode.parentNode!.replaceChild(newDomNode, domNode);
				dnode.domNode = newDomNode;
				textUpdated = true;
				return textUpdated;
			}
		} else {
			if (dnode.tag && dnode.tag.lastIndexOf('svg', 0) === 0) {
				projectionOptions = { ...projectionOptions, ...{ namespace: NAMESPACE_SVG } };
			}
			if (previous.children !== dnode.children) {
				const children = filterAndDecorateChildren(dnode.children, parentInstance);
				dnode.children = children;
				updated =
					updateChildren(dnode, previous.children, children, parentInstance, projectionOptions) || updated;
			}

			const previousProperties = buildPreviousProperties(domNode, previous, dnode);
			if (dnode.attributes && dnode.events) {
				updateAttributes(domNode, previousProperties.attributes, dnode.attributes, projectionOptions);
				updated =
					updateProperties(
						domNode,
						previousProperties.properties,
						dnode.properties,
						projectionOptions,
						false
					) || updated;
				removeOrphanedEvents(domNode, previousProperties.events, dnode.events, projectionOptions, true);
				const events = dnode.events;
				Object.keys(events).forEach((event) => {
					updateEvent(
						domNode,
						event,
						events[event],
						projectionOptions,
						dnode.properties.bind,
						previousProperties.events[event]
					);
				});
			} else {
				updated =
					updateProperties(domNode, previousProperties.properties, dnode.properties, projectionOptions) ||
					updated;
			}

			if (dnode.properties.key !== null && dnode.properties.key !== undefined) {
				const instanceData = widgetInstanceMap.get(parentInstance)!;
				instanceData.nodeHandler.add(domNode, `${dnode.properties.key}`);
			}
		}
		if (updated && dnode.properties && dnode.properties.updateAnimation) {
			dnode.properties.updateAnimation(domNode as Element, dnode.properties, previous.properties);
		}
	}
}

function addDeferredProperties(vnode: InternalVNode, projectionOptions: ProjectionOptions) {
	// transfer any properties that have been passed - as these must be decorated properties
	vnode.decoratedDeferredProperties = vnode.properties;
	const properties = vnode.deferredPropertiesCallback!(!!vnode.inserted);
	vnode.properties = { ...properties, ...vnode.decoratedDeferredProperties };
	projectionOptions.deferredRenderCallbacks.push(() => {
		const properties = {
			...vnode.deferredPropertiesCallback!(!!vnode.inserted),
			...vnode.decoratedDeferredProperties
		};
		updateProperties(vnode.domNode! as Element, vnode.properties, properties, projectionOptions);
		vnode.properties = properties;
	});
}

function runDeferredRenderCallbacks(projectionOptions: ProjectionOptions) {
	if (projectionOptions.deferredRenderCallbacks.length) {
		if (projectionOptions.sync) {
			while (projectionOptions.deferredRenderCallbacks.length) {
				const callback = projectionOptions.deferredRenderCallbacks.shift();
				callback && callback();
			}
		} else {
			global.requestAnimationFrame(() => {
				while (projectionOptions.deferredRenderCallbacks.length) {
					const callback = projectionOptions.deferredRenderCallbacks.shift();
					callback && callback();
				}
			});
		}
	}
}

function runAfterRenderCallbacks(projectionOptions: ProjectionOptions) {
	if (projectionOptions.sync) {
		while (projectionOptions.afterRenderCallbacks.length) {
			const callback = projectionOptions.afterRenderCallbacks.shift();
			callback && callback();
		}
	} else {
		if (global.requestIdleCallback) {
			global.requestIdleCallback(() => {
				while (projectionOptions.afterRenderCallbacks.length) {
					const callback = projectionOptions.afterRenderCallbacks.shift();
					callback && callback();
				}
			});
		} else {
			setTimeout(() => {
				while (projectionOptions.afterRenderCallbacks.length) {
					const callback = projectionOptions.afterRenderCallbacks.shift();
					callback && callback();
				}
			});
		}
	}
}

function scheduleRender(projectionOptions: ProjectionOptions) {
	if (projectionOptions.sync) {
		render(projectionOptions);
	} else if (projectionOptions.renderScheduled === undefined) {
		projectionOptions.renderScheduled = global.requestAnimationFrame(() => {
			render(projectionOptions);
		});
	}
}

function render(projectionOptions: ProjectionOptions) {
	projectionOptions.renderScheduled = undefined;
	const renderQueue = renderQueueMap.get(projectionOptions.projectorInstance)!;
	const renders = [...renderQueue];
	renderQueueMap.set(projectionOptions.projectorInstance, []);
	renders.sort((a, b) => a.depth - b.depth);

	while (renders.length) {
		const { instance } = renders.shift()!;
		const { parentVNode, dnode } = instanceMap.get(instance)!;
		const instanceData = widgetInstanceMap.get(instance)!;
		updateDom(dnode, toInternalWNode(instance, instanceData), projectionOptions, parentVNode, instance);
	}
	runAfterRenderCallbacks(projectionOptions);
	runDeferredRenderCallbacks(projectionOptions);
}

export const dom = {
	append: function(
		parentNode: Element,
		instance: DefaultWidgetBaseInterface,
		projectionOptions: Partial<ProjectionOptions> = {}
	): Projection {
		const instanceData = widgetInstanceMap.get(instance)!;
		const finalProjectorOptions = getProjectionOptions(projectionOptions, instance);

		finalProjectorOptions.rootNode = parentNode;
		const parentVNode = toParentVNode(finalProjectorOptions.rootNode);
		const node = toInternalWNode(instance, instanceData);
		const renderQueue: RenderQueue[] = [];
		instanceMap.set(instance, { dnode: node, parentVNode });
		renderQueueMap.set(finalProjectorOptions.projectorInstance, renderQueue);
		instanceData.invalidate = () => {
			instanceData.dirty = true;
			if (instanceData.rendering === false) {
				const renderQueue = renderQueueMap.get(finalProjectorOptions.projectorInstance)!;
				renderQueue.push({ instance, depth: finalProjectorOptions.depth });
				scheduleRender(finalProjectorOptions);
			}
		};
		updateDom(node, node, finalProjectorOptions, parentVNode, instance);
		finalProjectorOptions.afterRenderCallbacks.push(() => {
			instanceData.onAttach();
		});
		runDeferredRenderCallbacks(finalProjectorOptions);
		runAfterRenderCallbacks(finalProjectorOptions);
		return {
			domNode: finalProjectorOptions.rootNode
		};
	},
	create: function(instance: DefaultWidgetBaseInterface, projectionOptions?: Partial<ProjectionOptions>): Projection {
		return this.append(document.createElement('div'), instance, projectionOptions);
	},
	merge: function(
		element: Element,
		instance: DefaultWidgetBaseInterface,
		projectionOptions: Partial<ProjectionOptions> = {}
	): Projection {
		projectionOptions.merge = true;
		projectionOptions.mergeElement = element;
		return this.append(element.parentNode as Element, instance, projectionOptions);
	}
};
