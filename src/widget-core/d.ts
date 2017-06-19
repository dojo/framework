import { assign } from '@dojo/core/lang';
import { VNode } from '@dojo/interfaces/vdom';
import Symbol from '@dojo/shim/Symbol';
import { h, VNodeProperties } from 'maquette';
import {
	Constructor,
	DefaultWidgetBaseInterface,
	DNode,
	HNode,
	RegistryLabel,
	VirtualDomProperties,
	WidgetBaseInterface,
	WNode
} from './interfaces';
import { WidgetRegistry } from './WidgetRegistry';

/**
 * The symbol identifier for a WNode type
 */
export const WNODE = Symbol('Identifier for a WNode.');

/**
 * The symbol identifier for a HNode type
 */
export const HNODE = Symbol('Identifier for a HNode.');

/**
 * Helper function that returns true if the `DNode` is a `WNode` using the `type` property
 */
export function isWNode<W extends WidgetBaseInterface = DefaultWidgetBaseInterface>(child: DNode<W>): child is WNode<W> {
	return Boolean(child && (typeof child !== 'string') && child.type === WNODE);
}

/**
 * Helper function that returns true if the `DNode` is a `HNode` using the `type` property
 */
export function isHNode(child: DNode): child is HNode {
	return Boolean(child && (typeof child !== 'string') && child.type === HNODE);
}

/**
 * Generic decorate function for DNodes. The nodes are modified in place based on the provided predicate
 * and modifier functions.
 *
 * The children of each node are flattened and added to the array for decoration.
 *
 * If no predicate is supplied then the modifier will be executed on all nodes.
 */
export function decorate(dNodes: DNode, modifier: (dNode: DNode) => void, predicate?: (dNode: DNode) => boolean): DNode;
export function decorate(dNodes: DNode[], modifier: (dNode: DNode) => void, predicate?: (dNode: DNode) => boolean): DNode[];
export function decorate(dNodes: DNode | DNode[], modifier: (dNode: DNode) => void, predicate?: (dNode: DNode) => boolean): DNode | DNode[];
export function decorate(dNodes: DNode | DNode[], modifier: (dNode: DNode) => void, predicate?: (dNode: DNode) => boolean): DNode | DNode[] {
	let nodes = Array.isArray(dNodes) ? [ ...dNodes ] : [ dNodes ];
	while (nodes.length) {
		const node = nodes.pop();
		if (node) {
			if (!predicate || predicate(node)) {
				modifier(node);
			}
			if ((isWNode(node) || isHNode(node)) && node.children) {
				nodes = [ ...nodes, ...node.children ];
			}
		}
	}
	return dNodes;
}

/**
 * Global widget registry instance
 */
export const registry = new WidgetRegistry();

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
 * Wrapper function for calls to create hyperscript, lazily executes the hyperscript creation
 */
export function v(tag: string, properties: VirtualDomProperties, children?: DNode[]): HNode;
export function v(tag: string, children: DNode[]): HNode;
export function v(tag: string): HNode;
export function v(tag: string, propertiesOrChildren: VirtualDomProperties | DNode[] = {}, children: DNode[] = []): HNode {
		let properties: VirtualDomProperties = propertiesOrChildren;

		if (Array.isArray(propertiesOrChildren)) {
			children = propertiesOrChildren;
			properties = {};
		}

		if (properties) {
			let { classes } = properties;
			if (typeof classes === 'function') {
				classes = classes();
				properties = assign(properties, { classes });
			}
		}

		return {
			tag,
			children,
			properties,
			render(this: { vNodes: VNode[], properties: VNodeProperties }) {

				return h(tag, this.properties, this.vNodes);
			},
			type: HNODE
		};
}
