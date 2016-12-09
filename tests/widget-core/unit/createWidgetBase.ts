import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import Promise from 'dojo-shim/Promise';
import createWidgetBase from '../../src/createWidgetBase';
import { DNode, HNode, WidgetState, WidgetOptions } from './../../src/interfaces';
import { VNode } from 'dojo-interfaces/vdom';
import { v, w, registry } from '../../src/d';
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
	children() {
		let childrenEventEmitted = false;
		const expectedChild = v('div');
		const widget = createWidgetBase();
		widget.on('widget:children', () => {
			childrenEventEmitted = true;
		});

		assert.lengthOf(widget.children, 0);
		widget.children = [ expectedChild ];
		assert.lengthOf(widget.children, 1);
		assert.strictEqual(widget.children[0], expectedChild);
		assert.isTrue(childrenEventEmitted);
	},
	tagName: {
		'Applies default tagName'() {
			const widget = createWidgetBase();
			assert.deepEqual(widget.tagName, 'div');
			const renderedWidget = <VNode> widget.render();
			assert.deepEqual(renderedWidget.vnodeSelector, 'div');
		},
		'Applies overridden tagName'() {
			const widget = createWidgetBase.override({ tagName: 'header' })();
			assert.deepEqual(widget.tagName, 'header');
			const renderedWidget = <VNode> widget.render();
			assert.deepEqual(renderedWidget.vnodeSelector, 'header');
		}
		},
		'Applies classes to tagName'() {
			const widget = createWidgetBase.override({ tagName: 'header', classes: [ 'class-one', 'classTwo' ] })();
			const renderedWidget = <VNode> widget.render();
			assert.deepEqual(renderedWidget.vnodeSelector, 'header.class-one.classTwo');
	},
	'getNodeAttributes()'() {
		let clickCalled = false;
		const expectedClickFunction = () => {
			clickCalled = true;
		};

		const widgetBase = createWidgetBase({
			state: { id: 'foo', classes: [ 'bar' ] },
			listeners: {
				click: expectedClickFunction
			}
		});

		let nodeAttributes = widgetBase.getNodeAttributes();

		assert.strictEqual(nodeAttributes['data-widget-id'], 'foo');
		assert.deepEqual(nodeAttributes.classes, { bar: true });
		assert.strictEqual(Object.keys(nodeAttributes).length, 5);
		assert.isFunction(nodeAttributes.onclick);
		nodeAttributes.onclick!();
		assert.isTrue(clickCalled);

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
				.mixin({
					mixin: {
						getChildrenNodes: function(): DNode[] {
							return [ v('div') ];
						}
					}
				})();

			const childrenNodes = widgetBase.getChildrenNodes();

			assert.lengthOf(childrenNodes, 1);
			assert.isOk((<HNode> childrenNodes[0]).children);
			assert.lengthOf((<HNode> childrenNodes[0]).children, 0);
		}
	},
	render: {
		'render with non widget children'() {
			const widgetBase = createWidgetBase
				.mixin({
					mixin: {
						getChildrenNodes: function(): DNode[] {
							return [ v('header') ];
						}
					}
				})();

			const result = <VNode> widgetBase.render();
			assert.lengthOf(result.children, 1);
			assert.strictEqual(result.children && result.children[0].vnodeSelector, 'header');
		},
		'async factorys only initialise once'() {
			let resolveFunction: any;
			const loadFunction = () => {
				return new Promise((resolve) => {
					resolveFunction = resolve;
				});
			};
			registry.define('my-header', loadFunction);

			const createMyWidget = createWidgetBase
				.mixin({
					mixin: {
						getChildrenNodes: function(): DNode[] {
							return [ w('my-header', {}) ];
						}
					}
				});

			const createHeader = createWidgetBase
				.override({
					tagName: 'header'
				});

			let invalidateCount = 0;

			const myWidget = createMyWidget();
			myWidget.on('invalidated', () => {
				invalidateCount++;
			});

			let result = <VNode> myWidget.render();
			assert.lengthOf(result.children, 0);

			myWidget.invalidate();
			myWidget.render();
			myWidget.invalidate();
			myWidget.render();

			resolveFunction(createHeader);

			const promise = new Promise((resolve) => setTimeout(resolve, 100));
			return promise.then(() => {
				assert.equal(invalidateCount, 3);
				result = <VNode> myWidget.render();
				assert.lengthOf(result.children, 1);
				assert.strictEqual(result.children![0].vnodeSelector, 'header');
			});
		},
		'render with async factory'() {
			let resolveFunction: any;
			const loadFunction = () => {
				return new Promise((resolve) => {
					resolveFunction = resolve;
				});
			};
			registry.define('my-header1', loadFunction);

			const createMyWidget = createWidgetBase
				.mixin({
					mixin: {
						getChildrenNodes: function(): DNode[] {
							return [ w('my-header1', {}) ];
						}
					}
				});

			const createHeader = createWidgetBase
				.override({
					tagName: 'header'
				});

			const myWidget = createMyWidget();

			let result = <VNode> myWidget.render();
			assert.lengthOf(result.children, 0);

			resolveFunction(createHeader);
			return new Promise((resolve) => {
				myWidget.on('invalidated', () => {
					result = <VNode> myWidget.render();
					assert.lengthOf(result.children, 1);
					assert.strictEqual(result.children![0].vnodeSelector, 'header');
					resolve();
				});
			});
		},
		'render using scoped factory registry'() {
			const createHeader = createWidgetBase
				.override({
					tagName: 'header'
			});
			const createMyWidget = createWidgetBase.mixin({
				mixin: {
					getChildrenNodes: function(this: any) {
						return [ w('my-header', {}) ];
					}
				},
				initialize(instance) {
					instance.registry.define('my-header', createHeader);
				}
			});

			const myWidget = createMyWidget();

			let result = <VNode> myWidget.render();
			assert.lengthOf(result.children, 1);
			assert.strictEqual(result.children![0].vnodeSelector, 'header');
		},
		'render with nested children'() {
			const widgetBase = createWidgetBase
				.mixin({
					mixin: {
						getChildrenNodes: function(): DNode[] {
							return [
								v('header', [
									v('section')
								])
							];
						}
					}
				})();

			const result = <VNode> widgetBase.render();
			assert.lengthOf(result.children, 1);
			assert.strictEqual(result.children![0].vnodeSelector, 'header');
			assert.strictEqual(result.children![0].children![0].vnodeSelector, 'section');
		},
		'render with a text node children'() {
			const widgetBase = createWidgetBase
				.mixin({
					mixin: {
						getChildrenNodes: function(): DNode[] {
							return [ 'I am a text node' ];
						}
					}
				})();

			const result = <VNode> widgetBase.render();
			assert.isUndefined(result.children);
			assert.equal(result.text, 'I am a text node');
		},
		'render with multiple text node children'() {
			const widgetBase = createWidgetBase
				.mixin({
					mixin: {
						getChildrenNodes: function(): DNode[] {
							return [ 'I am a text node', 'Second text node' ];
						}
					}
				})();

			const result = <VNode> widgetBase.render();
			assert.isUndefined(result.text);
			assert.lengthOf(result.children, 2);
			assert.strictEqual(result.children![0].text, 'I am a text node');
			assert.strictEqual(result.children![1].text, 'Second text node');
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
				.mixin({
					mixin: {
						getChildrenNodes: function(this: any): (DNode | null)[] {
							const state = this.state.classes ? { classes: this.state.classes } : {};
							return [
								this.state.hide ? null : w(testChildWidget, <WidgetOptions<WidgetState>> { tagName: 'footer', state })
							];
						}
					}
				})();

			const firstRenderResult = <VNode> widgetBase.render();
			assert.strictEqual(countWidgetCreated, 1);
			assert.strictEqual(countWidgetDestroyed, 0);
			assert.lengthOf(firstRenderResult.children, 1);
			const firstRenderChild: any = firstRenderResult.children && firstRenderResult.children[0];
			assert.strictEqual(firstRenderChild.vnodeSelector, 'footer');

			widgetBase.invalidate();

			const secondRenderResult = <VNode> widgetBase.render();
			assert.strictEqual(countWidgetCreated, 1);
			assert.strictEqual(countWidgetDestroyed, 0);
			assert.lengthOf(secondRenderResult.children, 1);
			const secondRenderChild: any = secondRenderResult.children && secondRenderResult.children[0];
			assert.strictEqual(secondRenderChild.vnodeSelector, 'footer');

			widgetBase.setState({ 'classes': ['test-class'] });
			widgetBase.invalidate();
			const thirdRenderResult = <VNode> widgetBase.render();
			assert.strictEqual(countWidgetCreated, 1);
			assert.strictEqual(countWidgetDestroyed, 0);
			assert.lengthOf(thirdRenderResult.children, 1);
			const thirdRenderChild: any = thirdRenderResult.children && thirdRenderResult.children[0];
			assert.strictEqual(thirdRenderChild.vnodeSelector, 'footer');
			assert.isTrue(thirdRenderChild.properties.classes['test-class']);

			widgetBase.setState({ hide: true });
			widgetBase.invalidate();

			const forthRenderResult = <VNode> widgetBase.render();
			assert.strictEqual(countWidgetCreated, 1);
			assert.strictEqual(countWidgetDestroyed, 1);
			assert.lengthOf(forthRenderResult.children, 0);

			widgetBase.setState({ hide: false });
			widgetBase.invalidate();

			const lastRenderResult = <VNode> widgetBase.render();
			assert.strictEqual(countWidgetCreated, 2);
			assert.strictEqual(countWidgetDestroyed, 1);
			assert.lengthOf(lastRenderResult.children, 1);
			const lastRenderChild: any = lastRenderResult.children && lastRenderResult.children[0];
			assert.strictEqual(lastRenderChild.vnodeSelector, 'footer');
		},
		'render with multiple children of the same type without an id'() {
			const widgetBase = createWidgetBase
				.mixin({
					mixin: {
						getChildrenNodes: function(this: any): (DNode | null)[] {
							return [
								w(createWidgetBase, {}),
								w(createWidgetBase, {})
							];
						}
					}
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
			const result1 = <VNode> widgetBase.render();
			const result2 = <VNode> widgetBase.render();
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
	'invalidate emits invalidated event'() {
		const widgetBase = createWidgetBase();
		let count = 0;
		widgetBase.on('invalidated', function() {
			console.log('invalid');
			count++;
		});
		widgetBase.render();
		widgetBase.invalidate();
		assert.strictEqual(count, 1);
	}
});
