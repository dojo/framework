import assertRender from './assertRender';
import {
	WNode,
	DNode,
	Constructor,
	Callback,
	RenderResult,
	MiddlewareResultFactory,
	WNodeFactory,
	VNodeProperties,
	OptionalWNodeFactory,
	WidgetBaseInterface,
	DefaultChildrenWNodeFactory,
	VNode,
	DefaultMiddlewareResult
} from '../core/interfaces';
import { WidgetBase } from '../core/WidgetBase';
import { isWidgetFunction } from '../core/Registry';
import { invalidator, diffProperty, destroy, create, propertiesDiff, w, v, isVNode, isWNode } from '../core/vdom';
import { uuid } from '../core/util';
import decorate, { decorateNodes } from './decorate';
import { decorate as coreDecorate } from '../core/util';
import { Wrapped, WidgetFactory, CompareFunc, Comparable, NonComparable } from './interfaces';

export interface ChildInstruction {
	type: 'child';
	wrapped: Wrapped<any>;
	params: any;
}

export interface PropertyInstruction {
	type: 'property';
	id: string;
	key: string;
	wrapped: Wrapped<any>;
	params: any;
}

export type Instruction = ChildInstruction | PropertyInstruction;

export interface Child {
	<T extends WNodeFactory<{ properties: any; children: any }>>(
		wrapped: Wrapped<T>,
		params: T['children'] extends { [index: string]: any }
			? {
					[P in keyof T['children']]?: Parameters<T['children'][P]> extends never
						? []
						: Parameters<T['children'][P]>
			  }
			: T['children'] extends (...args: any[]) => RenderResult ? Parameters<T['children']> : never
	): void;
}

export type KnownKeys<T> = { [K in keyof T]: string extends K ? never : number extends K ? never : K } extends {
	[_ in keyof T]: infer U
}
	? U
	: never;
export type FunctionPropertyNames<T> = {
	[K in keyof T]: T[K] extends ((...args: any[]) => any | undefined) ? K : never
}[keyof T];
export type RequiredVNodeProperties = Required<Pick<VNodeProperties, KnownKeys<VNodeProperties>>>;

export interface Property {
	<T extends WidgetBase<any>, K extends FunctionPropertyNames<Required<T['properties']>>>(
		wrapped: Wrapped<Constructor<T>>,
		key: K,
		...params: Parameters<Exclude<T['properties'][K], CompareFunc<any>>>
	): void;
	<
		T extends OptionalWNodeFactory<{ properties: Comparable<VNodeProperties>; children: any }>,
		K extends FunctionPropertyNames<RequiredVNodeProperties>
	>(
		wrapped: Wrapped<T>,
		key: K,
		...params: any[]
	): void;
	<T extends WidgetFactory, K extends FunctionPropertyNames<Required<T['properties']>>>(
		wrapped: Wrapped<T>,
		key: K,
		...params: Parameters<Exclude<T['properties'][K], CompareFunc<any>>>
	): void;
}

interface RendererOptions {
	middleware?: [MiddlewareResultFactory<any, any, any, any>, () => DefaultMiddlewareResult][];
}

export type PropertiesComparatorFunction<T = any> = (actualProperties: T) => T;

export type TemplateChildren<T = DNode[]> = () => T;

export interface DecoratorResult<T> {
	hasDeferredProperties: boolean;
	nodes: T;
}

function isWrappedNode(value: any): value is (WNode & { id: string }) | (WNode & { id: string }) {
	return Boolean(value && value.id && (isWNode(value) || isVNode(value)));
}

