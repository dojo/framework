import assertRender from './support/assertRender';
import { select } from './support/selector';
import { WNode, DNode, WidgetBaseInterface, Constructor, VNode } from '@dojo/widget-core/interfaces';
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { decorate, isVNode, isWNode } from '@dojo/widget-core/d';

export interface CustomComparator {
	selector: string;
	property: string;
	comparator: (value: any) => boolean;
}

export interface FunctionalSelector {
	(node: VNode | WNode): undefined | Function;
}

export interface DecoratorResult<T> {
	hasDeferredProperties: boolean;
	nodes: T;
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

function decorateNodes(dNode: DNode[]): DecoratorResult<DNode[]>;
function decorateNodes(dNode: DNode): DecoratorResult<DNode>;
function decorateNodes(dNode: DNode | DNode[]): DecoratorResult<DNode | DNode[]>;
function decorateNodes(dNode: any): DecoratorResult<DNode | DNode[]> {
	let hasDeferredProperties = false;
	function addParent(parent: WNode | VNode): void {
		(parent.children || []).forEach((child) => {
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

export function harness(
	renderFunc: () => WNode<WidgetBaseInterface>,
	customComparator: CustomComparator[] = []
): HarnessAPI {
	let invalidated = true;
	let wNode = renderFunc();
	let widget: WidgetBase;
	const renderStack: (DNode | DNode[])[] = [];
	const { properties, children } = wNode;
	const widgetConstructor = wNode.widgetConstructor as Constructor<WidgetBase>;
	if (typeof widgetConstructor === 'function') {
		widget = new class extends widgetConstructor {
			invalidate() {
				invalidated = true;
				super.invalidate();
			}
		}();
		widget.__setProperties__(properties);
		widget.__setChildren__(children);
		_tryRender();
	} else {
		throw new Error('Harness does not support registry items');
	}

	function _getRender(count?: number): DNode | DNode[] {
		return count ? renderStack[count] : renderStack[renderStack.length - 1];
	}

	function _runCompares(nodes: DNode | DNode[], isExpected: boolean = false) {
		customComparator.forEach(({ selector, property, comparator }) => {
			const items = select(selector, nodes);
			items.forEach((item: any, index: number) => {
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
		const { properties, children } = renderFunc();
		widget.__setProperties__(properties);
		widget.__setChildren__(children);
		if (invalidated) {
			const render = widget.__render__();
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
			if (firstItem) {
				let triggerFunction: Function | undefined;
				if (typeof functionSelector === 'string') {
					triggerFunction = (firstItem.properties as any)[functionSelector];
				} else {
					triggerFunction = functionSelector(firstItem);
				}
				if (triggerFunction) {
					return triggerFunction.apply(widget, args);
				}
			}
		},
		getRender(index?: number): DNode | DNode[] {
			return _getRender(index);
		}
	};
}

export default harness;
