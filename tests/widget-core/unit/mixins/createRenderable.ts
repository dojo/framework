import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createRenderable, { isRenderable } from 'src/mixins/createRenderable';
import { h } from 'maquette/maquette';
import Promise from 'dojo-core/Promise';

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
	'option.parent'() {
		let count = 0;
		const parent = {
			append(child: any) {
				assert.strictEqual(child.tagName, 'div');
				child.parent = this;
				count++;
				return { destroy() { } };
			},
			clear() { },
			insert() { return { destroy() { } }; },
			own() { return { destroy() { } }; },
			destroy() { return Promise.resolve(true); }
		};
		const renderable = createRenderable({
			render() {
				return h('h1', [ 'Greetings' ]);
			},
			parent
		});
		assert.strictEqual(renderable.parent, parent);
		assert.strictEqual(count, 1);
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
