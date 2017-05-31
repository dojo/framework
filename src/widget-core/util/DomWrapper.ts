import { WidgetBase } from './../WidgetBase';
import { WidgetProperties, VirtualDomProperties, Constructor } from './../interfaces';
import { v } from './../d';
import { VNode } from '@dojo/interfaces/vdom';

export interface DomWrapperOptions {
	onAttached?(): void;
}

export type DomWrapperProperties = VirtualDomProperties & WidgetProperties;

export type DomWrapper = Constructor<WidgetBase<DomWrapperProperties>>;

export function DomWrapper(domNode: Element, options: DomWrapperOptions = {}): DomWrapper {
	return class extends WidgetBase<DomWrapperProperties> {

		protected onElementCreated(element: Element, key: string) {
			options.onAttached && options.onAttached();
		}

		public __render__() {
			const vNode = super.__render__() as VNode;
			vNode.domNode = domNode;
			return vNode;
		}

		protected render() {
			const properties = { ...this.properties, key: 'root' };
			return v(domNode.tagName, properties);
		}
	};
}

export default DomWrapper;