function findNode<T extends Wrapped<any>>(renderResult: RenderResult, wrapped: T): VNode | WNode {
	renderResult = decorateNodes(renderResult).nodes;
	let nodes: any[] = Array.isArray(renderResult) ? [...renderResult] : [renderResult];
	while (nodes.length) {
		let node = nodes.pop();
		if (isWrappedNode(node)) {
			if (node.id === wrapped.id) {
				return node;
			}
		}
		if (isVNode(node) || isWNode(node)) {
			const children = node.children || [];
			for (let i = 0; i < children.length; i++) {
				if (typeof children[i] === 'function') {
					children[i] = (children[i] as any)();
				}
			}
			nodes = [...children, ...nodes];
		} else if (node && typeof node === 'object') {
			nodes = [
				...Object.keys(node).reduce(
					(newNodes, key) => {
						if (typeof node[key] === 'function') {
							const result = node[key]();
							node[key] = result;
							return Array.isArray(result) ? [...result, ...newNodes] : [result, ...newNodes];
						} else if (typeof node[key] === 'object') {
							const result = node[key];
							return Array.isArray(result) ? [...result, ...newNodes] : [result, ...newNodes];
						}
						return newNodes;
					},
					[] as any[]
				),
				...nodes
			];
		}
	}

	throw new Error('Unable to find node');
}

