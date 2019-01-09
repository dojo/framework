import select from '@dojo/framework/testing/support/selector';
import { isWNode, isVNode, decorate } from '@dojo/framework/widget-core/d';
import { DNode } from '@dojo/framework/widget-core/interfaces';

interface AssertionTemplateResult {
	(): DNode | DNode[];
	setChildren?(selector: string, children: DNode[]): AssertionTemplateResult;
	setProperty?(selector: string, property: string, value: any): AssertionTemplateResult;
	getChildren?(selector: string): DNode[];
	getProperty?(selector: string, property: string): any;
}

const findOne = (nodes: DNode | DNode[], selector: string): DNode | undefined => {
	let [node] = select(selector, nodes);
	if (!node && selector.indexOf('@') === 0) {
		selector = `[\\~key='${selector.substr(1)}']`;
		[node] = select(selector, node);
	}
	return node;
};

export const assertionTemplate = (renderFunc: () => DNode | DNode[]) => {
	const assertionTemplateResult: AssertionTemplateResult = () => {
		const render = renderFunc();
		decorate(render, (node) => {
			if ((isWNode(node) || isVNode(node)) && node.properties['~key']) {
				delete node.properties['~key'];
			}
		});
		return render;
	};
	assertionTemplateResult.setProperty = (selector, property, value) => {
		const render = renderFunc();
		const node = findOne(render, selector);
		if (!node) {
			throw Error('Node not found');
		}
		if (typeof node === 'string') {
			throw Error('Cannot set property on text node');
		}
		node.properties[property] = value;
		return assertionTemplate(() => render);
	};
	assertionTemplateResult.setChildren = (selector, children) => {
		const render = renderFunc();
		const node = findOne(render, selector);
		if (!node) {
			throw Error('Node not found');
		}
		if (typeof node === 'string') {
			throw Error('Cannot set children on text node');
		}
		node.children = children;
		return assertionTemplate(() => render);
	};
	assertionTemplateResult.getProperty = (selector, property) => {
		const render = renderFunc();
		const node = findOne(render, selector);
		if (!node) {
			throw Error('Node not found');
		}
		if (typeof node === 'string') {
			throw Error('Cannot get property on text node');
		}
		return node.properties[property];
	};
	assertionTemplateResult.getChildren = (selector) => {
		const render = renderFunc();
		const node = findOne(render, selector);
		if (!node) {
			throw Error('Node not found');
		}
		if (typeof node === 'string') {
			throw Error('Cannot get children on text node');
		}
		return node.children || [];
	};
	return assertionTemplateResult;
};

export default assertionTemplate;
