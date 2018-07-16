import { DNode, WNode, VNode, DefaultWidgetBaseInterface, Constructor } from '@dojo/widget-core/interfaces';
import { isWNode } from '@dojo/widget-core/d';
import * as diff from 'diff';
import WeakMap from '@dojo/shim/WeakMap';
import Set from '@dojo/shim/Set';
import Map from '@dojo/shim/Map';
import { from as arrayFrom } from '@dojo/shim/array';

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
	let formattedNode = nodes.reduce((result: string, node, index) => {
		if (node === null || node === undefined) {
			return result;
		}
		if (index > 0) {
			result = `${result}\n`;
		}
		result = `${result}${tabs}`;

		if (typeof node === 'string') {
			return `${result}"${node}"`;
		}

		result = `${result}${formatNode(node, tabs)}`;
		if (node.children && node.children.length > 0) {
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
	const propertyKeyCount = Object.keys(node.properties).length;
	let properties = propertyKeyCount > 0 ? formatProperties(node.properties, tabs) : '{}';
	if (isWNode(node)) {
		return `w(${getWidgetName(node.widgetConstructor)}, ${properties}`;
	}
	return `v("${node.tag}", ${properties}`;
}

export function assertRender(actual: DNode | DNode[], expected: DNode | DNode[], message?: string): void {
	const parsedActual = formatDNodes(actual);
	const parsedExpected = formatDNodes(expected);
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
