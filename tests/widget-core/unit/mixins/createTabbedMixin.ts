import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createTabbedMixin from 'src/mixins/createTabbedMixin';
import createPanel from 'src/createPanel';
import { from as arrayFrom } from 'dojo-shim/array';

registerSuite({
	name: 'mixins/ceateTabbedMixin',
	'creation': {
		'with closable tabs'() {
			const tabbed = createTabbedMixin({
				children: {
					foo: createPanel({ state: { closeable: true, id: 'foo', label: 'foo' }}),
					bar: createPanel({ state: { closeable: false, id: 'bar', label: 'bar' }}),
					baz: createPanel({ state: { closeable: true, id: 'baz', label: 'baz' }}),
					qat: createPanel({ state: { closeable: false, id: 'qat', label: 'qat' }})
				},
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

			const [ tabBar, panels ] = vnode.children;
			assert.strictEqual(tabBar.vnodeSelector, 'ul');
			assert.strictEqual(tabBar.children.length, 4);
			tabBar.children.forEach((child) => assert.strictEqual(child.vnodeSelector, 'li'));

			const [ child1, child2, child3, child4 ] = tabBar.children;
			assert.strictEqual(child1.children[0].text, 'foo');
			assert.strictEqual(child1.children.length, 2);
			assert.strictEqual(child2.children[0].text, 'bar');
			assert.strictEqual(child2.children.length, 1);
			assert.strictEqual(child3.children[0].text, 'baz');
			assert.strictEqual(child3.children.length, 2);
			assert.strictEqual(child4.children[0].text, 'qat');
			assert.strictEqual(child4.children.length, 1);

			assert.strictEqual(panels.vnodeSelector, 'div.panels');
			assert.strictEqual(panels.children.length, 1);

			assert.strictEqual(vnode, tabbed.render(), 'should cache results, if not invalidated');

			tabbed.invalidate();
			assert.notStrictEqual(vnode, tabbed.render(), 'but should provide fresh results on invalidation');
		}
	},
	'close child'() {
		// const foo = createPanel({ state: { closeable: true, id: 'foo', label: 'foo' }});
		// const tabbed = createTabbedMixin({ children: { foo } });
		// const [ tabBar ] = tabbed.render().children;
		/* TODO: Complete */
	},
	'activeTab': {
		'get()'() {
			const foo = createPanel({ state: { closeable: true, id: 'foo', label: 'foo' }});
			const bar = createPanel({ state: { closeable: false, id: 'bar', label: 'bar', active: true }});
			const tabbed = createTabbedMixin({
				children: { foo, bar }
			});
			assert.strictEqual(tabbed.activeChild, bar);
			foo.setState({ active: true });
			assert.strictEqual(tabbed.activeChild, foo);
			assert.isFalse(bar.state['active']);
		},
		'set()'() {
			const foo = createPanel({ state: { closeable: true, id: 'foo', label: 'foo' }});
			const bar = createPanel({ state: { closeable: false, id: 'bar', label: 'bar', active: true }});
			const tabbed = createTabbedMixin({
				children: { foo, bar }
			});
			assert.strictEqual(tabbed.activeChild, bar);
			tabbed.activeChild = foo;
			assert.strictEqual(tabbed.activeChild, foo);
			assert.isTrue(foo.state['active']);
			assert.isFalse(bar.state['active']);
		},
		'click'() {
			let count = 0;
			const foo = createPanel({ state: { closeable: true, id: 'foo', label: 'foo' }});
			const bar = createPanel({ state: { closeable: false, id: 'bar', label: 'bar', active: true }});
			const tabbed = createTabbedMixin({
				children: { foo, bar }
			});
			const [ tabBar ] = tabbed.render().children;
			tabBar.children[0].children[0].properties.onclick(<any> {
				preventDefault() { count++; }
			});
			assert.strictEqual(tabbed.activeChild, foo);
			assert.strictEqual(count, 1);
		}
	},
	'children': {
		'merge'() {
			const foo = createPanel({ state: { closeable: true, id: 'foo', label: 'foo' }});
			const bar = createPanel({ state: { closeable: false, id: 'bar', label: 'bar' }});
			const baz = createPanel({ state: { closeable: true, id: 'baz', label: 'baz' }});
			const qat = createPanel({ state: { closeable: false, id: 'qat', label: 'qat' }});
			const tabbed = createTabbedMixin();
			tabbed.merge({ foo, bar, baz, qat });
			assert.deepEqual(arrayFrom(<any> tabbed.children.keys()), [ 'foo', 'bar', 'baz', 'qat' ]);
		}
	},
	'destroy()'() {
		const tabbed = createTabbedMixin();
		return tabbed.destroy();
	}
});
