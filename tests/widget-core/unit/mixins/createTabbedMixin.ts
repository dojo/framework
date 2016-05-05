import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createTabbedMixin from 'src/mixins/createTabbedMixin';
import createPanel from 'src/createPanel';

registerSuite({
	name: 'mixins/ceateTabbedMixin',
	'creation': {
		'with closable tabs'() {
			const tabbed = createTabbedMixin({
				children: [
					createPanel({ state: { closeable: true, id: 'foo', label: 'foo' }}),
					createPanel({ state: { closeable: false, id: 'bar', label: 'bar' }}),
					createPanel({ state: { closeable: true, id: 'baz', label: 'baz' }}),
					createPanel({ state: { closeable: false, id: 'qat', label: 'qat' }})
				],
				state: {
					id: 'qux'
				}
			});

			const vnode = tabbed.render();
			assert.deepEqual(vnode.properties, {
				'data-widget-id': 'qux',
				classes: {},
				styles: {},
				key: tabbed
			});
			assert.strictEqual(vnode.vnodeSelector, 'dojo-panel-mixin');
			assert.strictEqual(vnode.children.length, 2, 'should have two children');

			const tabBar = vnode.children[0];
			assert.strictEqual(tabBar.vnodeSelector, 'ul');
			assert.strictEqual(tabBar.children.length, 4);
			tabBar.children.forEach((child) => assert.strictEqual(child.vnodeSelector, 'li'));
			assert.strictEqual(tabBar.children[0].children[0].text, 'foo');
			assert.strictEqual(tabBar.children[0].children.length, 2);
			assert.strictEqual(tabBar.children[1].children[0].text, 'bar');
			assert.strictEqual(tabBar.children[1].children.length, 1);
			assert.strictEqual(tabBar.children[2].children[0].text, 'baz');
			assert.strictEqual(tabBar.children[2].children.length, 2);
			assert.strictEqual(tabBar.children[3].children[0].text, 'qat');
			assert.strictEqual(tabBar.children[3].children.length, 1);

			const panels = vnode.children[1];
			assert.strictEqual(panels.vnodeSelector, 'div.panels');
			assert.strictEqual(panels.children.length, 1);

			assert.strictEqual(vnode, tabbed.render(), 'should cache results, if not invalidated');
		}
	}
});
