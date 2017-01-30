import createWidget from '../createWidgetBase';
import { isHNode } from '../d';
import { Widget, WidgetProperties, DNode } from '../interfaces';
import { ComposeFactory } from '@dojo/compose/compose';
import { assign } from '@dojo/core/lang';
import { VNode } from '@dojo/interfaces/vdom';
import WeakMap from '@dojo/shim/WeakMap';

export interface DomWrapperProperties extends WidgetProperties {
	domNode: Node;
}

export type DomWrapperFactory = ComposeFactory<Widget<DomWrapperProperties>, DomWrapperProperties>;

interface DomWrapperPrivates {
	vNode: VNode;
}

const domWrapperData = new WeakMap<Widget<DomWrapperProperties>, DomWrapperPrivates>();

function handleDomInsertion(instance: Widget<DomWrapperProperties>, newNode: Node | null | undefined) {
	let notNullNode = newNode;

	if (!notNullNode) {
		notNullNode = document.createElement('div'); // placeholder element
	}

	const data = domWrapperData.get(instance);

	if (data) {
		// replace the vNode domElement with our new element...
		if (data.vNode.domNode && data.vNode.domNode.parentNode) {
			data.vNode.domNode.parentNode.replaceChild(notNullNode, data.vNode.domNode);
		}

		// and update the reference to our vnode
		data.vNode.domNode = notNullNode;
	}
}

const createDomWrapper: DomWrapperFactory = createWidget.mixin({
	mixin: {
		afterCreate(this: Widget<DomWrapperProperties>) {
			handleDomInsertion(this, this.properties.domNode);
		},
		afterUpdate(this: Widget<DomWrapperProperties>) {
			handleDomInsertion(this, this.properties.domNode);
		}
	}
}).aspect({
	after: {
		render(this: Widget<DomWrapperProperties>, dNode: DNode) {
			if (isHNode(dNode)) {
				const { afterCreate, afterUpdate } = this;

				assign(dNode.properties, {
					afterCreate,
					afterUpdate
				});
			}

			return dNode;
		},
		__render__(this: Widget<DomWrapperProperties>, vNode: VNode) {
			if (vNode && typeof vNode !== 'string') {
				if (!domWrapperData.has(this)) {
					domWrapperData.set(this, {
						vNode: vNode
					});
				}
			}
			else {
				domWrapperData.delete(this);
			}

			return vNode;
		}
	}
});

export default createDomWrapper;
