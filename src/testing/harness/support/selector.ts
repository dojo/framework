import { DNode, DefaultWidgetBaseInterface, WNode, VNode } from '../../../core/interfaces';
import * as cssSelect from 'css-select-umd';
import { isVNode, isWNode } from '../../../core/vdom';
import { decorate } from '../../../core/util';

export type TestFunction = (elem: DNode<DefaultWidgetBaseInterface>) => boolean;

export interface DecoratorResult<T> {
	hasDeferredProperties: boolean;
	nodes: T;
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
	const nodes = decorate(dNode, addParent, (node: DNode): node is WNode | VNode => isWNode(node) || isVNode(node));
	return { hasDeferredProperties, nodes };
}

export const parseSelector = (selector: string) => {
	const selectors = selector.split(' ');
	return selectors
		.map((selector) => {
			const keySigilIndex = selector.indexOf('@');
			if (keySigilIndex === 0) {
				return `[key="${selector.substr(1)}"]`;
			} else if (keySigilIndex > 0) {
				const key = selector.substring(keySigilIndex + 1);
				return `${selector.slice(0, keySigilIndex)}[key="${key}"]`;
			}
			return selector;
		})
		.join(' ');
};

export const adapter: any = {
	isTag(elem: DNode) {
		return isVNode(elem);
	},
	getText(elem: DNode[]) {
		return '';
	},
	removeSubsets(elements: DNode[]) {
		return elements;
	},
	getChildren(elem: DNode) {
		return isVNode(elem) || isWNode(elem) ? elem.children : [];
	},
	getAttributeValue(elem: DNode, name: string) {
		if (isVNode(elem) || isWNode(elem)) {
			if (name === 'class') {
				const classes = (elem.properties as any).classes;
				if (Array.isArray(classes)) {
					return classes.join(' ');
				}
				return classes;
			}
			return (elem.properties as any)[name];
		}
	},
	hasAttrib(elem: DNode, name: string) {
		if (isVNode(elem) || isWNode(elem)) {
			return name in elem.properties;
		}
		return false;
	},
	existsOne(test: TestFunction, elements: DNode[]) {
		return elements.some((elem: DNode) => test(elem));
	},
	getName(elem: DNode) {
		if (isVNode(elem)) {
			return elem.tag;
		}
	},
	getParent(elem: DNode) {
		if (isVNode(elem) || isWNode(elem)) {
			return (elem as any).parent;
		}
	},
	getSiblings(elem: DNode) {
		if (isVNode(elem) || isWNode(elem)) {
			if ((elem as any).parent) {
				return (elem as any).parent.children;
			}
			return [elem];
		}
	},
	findOne(test: TestFunction, arr: DNode[]): DNode {
		let elem = null;
		for (let i = 0, l = arr.length; i < l && !elem; i++) {
			if (test(arr[i])) {
				elem = arr[i];
			} else {
				const children = adapter.getChildren(arr[i]);
				if (children && children.length > 0) {
					elem = adapter.findOne(test, children);
				}
			}
		}
		return elem;
	},
	findAll(test: TestFunction, elements: DNode[]): DNode[] {
		let result: DNode[] = [];
		for (let i = 0, j = elements.length; i < j; i++) {
			if (test(elements[i])) {
				result.push(elements[i]);
			}
			const children = adapter.getChildren(elements[i]);
			if (children) {
				result = [...result, ...adapter.findAll(test, children)];
			}
		}
		return result;
	}
};

export function select(selector: string, nodes: DNode | DNode[]): (WNode | VNode)[] {
	nodes = decorateNodes(nodes).nodes;
	nodes = Array.isArray(nodes) ? nodes : [nodes];
	selector = parseSelector(selector);
	return cssSelect(selector, nodes, { adapter }) as (WNode | VNode)[];
}

export default select;
