import { assign } from '@dojo/core/lang';
import { DNode, HNode, VirtualDomProperties, WidgetProperties, WNode } from '@dojo/widget-core/interfaces';
import { isHNode, isWNode } from '@dojo/widget-core/d';
import AssertionError from './AssertionError';
import { CustomDiff } from './compare';

export type RenderResults = DNode | DNode[];

type FoundNodeInfo<T extends DNode = DNode> = { found?: T; parent?: WNode | HNode | undefined; index?: number };

function assignChildPropertiesByKeyOrIndex(
	target: WNode | HNode,
	keyOrIndex: string | number | object,
	properties: WidgetProperties | VirtualDomProperties,
	byKey?: boolean
) {
	const { found: node } = findByKeyOrIndex(target, keyOrIndex, byKey);

	if (!node || !(isWNode(node) || isHNode(node))) {
		const keyOrIndexString = typeof keyOrIndex === 'object' ? JSON.stringify(keyOrIndex) : keyOrIndex;
		throw new TypeError(
			`${
				byKey || typeof keyOrIndex === 'object' ? 'Key' : 'Index'
			} of "${keyOrIndexString}" is not resolving to a valid target`
		);
	}
	assignProperties(node, properties);
	return target;
}

export function assignChildProperties(
	target: WNode | HNode,
	index: number | string,
	properties: WidgetProperties | VirtualDomProperties
): WNode | HNode {
	return assignChildPropertiesByKeyOrIndex(target, index, properties);
}

export function assignChildPropertiesByKey(
	target: WNode | HNode,
	key: string | object,
	properties: WidgetProperties | VirtualDomProperties
): WNode | HNode {
	return assignChildPropertiesByKeyOrIndex(target, key, properties, true);
}

export function assignProperties(target: HNode, properties: VirtualDomProperties): HNode;
export function assignProperties(target: WNode, properties: WidgetProperties): WNode;
export function assignProperties(
	target: WNode | HNode,
	properties: WidgetProperties | VirtualDomProperties
): WNode | HNode;
export function assignProperties(
	target: WNode | HNode,
	properties: WidgetProperties | VirtualDomProperties
): WNode | HNode {
	assign(target.properties, properties);
	return target;
}

/**
 * Creates a function which, when placed in an expected render, will call the `callback`.  If the `callback` returns `true`, the value
 * of the property is considered equal, otherwise it is considered not equal and the expected render will fail.
 * @param callback A function that is invoked when comparing the property value
 */
export function compareProperty<T>(
	callback: (value: T, name: string | number, parent: WidgetProperties | VirtualDomProperties) => boolean
): CustomDiff<T> {
	function differ(value: T, name: string | number, parent: WidgetProperties | VirtualDomProperties) {
		if (!callback(value, name, parent)) {
			throw new AssertionError(`The value of property "${name}" is unexpected.`, {}, differ);
		}
	}
	return new CustomDiff<T>(differ);
}

function replaceChildByKeyOrIndex(
	target: WNode | HNode,
	indexOrKey: number | string | object,
	replacement: DNode,
	byKey = false
): WNode | HNode {
	if (!target.children) {
		throw new TypeError('Target does not have children.');
	}

	const { parent, index } = findByKeyOrIndex(target, indexOrKey, byKey);

	if (!parent || typeof index === 'undefined' || !parent.children) {
		if (byKey || typeof indexOrKey === 'object') {
			throw new TypeError(
				`Key of "${
					typeof indexOrKey === 'object' ? JSON.stringify(indexOrKey) : indexOrKey
				}" is not resolving to a valid target`
			);
		} else {
			throw new TypeError(`Index of "${indexOrKey}" is not resolving to a valid target`);
		}
	} else {
		parent.children[index] = replacement;
	}

	return target;
}

/**
 * Finds the child of the target that has the provided key, and replaces it with the provided node.
 *
 * *NOTE:* The replacement modifies the passed `target` and does not return a new instance of the `DNode`.
 * @param target The DNode to replace a child element on
 * @param key The key of the node to replace
 * @param replacement The DNode that replaces the found node
 * @returns {WNode | HNode}
 */
export function replaceChildByKey(target: WNode | HNode, key: string | object, replacement: DNode): WNode | HNode {
	return replaceChildByKeyOrIndex(target, key, replacement, true);
}

/**
 * Replace a child of DNode.
 *
 * *NOTE:* The replacement modifies the passed `target` and does not return a new instance of the `DNode`.
 * @param target The DNode to replace a child element on
 * @param index A number of the index of a child, or a string with comma separated indexes that would navigate
 * @param replacement The DNode to be replaced
 */
