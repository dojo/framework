import { isVNode, isWNode } from '../core/vdom';
import { RenderResult, DNode, VNode, WNode } from '../core/interfaces';
import { Instruction } from './renderer';
import Map from '../shim/Map';
import { Ignore } from './assertionTemplate';
import { findIndex } from '../shim/array';
import { decorate as coreDecorate } from '../core/util';

type DecorateTuple = [DNode[], DNode[]];

export interface DecoratorResult<T> {
	hasDeferredProperties: boolean;
	nodes: T;
}

function isNode(node: any): node is VNode | WNode {
	return isVNode(node) || isWNode(node);
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

	let node = nodes.shift();
	while (node) {
		const [actualNodes, expectedNodes] = node;
		let childNodes: DecorateTuple[] = [];
		while (expectedNodes.length > 0) {
			let actualNode: DNode | { [index: string]: any } = actualNodes.shift();
			let expectedNode: DNode | { [index: string]: any } = expectedNodes.shift();
			if (isNode(expectedNode)) {
				const instruction = instructions.get((expectedNode as any).id);
				if (instruction) {
					if (instruction.type === 'child') {
						const expectedChild: any = expectedNode.children && expectedNode.children[0];
						const actualChild: any = isNode(actualNode) && actualNode.children && actualNode.children[0];

						if (typeof expectedChild === 'object') {
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
						} else if (typeof expectedChild === 'function') {
							const newExpectedChildren = expectedChild();
							(expectedNode as any).children[0] = newExpectedChildren;
							if (typeof actualChild === 'function') {
								const newActualChildren = actualChild(...instruction.params);
								(actualNode as any).children[0] = newActualChildren;
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
			}

			if (isNode(expectedNode) && isNode(actualNode)) {
				const propertyKeys = Object.keys(expectedNode.properties);
				for (let i = 0; i < propertyKeys.length; i++) {
					const key = propertyKeys[i];
					if (expectedNode.properties[key].type === 'compare') {
						const result = expectedNode.properties[key](actualNode.properties[key]);
						if (result) {
							expectedNode.properties[key] = actualNode.properties[key];
						} else {
							expectedNode.properties[key] = 'Compare FAILED';
						}
					}
				}
			}

			if (expectedNode && (expectedNode as any).widgetConstructor === Ignore) {
				const index = findIndex((expectedNode as any).parent.children, (child) => child === expectedNode);
				if (index !== -1) {
					(expectedNode as any).parent.children[index] = actualNode || expectedNode;
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
