import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createParentMapMixin, { ParentMap } from 'src/mixins/createParentMapMixin';
import createRenderable, { Renderable } from 'src/mixins/createRenderable';
import { Child } from 'src/mixins/interfaces';
import { Map } from 'immutable/immutable';
import { from as arrayFrom } from 'dojo-core/array';

type RenderableWithID = Renderable & { id?: string; };
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
		const widget1 = createRenderable();
		const widget2 = createRenderable();
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
			const handle = parent.append(createRenderable({ tagName: 'foo' }));
			assert.strictEqual(parent.children.size, 1);
			assert.deepEqual(arrayFrom(<any> parent.children.keys()), [ 'child0' ]);
			assert.deepEqual(arrayFrom<Child>(<any> parent.children.values()).map(({ tagName }) => tagName), [ 'foo' ]);
			handle.destroy();
			assert.strictEqual(parent.children.size, 0);
		},
		'array without IDs'() {
			const parent = createParentMapMixin();
			const handle = parent.append([
				createRenderable({ tagName: 'foo' }),
				createRenderable({ tagName: 'bar' }),
				createRenderable({ tagName: 'baz' })
			]);
			assert.strictEqual(parent.children.size, 3);
			assert.deepEqual(arrayFrom(<any> parent.children.keys()), [ 'child0', 'child1', 'child2' ]);
			assert.deepEqual(arrayFrom<Child>(<any> parent.children.values()).map(({ tagName }) => tagName), [ 'foo', 'bar', 'baz' ]);
			handle.destroy();
			assert.strictEqual(parent.children.size, 0);
		},
		'child with ID'() {
			const parent = createParentMapMixin();
			const widget1: RenderableWithID = createRenderable();
			widget1.id = 'widget1';
			const handle = parent.append(widget1);
			assert.strictEqual(parent.children.size, 1);
			assert.deepEqual(arrayFrom(<any> parent.children.keys()), [ 'widget1' ]);
			assert.deepEqual(arrayFrom<Child>(<any> parent.children.values()).map(({ id }) => id), [ 'widget1' ]);
			handle.destroy();
			assert.strictEqual(parent.children.size, 0);
		},
		'array with IDs'() {
			const parent = createParentMapMixin();
			const widget1: RenderableWithID = createRenderable();
			widget1.id = 'widget1';
			const widget2: RenderableWithID = createRenderable();
			widget2.id = 'widget2';
			const widget3: RenderableWithID = createRenderable();
			widget3.id = 'widget3';
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
				widget1: createRenderable({ tagName: 'foo' }),
				widget2: createRenderable({ tagName: 'bar' })
			}
		});
		assert.strictEqual(parent.children.size, 2);
		const handle = parent.merge({
			widget1: createRenderable({ tagName: 'baz' }),
			widget3: createRenderable({ tagName: 'qat' })
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
				widget1: createRenderable()
			}
		});
		const handle = parent.merge({
			widget2: createRenderable()
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
			widget1: createRenderable()
		});
		assert.strictEqual(called, 1);
		parent.append(createRenderable());
		assert.strictEqual(called, 2);
		parent.clear();
		assert.strictEqual(called, 3);
	}
});
