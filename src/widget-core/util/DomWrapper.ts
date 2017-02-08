import { DNode, WidgetBase, WidgetProperties } from './../WidgetBase';
import { isHNode } from '../d';
import { assign } from '@dojo/core/lang';
import { VNode } from '@dojo/interfaces/vdom';

export interface DomWrapperProperties extends WidgetProperties {
	domNode: Node;
}

export class DomWrapper extends WidgetBase<DomWrapperProperties> {

	private vNode: VNode | undefined;

	afterCreate() {
		this.handleDomInsertion(this.properties.domNode);
	}

	afterUpdate() {
		this.handleDomInsertion(this.properties.domNode);
	}

	private handleDomInsertion(newNode: Node | null | undefined) {
		let notNullNode = newNode;

		if (!notNullNode) {
			notNullNode = document.createElement('div'); // placeholder element
		}

		if (this.vNode) {
			// replace the vNode domElement with our new element...
			if (this.vNode.domNode && this.vNode.domNode.parentNode) {
				this.vNode.domNode.parentNode.replaceChild(notNullNode, this.vNode.domNode);
			}

			// and update the reference to our vnode
			this.vNode.domNode = notNullNode;
		}
	}

	render(): DNode {
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

	__render__() {
		const vNode = super.__render__();
		if (vNode && typeof vNode !== 'string') {
			if (!this.vNode) {
				this.vNode = vNode;
			}
		}
		else {
			this.vNode = undefined;
		}

		return vNode;
	}
}
