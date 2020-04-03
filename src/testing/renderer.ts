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
	DefaultChildrenWNodeFactory
} from '../core/interfaces';
import { WidgetBase } from '../core/WidgetBase';
import { isWidgetFunction } from '../core/Registry';
import { invalidator, diffProperty, destroy, create, propertiesDiff, w, v } from '../core/vdom';
import { uuid } from '../core/util';
import decorate, { decorateNodes } from './decorate';
import { AssertionTemplateResult } from './assertionTemplate';
import { Wrapped, WidgetFactory, CompareFunc, Comparable } from './interfaces';

export interface Expect {
	(expectedRenderFunc: AssertionTemplateResult): void;
}

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
		params: T['children'] extends { [index: string]: (...args: any[]) => RenderResult }
			? { [P in keyof T['children']]: Parameters<T['children'][P]> }
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
		wrapped: Constructor<T>,
		key: K,
		...params: Parameters<Exclude<T['properties'][K], CompareFunc<any>>>
	): void;
	<T extends WidgetFactory, K extends FunctionPropertyNames<Required<T['properties']>>>(
		wrapped: T,
		key: K,
		...params: Parameters<Exclude<T['properties'][K], CompareFunc<any>>>
	): void;
	<
		T extends OptionalWNodeFactory<{ properties: Comparable<VNodeProperties>; children: any }>,
		K extends FunctionPropertyNames<RequiredVNodeProperties>
	>(
		wrapped: T,
		key: K,
		...params: any[]
	): void;
}

export interface RendererAPI {
	expect: Expect;
	child: Child;
	property: Property;
}

let middlewareId = 0;

interface RendererOptions {
	middleware?: [MiddlewareResultFactory<any, any, any, any>, MiddlewareResultFactory<any, any, any, any>][];
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

export function compare(compareFunc: (actual: unknown, expected: unknown) => boolean): CompareFunc<unknown> {
	(compareFunc as any).type = 'compare';
	return compareFunc as any;
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
	let customDiffs: any[] = [];
	let customDiffNames: string[] = [];
	let childInstructions = new Map<string, ChildInstruction>();
	let propertyInstructions: PropertyInstruction[] = [];
	let mockMiddleware = options.middleware || [];

	if (isWidgetFunction(wNode.widgetConstructor)) {
		widget = wNode.widgetConstructor;

		const resolveMiddleware = (middlewares: any, mocks: any[]) => {
			const keys = Object.keys(middlewares);
			const results: any = {};
			const uniqueId = `${middlewareId++}`;
			const mockMiddlewareMap = new Map(mocks);

			for (let i = 0; i < keys.length; i++) {
				let isMock = false;
				let middleware = middlewares[keys[i]]();
				if (mockMiddlewareMap.has(middlewares[keys[i]])) {
					middleware = mockMiddlewareMap.get(middlewares[keys[i]]);
					isMock = true;
				}
				const payload: any = {
					id: uniqueId,
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
			factory(() => (propName: string, func: any) => {
				if (customDiffNames.indexOf(propName) === -1) {
					customDiffNames.push(propName);
					customDiffs.push(func);
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
			customDiffs.forEach((diff) => diff(properties, wNode.properties));
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

	function _expect(expectedRenderFunc: AssertionTemplateResult) {
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
		property(wrapped: any, key: any, params: any = []) {
			if (!expectedRenderResult) {
				throw new Error('To use `.property` please perform an initial expect');
			}
			propertyInstructions.push({ id: wrapped.id, wrapped, params, type: 'property', key });
		},
		expect(expectedRenderFunc: AssertionTemplateResult) {
			return _expect(expectedRenderFunc);
		}
	};
}

export default renderer;
