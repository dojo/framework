import { DNode, WNode, VNode } from '../core/interfaces';
import * as diff from 'diff';
import WeakMap from '../shim/WeakMap';
import Set from '../shim/Set';
import Map from '../shim/Map';
import { from as arrayFrom } from '../shim/array';
import { isWNode, isVNode } from '../core/vdom';

const LINE_BREAK = '\n';
const TAB = '\t';

let widgetClassCounter = 0;
const widgetMap = new WeakMap<any, number>();

function getTabs(depth = 0): string {
	return new Array(depth + 1).join(TAB);
}

function isNode(value: any): value is DNode {
	return isWNode(value) || isVNode(value);
}

function getTagName(node: VNode | WNode): string {
	if (isVNode(node)) {
		return node.tag;
	}
	const { widgetConstructor } = node;
	let name: string;
	if (typeof widgetConstructor === 'string' || typeof widgetConstructor === 'symbol') {
		name = widgetConstructor.toString();
	} else {
		name = (widgetConstructor as any).name;
		if (!name) {
			let id = widgetMap.get(widgetConstructor);
			if (id === undefined) {
				id = ++widgetClassCounter;
				widgetMap.set(widgetConstructor, id);
			}
			name = `Widget-${id}`;
		}
	}
	return name;
}

function format(nodes: DNode | DNode[], depth = 0): string {
	nodes = Array.isArray(nodes) ? nodes : [nodes];
	const nodeString = nodes.reduce((str: string, node, index) => {
		if (node == null || node === true || node === false) {
			return str;
		}

		if (index > 0) {
			str = `${str}\n${getTabs(depth)}`;
		}

		if (typeof node === 'string' || typeof node === 'number') {
			return `${str}${node}`;
		}

		const tag = getTagName(node);
		str = `${str}<${tag}`;

		const propertyKeys = Object.keys(node.properties).sort();
		if (propertyKeys.length) {
			const properties = propertyKeys.reduce((props, propKey) => {
				return `${props} ${propKey}=${typeof node.properties[propKey] === 'string' ? '"' : '{'}${
					typeof node.properties[propKey] === 'function'
						? `"function"`
						: node.properties[propKey] instanceof Set || node.properties[propKey] instanceof Map
							? arrayFrom(node.properties[propKey])
							: node.properties[propKey]
				}${typeof node.properties[propKey] === 'string' ? '"' : '}'}`;
			}, '');

			str = `${str}${properties}`;
		}
		str = `${str}>`;

		if (node.children && node.children.length) {
			for (let i = 0; i < node.children.length; i++) {
				const child = node.children[i];
				if (!child) {
					continue;
				}
				if (isNode(child) || typeof child === 'string') {
					str = `${str}${LINE_BREAK}${format(child, depth + 1)}`;
				} else if (typeof child === 'function') {
					str = `${str}${LINE_BREAK}${getTabs(depth + 1)}{`;
					str = `${str}${LINE_BREAK}${getTabs(depth + 2)}"child function"`;
					str = `${str}${LINE_BREAK}${getTabs(depth + 1)}}`;
				} else if (typeof child === 'object') {
					str = `${str}${LINE_BREAK}${getTabs(depth + 1)}{`;
					const childrenKeys = Object.keys(child);
					for (let j = 0; j < childrenKeys.length; j++) {
						str = `${str}${LINE_BREAK}${getTabs(depth + 2)}${childrenKeys[j]}: (`;
						if (typeof child[childrenKeys[j]] !== 'function') {
							str = `${str}${LINE_BREAK}${format(child[childrenKeys[j]], depth + 3)}`;
						} else {
							str = `${str}${LINE_BREAK}${getTabs(depth + 3)}"child function"`;
						}
						str = `${str}${LINE_BREAK}${getTabs(depth + 2)})`;
					}
					str = `${str}${LINE_BREAK}${getTabs(depth + 1)}}`;
				}
			}
		}
		if (tag) {
			str = `${str}${LINE_BREAK}${getTabs(depth)}</${tag}>`;
		}
		return str;
	}, getTabs(depth));
	return nodeString;
}

export function assertRender(actual: DNode | DNode[], expected: DNode | DNode[]): void {
	const parsedActual = format(actual);
	const parsedExpected = format(expected);
	const diffResult = diff.diffLines(parsedActual, parsedExpected);
	let diffFound = false;
	const parsedDiff = diffResult.reduce((result: string, part) => {
		if (part.added) {
			diffFound = true;
			result = `${result}(E)${part.value.replace(/\n\t/g, '\n(E)\t')}`;
		} else if (part.removed) {
			diffFound = true;
			result = `${result}(A)${part.value.replace(/\n\t/g, '\n(A)\t')}`;
		} else {
			result = `${result}${part.value}`;
		}
		return result;
	}, '\n');

	if (diffFound) {
		throw new Error(parsedDiff);
	}
}

export default assertRender;
