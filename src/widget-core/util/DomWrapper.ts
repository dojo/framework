import { WidgetBase } from './../WidgetBase';
import { DNode, WidgetProperties } from './../interfaces';
import { isHNode } from '../d';
import { assign } from '@dojo/core/lang';
import { VNode } from '@dojo/interfaces/vdom';

export interface DomWrapperProperties extends WidgetProperties {
	domNode: Node;
}

export class DomWrapper extends WidgetBase<DomWrapperProperties> {

	private _vNode: VNode | undefined;

	public afterCreate() {
		this.handleDomInsertion(this.properties.domNode);
	}

	public afterUpdate() {
		this.handleDomInsertion(this.properties.domNode);
	}

	public __render__() {
		const vNode = super.__render__();
		if (vNode && typeof vNode !== 'string') {
			if (!this._vNode) {
				this._vNode = vNode;
			}
		}
		else {
			this._vNode = undefined;
		}

		return vNode;
	}

	protected render(): DNode {
		const dNode = super.render();
		if (isHNode(dNode)) {
			const { afterCreate, afterUpdate } = this;

			assign(dNode.properties, {
				afterCreate,
				afterUpdate
			});
		}

		return dNode;
	}

	private handleDomInsertion(newNode: Node | null | undefined) {
		let notNullNode = newNode;

		if (!notNullNode) {
			notNullNode = document.createElement('div'); // placeholder element
		}

		if (this._vNode) {
			// replace the vNode domElement with our new element...
			if (this._vNode.domNode && this._vNode.domNode.parentNode) {
				this._vNode.domNode.parentNode.replaceChild(notNullNode, this._vNode.domNode);
			}

			// and update the reference to our vnode
			this._vNode.domNode = notNullNode;
		}
	}
}

export default DomWrapper;
