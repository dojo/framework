import select from './support/selector';
import { VNode, WNode, DNode } from '../../core/interfaces';
import { isWNode, isVNode } from '../../core/vdom';
import { decorate } from '../../core/util';
import WidgetBase from '../../core/WidgetBase';

export type PropertiesComparatorFunction = (actualProperties: any) => any;

export type TemplateChildren = DNode[] | (() => DNode[]);

export interface AssertionTemplateResult {
	(): DNode | DNode[];
	append(selector: string, children: TemplateChildren): AssertionTemplateResult;
	prepend(selector: string, children: TemplateChildren): AssertionTemplateResult;
	replaceChildren(selector: string, children: TemplateChildren): AssertionTemplateResult;
	insertBefore(selector: string, children: TemplateChildren): AssertionTemplateResult;
	insertAfter(selector: string, children: TemplateChildren): AssertionTemplateResult;
	insertSiblings(selector: string, children: TemplateChildren, type?: 'before' | 'after'): AssertionTemplateResult;
	setChildren(
		selector: string,
		children: TemplateChildren,
		type?: 'prepend' | 'replace' | 'append'
	): AssertionTemplateResult;
	setProperty(selector: string, property: string, value: any): AssertionTemplateResult;
	setProperties(selector: string, value: any | PropertiesComparatorFunction): AssertionTemplateResult;
	getChildren(selector: string): DNode[];
	getProperty(selector: string, property: string): any;
	getProperties(selector: string): any;
	replace(selector: string, node: DNode): AssertionTemplateResult;
	remove(selector: string): AssertionTemplateResult;
}

type NodeWithProperties = (VNode | WNode) & { properties: { [index: string]: any } };

const findOne = (nodes: DNode | DNode[], selector: string): NodeWithProperties => {
	let finalSelector = selector;
	if (selector.indexOf('~') === 0) {
		finalSelector = `[\\~key='${selector.substr(1)}']`;
	}
	let [node] = select(finalSelector, nodes);
	if (!node) {
		finalSelector = `[assertion-key='${selector.substr(1)}']`;
		[node] = select(finalSelector, nodes);
	}
	if (!node) {
		throw Error(`Node not found for selector "${selector}"`);
	}
	if (!isWNode(node) && !isVNode(node)) {
		throw Error('Cannot set or get on unknown node');
	}
	return node;
};

const replaceChildren = (
	selector: string,
	render: DNode | DNode[],
	modifyChildrenFn: (index: number, children: DNode[]) => DNode[]
): DNode | DNode[] => {
	const node = findOne(render, selector);
	const parent: (VNode | WNode) & { children: DNode[] } | undefined = (node as any).parent;
	const siblings = parent ? parent.children : Array.isArray(render) ? render : [render];
	const newChildren = modifyChildrenFn(siblings.indexOf(node), [...siblings]);

	if (!parent) {
		return newChildren;
	}

	parent.children = newChildren;
	return render;
};

export class Ignore extends WidgetBase {}

export function assertionTemplate(renderFunc: () => DNode | DNode[]) {
	const assertionTemplateResult: any = () => {
		const render = renderFunc();
		decorate(render, (node) => {
			if (isWNode(node) || isVNode(node)) {
				delete (node as NodeWithProperties).properties['~key'];
				delete (node as NodeWithProperties).properties['assertion-key'];
			}
		});
		return render;
	};
	assertionTemplateResult.setProperty = (selector: string, property: string, value: any) => {
		return assertionTemplate(() => {
			const render = renderFunc();
			const node = findOne(render, selector);
			node.properties[property] = value;
			return render;
		});
	};
	assertionTemplateResult.setProperties = (selector: string, value: any | PropertiesComparatorFunction) => {
		return assertionTemplate(() => {
			const render = renderFunc();
			const node = findOne(render, selector);
			node.properties = value;
			return render;
		});
	};
	assertionTemplateResult.append = (selector: string, children: TemplateChildren) => {
		return assertionTemplateResult.setChildren(selector, children, 'append');
	};
	assertionTemplateResult.prepend = (selector: string, children: TemplateChildren) => {
		return assertionTemplateResult.setChildren(selector, children, 'prepend');
	};
	assertionTemplateResult.replaceChildren = (selector: string, children: TemplateChildren) => {
		return assertionTemplateResult.setChildren(selector, children, 'replace');
	};
	assertionTemplateResult.setChildren = (
		selector: string,
		children: TemplateChildren,
		type: 'prepend' | 'replace' | 'append' = 'replace'
	) => {
		if (Array.isArray(children)) {
			console.warn(
				'The array API (`children: DNode[]`) has been deprecated. Working with children should use a factory to avoid issues with mutation.'
			);
		}
		return assertionTemplate(() => {
			const render = renderFunc();
			const node = findOne(render, selector);
			node.children = node.children || [];
			let childrenResult = children;
			if (typeof childrenResult === 'function') {
				childrenResult = childrenResult();
			}
			switch (type) {
				case 'prepend':
					node.children = [...childrenResult, ...node.children];
					break;
				case 'append':
					node.children = [...node.children, ...childrenResult];
					break;
				case 'replace':
					node.children = [...childrenResult];
					break;
			}
			return render;
		});
	};
	assertionTemplateResult.insertBefore = (selector: string, children: TemplateChildren) => {
		return assertionTemplateResult.insertSiblings(selector, children, 'before');
	};
	assertionTemplateResult.insertAfter = (selector: string, children: TemplateChildren) => {
		return assertionTemplateResult.insertSiblings(selector, children, 'after');
	};
	assertionTemplateResult.insertSiblings = (
		selector: string,
		children: TemplateChildren,
		type: 'before' | 'after' = 'after'
	) => {
		if (Array.isArray(children)) {
			console.warn(
				'The array API (`children: DNode[]`) has been deprecated. Working with children should use a factory to avoid issues with mutation.'
			);
		}
		return assertionTemplate(() => {
			const render = renderFunc();
			const insertedChildren = typeof children === 'function' ? children() : children;
			return replaceChildren(selector, render, (index, children) => {
				if (type === 'after') {
					children.splice(index + 1, 0, ...insertedChildren);
				} else {
					children.splice(index, 0, ...insertedChildren);
				}
				return children;
			});
		});
	};
	assertionTemplateResult.getProperty = (selector: string, property: string) => {
		const render = renderFunc();
		const node = findOne(render, selector);
		return node.properties[property];
	};
	assertionTemplateResult.getProperties = (selector: string, property: string) => {
		const render = renderFunc();
		const node = findOne(render, selector);
		return node.properties;
	};
	assertionTemplateResult.getChildren = (selector: string) => {
		const render = renderFunc();
		const node = findOne(render, selector);
		return node.children || [];
	};
	assertionTemplateResult.replace = (selector: string, newNode: DNode) => {
		return assertionTemplate(() => {
			const render = renderFunc();
			return replaceChildren(selector, render, (index, children) => {
				children.splice(index, 1, newNode);
				return children;
			});
		});
	};
	assertionTemplateResult.remove = (selector: string) => {
		return assertionTemplate(() => {
			const render = renderFunc();
			return replaceChildren(selector, render, (index, children) => {
				children.splice(index, 1);
				return children;
			});
		});
	};
	return assertionTemplateResult as AssertionTemplateResult;
}

export default assertionTemplate;
