import { DNode, WNode, VNode, DefaultWidgetBaseInterface, Constructor } from '../../../core/interfaces';
import * as diff from 'diff';
import WeakMap from '../../../shim/WeakMap';
import Set from '../../../shim/Set';
import Map from '../../../shim/Map';
import { from as arrayFrom } from '../../../shim/array';
import { isVNode, isWNode } from '../../../core/vdom';
import { Ignore } from '../assertionTemplate';

let widgetClassCounter = 0;
const widgetMap = new WeakMap<Constructor<DefaultWidgetBaseInterface>, number>();

function replacer(key: string, value: any): any {
	if (typeof value === 'function') {
		return 'function';
	} else if (typeof value === 'undefined') {
		return 'undefined';
	} else if (value instanceof Set || value instanceof Map) {
		return arrayFrom(value);
	}
	return value;
}

export function formatDNodes(nodes: DNode | DNode[], depth: number = 0): string {
	const isArrayFragment = Array.isArray(nodes) && depth === 0;
	let initial = isArrayFragment ? '[\n' : '';
	let tabs = '';
	depth = isArrayFragment ? 1 : depth;
	nodes = Array.isArray(nodes) ? nodes : [nodes];

	for (let i = 0; i < depth; i++) {
		tabs = `${tabs}\t`;
	}
	let requiresCarriageReturn = false;
	let formattedNode = nodes.reduce((result: string, node, index) => {
		if (!node || node === true) {
			return result;
		}
		if (requiresCarriageReturn) {
			result = `${result}\n`;
		} else {
			requiresCarriageReturn = true;
		}
		result = `${result}${tabs}`;

		if (typeof node === 'string' || typeof node === 'number') {
			return `${result}"${node}"`;
		}

		if (isVNode(node) && node.text) {
			return `${result}"${node.text}"`;
		}

		result = `${result}${formatNode(node, tabs)}`;
		if (node.children && node.children.some((child) => !!child)) {
			result = `${result}, [\n${formatDNodes(node.children, depth + 1)}\n${tabs}]`;
		}
		return `${result})`;
	}, initial);

	return isArrayFragment ? (formattedNode = `${formattedNode}\n]`) : formattedNode;
}

function formatProperties(properties: any, tabs: string): string {
	properties = Object.keys(properties)
		.sort()
		.reduce((props: any, key) => {
			props[key] = properties[key];
			return props;
		}, {});
	properties = JSON.stringify(properties, replacer, `${tabs}\t`).slice(0, -1);
	return `${properties}${tabs}}`;
}

function getWidgetName(widgetConstructor: any): string {
	let name: string;
	if (typeof widgetConstructor === 'string' || typeof widgetConstructor === 'symbol') {
		name = widgetConstructor.toString();
	} else {
		name = widgetConstructor.name;
		if (name === undefined) {
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

function formatNode(node: WNode | VNode, tabs: any): string {
	if (!isVNode(node) && !isWNode(node)) {
		return '';
	}

	const propertyKeyCount = Object.keys(node.properties).length;
	let properties = propertyKeyCount > 0 ? formatProperties(node.properties, tabs) : '{}';
	if (isWNode(node)) {
		return `w(${getWidgetName(node.widgetConstructor)}, ${properties}`;
	}
	return `v("${node.tag}", ${properties}`;
}

function isNode(node: any): node is VNode | WNode {
	return isVNode(node) || isWNode(node);
}

function decorate(actual: DNode | DNode[], expected: DNode | DNode[]): [DNode[], DNode[]] {
	actual = Array.isArray(actual) ? actual : [actual];
	expected = Array.isArray(expected) ? expected : [expected];
	let actualDecoratedNodes = [];
	let expectedDecoratedNodes = [];
	const length = actual.length > expected.length ? actual.length : expected.length;
	for (let i = 0; i < length; i++) {
		let actualNode = actual[i];
		let expectedNode = expected[i];

		if (expectedNode && (expectedNode as any).widgetConstructor === Ignore) {
			expectedNode = actualNode || expectedNode;
		}

		if (isNode(expectedNode)) {
			if (typeof expectedNode.properties === 'function') {
				const actualProperties = isNode(actualNode) ? actualNode.properties : {};
				expectedNode.properties = (expectedNode as any).properties(actualProperties);
			}
		}
		const childrenA = isNode(actualNode) ? actualNode.children : [];
		const childrenB = isNode(expectedNode) ? expectedNode.children : [];

		const [actualChildren, expectedChildren] = decorate(childrenA, childrenB);
		if (isNode(actualNode)) {
			actualNode.children = actualChildren;
		}
		if (isNode(expectedNode)) {
			expectedNode.children = expectedChildren;
		}
		actualDecoratedNodes.push(actualNode);
		expectedDecoratedNodes.push(expectedNode);
	}
	return [actualDecoratedNodes, expectedDecoratedNodes];
}

export function assertRender(actual: DNode | DNode[], expected: DNode | DNode[], message?: string): void {
	const [decoratedActual, decoratedExpected] = decorate(actual, expected);
	const parsedActual = formatDNodes(Array.isArray(actual) ? decoratedActual : decoratedActual[0]);
	const parsedExpected = formatDNodes(Array.isArray(expected) ? decoratedExpected : decoratedExpected[0]);
	const diffResult = diff.diffLines(parsedActual, parsedExpected);
	let diffFound = false;
	const parsedDiff = diffResult.reduce((result: string, part, index) => {
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
