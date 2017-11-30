import { WidgetBase } from './../WidgetBase';
import { Constructor, DNode, HNode, VirtualDomProperties, WidgetProperties } from './../interfaces';
import { v } from './../d';
import { InternalHNode } from './../vdom';

export interface DomWrapperOptions {
	onAttached?(): void;
}

export type DomWrapperProperties = VirtualDomProperties & WidgetProperties;

export type DomWrapper = Constructor<WidgetBase<DomWrapperProperties>>;

export function DomWrapper(domNode: Element, options: DomWrapperOptions = {}): DomWrapper {
	return class DomWrapper extends WidgetBase<DomWrapperProperties> {

		public __render__(): HNode {
			const hNode = super.__render__() as InternalHNode;
			hNode.domNode = domNode;
			return hNode;
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
