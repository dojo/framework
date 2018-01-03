import { v, w } from './d';
import { Constructor, DNode } from './interfaces';
import { WNode, VNodeProperties } from './interfaces';

declare global {
	namespace JSX {
		type Element = WNode;
		interface ElementAttributesProperty {
			properties: {};
		}
		interface IntrinsicElements {
			[key: string]: VNodeProperties;
		}
	}
}

export const REGISTRY_ITEM = Symbol('Identifier for an item from the Widget Registry.');

export class FromRegistry<P> {
	static type = REGISTRY_ITEM;
	properties: P;
	name: string;
}

export function fromRegistry<P>(tag: string): Constructor<FromRegistry<P>> {
	return class extends FromRegistry<P> {
		properties: P;
		static type = REGISTRY_ITEM;
		name = tag;
	};
}

function spreadChildren(children: any[], child: any): any[] {
	if (Array.isArray(child)) {
		return child.reduce(spreadChildren, children);
	} else {
		return [...children, child];
	}
}

export function tsx(tag: any, properties = {}, ...children: any[]): DNode {
	children = children.reduce(spreadChildren, []);
	properties = properties === null ? {} : properties;
	if (typeof tag === 'string') {
		return v(tag, properties, children);
	} else if (tag.type === REGISTRY_ITEM) {
		const registryItem = new tag();
		return w(registryItem.name, properties, children);
	} else {
		return w(tag, properties, children);
	}
}
