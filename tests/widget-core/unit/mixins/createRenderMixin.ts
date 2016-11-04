import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createRenderMixin from '../../../src/mixins/createRenderMixin';
import { before } from 'dojo-core/aspect';
import { createProjector } from '../../../src/projector';

registerSuite({
	name: 'mixins/createRenderMixin',
	api() {
		const cachedRender = createRenderMixin();
		assert(cachedRender);
		assert.isFunction(cachedRender.getNodeAttributes);
		assert.isFunction(cachedRender.getChildrenNodes);
		assert.isFunction(cachedRender.invalidate);
	},
	'getSelectorAndWidgetClasses': {
		'Applies widget class to selector'() {
			const createWidgetClassesWidget = createRenderMixin.extend({
				classes: [ 'widget-class' ]
			});

			const widget = createWidgetClassesWidget();
			assert.deepEqual(widget.classes, [ 'widget-class' ]);
			const selectorAndWidgetClasses = widget.getSelectorAndWidgetClasses();
			assert.deepEqual(selectorAndWidgetClasses, 'div.widget-class');
		},
		'Applies multiple widget class to selector'() {
			const createWidgetClassesWidget = createRenderMixin
			.extend({
				classes: [ 'widget-class' ]
			})
			.extend({
				classes: [ 'widget-class-2' ]
			});

			const widget = createWidgetClassesWidget();
			assert.deepEqual(widget.classes, [ 'widget-class', 'widget-class-2' ]);
			const selectorAndWidgetClasses = widget.getSelectorAndWidgetClasses();
			assert.deepEqual(selectorAndWidgetClasses, 'div.widget-class.widget-class-2');
		},
		'Returns just the selector when no widget classes exist'() {
			const widget = createRenderMixin();
			assert.deepEqual(widget.classes, []);
			const selectorAndWidgetClasses = widget.getSelectorAndWidgetClasses();
			assert.deepEqual(selectorAndWidgetClasses, 'div');
		}
	},
	'getNodeAttributes()'() {
		const cachedRender = createRenderMixin({
			state: { id: 'foo', classes: [ 'bar' ] }
		});

		let nodeAttributes = cachedRender.getNodeAttributes();
		assert.strictEqual(nodeAttributes['data-widget-id'], 'foo');
		assert.deepEqual(nodeAttributes.classes, { bar: true });
		assert.strictEqual(Object.keys(nodeAttributes).length, 4);

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
		assert.strictEqual(Object.keys(nodeAttributes).length, 5);
	},
	'getChildrenNodes()'() {
		const cachedRender = createRenderMixin();
		assert.deepEqual(cachedRender.getChildrenNodes(), []);
		cachedRender.setState({ label: 'foo' });
		assert.deepEqual(cachedRender.getChildrenNodes(), [ 'foo' ]);
	},
	'render()/invalidate()'() {
		const cachedRender = createRenderMixin({
			state: { id: 'foo', label: 'foo' }
		});
		const result1 = cachedRender.render();
		const result2 = cachedRender.render();
		cachedRender.invalidate();
		cachedRender.invalidate();
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
		assert.strictEqual(result1.properties!['data-widget-id'], 'foo');
		assert.strictEqual(result1.text, 'foo');
	},
	'id': {
		'in state'() {
			const cachedRender = createRenderMixin({
				state: {
					id: 'foo'
				}
			});

			assert.strictEqual(cachedRender.id, 'foo');
		},
		'generated'() {
			let called = false;
			const cachedRender = createRenderMixin();

			cachedRender.on('state:changed', () => {
				assert.strictEqual(cachedRender.id, cachedRender.state.id, 'state should match');
				called = true;
			});

			const id = cachedRender.id;
			assert.isTrue(called, 'state:changed should have been called');

			assert.include(id, createRenderMixin.idBase, 'should include static idBase');
			assert.notStrictEqual(cachedRender.id, createRenderMixin.idBase, 'but shouldn\'t match exactly');
			assert.strictEqual(id, cachedRender.id, 'should return same id');
		},
		'is read only'() {
			const cachedRender = createRenderMixin();
			assert.throws(() => {
				(<any> cachedRender).id = 'foo'; /* .id is readonly, so TypeScript will prevent mutation */
			});
		}
	},
	'invalidate invalidates parent projector'() {
		let count = 0;
		const projector = createProjector({});
		before(projector, 'invalidate', () => {
			count++;
		});
		projector.attach();
		const cachedRender = createRenderMixin();
		cachedRender.parent = projector;
		cachedRender.invalidate();
		assert.strictEqual(count, 0);
		cachedRender.render();
		cachedRender.invalidate();
		assert.strictEqual(count, 1);
	},
	'invalidate invalidates parent widget'() {
		let count = 0;
		const createParent = createRenderMixin.before('invalidate', () => {
			count++;
		});
		const parent = createParent();
		const cachedRender = createRenderMixin();
		cachedRender.parent = <any> parent; /* trick typescript, becuase this isn't a real parent */
		cachedRender.invalidate();
		assert.strictEqual(count, 0);
		cachedRender.render();
		cachedRender.invalidate();
		assert.strictEqual(count, 1);
	}
});
