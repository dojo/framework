import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createParentMapMixin, { ParentMap } from '../../../src/mixins/createParentMapMixin';
import createRenderMixin from '../../../src/mixins/createRenderMixin';
import { Child } from '../../../src/mixins/interfaces';
import { Map } from 'immutable';
import { from as arrayFrom } from 'dojo-shim/array';

type ParentMapWithInvalidate = ParentMap<Child> & { invalidate?(): void; };

registerSuite({
	name: 'mixins/createParentMapMixin',
	creation() {
		const parent = createParentMapMixin();
		assert.instanceOf(parent.children, Map);
		assert.isFunction(parent.append);
		assert.isFunction(parent.merge);
		assert.isFunction(parent.clear);
	},
	'children at creation'() {
		const widget1 = createRenderMixin();
		const widget2 = createRenderMixin();
		const parent = createParentMapMixin({
			children: {
				widget1,
				widget2
			}
		});
		assert.strictEqual(parent.children.get('widget1'), widget1);
		assert.strictEqual(parent.children.get('widget2'), widget2);
	},
	'append()': {
		'child without ID'() {
			const parent = createParentMapMixin();
			const handle = parent.append(createRenderMixin({ tagName: 'foo' }));
			assert.strictEqual(parent.children.size, 1);
			assert.deepEqual(arrayFrom(<any> parent.children.keys()), [ 'widget1' ]);
			assert.deepEqual(arrayFrom<Child>(<any> parent.children.values()).map(({ tagName }) => tagName), [ 'foo' ]);
			handle.destroy();
			assert.strictEqual(parent.children.size, 0);
		},
		'array without IDs'() {
			const parent = createParentMapMixin();
			const handle = parent.append([
				createRenderMixin({ tagName: 'foo' }),
				createRenderMixin({ tagName: 'bar' }),
				createRenderMixin({ tagName: 'baz' })
			]);
			assert.strictEqual(parent.children.size, 3);
			assert.deepEqual(arrayFrom(<any> parent.children.keys()), [ 'widget2', 'widget3', 'widget4' ]);
			assert.deepEqual(arrayFrom<Child>(<any> parent.children.values()).map(({ tagName }) => tagName), [ 'foo', 'bar', 'baz' ]);
			handle.destroy();
			assert.strictEqual(parent.children.size, 0);
		},
		'child with ID'() {
			const parent = createParentMapMixin();
			const widget1 = createRenderMixin({ state: { id: 'widget1' } });
			const handle = parent.append(widget1);
			assert.strictEqual(parent.children.size, 1);
			assert.deepEqual(arrayFrom(<any> parent.children.keys()), [ 'widget1' ]);
			assert.deepEqual(arrayFrom<Child>(<any> parent.children.values()).map(({ id }) => id), [ 'widget1' ]);
			handle.destroy();
			assert.strictEqual(parent.children.size, 0);
		},
		'array with IDs'() {
			const parent = createParentMapMixin();
			const widget1 = createRenderMixin({ state: { id: 'widget1' } });
			const widget2 = createRenderMixin({ state: { id: 'widget2' } });
			const widget3 = createRenderMixin({ state: { id: 'widget3' } });
			const handle = parent.append([
				widget1,
				widget2,
				widget3
			]);
			assert.strictEqual(parent.children.size, 3);
			assert.deepEqual(arrayFrom(<any> parent.children.keys()), [ 'widget1', 'widget2', 'widget3' ]);
			assert.deepEqual(arrayFrom<Child>(<any> parent.children.values()).map(({ id }) => id), [ 'widget1', 'widget2', 'widget3' ]);
			handle.destroy();
			assert.strictEqual(parent.children.size, 0);
		}
	},
	'merge()'() {
		const parent = createParentMapMixin({
			children: {
				widget1: createRenderMixin({ tagName: 'foo' }),
				widget2: createRenderMixin({ tagName: 'bar' })
			}
		});
		assert.strictEqual(parent.children.size, 2);
		const handle = parent.merge({
			widget1: createRenderMixin({ tagName: 'baz' }),
			widget3: createRenderMixin({ tagName: 'qat' })
		});
		assert.strictEqual(parent.children.size, 3);
		assert.deepEqual(arrayFrom(<any> parent.children.keys()), [ 'widget1', 'widget2', 'widget3' ]);
		assert.deepEqual(arrayFrom<Child>(<any> parent.children.values()).map(({ tagName }) => tagName), [ 'baz', 'bar', 'qat' ]);
		handle.destroy();
		assert.strictEqual(parent.children.size, 1);
	},
	'clear()'() {
		const parent = createParentMapMixin({
			children: {
				widget1: createRenderMixin()
			}
		});
		const handle = parent.merge({
			widget2: createRenderMixin()
		});
		assert.strictEqual(parent.children.size, 2);
		parent.clear();
		assert.strictEqual(parent.children.size, 0);
		handle.destroy();
		return parent.destroy();
	},
	'invalidation'() {
		let called = 0;
		const parent: ParentMapWithInvalidate = createParentMapMixin();
		parent.invalidate = () => called++;
		assert.strictEqual(called, 0);
		parent.merge({
			widget1: createRenderMixin()
		});
		assert.strictEqual(called, 1);
		parent.append(createRenderMixin());
		assert.strictEqual(called, 2);
		parent.clear();
		assert.strictEqual(called, 3);
	}
});
