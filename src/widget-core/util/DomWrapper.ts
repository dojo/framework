import { WidgetBase } from './../WidgetBase';
import { Constructor, DNode, VNode, VNodeProperties, WidgetProperties } from './../interfaces';
import { v } from './../d';
import { InternalVNode } from './../vdom';

export interface DomWrapperOptions {
	onAttached?(): void;
}

export type DomWrapperProperties = VNodeProperties & WidgetProperties;

export type DomWrapper = Constructor<WidgetBase<DomWrapperProperties>>;

function isElement(value: any): value is Element {
	return value.tagName;
}

export function DomWrapper(domNode: Element | Text, options: DomWrapperOptions = {}): DomWrapper {
	return class DomWrapper extends WidgetBase<DomWrapperProperties> {
		public __render__(): VNode {
			const vNode = super.__render__() as InternalVNode;
			vNode.domNode = domNode;
			return vNode;
		}

		protected onAttach() {
			options.onAttached && options.onAttached();
		}

		protected render(): DNode {
			const properties = { ...this.properties, key: 'root' };
			const tag = isElement(domNode) ? domNode.tagName : '';
			return v(tag, properties);
		}
	};
}

export default DomWrapper;
