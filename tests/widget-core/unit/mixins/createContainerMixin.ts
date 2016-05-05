import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createContainerMixin from 'src/mixins/createContainerMixin';
import createDestroyable from 'dojo-compose/mixins/createDestroyable';
import { ComposeFactory } from 'dojo-compose/compose';
import { Child } from 'src/mixins/createParentMixin';
import createRenderable from 'src/mixins/createRenderable';
import { VNode } from 'maquette/maquette';

const createRenderableChild = createDestroyable
	.mixin(createRenderable) as ComposeFactory<Child, any>;

registerSuite({
	name: 'mixins/createContainerMixin',
	api() {
		const container = createContainerMixin();
		assert.isFunction(container.getChildrenNodes);
		assert.isFunction(container.append);
		assert.isFunction(container.insert);
		assert.strictEqual(container.children.size, 0);
	},
	'children at startup'() {
		const container = createContainerMixin({
			children: [
				createRenderableChild({ tagName: 'foo' }),
				createRenderableChild({ tagName: 'bar' })
			]
		});
		assert.strictEqual(container.children.size, 2);
		assert.strictEqual(container.children.get(0).tagName, 'foo');
		assert.strictEqual(container.children.get(0).parent, container);
		assert.strictEqual(container.children.get(1).tagName, 'bar');
		assert.strictEqual(container.children.get(1).parent, container);
	},
	'append()': {
		'single child'() {
			const container = createContainerMixin();
			const foo = createRenderableChild({ tagName: 'foo' });
			const bar = createRenderableChild({ tagName: 'bar' });
			container.append(foo);
			const handle = container.append(bar);
			assert.strictEqual(container.children.size, 2);
			assert.strictEqual(container.children.get(0).tagName, 'foo');
			assert.strictEqual(container.children.get(0).parent, container);
			assert.strictEqual(container.children.get(1).tagName, 'bar');
			assert.strictEqual(container.children.get(1).parent, container);

			return foo.destroy().then(() => {
				assert.strictEqual(container.children.size, 1);
				assert.strictEqual(container.children.get(0).tagName, 'bar');
				assert.isUndefined(foo.parent);

				handle.destroy();
				assert.strictEqual(container.children.size, 0);
				assert.isUndefined(foo.parent);

				handle.destroy();
			});
		},
		'array'() {
			const container = createContainerMixin();
			const foo = createRenderableChild({ tagName: 'foo' });
			const bar = createRenderableChild({ tagName: 'bar' });
			const baz = createRenderableChild({ tagName: 'baz' });
			const children = [ foo, bar, baz ];
			const handle = container.append(children);
			assert.strictEqual(container.children.size, 3);
			assert.strictEqual(container.children.get(0).tagName, 'foo');
			assert.strictEqual(container.children.get(0).parent, container);
			assert.strictEqual(container.children.get(1).tagName, 'bar');
			assert.strictEqual(container.children.get(1).parent, container);
			assert.strictEqual(container.children.get(2).tagName, 'baz');
			assert.strictEqual(container.children.get(2).parent, container);

			return bar.destroy().then(() => {
				assert.strictEqual(container.children.size, 2);
				assert.strictEqual(container.children.get(1).tagName, 'baz');
				assert.isUndefined(bar.parent);

				handle.destroy();
				assert.strictEqual(container.children.size, 0);
				assert.isUndefined(foo.parent);
				assert.isUndefined(baz.parent);

				handle.destroy();
			});
		}
	},
	'insert()'() {
		const container = createContainerMixin();
		container.insert(createRenderableChild({ tagName: 'foo' }), 'first');
		container.insert(createRenderableChild({ tagName: 'bar' }), 'first');
		assert.strictEqual(container.children.get(0).tagName, 'bar');
		assert.strictEqual(container.children.get(0).parent, container);
		assert.strictEqual(container.children.get(1).tagName, 'foo');
		assert.strictEqual(container.children.get(1).parent, container);
	},
	'destroy()'() {
		const foo = createRenderableChild({ tagName: 'foo' });
		const bar = createRenderableChild({ tagName: 'bar' });
		const baz = createRenderableChild({ tagName: 'baz' });
		const qat = createRenderableChild({ tagName: 'qat' });
		const childContainer = createContainerMixin({
			children: [ foo ]
		});
		const container = createContainerMixin({
			children: [ childContainer, bar ]
		});
		childContainer.append(baz);
		container.append(qat);

		assert.strictEqual(childContainer.parent, container);
		assert.strictEqual(childContainer.children.size, 2);
		assert.strictEqual(container.children.size, 3);

		return childContainer.destroy().then(() => {
			assert.strictEqual(container.children.size, 2);
			assert.isUndefined(foo.parent);
			assert.isUndefined(baz.parent);
			assert.isUndefined(childContainer.parent);
			assert.strictEqual(bar.parent, container);
			assert.strictEqual(qat.parent, container);
			return container.destroy().then(() => {
				assert.strictEqual(container.children.size, 0);
				assert.isUndefined(bar.parent);
				assert.isUndefined(qat.parent);
				return container.destroy();
			});
		});
	},
	'getChildrenNodes()'() {
		const createMockWidget = createRenderableChild
			.extend({
				render() {
					return this.tagName;
				}
			});

		const container = createContainerMixin({
			children: [
				createMockWidget({ tagName: 'foo' }),
				createContainerMixin({
					children: [
						createMockWidget({ tagName: 'bar'})
					]
				})
			]
		});

		const childrenNodes = container.getChildrenNodes();
		assert.strictEqual(childrenNodes[0], 'foo');
		assert.isObject(childrenNodes[1]);
		assert.strictEqual((<VNode> childrenNodes[1]).vnodeSelector, 'div');
		assert.strictEqual((<VNode> childrenNodes[1]).text, 'bar');
		assert.isUndefined((<VNode> childrenNodes[1]).children);
	}
});
