import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createParentMapMixin, { ParentMap } from '../../../src/mixins/createParentMapMixin';
import createWidgetBase from '../../../src/bases/createWidgetBase';
import { Child } from '../../../src/mixins/interfaces';
import Map from 'dojo-shim/Map';
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
		const widget1 = createWidgetBase();
		const widget2 = createWidgetBase();
		const parent = createParentMapMixin({
			children: new Map<string, Child>([['widget1', widget1], ['widget2', widget2]])
		});
		assert.strictEqual(parent.children.get('widget1'), widget1);
		assert.strictEqual(parent.children.get('widget2'), widget2);
	},
	'append()': {
		'child without ID'() {
			const parent = createParentMapMixin();
			const handle = parent.append(createWidgetBase({ tagName: 'foo' }));
			assert.strictEqual(parent.children.size, 1);
			assert.deepEqual(arrayFrom(<any> parent.children.keys()), [ 'widget-1' ]);
			assert.deepEqual(arrayFrom<Child>(<any> parent.children.values()).map(({ tagName }) => tagName), [ 'foo' ]);
			handle.destroy();
			assert.strictEqual(parent.children.size, 0);
		},
		'array without IDs'() {
			const parent = createParentMapMixin();
			const handle = parent.append([
				createWidgetBase({ tagName: 'foo' }),
				createWidgetBase({ tagName: 'bar' }),
				createWidgetBase({ tagName: 'baz' })
			]);
			assert.strictEqual(parent.children.size, 3);
			assert.deepEqual(arrayFrom(<any> parent.children.keys()), [ 'widget-2', 'widget-3', 'widget-4' ]);
			assert.deepEqual(arrayFrom<Child>(<any> parent.children.values()).map(({ tagName }) => tagName), [ 'foo', 'bar', 'baz' ]);
			handle.destroy();
			assert.strictEqual(parent.children.size, 0);
		},
		'child with ID'() {
			const parent = createParentMapMixin();
			const widget1 = createWidgetBase({ state: { id: 'widget1' } });
			const handle = parent.append(widget1);
			assert.strictEqual(parent.children.size, 1);
			assert.deepEqual(arrayFrom(<any> parent.children.keys()), [ 'widget1' ]);
			assert.deepEqual(arrayFrom<Child>(<any> parent.children.values()).map(({ id }) => id), [ 'widget1' ]);
			handle.destroy();
			assert.strictEqual(parent.children.size, 0);
		},
		'array with IDs'() {
			const parent = createParentMapMixin();
			const widget1 = createWidgetBase({ state: { id: 'widget1' } });
			const widget2 = createWidgetBase({ state: { id: 'widget2' } });
			const widget3 = createWidgetBase({ state: { id: 'widget3' } });
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
			children: new Map<string, Child>([
				['widget1', createWidgetBase({ tagName: 'foo' })],
				['widget2', createWidgetBase({ tagName: 'bar' })]
			])
		});
		assert.strictEqual(parent.children.size, 2);
		const handle = parent.merge(new Map<string, Child> ([
			['widget1', createWidgetBase({ tagName: 'baz' })],
			['widget3', createWidgetBase({ tagName: 'qat' })]
		]));
		assert.strictEqual(parent.children.size, 3);
		assert.deepEqual(arrayFrom(<any> parent.children.keys()), [ 'widget1', 'widget2', 'widget3' ]);
		assert.deepEqual(arrayFrom<Child>(<any> parent.children.values()).map(({ tagName }) => tagName), [ 'baz', 'bar', 'qat' ]);
		handle.destroy();
		assert.strictEqual(parent.children.size, 1);
	},
	'clear()'() {
		const parent = createParentMapMixin({
			children: new Map<string, Child> ([['widget1', createWidgetBase()]])
		});
		const handle = parent.merge(new Map<string, Child> ([['widget2', createWidgetBase()]]));
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
		parent.merge(new Map<string, Child> ([['widget1', createWidgetBase()]]));
		assert.strictEqual(called, 1);
		parent.append(createWidgetBase());
		assert.strictEqual(called, 2);
		parent.clear();
		assert.strictEqual(called, 3);
	}
});
