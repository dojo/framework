import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createListMixin from 'src/mixins/createListMixin';

registerSuite({
	name: 'mixins/createListMixin',
	creation() {
		const list = createListMixin();
		assert.isFunction(list.getChildrenNodes);
		assert.deepEqual(list.tagNames, { list: 'ul', item: 'li' });
	},
	'getChildrenNodes()': {
		'no items'() {
			const list = createListMixin();
			assert.deepEqual(list.getChildrenNodes(), []);
		},
		'items'() {
			const list = createListMixin({
				state: {
					items: [
						{ id: 1, label: 'foo' },
						{ id: 2, label: 'bar' },
						{ id: 3, label: 'baz' }
					]
				}
			});
			const [ vnode ] = list.getChildrenNodes();
			if (typeof vnode !== 'string') {
				assert.strictEqual(vnode.vnodeSelector, 'ul');
				assert.isUndefined(vnode.text);
				assert.strictEqual(vnode.children.length, 3);
				const [ node1, node2, node3 ] = vnode.children;
				assert.strictEqual(node1.vnodeSelector, 'li');
				assert.strictEqual(node1.text, 'foo');
				assert.isUndefined(node1.children);
				assert.strictEqual(node2.vnodeSelector, 'li');
				assert.strictEqual(node2.text, 'bar');
				assert.isUndefined(node2.children);
				assert.strictEqual(node3.vnodeSelector, 'li');
				assert.strictEqual(node3.text, 'baz');
				assert.isUndefined(node3.children);
			}
			else {
				throw Error('vnode is string');
			}
		}
	}
});
