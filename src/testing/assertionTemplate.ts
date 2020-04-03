import { VNode, WNode, DNode, RenderResult, WidgetBaseInterface, Constructor } from '../core/interfaces';
import { isWNode, isVNode } from '../core/vdom';
import { decorate } from '../core/util';
import { Wrapped, WidgetFactory, NonComparable, CompareFunc } from './interfaces';
import WidgetBase from '../core/WidgetBase';

export type PropertiesComparatorFunction<T = any> = (actualProperties: T) => T;

export type TemplateChildren<T = DNode[]> = () => T;

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

function isWrappedNode(value: any): value is (WNode & { id: string }) | (WNode & { id: string }) {
	return Boolean(value && value.id && (isWNode(value) || isVNode(value)));
}

function findNode<T extends Wrapped<any>>(renderResult: RenderResult, wrapped: T): VNode | WNode {
	renderResult = decorateNodes(renderResult).nodes;
	let nodes = Array.isArray(renderResult) ? [...renderResult] : [renderResult];
	while (nodes.length) {
		let node = nodes.pop();
		if (isWrappedNode(node)) {
			if (node.id === wrapped.id) {
				return node;
			}
		}
		if (isVNode(node) || isWNode(node)) {
			const children = node.children || [];
			nodes = [...children, ...nodes];
		}
	}
	throw new Error('Unable to find node');
}

export interface AssertionTemplateResult {
	(): DNode | DNode[];
	append<T extends WidgetBaseInterface>(
		target: Wrapped<Constructor<T>>,
		children: TemplateChildren<T['children']>
	): AssertionTemplateResult;
	append<T extends WidgetFactory>(
		target: Wrapped<T>,
		children: TemplateChildren<T['children']>
	): AssertionTemplateResult;
	prepend<T extends WidgetBaseInterface>(
		target: Wrapped<Constructor<T>>,
		children: TemplateChildren<T['children']>
	): AssertionTemplateResult;
	prepend<T extends WidgetFactory>(
		target: Wrapped<T>,
		children: TemplateChildren<T['children']>
	): AssertionTemplateResult;
	replaceChildren<T extends WidgetBaseInterface>(
		target: Wrapped<Constructor<T>>,
		children: TemplateChildren<T['children']>
	): AssertionTemplateResult;
	replaceChildren<T extends WidgetFactory>(
		target: Wrapped<T>,
		children: TemplateChildren<T['children']>
	): AssertionTemplateResult;
	insertBefore<T extends WidgetBaseInterface>(
		target: Wrapped<Constructor<T>>,
		children: TemplateChildren<T['children']>
	): AssertionTemplateResult;
	insertBefore<T extends WidgetFactory>(
		target: Wrapped<T>,
		children: TemplateChildren<T['children']>
	): AssertionTemplateResult;
	insertAfter<T extends WidgetBaseInterface>(
		target: Wrapped<Constructor<T>>,
		children: TemplateChildren<T['children']>
	): AssertionTemplateResult;
	insertAfter<T extends WidgetFactory>(
		target: Wrapped<T>,
		children: TemplateChildren<T['children']>
	): AssertionTemplateResult;
	insertSiblings<T extends WidgetBaseInterface>(
		target: T,
		children: TemplateChildren,
		type?: 'before' | 'after'
	): AssertionTemplateResult;
	setChildren<T extends WidgetFactory>(
		target: Wrapped<T>,
		children: TemplateChildren<T['children']>,
		type?: 'prepend' | 'replace' | 'append'
	): AssertionTemplateResult;
	setChildren<T extends WidgetBaseInterface>(
		target: Wrapped<Constructor<T>>,
		children: TemplateChildren<T['children']>,
		type?: 'prepend' | 'replace' | 'append'
	): AssertionTemplateResult;
	setProperty<T extends WidgetBaseInterface, K extends keyof T['properties']>(
		wrapped: Wrapped<Constructor<T>>,
		property: K,
		value: Exclude<T['properties'][K], CompareFunc<any>>
	): AssertionTemplateResult;
	setProperty<T extends WidgetFactory, K extends keyof T['properties']>(
		wrapped: Wrapped<T>,
		property: K,
		value: Exclude<T['properties'][K], CompareFunc<any>>
	): AssertionTemplateResult;
	setProperties<T extends WidgetBaseInterface>(
		wrapped: Wrapped<Constructor<T>>,
		value: NonComparable<T['properties']> | PropertiesComparatorFunction<NonComparable<T['properties']>>
	): AssertionTemplateResult;
	setProperties<T extends WidgetFactory>(
		wrapped: Wrapped<T>,
		value: NonComparable<T['properties']> | PropertiesComparatorFunction<NonComparable<T['properties']>>
	): AssertionTemplateResult;
	getChildren<T extends WidgetBaseInterface>(target: Wrapped<Constructor<T>>): T['children'];
	getChildren<T extends WidgetFactory>(target: Wrapped<T>): T['children'];
	getProperty<T extends WidgetBaseInterface, K extends keyof T['properties']>(
		target: Wrapped<Constructor<T>>,
		property: K
	): Exclude<T['properties'][K], CompareFunc<any>>;
	getProperty<T extends WidgetFactory, K extends keyof T['properties']>(
		target: Wrapped<T>,
		property: K
	): Exclude<T['properties'][K], CompareFunc<any>>;
	getProperties<T extends WidgetBaseInterface>(target: Wrapped<Constructor<T>>): NonComparable<T['properties']>;
	getProperties<T extends WidgetFactory>(target: Wrapped<T>): NonComparable<T['properties']>;
	replace<T extends WidgetBaseInterface>(target: Wrapped<Constructor<T>>, node: DNode): AssertionTemplateResult;
	replace<T extends WidgetFactory>(target: Wrapped<T>, node: DNode): AssertionTemplateResult;
	remove<T extends WidgetBaseInterface>(target: Wrapped<Constructor<T>>): AssertionTemplateResult;
	remove<T extends WidgetFactory>(target: Wrapped<T>): AssertionTemplateResult;
}

