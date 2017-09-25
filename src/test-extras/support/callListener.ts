import { HNode, WNode } from '@dojo/widget-core/interfaces';
import { findIndex, findKey } from './d';

/**
 * Options that can be passed to `callListener`
 */
export interface CallListenerOptions {
	/**
	 * Arguments to be passed to the listener when called
	 */
	args?: any[];

	/**
	 * Target a child of the `node` based on the _index_ which can be either a number, or a string of numbers
	 * deliminated by a comma.
	 */
	index?: number | string;

	/**
	 * Target the node based on a `key`.
	 */
	key?: string | object;

	/**
	 * Supply your own `target`
	 */
	target?: HNode | WNode;

	/**
	 * The `thisArg` to call a listener with.  It defaults to `properties.bind` of the target or `undefined`.
	 */
	thisArg?: any;
}

/**
 * Call a listener on a virtual DOM node or one of its children.
 * @param node The node to resolve the listener and call
 * @param method The listener name in the `node.properties` to call
 * @param options Options that effect how the listener is called
 */
export default function callListener(node: HNode | WNode, method: string, options: CallListenerOptions = {}): void {
	const { args, index, key, target, thisArg } = options;
	let resolvedTarget: any;
	if (target) {
		resolvedTarget = target;
	}
	else if (key) {
		resolvedTarget = findKey(node, key);
	}
	else if (typeof index !== 'undefined') {
		const byIndex = findIndex(node, index);
		if (typeof byIndex === 'object' && byIndex !== null && 'properties' in byIndex) {
			resolvedTarget = byIndex;
		}
	}
	else {
		resolvedTarget = node;
	}
	if (!resolvedTarget) {
		throw new TypeError(`Cannot resolve target`);
	}
	const listener: ((...args: any[]) => void) | undefined = resolvedTarget.properties[method];
	if (!listener) {
		throw new TypeError(`Cannot resolve listener: "${method}"`);
	}
	const bind = resolvedTarget.coreProperties ? resolvedTarget.coreProperties.bind : resolvedTarget.properties.bind;
	listener.apply(thisArg || bind, args);
}
