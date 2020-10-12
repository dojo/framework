import { isVNode, isWNode } from '../core/vdom';
import { RenderResult, DNode, VNode, WNode } from '../core/interfaces';
import { Instruction } from './renderer';
import Map from '../shim/Map';
import { findIndex } from '../shim/array';
import { decorate as coreDecorate } from '../core/util';

type DecorateTuple = [DNode[], DNode[]];

export interface DecoratorResult<T> {
	hasDeferredProperties: boolean;
	nodes: T;
}

function isNode(node: any): node is VNode & { id?: string } | WNode & { id?: string } {
	return isVNode(node) || isWNode(node);
}

function isWrappedNode(node: any): node is VNode & { id: string } | WNode & { id: string } {
	return Boolean(isNode(node) && node.id);
}

function isIgnoredNode(node: any): node is VNode | WNode {
	return Boolean(node && node.isIgnore && isNode(node));
}

function isSameType(expected: DNode | { [index: string]: any }, actual: DNode | { [index: string]: any }): boolean {
	if (isNode(expected) && isNode(actual)) {
		if (isVNode(expected) && isVNode(actual) && expected.tag === actual.tag) {
			return true;
		}
		return isWNode(expected) && isWNode(actual) && expected.widgetConstructor === actual.widgetConstructor;
	}
	return false;
}

export function decorateNodes(dNode: DNode[]): DecoratorResult<DNode[]>;
export function decorateNodes(dNode: DNode): DecoratorResult<DNode>;
export function decorateNodes(dNode: DNode | DNode[]): DecoratorResult<DNode | DNode[]>;
export function decorateNodes(dNode: any): DecoratorResult<DNode | DNode[]> {
	let hasDeferredProperties = false;
	function addParent(parent: WNode | VNode): void {
		(parent.children || []).forEach((child: any) => {
			if (isVNode(child) || isWNode(child)) {
				(child as any).parent = parent;
			}
		});
		if (isVNode(parent) && typeof parent.deferredPropertiesCallback === 'function') {
			hasDeferredProperties = true;
			parent.properties = { ...parent.properties, ...parent.deferredPropertiesCallback(false) };
		}
	}
	const nodes = coreDecorate(
		dNode,
		addParent,
		(node: DNode): node is WNode | VNode => isWNode(node) || isVNode(node)
	);
	return { hasDeferredProperties, nodes };
}

export function decorate(actual: RenderResult, expected: RenderResult, instructions: Map<string, Instruction>) {
	let nodes: DecorateTuple[] = [
		[Array.isArray(actual) ? [...actual] : [actual], Array.isArray(expected) ? [...expected] : [expected]]
	];
	const wrappedNodeIds = [];

	let node = nodes.shift();
	while (node) {
		const [actualNodes, expectedNodes] = node.map((nodes) =>
			nodes.filter((node) => node != null && node !== true && node !== false)
		);
		let childNodes: DecorateTuple[] = [];
		while (expectedNodes.length > 0) {
			let actualNode: DNode | { [index: string]: any } = actualNodes.shift();
			let expectedNode: DNode | { [index: string]: any } = expectedNodes.shift();
			if (isWrappedNode(expectedNode)) {
				if (wrappedNodeIds.indexOf(expectedNode.id) !== -1) {
					throw new Error('Cannot use a wrapped test node more than once within an assertion template.');
				}
				const instruction = instructions.get(expectedNode.id);
				if (instruction && isSameType(actualNode, expectedNode)) {
					if (instruction.type === 'child') {
						const expectedChild: any = expectedNode.children && expectedNode.children[0];
						const actualChild: any = isNode(actualNode) && actualNode.children && actualNode.children[0];

						if (typeof expectedChild === 'function' || typeof actualChild === 'function') {
							if (typeof expectedChild === 'function') {
								const newExpectedChildren = expectedChild();
								(expectedNode as any).children[0] = newExpectedChildren;
							}
							if (typeof actualChild === 'function') {
								const newActualChildren = actualChild(...instruction.params);
								(actualNode as any).children[0] = newActualChildren;
							}
						} else if (typeof expectedChild === 'object') {
							const keys = Object.keys(expectedChild);
							for (let i = 0; i < keys.length; i++) {
								const key = keys[i];
								if (typeof expectedChild[key] === 'function') {
									const newExpectedChildren = expectedChild[key]();
									expectedChild[key] = newExpectedChildren;
								}
								if (typeof actualChild === 'object' && typeof actualChild[key] === 'function') {
									const newActualChildren = actualChild[key](...(instruction.params[key] || []));
									actualChild[key] = newActualChildren;
								}
							}
						}
					} else if (
						instruction.type === 'property' &&
						isNode(actualNode) &&
						typeof actualNode.properties[instruction.key] === 'function'
					) {
						actualNode.properties[instruction.key](...instruction.params);
					}
				}
				wrappedNodeIds.push(expectedNode.id);
			}

			if (isIgnoredNode(expectedNode)) {
				const index = findIndex((expectedNode as any).parent.children, (child) => child === expectedNode);
				if (index !== -1) {
					if (isSameType(expectedNode, actualNode)) {
						(expectedNode as any).parent.children[index] = actualNode || expectedNode;
					}
				}
			}

			if (isNode(expectedNode) && isNode(actualNode)) {
				const propertyKeys = Object.keys(expectedNode.properties);
				for (let i = 0; i < propertyKeys.length; i++) {
					const key = propertyKeys[i];
					if (expectedNode.properties[key] != null && expectedNode.properties[key].type === 'compare') {
						const result = expectedNode.properties[key](actualNode.properties[key]);
						if (result) {
							expectedNode.properties[key] = actualNode.properties[key];
						} else {
							expectedNode.properties[key] = 'Compare FAILED';
						}
					}
				}
			}

			if (isNode(expectedNode)) {
				if (typeof expectedNode.properties === 'function') {
					const actualProperties = isNode(actualNode) ? actualNode.properties : {};
					expectedNode.properties = (expectedNode as any).properties(actualProperties);
				}
			}

			if (isNode(expectedNode)) {
				const expectedChildren = expectedNode.children ? [...expectedNode.children] : [];
				const actualChildren = isNode(actualNode) && actualNode.children ? [...actualNode.children] : [];
				childNodes.push([actualChildren, expectedChildren]);
			} else if (expectedNode && typeof expectedNode === 'object') {
				const expectedChildren = Object.keys(expectedNode).map((key) => (expectedNode as any)[key]);
				const actualChildren =
					actualNode && typeof actualNode === 'object'
						? Object.keys(actualNode).map((key) => (actualNode as any)[key])
						: [];
				childNodes.push([actualChildren, expectedChildren]);
			}
		}
		childNodes.reverse();
		nodes = [...childNodes, ...nodes];
		node = nodes.shift();
	}
}

export default decorate;
