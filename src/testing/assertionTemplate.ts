import select from './support/selector';
import { isWNode, isVNode, decorate } from '../widget-core/d';
import { VNode, WNode, DNode } from '../widget-core/interfaces';

export interface AssertionTemplateResult {
	(): DNode | DNode[];
	setChildren(selector: string, children: DNode[]): AssertionTemplateResult;
	setProperty(selector: string, property: string, value: any): AssertionTemplateResult;
	getChildren(selector: string): DNode[];
	getProperty(selector: string, property: string): any;
}

const findOne = (nodes: DNode | DNode[], selector: string): DNode | undefined => {
	if (selector.indexOf('~') === 0) {
		selector = `[\\~key='${selector.substr(1)}']`;
	}
	const [node] = select(selector, nodes);
	return node;
};

type NodeWithProperties = (VNode | WNode) & { properties: { [index: string]: any } };

const guard = (node: DNode): NodeWithProperties => {
	if (!node) {
		throw Error('Node not found');
	}
	if (!isWNode(node) && !isVNode(node)) {
		throw Error('Cannot set or get on unknown node');
	}
	return node;
};

export function assertionTemplate(renderFunc: () => DNode | DNode[]) {
	const assertionTemplateResult: any = () => {
		const render = renderFunc();
		decorate(render, (node) => {
			if (isWNode(node) || isVNode(node)) {
				delete (node as NodeWithProperties).properties['~key'];
			}
		});
		return render;
	};
	assertionTemplateResult.setProperty = (selector: string, property: string, value: any) => {
		const render = renderFunc();
		const node = guard(findOne(render, selector));
		node.properties[property] = value;
		return assertionTemplate(() => render);
	};
	assertionTemplateResult.setChildren = (selector: string, children: DNode[]) => {
		const render = renderFunc();
		const node = guard(findOne(render, selector));
		node.children = children;
		return assertionTemplate(() => render);
	};
	assertionTemplateResult.getProperty = (selector: string, property: string) => {
		const render = renderFunc();
		const node = guard(findOne(render, selector));
		return node.properties[property];
	};
	assertionTemplateResult.getChildren = (selector: string) => {
		const render = renderFunc();
		const node = guard(findOne(render, selector));
		return node.children || [];
	};
	return assertionTemplateResult as AssertionTemplateResult;
}

export default assertionTemplate;
