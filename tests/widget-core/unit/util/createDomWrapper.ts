import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { isHNode } from '../../../src/d';
import { HNode, Widget } from '../../../src/interfaces';
import createDomWrapper from '../../../src/util/createDomWrapper';

function callCreate(widget: Widget<any>, includeUpdate = false) {
	const hNode: HNode = <HNode> widget.render();

	assert.isTrue(isHNode(hNode));

	assert.isFunction(hNode.properties.afterCreate);

	if (includeUpdate) {
		assert.isFunction(hNode.properties.afterUpdate);
	}

	widget.__render__();
	(<any> hNode.properties).afterCreate.call(widget);

	if (includeUpdate) {
		(<any> hNode.properties).afterUpdate.call(widget);
	}
}

registerSuite({
	name: 'createDomWrapper',

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

		let domWrapper = createDomWrapper.mixin({
			mixin: {
				__render__() {
					return <any> {
						domNode: parentNode
					};
				}
			}
		})();
		domWrapper.setProperties({
			domNode: <any> mock
		});

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

		let domWrapper = createDomWrapper.mixin({
			mixin: {
				__render__() {
					return <any> {
						domNode: null
					};
				}
			}
		})();
		domWrapper.setProperties({
			domNode: <any> 'test'
		});

		callCreate(domWrapper);
	},

	'Nothing bad happens if there if node is a string'() {
		let domWrapper = createDomWrapper.mixin({
			mixin: {
				__render__() {
					return 'test';
				}
			}
		})();

		domWrapper.setProperties({
			domNode: <any> 'test'
		});

		callCreate(domWrapper);
	},

	'updates with no renders don\'t do anything'() {
		let domWrapper = createDomWrapper.mixin({
			mixin: {
				__render__() {
					return <any> {
						domNode: null
					};
				}
			}
		})();

		callCreate(domWrapper, true);
	},

	'nothing bad happens if our vnode doesn\'t have a parent'() {
		let parentNode = {
			child: null,

			appendChild: function (argument: any) {
				parentNode.child = argument;
			}
		};

		let domWrapper = createDomWrapper.mixin({
			mixin: {
				__render__() {
					return <any> {
						domNode: parentNode
					};
				}
			}
		})();

		callCreate(domWrapper, true);
	},

	'render aspect is ok if we dont return an hnode'() {
		let domWrapper = createDomWrapper.mixin({
			mixin: {
				render() {
					return 'test';
				}
			}
		})();

		domWrapper.render();
	}
});
