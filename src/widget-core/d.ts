import Symbol from '@dojo/shim/Symbol';
import {
	Constructor,
	DefaultWidgetBaseInterface,
	DeferredVirtualProperties,
	DNode,
	VNode,
	RegistryLabel,
	VNodeProperties,
	WidgetBaseInterface,
	WNode
} from './interfaces';

/**
 * The symbol identifier for a WNode type
 */
export const WNODE = Symbol('Identifier for a WNode.');

/**
 * The symbol identifier for a VNode type
 */
export const VNODE = Symbol('Identifier for a VNode.');

/**
 * Helper function that returns true if the `DNode` is a `WNode` using the `type` property
 */
export function isWNode<W extends WidgetBaseInterface = DefaultWidgetBaseInterface>(child: DNode<W>): child is WNode<W> {
	return Boolean(child && (typeof child !== 'string') && child.type === WNODE);
}

/**
 * Helper function that returns true if the `DNode` is a `VNode` using the `type` property
 */
export function isVNode(child: DNode): child is VNode {
	return Boolean(child && (typeof child !== 'string') && child.type === VNODE);
}

/**
 * Generic decorate function for DNodes. The nodes are modified in place based on the provided predicate
 * and modifier functions.
 *
 * The children of each node are flattened and added to the array for decoration.
 *
 * If no predicate is supplied then the modifier will be executed on all nodes.
 */
export function decorate<T extends DNode>(dNodes: DNode, modifier: (dNode: T) => void, predicate: (dNode: DNode) => dNode is T): DNode;
export function decorate<T extends DNode>(dNodes: DNode[], modifier: (dNode: T) => void, predicate: (dNode: DNode) => dNode is T): DNode[];
export function decorate(dNodes: DNode, modifier: (dNode: DNode) => void): DNode;
export function decorate(dNodes: DNode[], modifier: (dNode: DNode) => void): DNode[];
export function decorate(dNodes: DNode | DNode[], modifier: (dNode: DNode) => void, predicate?: (dNode: DNode) => boolean): DNode | DNode[] {
	let nodes = Array.isArray(dNodes) ? [ ...dNodes ] : [ dNodes ];
	while (nodes.length) {
		const node = nodes.pop();
		if (node) {
			if (!predicate || predicate(node)) {
				modifier(node);
			}
			if ((isWNode(node) || isVNode(node)) && node.children) {
				nodes = [ ...nodes, ...node.children ];
			}
		}
	}
	return dNodes;
}

/**
 * Wrapper function for calls to create a widget.
 */
export function w<W extends WidgetBaseInterface>(widgetConstructor: Constructor<W> | RegistryLabel, properties: W['properties'], children: W['children'] = []): WNode<W> {

	return {
		children,
		widgetConstructor,
		properties,
		type: WNODE
	};
}

/**
 * Wrapper function for calls to create VNodes.
 */
export function v(tag: string, properties: VNodeProperties | DeferredVirtualProperties, children?: DNode[]): VNode;
export function v(tag: string, children: undefined | DNode[]): VNode;
export function v(tag: string): VNode;
export function v(tag: string, propertiesOrChildren: VNodeProperties | DeferredVirtualProperties | DNode[] = {}, children: undefined | DNode[] = undefined): VNode {
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

		return {
			tag,
			deferredPropertiesCallback,
			children,
			properties,
			type: VNODE
		};
}
