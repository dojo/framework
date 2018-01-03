import { WidgetBase } from './../WidgetBase';
import { Constructor, DNode, VNode, VNodeProperties, WidgetProperties } from './../interfaces';
import { v } from './../d';
import { InternalVNode } from './../vdom';

export interface DomWrapperOptions {
	onAttached?(): void;
}

export type DomWrapperProperties = VNodeProperties & WidgetProperties;

export type DomWrapper = Constructor<WidgetBase<DomWrapperProperties>>;

export function DomWrapper(domNode: Element, options: DomWrapperOptions = {}): DomWrapper {
	return class DomWrapper extends WidgetBase<DomWrapperProperties> {
		public __render__(): VNode {
			const vNode = super.__render__() as InternalVNode;
			vNode.domNode = domNode;
			return vNode;
		}

		protected onElementCreated(element: Element, key: string | number) {
			options.onAttached && options.onAttached();
		}

		protected render(): DNode {
			const properties = { ...this.properties, key: 'root' };
			return v(domNode.tagName, properties);
		}
	};
}

export default DomWrapper;
