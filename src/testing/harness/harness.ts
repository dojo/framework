import assertRender from './support/assertRender';
import { decorateNodes, select } from './support/selector';
import {
	WNode,
	DNode,
	Constructor,
	VNode,
	Callback,
	RenderResult,
	MiddlewareResultFactory,
	DefaultMiddlewareResult
} from '../../core/interfaces';
import { WidgetBase } from '../../core/WidgetBase';
import { isWidgetFunction } from '../../core/Registry';
import { invalidator, diffProperty, destroy, create, propertiesDiff } from '../../core/vdom';
import { uuid } from '../../core/util';

export interface CustomComparator {
	selector: string;
	property: string;
	comparator: (value: any) => boolean;
}

export interface FunctionalSelector {
	(node: VNode | WNode): undefined | Function;
}

export interface ExpectedRender {
	(): DNode | DNode[];
}

export interface Expect {
	(expectedRenderFunc: ExpectedRender): void;
	(expectedRenderFunc: ExpectedRender, actualRenderFunc?: ExpectedRender): void;
}

export interface ExpectPartial {
	(selector: string, expectedRenderFunc: ExpectedRender): void;
	(selector: string, expectedRenderFunc: ExpectedRender, actualRenderFunc?: ExpectedRender): void;
}

export interface Trigger {
	(selector: string, functionSelector: FunctionalSelector, ...args: any[]): any;
	(selector: string, functionSelector: string, ...args: any[]): any;
}

export interface GetRender {
	(index?: number): DNode | DNode[];
}

export interface HarnessAPI {
	expect: Expect;
	expectPartial: ExpectPartial;
	trigger: Trigger;
	getRender: GetRender;
}

interface HarnessOptions {
	customComparator?: CustomComparator[];
	middleware?: [MiddlewareResultFactory<any, any, any, any>, () => DefaultMiddlewareResult][];
}

const factory = create();

export function harness(renderFunc: () => WNode, options?: HarnessOptions): HarnessAPI;
export function harness(renderFunc: () => WNode, customComparator?: CustomComparator[]): HarnessAPI;
export function harness(renderFunc: () => WNode, options: HarnessOptions | CustomComparator[] = []): HarnessAPI {
	let invalidated = true;
	let wNode = renderFunc();
	const renderStack: (DNode | DNode[])[] = [];
	let widget: WidgetBase | Callback<any, any, any, RenderResult>;
	let middleware: any = {};
	let properties: any = {};
	let children: any = [];
	let customDiffs: [string, Function][] = [];
	let customDiffNames: string[] = [];
	let customComparator: CustomComparator[] = [];
	let mockMiddleware: [MiddlewareResultFactory<any, any, any, any>, () => DefaultMiddlewareResult][] = [];
	if (Array.isArray(options)) {
		customComparator = options;
	} else {
		if (options.middleware) {
			mockMiddleware = options.middleware;
		}
		if (options.customComparator) {
			customComparator = options.customComparator;
		}
	}

	if (isWidgetFunction(wNode.widgetConstructor)) {
		widget = wNode.widgetConstructor;

		const resolveMiddleware = (middlewares: any, mocks: any[]) => {
			const keys = Object.keys(middlewares);
			const results: any = {};
			const uniqueId = uuid();
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
			throw new Error('Harness does not support registry items');
		}
	}

	function _getRender(count?: number): DNode | DNode[] {
		return count ? renderStack[count] : renderStack[renderStack.length - 1];
	}

	function _runCompares(nodes: DNode | DNode[], isExpected: boolean = false) {
		customComparator.forEach(({ selector, property, comparator }) => {
			const items = select(selector, nodes);
			items.forEach((item: any) => {
				const comparatorName = `comparator(selector=${selector}, ${property})`;
				if (item && item.properties && item.properties[property] !== undefined) {
					const comparatorResult = comparator(item.properties[property])
						? comparatorName
						: `${comparatorName} FAILED`;
					item.properties[property] = isExpected ? comparatorName : comparatorResult;
				}
			});
		});
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
			const { hasDeferredProperties, nodes } = decorateNodes(render);
			_runCompares(nodes);
			renderStack.push(nodes);
			if (hasDeferredProperties) {
				const { nodes: afterDeferredPropertiesNodes } = decorateNodes(render);
				_runCompares(afterDeferredPropertiesNodes);
				renderStack.push(afterDeferredPropertiesNodes);
			}
			invalidated = false;
		}
	}

	function _expect(expectedRenderFunc: ExpectedRender, actualRenderFunc?: ExpectedRender, selector?: string) {
		let renderResult: DNode | DNode[];
		if (actualRenderFunc === undefined) {
			_tryRender();
			renderResult = _getRender();
		} else {
			renderResult = actualRenderFunc();
			_runCompares(renderResult);
		}

		const { nodes: expectedRenderResult } = decorateNodes(expectedRenderFunc());
		_runCompares(expectedRenderResult, true);
		if (selector) {
			const [firstItem] = select(selector, renderResult);
			assertRender(firstItem, expectedRenderResult);
		} else {
			assertRender(renderResult, expectedRenderResult);
		}
	}

	return {
		expect(expectedRenderFunc: ExpectedRender, actualRenderFunc?: ExpectedRender) {
			return _expect(expectedRenderFunc, actualRenderFunc);
		},
		expectPartial(selector: string, expectedRenderFunc: ExpectedRender, actualRenderFunc?: ExpectedRender) {
			return _expect(expectedRenderFunc, actualRenderFunc, selector);
		},
		trigger(selector: string, functionSelector: string | FunctionalSelector, ...args: any[]): any {
			_tryRender();
			const [firstItem] = select(selector, _getRender());

			if (!firstItem) {
				throw new Error(`Cannot find node with selector ${selector}`);
			}

			let triggerFunction: Function | undefined;
			if (typeof functionSelector === 'string') {
				triggerFunction = (firstItem.properties as any)[functionSelector];
			} else {
				triggerFunction = functionSelector(firstItem);
			}
			if (triggerFunction) {
				return triggerFunction.apply(widget, args);
			}
		},
		getRender(index?: number): DNode | DNode[] {
			return _getRender(index);
		}
	};
}

export default harness;