export interface AssertionResult {
	(): DNode | DNode[];
	append<T extends WidgetBaseInterface>(
		target: Wrapped<Constructor<T>>,
		children: TemplateChildren<T['children']>
	): AssertionResult;
	append<T extends WidgetFactory>(target: Wrapped<T>, children: TemplateChildren<T['children']>): AssertionResult;
	prepend<T extends WidgetBaseInterface>(
		target: Wrapped<Constructor<T>>,
		children: TemplateChildren<T['children']>
	): AssertionResult;
	prepend<T extends WidgetFactory>(target: Wrapped<T>, children: TemplateChildren<T['children']>): AssertionResult;
	replaceChildren<T extends WidgetBaseInterface>(
		target: Wrapped<Constructor<T>>,
		children: TemplateChildren<T['children']>
	): AssertionResult;
	replaceChildren<T extends WidgetFactory>(
		target: Wrapped<T>,
		children: TemplateChildren<T['children']>
	): AssertionResult;
	insertBefore<T extends WidgetBaseInterface>(
		target: Wrapped<Constructor<T>>,
		children: TemplateChildren
	): AssertionResult;
	insertBefore<T extends WidgetFactory>(target: Wrapped<T>, children: TemplateChildren): AssertionResult;
	insertAfter<T extends WidgetBaseInterface>(
		target: Wrapped<Constructor<T>>,
		children: TemplateChildren
	): AssertionResult;
	insertAfter<T extends WidgetFactory>(target: Wrapped<T>, children: TemplateChildren): AssertionResult;
	insertSiblings<T extends WidgetBaseInterface>(
		target: T,
		children: TemplateChildren,
		type?: 'before' | 'after'
	): AssertionResult;
	setChildren<T extends WidgetFactory>(
		target: Wrapped<T>,
		children: TemplateChildren<T['children']>,
		type?: 'prepend' | 'replace' | 'append'
	): AssertionResult;
	setChildren<T extends WidgetBaseInterface>(
		target: Wrapped<Constructor<T>>,
		children: TemplateChildren<T['children']>,
		type?: 'prepend' | 'replace' | 'append'
	): AssertionResult;
	setProperty<T extends WidgetBaseInterface, K extends keyof T['properties']>(
		wrapped: Wrapped<Constructor<T>>,
		property: K,
		value: Exclude<T['properties'][K], CompareFunc<any>>
	): AssertionResult;
	setProperty<T extends WidgetFactory, K extends keyof T['properties']>(
		wrapped: Wrapped<T>,
		property: K,
		value: Exclude<T['properties'][K], CompareFunc<any>>
	): AssertionResult;
	setProperties<T extends WidgetBaseInterface>(
		wrapped: Wrapped<Constructor<T>>,
		value: NonComparable<T['properties']> | PropertiesComparatorFunction<NonComparable<T['properties']>>
	): AssertionResult;
	setProperties<T extends WidgetFactory>(
		wrapped: Wrapped<T>,
		value: NonComparable<T['properties']> | PropertiesComparatorFunction<NonComparable<T['properties']>>
	): AssertionResult;
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
	replace<T extends WidgetBaseInterface>(target: Wrapped<Constructor<T>>, node: DNode): AssertionResult;
	replace<T extends WidgetFactory>(target: Wrapped<T>, node: DNode): AssertionResult;
	remove<T extends WidgetBaseInterface>(target: Wrapped<Constructor<T>>): AssertionResult;
	remove<T extends WidgetFactory>(target: Wrapped<T>): AssertionResult;
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

export function assertion(renderFunc: () => DNode | DNode[]) {
	const assertionResult: any = () => {
		const render = renderFunc();
		coreDecorate(render, (node) => {
			if (isWNode(node) || isVNode(node)) {
				delete (node as NodeWithProperties).properties['~key'];
				delete (node as NodeWithProperties).properties['assertion-key'];
			}
		});
		return render;
	};
	assertionResult.setProperty = (wrapped: Wrapped<any>, property: string, value: any) => {
		return assertion(() => {
			const render = renderFunc();
			const node = findNode(render, wrapped);
			node.properties[property] = value;
			return render;
		});
	};
	assertionResult.setProperties = (wrapped: Wrapped<any>, value: any | PropertiesComparatorFunction) => {
		return assertion(() => {
			const render = renderFunc();
			const node = findNode(render, wrapped);
			node.properties = value;
			return render;
		});
	};
	assertionResult.append = (wrapped: Wrapped<any>, children: TemplateChildren) => {
		return assertionResult.setChildren(wrapped, children, 'append');
	};
	assertionResult.prepend = (wrapped: Wrapped<any>, children: TemplateChildren) => {
		return assertionResult.setChildren(wrapped, children, 'prepend');
	};
	assertionResult.replaceChildren = (wrapped: Wrapped<any>, children: TemplateChildren) => {
		return assertionResult.setChildren(wrapped, children, 'replace');
	};
	assertionResult.setChildren = (
		wrapped: Wrapped<any>,
		children: TemplateChildren,
		type: 'prepend' | 'replace' | 'append' = 'replace'
	) => {
		return assertion(() => {
			const render = renderFunc();
			const node = findNode(render, wrapped);
			node.children = node.children || [];
			let childrenResult = children();
			if (!Array.isArray(childrenResult)) {
				childrenResult = [childrenResult];
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
	assertionResult.insertBefore = (wrapped: Wrapped<any>, children: TemplateChildren) => {
		return assertionResult.insertSiblings(wrapped, children, 'before');
	};
	assertionResult.insertAfter = (wrapped: Wrapped<any>, children: TemplateChildren) => {
		return assertionResult.insertSiblings(wrapped, children, 'after');
	};
	assertionResult.insertSiblings = (
		wrapped: Wrapped<any>,
		children: TemplateChildren,
		type: 'before' | 'after' = 'after'
	) => {
		return assertion(() => {
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
	assertionResult.getProperty = (wrapped: Wrapped<any>, property: string) => {
		const render = renderFunc();
		const node = findNode(render, wrapped);
		return node.properties[property];
	};
	assertionResult.getProperties = (wrapped: Wrapped<any>) => {
		const render = renderFunc();
		const node = findNode(render, wrapped);
		return node.properties;
	};
	assertionResult.getChildren = (wrapped: Wrapped<any>) => {
		const render = renderFunc();
		const node = findNode(render, wrapped);
		return node.children || [];
	};
	assertionResult.replace = (wrapped: Wrapped<any>, newNode: DNode) => {
		return assertion(() => {
			const render = renderFunc();
			return replaceChildren(wrapped, render, (index, children) => {
				children.splice(index, 1, newNode);
				return children;
			});
		});
	};
	assertionResult.remove = (wrapped: Wrapped<any>) => {
		return assertion(() => {
			const render = renderFunc();
			return replaceChildren(wrapped, render, (index, children) => {
				children.splice(index, 1);
				return children;
			});
		});
	};
	return assertionResult as AssertionResult;
}

export function wrap(
	node: string
): Wrapped<OptionalWNodeFactory<{ properties: Comparable<VNodeProperties>; children: DNode | (DNode | DNode[])[] }>> & {
	tag: string;
};
export function wrap<T extends WidgetBaseInterface>(
	node: Constructor<T>
): Wrapped<Constructor<WidgetBase<Comparable<T['properties']>>>>;
export function wrap<T extends OptionalWNodeFactory<any>>(
	node: T
): Wrapped<OptionalWNodeFactory<{ properties: Comparable<T['properties']>; children: T['children'] }>>;
export function wrap<T extends DefaultChildrenWNodeFactory<any>>(
	node: T
): Wrapped<DefaultChildrenWNodeFactory<{ properties: Comparable<T['properties']>; children: T['children'] }>>;
export function wrap<T extends WNodeFactory<any>>(
	node: T
): Wrapped<WNodeFactory<{ properties: Comparable<T['properties']>; children: T['children'] }>>;
export function wrap(node: any): any {
	const id = uuid();
	const nodeFactory: any = (properties: any, children: any[]) => {
		const dNode: any =
			typeof node === 'string' ? v(node, properties, children) : w(node as any, properties, children);
		dNode.id = id;
		return dNode;
	};
	nodeFactory.id = id;
	nodeFactory.isFactory = true;
	if (typeof node === 'string') {
		nodeFactory.tag = nodeFactory;
	}
	return nodeFactory;
}

export function ignore(
	node: string
): OptionalWNodeFactory<{ properties: Comparable<VNodeProperties>; children: DNode | (DNode | DNode[])[] }> & {
	tag: string;
};
export function ignore<T extends WidgetBaseInterface>(
	node: Constructor<T>
): Constructor<WidgetBase<Comparable<T['properties']>>>;
export function ignore<T extends OptionalWNodeFactory<any>>(
	node: T
): OptionalWNodeFactory<{ properties: Comparable<T['properties']>; children: T['children'] }>;
export function ignore<T extends DefaultChildrenWNodeFactory<any>>(
	node: T
): DefaultChildrenWNodeFactory<{ properties: Comparable<T['properties']>; children: T['children'] }>;
export function ignore<T extends WNodeFactory<any>>(
	node: T
): WNodeFactory<{ properties: Comparable<T['properties']>; children: T['children'] }>;
export function ignore(node: any): any {
	const nodeFactory: any = (properties: any, children: any[]) => {
		const dNode: any =
			typeof node === 'string' ? v(node, properties, children) : w(node as any, properties, children);
		dNode.isIgnore = true;
		return dNode;
	};

	nodeFactory.isFactory = true;
	if (typeof node === 'string') {
		nodeFactory.tag = nodeFactory;
	}
	return nodeFactory;
}

export function compare(compareFunc: (actual: unknown, expected: unknown) => boolean): CompareFunc<unknown> {
	(compareFunc as any).type = 'compare';
	return compareFunc as any;
}

export interface Expect {
	(expectedRenderFunc: AssertionResult): void;
}

export interface RendererAPI {
	expect: Expect;
	child: Child;
	property: Property;
}

const factory = create();

export function renderer(renderFunc: () => WNode, options: RendererOptions = {}): RendererAPI {
	let invalidated = true;
	let wNode = renderFunc();
	let expectedRenderResult: RenderResult;
	let renderResult: RenderResult;
	let widget: WidgetBase | Callback<any, any, any, RenderResult>;
	let middleware: any = {};
	let properties: any = {};
	let children: any = [];
	let customDiffs: [string, Function][] = [];
	let customDiffNames: string[] = [];
	let childInstructions = new Map<string, ChildInstruction>();
	let propertyInstructions: PropertyInstruction[] = [];
	let mockMiddleware = options.middleware || [];

	if (isWidgetFunction(wNode.widgetConstructor)) {
		widget = wNode.widgetConstructor;

		const resolveMiddleware = (middlewares: any, mocks: any[]) => {
			const keys = Object.keys(middlewares);
			const results: any = {};
			const mockMiddlewareMap = new Map(mocks);

			for (let i = 0; i < keys.length; i++) {
				let isMock = false;
				let middleware = middlewares[keys[i]]();
				if (mockMiddlewareMap.has(middlewares[keys[i]])) {
					middleware = mockMiddlewareMap.get(middlewares[keys[i]]);
					isMock = true;
				}
				const payload: any = {
					id: keys[i],
					properties: () => {
						return { ...properties };
					},
					children: () => {
						return children;
					}
				};
				if (middleware.middlewares) {
					const resolvedMiddleware = resolveMiddleware(middleware.middlewares, mocks);
					payload.middleware = resolvedMiddleware;
					results[keys[i]] = middleware.callback(payload);
				} else {
					if (isMock) {
						let result = middleware();
						const resolvedMiddleware = resolveMiddleware(result.middlewares, mocks);
						payload.middleware = resolvedMiddleware;
						results[keys[i]] = result.callback(payload);
					} else {
						results[keys[i]] = middleware.callback(payload);
					}
				}
			}
			return results;
		};
		mockMiddleware.push([
			invalidator,
			factory(() => () => {
				invalidated = true;
			})
		]);
		mockMiddleware.push([destroy, factory(() => () => {})]);
		mockMiddleware.push([
			diffProperty,
			factory(() => (propName: string, propertiesOrDiff: Function, diff?: Function) => {
				const diffFunction = diff || propertiesOrDiff;
				if (customDiffNames.indexOf(propName) === -1) {
					customDiffNames.push(propName);
					customDiffs.push([propName, diffFunction]);
					const result = diffFunction({}, properties);
					if (result) {
						properties = { ...properties, [propName]: result };
					}
				}
			})
		]);
		middleware = resolveMiddleware((wNode.widgetConstructor as any).middlewares, mockMiddleware);
	} else {
		const widgetConstructor = wNode.widgetConstructor as Constructor<WidgetBase>;
		if (typeof widgetConstructor === 'function') {
			widget = new class extends widgetConstructor {
				invalidate() {
					invalidated = true;
					super.invalidate();
				}
			}();
			_tryRender();
		} else {
			throw new Error('Renderer does not support registry items');
		}
	}

	function _tryRender() {
		let render: RenderResult;
		const wNode = renderFunc();
		if (isWidgetFunction(widget)) {
			for (let i = 0; i < customDiffs.length; i++) {
				const [name, diff] = customDiffs[i];
				const result = diff(properties, wNode.properties);
				if (result) {
					wNode.properties = { ...wNode.properties, [name]: result };
				}
			}
			propertiesDiff(
				properties,
				wNode.properties,
				() => {
					invalidated = true;
				},
				[...customDiffNames]
			);
			if (children.length || wNode.children.length) {
				invalidated = true;
			}
			properties = { ...wNode.properties };
			children = wNode.children;
			if (invalidated) {
				render = widget({ id: 'test', middleware, properties: () => properties, children: () => children });
			}
		} else {
			widget.__setProperties__(wNode.properties);
			widget.__setChildren__(wNode.children);
			if (invalidated) {
				render = widget.__render__();
			}
		}
		if (invalidated) {
			let { hasDeferredProperties, nodes } = decorateNodes(render);
			if (hasDeferredProperties) {
				nodes = decorateNodes(render).nodes;
			}
			renderResult = nodes;
			invalidated = false;
		}
	}

	function _expect(expectedRenderFunc: AssertionResult) {
		if (expectedRenderResult && propertyInstructions.length > 0) {
			propertyInstructions.forEach((instruction) => {
				decorate(renderResult, expectedRenderResult, new Map([[instruction.id, instruction]]));
			});

			propertyInstructions = [];
		}

		_tryRender();
		expectedRenderResult = expectedRenderFunc();
		expectedRenderResult = decorateNodes(expectedRenderResult).nodes;
		decorate(renderResult, expectedRenderResult, childInstructions);
		assertRender(renderResult, expectedRenderResult);
	}

	return {
		child(wrapped: any, params: any) {
			childInstructions.set(wrapped.id, { wrapped, params, type: 'child' });
			invalidated = true;
		},
		property(wrapped: any, key: any, ...params: any[]) {
			if (!expectedRenderResult) {
				throw new Error('To use `.property` please perform an initial expect');
			}
			propertyInstructions.push({ id: wrapped.id, wrapped, params, type: 'property', key });
		},
		expect(expectedRenderFunc: AssertionResult) {
			return _expect(expectedRenderFunc);
		}
	};
}

export default renderer;
