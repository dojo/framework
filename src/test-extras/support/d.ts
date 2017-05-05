import { assign } from '@dojo/core/lang';
import { DNode, HNode, VirtualDomProperties, WidgetProperties, WNode } from '@dojo/widget-core/interfaces';
import { isHNode, isWNode } from '@dojo/widget-core/d';

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
	return value && typeof value === 'object' && 'children' in value;
}

export function findKey(target: WNode | HNode, key: string | object): WNode | HNode | undefined {
	if (target.properties.key === key) {
		return target;
	}
	let found: WNode | HNode | undefined;
	target.children
		.some((child) => {
			if (hasChildren(child)) {
				return Boolean(found = findKey(child, key));
			}
			return false;
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
