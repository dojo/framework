import { DNode } from '@dojo/widget-core/interfaces';
import { findIndex, findKey, RenderResults } from './d';

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
	target?: DNode;

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
export default function callListener(node: RenderResults, method: string, options: CallListenerOptions = {}): void {
	const { args, thisArg } = options;
	const resolvedTargets = resolveTarget(node, options);
	if (resolvedTargets == null || !resolvedTargets.length) {
		throw new TypeError(`Cannot resolve target`);
	}
	resolvedTargets.forEach((target) => {
		const listener: ((...args: any[]) => void) | undefined = target.properties[method];
		if (!listener) {
			throw new TypeError(`Cannot resolve listener: "${method}"`);
		}
		const bind = target.coreProperties ? target.coreProperties.bind : target.properties.bind;
		listener.apply(thisArg || bind, args);
	});
}

function resolveTarget(node: RenderResults, options: CallListenerOptions): any[] {
	if (Array.isArray(node)) {
		let resolvedTargets: DNode[] = [];
		for (let i = 0, len = node.length; i < len; i++) {
			const item = node[i];
			const found = resolveTarget(item, options);
			if (found != null) {
				found.forEach((node) => {
					resolvedTargets.push(node);
				});
			}
		}
		return resolvedTargets;
	} else {
		let resolvedTarget: any;
		const { index, key, target } = options;
		if (target) {
			resolvedTarget = target;
		} else if (node != null && typeof node !== 'string') {
			if (key) {
				resolvedTarget = findKey(node, key);
			} else if (typeof index !== 'undefined') {
				const byIndex = findIndex(node, index);
				if (typeof byIndex === 'object' && byIndex !== null && 'properties' in byIndex) {
					resolvedTarget = byIndex;
				}
			} else {
				resolvedTarget = node;
			}
		}
		return resolvedTarget && [resolvedTarget];
	}
}
