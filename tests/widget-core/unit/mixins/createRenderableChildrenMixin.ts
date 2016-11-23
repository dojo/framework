import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { HNode } from 'dojo-interfaces/widgetBases';
import createRenderableChildrenMixin, { RenderableChildrenMixin } from '../../../src/mixins/createRenderableChildrenMixin';
import createWidgetBase from '../../../src/bases/createWidgetBase';
import { Child } from '../../../src/mixins/interfaces';
import Map from 'dojo-shim/Map';

type WithListChildren = RenderableChildrenMixin & { children?: Child[]; };
type WithMapChildren = RenderableChildrenMixin & { children?: Map<string, Child>; };

registerSuite({
	name: 'mixins/createRenderableChildrenMixin',
	creation() {
		const parent = createRenderableChildrenMixin();
		assert.isFunction(parent.getChildrenNodes);
	},
	'getChildrenNodes()': {
		'List children'() {
			const parent: WithListChildren = createRenderableChildrenMixin();
			parent.children = [
				createWidgetBase({ tagName: 'foo' }),
				createWidgetBase({ tagName: 'bar' }),
				createWidgetBase({ tagName: 'baz' })
			];
			const dnodes = parent.getChildrenNodes();
			assert.strictEqual(dnodes.length, 3);
			assert.strictEqual((<HNode> dnodes[0]).render().vnodeSelector, 'foo');
			assert.strictEqual((<HNode> dnodes[1]).render().vnodeSelector, 'bar');
			assert.strictEqual((<HNode> dnodes[2]).render().vnodeSelector, 'baz');
		},
		'Map children'() {
			const parent: WithMapChildren = createRenderableChildrenMixin();
			parent.children = new Map<string, Child>([
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
	}
});
