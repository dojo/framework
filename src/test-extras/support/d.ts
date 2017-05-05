import { assign } from '@dojo/core/lang';
import { DNode, HNode, VirtualDomProperties, WidgetProperties, WNode } from '@dojo/widget-core/interfaces';
import { isHNode, isWNode } from '@dojo/widget-core/d';
import AssertionError from './AssertionError';
import { CustomDiff } from './compare';

export function isVirtualDomPropertiesWithClasses(value: any): value is VirtualDomProperties {
	return Boolean(value && value.classes);
}

export function assignChildProperties(target: WNode | HNode, index: number | string, properties: WidgetProperties | VirtualDomProperties): WNode | HNode {
	const node = findIndex(target, index);
	if (!node || !(isWNode(node) || isHNode(node))) {
		throw new TypeError(`Index of "${index}" is not resolving to a valid target`);
	}
	assignProperties(node, properties);
	return target;
}

export function assignProperties(target: HNode, properties: VirtualDomProperties): HNode;
export function assignProperties(target: WNode, properties: WidgetProperties): WNode;
export function assignProperties(target: WNode | HNode, properties: WidgetProperties | VirtualDomProperties): WNode | HNode;
export function assignProperties(target: WNode | HNode, properties: WidgetProperties | VirtualDomProperties): WNode | HNode {
	if (isVirtualDomPropertiesWithClasses(properties) && typeof properties.classes === 'function') {
		assign(properties, { classes: properties.classes() });
	}
	assign(target.properties, properties);
	return target;
}

/**
 * Creates a function which, when placed in an expected render, will call the `callback`.  If the `callback` returns `true`, the value
 * of the property is considered equal, otherwise it is considerd not equal and the expected render will fail.
 * @param callback A function that is invoked when comparing the property value
 */
export function compareProperty<T>(callback: (value: T, name: string, parent: WidgetProperties | VirtualDomProperties) => boolean): CustomDiff<T> {
	function differ(value: T, name: string, parent: WidgetProperties | VirtualDomProperties) {
		if (!callback(value, name, parent)) {
			throw new AssertionError(`The value of property "${name}" is unexpected.`, {}, differ);
		}
	}
	return new CustomDiff(differ);
}

/**
 * Replace a child of DNode.
 *
 * *NOTE:* The replacement modifies the passed `target` and does not return a new instance of the `DNode`.
 * @param target The DNode to replace a child element on
 * @param index A number of the index of a child, or a string with comma seperated indexes that would nagivate
 * @param replacement The DNode to be replaced
 */
export function replaceChild(target: WNode | HNode, index: number | string, replacement: DNode): WNode | HNode {
	/* TODO: [Combine with findIndex](https://github.com/dojo/test-extras/issues/28) */
	if (typeof index === 'number') {
		target.children[index] = replacement;
	}
	else {
		const indexes = index.split(',').map(Number);
		const lastIndex = indexes.pop()!;
		const resolvedTarget = indexes.reduce((target, idx) => {
			if (!(isWNode(target) || isHNode(target))) {
				throw new TypeError(`Index of "${index}" is not resolving to a valid target`);
			}
			return target.children[idx];
		}, <DNode> target);
		if (!(isWNode(resolvedTarget) || isHNode(resolvedTarget))) {
			throw new TypeError(`Index of "${index}" is not resolving to a valid target`);
		}
		resolvedTarget.children[lastIndex] = replacement;
	}
	return target;
}

function hasChildren(value: any): value is WNode | HNode {
	return value && typeof value === 'object' && value !== null;
}

/**
 * Find a virtual DOM node (`WNode` or `HNode`) based on it having a matching `key` property.
 *
 * The function returns `undefined` if no node was found, otherwise it returns the node.  *NOTE* it will return the first node
 * matching the supplied `key`, but will `console.warn` if more than one node was found.
 */
export function findKey(target: WNode | HNode, key: string | object): WNode | HNode | undefined {
	if (target.properties.key === key) {
		return target;
	}
	let found: WNode | HNode | undefined;
	target.children
		.forEach((child) => {
			if (hasChildren(child)) {
				if (found) {
					if (findKey(child, key)) {
						console.warn(`Duplicate key of "${key}" found.`);
					}
				}
				else {
					found = findKey(child, key);
				}
			}
		});
	return found;
}

/**
 * Return a `DNode` that is identified by supplied index
 * @param target The target `WNode` or `HNode` to resolve the index for
 * @param index A number or a string indicating the child index
 */
export function findIndex(target: WNode | HNode, index: number | string): DNode | undefined {
	if (typeof index === 'number') {
		return target.children[index];
	}
	const indexes = index.split(',').map(Number);
	const lastIndex = indexes.pop()!;
	const resolvedTarget = indexes.reduce((target: any, idx) => {
		if (!(isWNode(target) || isHNode(target))) {
			return target;
		}
		return target.children[idx];
	}, target);
	if (!(isWNode(resolvedTarget) || isHNode(resolvedTarget))) {
		return;
	}
	return resolvedTarget.children[lastIndex];
}

export function replaceChildProperties(target: WNode | HNode, index: number | string, properties: WidgetProperties | VirtualDomProperties): WNode | HNode {
	const node = findIndex(target, index);
	if (!node || !(isWNode(node) || isHNode(node))) {
		throw new TypeError(`Index of "${index}" is not resolving to a valid target`);
	}
	replaceProperties(node, properties);
	return target;
}

export function replaceProperties(target: HNode, properties: VirtualDomProperties): HNode;
export function replaceProperties(target: WNode, properties: WidgetProperties): WNode;
export function replaceProperties(target: WNode | HNode, properties: WidgetProperties | VirtualDomProperties): WNode | HNode;
export function replaceProperties(target: WNode | HNode, properties: WidgetProperties | VirtualDomProperties): WNode | HNode {
	target.properties = properties;
	return target;
}