type NodeWithProperties = (VNode | WNode) & { properties: { [index: string]: any } };

const replaceChildren = (
	wrapped: Wrapped<any>,
	render: DNode | DNode[],
	modifyChildrenFn: (index: number, children: DNode[]) => DNode[]
): DNode | DNode[] => {
	const node = findNode(render, wrapped);
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
	assertionTemplateResult.setProperty = (wrapped: Wrapped<any>, property: string, value: any) => {
		return assertionTemplate(() => {
			const render = renderFunc();
			const node = findNode(render, wrapped);
			node.properties[property] = value;
			return render;
		});
	};
	assertionTemplateResult.setProperties = (wrapped: Wrapped<any>, value: any | PropertiesComparatorFunction) => {
		return assertionTemplate(() => {
			const render = renderFunc();
			const node = findNode(render, wrapped);
			node.properties = value;
			return render;
		});
	};
	assertionTemplateResult.append = (wrapped: Wrapped<any>, children: TemplateChildren) => {
		return assertionTemplateResult.setChildren(wrapped, children, 'append');
	};
	assertionTemplateResult.prepend = (wrapped: Wrapped<any>, children: TemplateChildren) => {
		return assertionTemplateResult.setChildren(wrapped, children, 'prepend');
	};
	assertionTemplateResult.replaceChildren = (wrapped: Wrapped<any>, children: TemplateChildren) => {
		return assertionTemplateResult.setChildren(wrapped, children, 'replace');
	};
	assertionTemplateResult.setChildren = (
		wrapped: Wrapped<any>,
		children: TemplateChildren,
		type: 'prepend' | 'replace' | 'append' = 'replace'
	) => {
		return assertionTemplate(() => {
			const render = renderFunc();
			const node = findNode(render, wrapped);
			node.children = node.children || [];
			let childrenResult = children();
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
	assertionTemplateResult.insertBefore = (wrapped: Wrapped<any>, children: TemplateChildren) => {
		return assertionTemplateResult.insertSiblings(wrapped, children, 'before');
	};
	assertionTemplateResult.insertAfter = (wrapped: Wrapped<any>, children: TemplateChildren) => {
		return assertionTemplateResult.insertSiblings(wrapped, children, 'after');
	};
	assertionTemplateResult.insertSiblings = (
		wrapped: Wrapped<any>,
		children: TemplateChildren,
		type: 'before' | 'after' = 'after'
	) => {
		return assertionTemplate(() => {
			const render = renderFunc();
			const insertedChildren = typeof children === 'function' ? children() : children;
			return replaceChildren(wrapped, render, (index, children) => {
				if (type === 'after') {
					children.splice(index + 1, 0, ...insertedChildren);
				} else {
					children.splice(index, 0, ...insertedChildren);
				}
				return children;
			});
		});
	};
	assertionTemplateResult.getProperty = (wrapped: Wrapped<any>, property: string) => {
		const render = renderFunc();
		const node = findNode(render, wrapped);
		return node.properties[property];
	};
	assertionTemplateResult.getProperties = (wrapped: Wrapped<any>) => {
		const render = renderFunc();
		const node = findNode(render, wrapped);
		return node.properties;
	};
	assertionTemplateResult.getChildren = (wrapped: Wrapped<any>) => {
		const render = renderFunc();
		const node = findNode(render, wrapped);
		return node.children || [];
	};
	assertionTemplateResult.replace = (wrapped: Wrapped<any>, newNode: DNode) => {
		return assertionTemplate(() => {
			const render = renderFunc();
			return replaceChildren(wrapped, render, (index, children) => {
				children.splice(index, 1, newNode);
				return children;
			});
		});
	};
	assertionTemplateResult.remove = (wrapped: Wrapped<any>) => {
		return assertionTemplate(() => {
			const render = renderFunc();
			return replaceChildren(wrapped, render, (index, children) => {
				children.splice(index, 1);
				return children;
			});
		});
	};
	return assertionTemplateResult as AssertionTemplateResult;
}

export default assertionTemplate;
