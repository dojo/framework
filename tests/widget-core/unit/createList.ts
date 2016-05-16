import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createList from 'src/createList';

registerSuite({
	name: 'createList',

	construction() {
		const list = createList();
		const items = [
			{ id: 1, label: 'foo' },
			{ id: 2, label: 'bar' },
			{ id: 3, label: 'baz' },
			{ id: 4, label: 'qat' },
			{ id: 5, label: 'qux' }
		];
		list.setState({ items });
		assert.strictEqual(list.state.items.length, 5);
		items.pop();
		assert.strictEqual(list.state.items.length, 5);
		list.setState({ items });
		assert.strictEqual(list.state.items.length, 4);
	},

	render() {
		const items = [
			{ id: 1, label: 'foo' },
			{ id: 2, label: 'bar' },
			{ id: 3, label: 'baz' },
			{ id: 4, label: 'qat' },
			{ id: 5, label: 'qux' }
		];
		const list = createList({
			state: { items }
		});
		let vnode = list.render();
		assert.strictEqual(vnode.vnodeSelector, 'dojo-list');
		assert.strictEqual(vnode.children.length, 1);
		assert.strictEqual(vnode.children[0].vnodeSelector, 'ul');
		assert.strictEqual(vnode.children[0].children.length, 5);
		assert.strictEqual(vnode.children[0].children[0].vnodeSelector, 'li');
		items.pop();
		list.setState({ items });
		vnode = list.render();
		assert.strictEqual(vnode.children[0].children.length, 4);
	}
});