export function replaceChild(target: WNode | HNode, index: number | string, replacement: DNode): WNode | HNode {
	return replaceChildByKeyOrIndex(target, index, replacement);
}

function isNode(value: any): value is WNode | HNode {
	return value && typeof value === 'object' && value !== null;
}

function findByKeyOrIndex(target: WNode | HNode, keyOrIndex: string | number | object, byKey = false) {
	if (byKey || typeof keyOrIndex === 'object') {
		return findByKey(target, keyOrIndex);
	} else {
		return findByIndex(target, keyOrIndex);
	}
}

function findByKey(
	target: WNode | HNode,
	key: string | object | number,
	parent?: WNode | HNode,
	index?: number
): FoundNodeInfo<WNode | HNode> {
	if (target.properties.key === key) {
		return { parent, found: target, index };
	}
	if (!target.children) {
		return {};
	}
	let nodeInfo: FoundNodeInfo<WNode | HNode> | undefined;
	target.children.forEach((child, index) => {
		if (isNode(child)) {
			if (nodeInfo && nodeInfo.found) {
				if (findByKey(child, key, target, index).found) {
					console.warn(`Duplicate key of "${typeof key === 'object' ? JSON.stringify(key) : key}" found.`);
				}
			} else {
				nodeInfo = findByKey(child, key, target, index);
			}
		}
	});
	return nodeInfo || {};
}

function findByIndex(target: WNode | HNode, index: number | string): FoundNodeInfo {
	if (typeof index === 'number') {
		return target.children ? { parent: target, found: target.children[index], index } : {};
	}
	const indexes = index.split(',').map(Number);
	const lastIndex = indexes.pop()!;
	const resolvedTarget = indexes.reduce((target: any, idx) => {
		if (!(isWNode(target) || isHNode(target)) || !target.children) {
			return target;
		}
		return target.children[idx];
	}, target);
	if (!(isWNode(resolvedTarget) || isHNode(resolvedTarget)) || !resolvedTarget.children) {
		return {};
	}
	return { parent: resolvedTarget, found: resolvedTarget.children[lastIndex], index: lastIndex };
}

/**
 * Find a virtual DOM node (`WNode` or `HNode`) based on it having a matching `key` property.
 *
 * The function returns `undefined` if no node was found, otherwise it returns the node.  *NOTE* it will return the first node
 * matching the supplied `key`, but will `console.warn` if more than one node was found.
 */
export function findKey(target: WNode | HNode, key: string | object): WNode | HNode | undefined {
	const { found } = findByKey(target, key);
	return found;
}

/**
 * Return a `DNode` that is identified by supplied index
 * @param target The target `WNode` or `HNode` to resolve the index for
 * @param index A number or a string indicating the child index
 */
export function findIndex(target: WNode | HNode, index: number | string): DNode | undefined {
	const { found } = findByIndex(target, index);
	return found;
}

function replaceChildPropertiesByKeyOrIndex(
	target: WNode | HNode,
	indexOrKey: number | string | object,
	properties: WidgetProperties | VirtualDomProperties,
	byKey = false
): WNode | HNode {
	const { found } = findByKeyOrIndex(target, indexOrKey, byKey);

	if (!found || !(isWNode(found) || isHNode(found))) {
		if (byKey || typeof indexOrKey === 'object') {
			throw new TypeError(
				`Key of "${
					typeof indexOrKey === 'object' ? JSON.stringify(indexOrKey) : indexOrKey
				}" is not resolving to a valid target`
			);
		} else {
			throw new TypeError(`Index of "${indexOrKey}" is not resolving to a valid target`);
		}
	}

	replaceProperties(found, properties);
	return target;
}

export function replaceChildProperties(
	target: WNode | HNode,
	index: number | string,
	properties: WidgetProperties | VirtualDomProperties
): WNode | HNode {
	return replaceChildPropertiesByKeyOrIndex(target, index, properties);
}

export function replaceChildPropertiesByKey(
	target: WNode | HNode,
	key: string | object,
	properties: WidgetProperties | VirtualDomProperties
): WNode | HNode {
	return replaceChildPropertiesByKeyOrIndex(target, key, properties, true);
}

export function replaceProperties(target: HNode, properties: VirtualDomProperties): HNode;
export function replaceProperties(target: WNode, properties: WidgetProperties): WNode;
export function replaceProperties(
	target: WNode | HNode,
	properties: WidgetProperties | VirtualDomProperties
): WNode | HNode;
export function replaceProperties(
	target: WNode | HNode,
	properties: WidgetProperties | VirtualDomProperties
): WNode | HNode {
	target.properties = properties;
	return target;
}
