import { DNode, WNode, VNode, RenderResult } from '../core/interfaces';
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

function newLine(depth = 0): string {
	return `${LINE_BREAK}${getTabs(depth)}`;
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

function formatObject(obj: { [index: string]: any }, depth = 0, style: 'prop' | 'object'): string {
	const objectKeys = Object.keys(obj).sort();
	if (!objectKeys) {
		return '';
	}
	const tabs = getTabs(depth + 1);
	const sep = style === 'prop' ? '=' : ': ';
	const opening = style === 'prop' ? '{' : '';
	const closing = style === 'prop' ? '}' : '';
	return objectKeys.reduce((props, propKey, index) => {
		const prop = obj[propKey];
		propKey = style === 'object' ? `"${propKey}"` : propKey;

		if (index < objectKeys.length) {
			props = `${props}${LINE_BREAK}${tabs}`;
		}
		props = `${props}${propKey}${sep}`;

		switch (typeof prop) {
			case 'function':
				props = `${props}${opening}function${closing}`;
				break;
			case 'boolean':
				props = `${props}${opening}${prop}${closing}`;
				break;
			case 'object':
				const isArrayLike = prop instanceof Set || prop instanceof Map || Array.isArray(prop);
				if (isArrayLike) {
					props = `${props}${opening}${JSON.stringify(arrayFrom(prop))}${closing}`;
				} else {
					props = `${props}${opening}{${formatObject(
						prop,
						depth + 1,
						'object'
					)}${LINE_BREAK}${tabs}}${closing}`;
				}
				break;
			default:
				props = `${props}${opening}${JSON.stringify(prop)}${closing}`;
				break;
		}
		if (style === 'object' && index < objectKeys.length - 1) {
			props = `${props},`;
		}
		return props;
	}, '');
}

function format(nodes: RenderResult, depth = 0) {
	nodes = Array.isArray(nodes) ? nodes : [nodes];
	let str = '';
	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i];
		if (node === '' || node == null || node === true || node === false) {
			continue;
		}
		if (i > 0 || depth > 0) {
			str = `${str}${newLine(depth)}`;
		}
		if (typeof node === 'string' || typeof node === 'number') {
			str = `${str}${node}`;
			continue;
		}
		if (isNode(node)) {
			const tag = getTagName(node);
			str = `${str}<${tag}`;
			const propertyNames = Object.keys(node.properties).sort();
			if (propertyNames.length) {
				str = `${str}${formatObject(node.properties, depth, 'prop')}`;
				str = `${str}${newLine(depth)}>`;
			} else {
				str = `${str}>`;
			}

			if (node.children && node.children.length) {
				str = `${str}${format(node.children, depth + 1)}`;
			}
			str = `${str}${newLine(depth)}</${tag}>`;
		} else if (typeof node === 'object') {
			str = `${str}{{`;
			const nodeObjectKeys = Object.keys(node);
			nodeObjectKeys.forEach((key, index) => {
				str = `${str}${newLine(depth + 1)}"${key}": (${format(node[key], depth + 2)}${newLine(depth + 1)})${
					index < nodeObjectKeys.length - 1 ? ',' : ''
				}`;
			});
			str = `${str}${newLine(depth)}}}`;
		} else {
			str = `${str}"child function"`;
		}
	}
	return str;
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
