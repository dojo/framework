import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createWidgetBase from '../../../src/bases/createWidgetBase';
import { before } from 'dojo-core/aspect';
import { DNode, HNode } from 'dojo-interfaces/widgetBases';
import { createProjector } from '../../../src/projector';
import d from '../../../src/util/d';
import { stub } from 'sinon';

registerSuite({
	name: 'bases/createWidgetBase',
	api() {
		const widgetBase = createWidgetBase();
		assert(widgetBase);
		assert.isFunction(widgetBase.getNodeAttributes);
		assert.isFunction(widgetBase.getChildrenNodes);
		assert.isFunction(widgetBase.invalidate);
	},
	tagName: {
		'Applies default tagName'() {
			const widget = createWidgetBase();
			assert.deepEqual(widget.tagName, 'div');
		},
		'Applies overridden tagName'() {
			const widget = createWidgetBase.extend({ tagName: 'header' })();
			assert.deepEqual(widget.tagName, 'header');
		}
	},
	'getNodeAttributes()'() {
		const widgetBase = createWidgetBase({
			state: { id: 'foo', classes: [ 'bar' ] }
		});

		let nodeAttributes = widgetBase.getNodeAttributes();
		assert.strictEqual(nodeAttributes['data-widget-id'], 'foo');
		assert.deepEqual(nodeAttributes.classes, { bar: true });
		assert.strictEqual(Object.keys(nodeAttributes).length, 4);

		widgetBase.setState({ 'id': 'foo', classes: ['foo'] });

		nodeAttributes = widgetBase.getNodeAttributes();

		assert.deepEqual(nodeAttributes.classes, { foo: true, bar: false });
	},
	getChildrenNodes: {
		'getChildrenNodes with no ChildNodeRenderers'() {
			const widgetBase = createWidgetBase();
			assert.deepEqual(widgetBase.getChildrenNodes(), []);
		},
		'getChildrenNodes with a ChildNodeRenderer'() {
			const widgetBase = createWidgetBase
				.extend({
					childNodeRenderers: [
						function(): DNode[] {
							return [ d('div') ];
						}
					]
				})();

			const childrenNodes = widgetBase.getChildrenNodes();

			assert.lengthOf(childrenNodes, 1);
			assert.isOk((<HNode> childrenNodes[0]).children);
			assert.lengthOf((<HNode> childrenNodes[0]).children, 0);
		},
		'getChildrenNodes with multiple ChildNodeRenderers'() {
			const widgetBase = createWidgetBase
				.extend({
					childNodeRenderers: [
						function(): DNode[] {
							return [ d('div') ];
						}
					]
				})
				.extend({
					childNodeRenderers: [
						function(): DNode[] {
							return [ d('div', {}, [ d('div') ]) ];
						}
					]
				})();

			const childrenNodes = widgetBase.getChildrenNodes();

			assert.lengthOf(childrenNodes, 2);
			assert.isOk((<HNode> childrenNodes[0]).children);
			assert.lengthOf((<HNode> childrenNodes[0]).children, 0);
			assert.isOk((<HNode> childrenNodes[1]).children);
			assert.lengthOf((<HNode> childrenNodes[1]).children, 1);
		}
	},
	render: {
		'render with non widget children'() {
			const widgetBase = createWidgetBase
				.extend({
					childNodeRenderers: [
						function(): DNode[] {
							return [ d('header') ];
						}
					]
				})();

			const result = widgetBase.render();
			assert.lengthOf(result.children, 1);
			assert.strictEqual(result.children && result.children[0].vnodeSelector, 'header');
		},
		'render with widget children'() {
			let countWidgetCreated = 0;
			let countWidgetDestroyed = 0;
			const testChildWidget = createWidgetBase.mixin({
				aspectAdvice: {
					before: {
						destroy() {
							countWidgetDestroyed++;
						}
					}
				},
				initialize() {
					countWidgetCreated++;
				}
			});

			const widgetBase = createWidgetBase
				.extend({
					childNodeRenderers: [
						function(this: any): (DNode | null)[] {
							const state = this.state.classes ? { classes: this.state.classes } : {};
							return [
								this.state.hide ? null : d(testChildWidget, { tagName: 'footer', state })
							];
						}
					]
				})();

			const firstRenderResult = widgetBase.render();
			assert.strictEqual(countWidgetCreated, 1);
			assert.strictEqual(countWidgetDestroyed, 0);
			assert.lengthOf(firstRenderResult.children, 1);
			const firstRenderChild: any = firstRenderResult.children && firstRenderResult.children[0];
			assert.strictEqual(firstRenderChild.vnodeSelector, 'footer');

			widgetBase.invalidate();

			const secondRenderResult = widgetBase.render();
			assert.strictEqual(countWidgetCreated, 1);
			assert.strictEqual(countWidgetDestroyed, 0);
			assert.lengthOf(secondRenderResult.children, 1);
			const secondRenderChild: any = secondRenderResult.children && secondRenderResult.children[0];
			assert.strictEqual(secondRenderChild.vnodeSelector, 'footer');

			widgetBase.setState({ 'classes': ['test-class'] });
			widgetBase.invalidate();
			const thirdRenderResult = widgetBase.render();
			assert.strictEqual(countWidgetCreated, 1);
			assert.strictEqual(countWidgetDestroyed, 0);
			assert.lengthOf(thirdRenderResult.children, 1);
			const thirdRenderChild: any = thirdRenderResult.children && thirdRenderResult.children[0];
			assert.strictEqual(thirdRenderChild.vnodeSelector, 'footer');
			assert.isTrue(thirdRenderChild.properties.classes['test-class']);

			widgetBase.setState({ hide: true });
			widgetBase.invalidate();

			const forthRenderResult = widgetBase.render();
			assert.strictEqual(countWidgetCreated, 1);
			assert.strictEqual(countWidgetDestroyed, 1);
			assert.lengthOf(forthRenderResult.children, 0);

			widgetBase.setState({ hide: false });
			widgetBase.invalidate();

			const lastRenderResult = widgetBase.render();
			assert.strictEqual(countWidgetCreated, 2);
			assert.strictEqual(countWidgetDestroyed, 1);
			assert.lengthOf(lastRenderResult.children, 1);
			const lastRenderChild: any = lastRenderResult.children && lastRenderResult.children[0];
			assert.strictEqual(lastRenderChild.vnodeSelector, 'footer');
		},
		'render with multiple children of the same type without an id'() {
			const widgetBase = createWidgetBase
				.extend({
					childNodeRenderers: [
						function(this: any): (DNode | null)[] {
							return [
								d(createWidgetBase, {}),
								d(createWidgetBase, {})
							];
						}
					]
				})();

			const consoleStub = stub(console, 'error');
			widgetBase.render();
			assert.isTrue(consoleStub.calledWith('must provide unique keys when using the same widget factory multiple times'));
			consoleStub.restore();
		},
		'render() and invalidate()'() {
			const widgetBase = createWidgetBase({
				state: { id: 'foo', label: 'foo' }
			});
			const result1 = widgetBase.render();
			const result2 = widgetBase.render();
			widgetBase.invalidate();
			widgetBase.invalidate();
			widgetBase.setState({});
			const result3 = widgetBase.render();
			const result4 = widgetBase.render();
			assert.strictEqual(result1, result2);
			assert.strictEqual(result3, result4);
			assert.notStrictEqual(result1, result3);
			assert.notStrictEqual(result2, result4);
			assert.deepEqual(result1, result3);
			assert.deepEqual(result2, result4);
			assert.strictEqual(result1.vnodeSelector, 'div');
			assert.strictEqual(result1.properties!['data-widget-id'], 'foo');
		}
	},
	'id': {
		'in options'() {
			const widgetBase = createWidgetBase({
				id: 'foo'
			});

			assert.strictEqual(widgetBase.id, 'foo');
		},
		'in state'() {
			const widgetBase = createWidgetBase({
				state: {
					id: 'foo'
				}
			});

			assert.strictEqual(widgetBase.id, 'foo');
		},
		'in options and state'() {
			const widgetBase = createWidgetBase({
				id: 'foo',
				state: {
					id: 'bar'
				}
			});

			assert.strictEqual(widgetBase.id, 'foo');
		},
		'not in options or state'() {
			const widgetBase = createWidgetBase();

			assert.strictEqual(widgetBase.id, 'widget-1');
		},
		'is read only'() {
			const widgetBase = createWidgetBase();
			assert.throws(() => {
				(<any> widgetBase).id = 'foo'; /* .id is readonly, so TypeScript will prevent mutation */
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
		const widgetBase = createWidgetBase();
		projector.append(widgetBase);
		widgetBase.invalidate();
		assert.strictEqual(count, 2);
		widgetBase.render();
		widgetBase.invalidate();
		assert.strictEqual(count, 3);
	},
	'invalidate emits invalidate event'() {
		const widgetBase = createWidgetBase();
		let count = 0;
		widgetBase.on('invalidate', function() {
			console.log('invalid');
			count++;
		});
		widgetBase.render();
		widgetBase.invalidate();
		assert.strictEqual(count, 1);
	}
});
