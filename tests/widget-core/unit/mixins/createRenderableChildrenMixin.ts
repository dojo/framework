import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { HNode } from 'dojo-interfaces/widgetBases';
import createRenderableChildrenMixin, { RenderableChildrenMixin } from '../../../src/mixins/createRenderableChildrenMixin';
import createWidgetBase from '../../../src/bases/createWidgetBase';
import { Child } from '../../../src/mixins/interfaces';
import { List, Map } from 'immutable';

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
				createWidgetBase({ tagName: 'foo' }),
				createWidgetBase({ tagName: 'bar' }),
				createWidgetBase({ tagName: 'baz' })
			]);
			const dnodes = parent.getChildrenNodes();
			assert.strictEqual(dnodes.length, 3);
			assert.strictEqual((<HNode> dnodes[0]).render().vnodeSelector, 'foo');
			assert.strictEqual((<HNode> dnodes[1]).render().vnodeSelector, 'bar');
			assert.strictEqual((<HNode> dnodes[2]).render().vnodeSelector, 'baz');
		},
		'Map children'() {
			const parent: WithMapChildren = createRenderableChildrenMixin();
			parent.children = Map<string, Child>([
				[ 'foo', createWidgetBase({ tagName: 'foo' }) ],
				[ 'bar', createWidgetBase({ tagName: 'bar' }) ],
				[ 'baz', createWidgetBase({ tagName: 'baz' }) ]
			]);
			const dnodes = parent.getChildrenNodes();
			assert.strictEqual(dnodes.length, 3);
			assert.strictEqual((<HNode> dnodes[0]).render().vnodeSelector, 'foo');
			assert.strictEqual((<HNode> dnodes[1]).render().vnodeSelector, 'bar');
			assert.strictEqual((<HNode> dnodes[2]).render().vnodeSelector, 'baz');
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
				createWidgetBase({ tagName: 'foo' }),
				createWidgetBase({ tagName: 'bar' })
			]);
			parent.sort = function (valueA: [ number, Child ], valueB: [ number, Child ]): number {
				const [ , childA ] = valueA;
				const [ , childB ] = valueB;
				return childA.tagName < childB.tagName ? -1 : 1;
			};
			const dnodes = parent.getChildrenNodes();
			assert.strictEqual((<HNode> dnodes[0]).render().vnodeSelector, 'bar');
			assert.strictEqual((<HNode> dnodes[1]).render().vnodeSelector, 'foo');
		},
		'with map children'() {
			const parent: WithMapChildren = createRenderableChildrenMixin();
			parent.children = Map<string, Child>()
				.set('foo', createWidgetBase({ tagName: 'foo' }))
				.set('bar', createWidgetBase({ tagName: 'bar' }));
			parent.sort = function (valueA: [ string, Child ], valueB: [ string, Child ]): number {
				const [ keyA ] = valueA;
				const [ keyB ] = valueB;
				assert.isString(keyA);
				assert.isString(keyB);
				return keyA < keyB ? -1 : 1;
			};
			const dnodes = parent.getChildrenNodes();
			assert.strictEqual((<HNode> dnodes[0]).render().vnodeSelector, 'bar');
			assert.strictEqual((<HNode> dnodes[1]).render().vnodeSelector, 'foo');
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
				.set('foo', createWidgetBase({ tagName: 'foo' }))
				.set('bar', createWidgetBase({ tagName: 'bar' }));
			const dnodes = parent.getChildrenNodes();
			assert.strictEqual((<HNode> dnodes[0]).render().vnodeSelector, 'bar');
			assert.strictEqual((<HNode> dnodes[1]).render().vnodeSelector, 'foo');
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
