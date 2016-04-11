import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createRenderable, { isRenderable } from 'src/mixins/createRenderable';
import createContainerMixin from 'src/mixins/createContainerMixin';
import { h } from 'maquette/maquette';
import { createProjector } from 'src/projector';

registerSuite({
	name: 'mixins/createRenderable',
	'set render function'() {
		const renderable = createRenderable();
		assert.isNull(renderable.render);
		renderable.render = () => {
			return h('h1', [ 'Greetings' ]);
		};
		assert(renderable.render());
	},
	'tagname'() {
		const renderable = createRenderable();
		assert.strictEqual(renderable.tagName, 'div');
	},
	'options on construction'() {
		const renderable1 = createRenderable({
			render() {
				return h('h1', [ 'Greetings' ]);
			}
		});
		assert.isFunction(renderable1.render);
		const renderable2 = createRenderable({
			tagName: 'h1'
		});
		assert.strictEqual(renderable2.tagName, 'h1');
	},
	'option.parent': {
		'container'() {
			const parent = createContainerMixin();
			const renderable = createRenderable({
				render() {
					return h('h1', [ 'Greetings' ]);
				},
				parent
			});
			assert.strictEqual(renderable.parent, parent);
		},
		'projector'() {
			const projector = createProjector({});
			const renderable = createRenderable({
				render() {
					return h('h1', [ 'Greetings' ]);
				},
				parent: projector
			});
			assert.strictEqual(renderable.parent, projector);
		}
	},
	'isRenderable'() {
		const renderable = createRenderable({
			render() {
				return h('h1', [ ' Greetings' ]);
			}
		});
		assert.isTrue(isRenderable(renderable));
		assert.isFalse(isRenderable({}));
	}
});
