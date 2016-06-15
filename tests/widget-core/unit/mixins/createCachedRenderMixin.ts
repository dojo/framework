import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createCachedRenderMixin from 'src/mixins/createCachedRenderMixin';
import { before } from 'dojo-core/aspect';
import { createProjector } from 'src/projector';

registerSuite({
	name: 'mixins/createCachedRenderMixin',
	api() {
		const cachedRender = createCachedRenderMixin();
		assert(cachedRender);
		assert.isFunction(cachedRender.getNodeAttributes);
		assert.isFunction(cachedRender.getChildrenNodes);
		assert.isFunction(cachedRender.invalidate);
	},
	'getNodeAttributes()'() {
		let count = 0;
		const click = function click() {
			count++;
		};
		const cachedRender = createCachedRenderMixin({
			listeners: { click },
			state: { id: 'foo', classes: [ 'bar' ] }
		});

		let nodeAttributes = cachedRender.getNodeAttributes();
		assert.strictEqual(nodeAttributes['data-widget-id'], 'foo');
		assert.isFunction(nodeAttributes.onclick);
		nodeAttributes.onclick();
		assert.strictEqual(count, 1);
		assert.deepEqual(nodeAttributes.classes, { bar: true });
		assert.strictEqual(Object.keys(nodeAttributes).length, 5);

		cachedRender.setState({ 'id': 'foo', classes: ['foo'] });

		nodeAttributes = cachedRender.getNodeAttributes();

		assert.deepEqual(nodeAttributes.classes, { foo: true, bar: false });

		nodeAttributes = cachedRender.getNodeAttributes({
			name: 'foo',
			'data-widget-id': 'bar',
			classes: { bar: false }
		});

		assert.strictEqual(nodeAttributes.name, 'foo');
		assert.strictEqual(nodeAttributes['data-widget-id'], 'bar');
		assert.deepEqual(nodeAttributes.classes, { bar: false });
		assert.strictEqual(Object.keys(nodeAttributes).length, 6);
	},
	'getChildrenNodes()'() {
		const cachedRender = createCachedRenderMixin();
		assert.isUndefined(cachedRender.getChildrenNodes());
		cachedRender.setState({ label: 'foo' });
		assert.deepEqual(cachedRender.getChildrenNodes(), [ 'foo' ]);
	},
	'render()/invalidate()'() {
		const cachedRender = createCachedRenderMixin({
			state: { id: 'foo', label: 'foo' }
		});
		cachedRender.invalidate();
		cachedRender.invalidate();
		const result1 = cachedRender.render();
		const result2 = cachedRender.render();
		cachedRender.setState({});
		const result3 = cachedRender.render();
		const result4 = cachedRender.render();
		assert.strictEqual(result1, result2);
		assert.strictEqual(result3, result4);
		assert.notStrictEqual(result1, result3);
		assert.notStrictEqual(result2, result4);
		assert.deepEqual(result1, result3);
		assert.deepEqual(result2, result4);
		assert.strictEqual(result1.vnodeSelector, 'div');
		assert.strictEqual(result1.properties['data-widget-id'], 'foo');
		assert.strictEqual(result1.text, 'foo');
	},
	'invalidate invalidates parent projector'() {
		let count = 0;
		const projector = createProjector({});
		before(projector, 'invalidate', () => {
			count++;
		});
		projector.attach();
		const cachedRender = createCachedRenderMixin();
		cachedRender.parent = projector;
		cachedRender.invalidate();
		assert.strictEqual(count, 0);
		cachedRender.render();
		cachedRender.invalidate();
		assert.strictEqual(count, 1);
	},
	'invalidate invalidates parent widget'() {
		let count = 0;
		const createParent = createCachedRenderMixin.before('invalidate', () => {
			count++;
		});
		const parent = createParent();
		const cachedRender = createCachedRenderMixin();
		cachedRender.parent = <any> parent; /* trick typescript, becuase this isn't a real parent */
		cachedRender.invalidate();
		assert.strictEqual(count, 0);
		cachedRender.render();
		cachedRender.invalidate();
		assert.strictEqual(count, 1);
	}
});
