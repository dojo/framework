import { WidgetBase } from './../WidgetBase';
import { WidgetProperties, VirtualDomProperties } from './../interfaces';
import { v } from './../d';
import { VNode } from '@dojo/interfaces/vdom';
import { Constructor } from '../interfaces';

export function DomWrapper(domNode: Element): Constructor<WidgetBase<VirtualDomProperties & WidgetProperties>> {
	return class extends WidgetBase<VirtualDomProperties & WidgetProperties> {
		private _vNode: VNode;
		private _firstRender = true;

		protected onElementCreated(element: Element, key: string) {
			element.parentNode && element.parentNode.replaceChild(domNode, element);
			this._vNode.domNode = domNode;
			this._firstRender = false;
			this.invalidate();
		}

		public __render__() {
			this._vNode = super.__render__() as VNode;
			return this._vNode;
		}

		protected render() {
			const properties = this._firstRender ? {} as any : this.properties;
			properties.bind && delete properties.bind;
			return v(domNode.tagName, { ...properties, key: 'root' });
		}
	};
}

export default DomWrapper;
