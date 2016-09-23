import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createRenderableChildrenMixin, { RenderableChildrenMixin } from '../../../src/mixins/createRenderableChildrenMixin';
import createRenderMixin from '../../../src/mixins/createRenderMixin';
import { Child } from '../../../src/mixins/interfaces';
import { List, Map } from 'immutable';
import { VNode } from 'maquette';

type WithListChildren = RenderableChildrenMixin & { children?: List<Child>; };
type WithMapChildren = RenderableChildrenMixin & { children?: Map<string, Child>; };

registerSuite({
	name: 'mixins/createRenderableChildrenMixin',
	creation() {
		const parent = createRenderableChildrenMixin();
		assert.isFunction(parent.getChildrenNodes);
		assert.isUndefined(parent.sort);
	},
	'getChildrenNodes()': {
		'List children'() {
			const parent: WithListChildren = createRenderableChildrenMixin();
			parent.children = List([
				createRenderMixin({ tagName: 'foo' }),
				createRenderMixin({ tagName: 'bar' }),
				createRenderMixin({ tagName: 'baz' })
			]);
			const vnodes = parent.getChildrenNodes();
			assert.strictEqual(vnodes.length, 3);
			assert.strictEqual((<VNode> vnodes[0]).vnodeSelector, 'foo');
			assert.strictEqual((<VNode> vnodes[1]).vnodeSelector, 'bar');
			assert.strictEqual((<VNode> vnodes[2]).vnodeSelector, 'baz');
		},
		'Map children'() {
			const parent: WithMapChildren = createRenderableChildrenMixin();
			parent.children = Map<string, Child>([
				[ 'foo', createRenderMixin({ tagName: 'foo' }) ],
				[ 'bar', createRenderMixin({ tagName: 'bar' }) ],
				[ 'baz', createRenderMixin({ tagName: 'baz' }) ]
			]);
			const vnodes = parent.getChildrenNodes();
			assert.strictEqual(vnodes.length, 3);
			assert.strictEqual((<VNode> vnodes[0]).vnodeSelector, 'foo');
			assert.strictEqual((<VNode> vnodes[1]).vnodeSelector, 'bar');
			assert.strictEqual((<VNode> vnodes[2]).vnodeSelector, 'baz');
		},
		'Children Unassigned'() {
			const parent: WithListChildren = createRenderableChildrenMixin();
			const vnodes = parent.getChildrenNodes();
			assert.strictEqual(vnodes.length, 0);
		}
	},
	sort: {
		'with list children'() {
			const parent: WithListChildren = createRenderableChildrenMixin();
			parent.children = List([
				createRenderMixin({ tagName: 'foo' }),
				createRenderMixin({ tagName: 'bar' })
			]);
			parent.sort = function (valueA: [ number, Child ], valueB: [ number, Child ]): number {
				const [ , childA ] = valueA;
				const [ , childB ] = valueB;
				return childA.tagName < childB.tagName ? -1 : 1;
			};
			const vnodes = parent.getChildrenNodes();
			assert.strictEqual((<VNode> vnodes[0]).vnodeSelector, 'bar');
			assert.strictEqual((<VNode> vnodes[1]).vnodeSelector, 'foo');
		},
		'with map children'() {
			const parent: WithMapChildren = createRenderableChildrenMixin();
			parent.children = Map<string, Child>()
				.set('foo', createRenderMixin({ tagName: 'foo' }))
				.set('bar', createRenderMixin({ tagName: 'bar' }));
			parent.sort = function (valueA: [ string, Child ], valueB: [ string, Child ]): number {
				const [ keyA ] = valueA;
				const [ keyB ] = valueB;
				assert.isString(keyA);
				assert.isString(keyB);
				return keyA < keyB ? -1 : 1;
			};
			const vnodes = parent.getChildrenNodes();
			assert.strictEqual((<VNode> vnodes[0]).vnodeSelector, 'bar');
			assert.strictEqual((<VNode> vnodes[1]).vnodeSelector, 'foo');
		},
		'provided on creation'() {
			const parent: WithMapChildren = createRenderableChildrenMixin({
				sort(valueA: [ string, Child ], valueB: [ string, Child ]): number {
					const [ keyA ] = valueA;
					const [ keyB ] = valueB;
					return keyA < keyB ? -1 : 1;
				}
			});
			parent.children = Map<string, Child>()
				.set('foo', createRenderMixin({ tagName: 'foo' }))
				.set('bar', createRenderMixin({ tagName: 'bar' }));
			const vnodes = parent.getChildrenNodes();
			assert.strictEqual((<VNode> vnodes[0]).vnodeSelector, 'bar');
			assert.strictEqual((<VNode> vnodes[1]).vnodeSelector, 'foo');
		},
		'No Children, does not get called'() {
			const parent: WithListChildren = createRenderableChildrenMixin();
			parent.sort = function () {
				throw new Error('should not be called');
			};
			const vnodes = parent.getChildrenNodes();
			assert.strictEqual(vnodes.length, 0);
		}
	}
});
