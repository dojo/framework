import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { isHNode } from '../../../src/d';
import { WidgetBase, HNode } from './../../../src/WidgetBase';
import { DomWrapper } from '../../../src/util/DomWrapper';

function callCreate(widget: WidgetBase<any>, includeUpdate = false) {
	const hNode: HNode = <HNode> widget.render();

	assert.isTrue(isHNode(hNode));

	assert.isFunction(hNode.properties.afterCreate);

	if (includeUpdate) {
		assert.isFunction(hNode.properties.afterUpdate);
	}

	(<any> widget).__render__();
	(<any> hNode.properties).afterCreate.call(widget);

	if (includeUpdate) {
		(<any> hNode.properties).afterUpdate.call(widget);
	}
}

registerSuite({
	name: 'DomWrapper',

	'DOM element is added as a child'() {
		let mock = {};
		let parentNode = {
			child: null,

			parentNode: {
				replaceChild: function (newNode: any) {
					parentNode.child = newNode;
				}
			}
		};

		let domWrapper: any = new DomWrapper({ domNode: <any> mock });

		domWrapper.dirty = false;
		domWrapper.cachedVNode = {
			domNode: parentNode
		};

		callCreate(domWrapper);

		assert.equal(domWrapper.properties.domNode, mock);
		assert.equal(parentNode.child, mock);
	},

	'Nothing bad happens if there is no node'() {
		let parentNode = {
			child: null,

			appendChild: function (argument: any) {
				parentNode.child = argument;
			}
		};

		let domWrapper: any = new DomWrapper({ domNode: <any> 'test' });

		domWrapper.dirty = false;
		domWrapper.cachedVNode = {
			domNode: null
		};

		callCreate(domWrapper);
	},

	'Nothing bad happens if there if node is a string'() {
		let domWrapper: any = new DomWrapper({ domNode: <any> 'test' });

		domWrapper.dirty = false;
		domWrapper.cachedVNode = {
			domNode: 'test'
		};

		callCreate(domWrapper);
	},

	'updates with no renders don\'t do anything'() {
		let domWrapper: any = new DomWrapper({ domNode: <any> undefined });
		domWrapper.dirty = false;
		domWrapper.cachedVNode = {
			domNode: null
		};

		callCreate(domWrapper, true);
	},

	'nothing bad happens if our vnode doesn\'t have a parent'() {
		let parentNode = {
			child: null,

			appendChild: function (argument: any) {
				parentNode.child = argument;
			}
		};

		let domWrapper: any = new DomWrapper({ domNode: <any> undefined });
		domWrapper.dirty = false;
		domWrapper.cachedVNode = {
			domNode: parentNode
		};

		callCreate(domWrapper, true);
	},

	'render aspect is ok if we dont return an hnode'() {
		let domWrapper: any = new DomWrapper({ domNode: <any> undefined });
		domWrapper.dirty = false;
		domWrapper.cachedVNode = {
			domNode: 'test'
		};

		domWrapper.render();
	}
});
