import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import Promise from '@dojo/shim/Promise';
import { DNode } from '../../src/interfaces';
import { WidgetBase, diffProperty, afterRender, onPropertiesChanged } from '../../src/WidgetBase';
import { VNode } from '@dojo/interfaces/vdom';
import { v, w, registry } from '../../src/d';
import { stub, spy } from 'sinon';
import FactoryRegistry from './../../src/FactoryRegistry';

registerSuite({
	name: 'WidgetBase',
	api() {
		const widgetBase = new WidgetBase();
		assert(widgetBase);
		assert.isFunction(widgetBase.render);
		assert.isFunction(widgetBase.invalidate);
	},
	children() {
		let childrenEventEmitted = false;
		const expectedChild = v('div');
		const widget = new WidgetBase();
		widget.on('widget:children', () => {
			childrenEventEmitted = true;
		});

		assert.lengthOf(widget.children, 0);
		widget.setChildren([expectedChild]);
		assert.lengthOf(widget.children, 1);
		assert.strictEqual(widget.children[0], expectedChild);
		assert.isTrue(childrenEventEmitted);
	},
	'Applies div as default tag'() {
			const widget = new WidgetBase();
			const renderedWidget = <VNode> (<any> widget).__render__();
			assert.deepEqual(renderedWidget.vnodeSelector, 'div');
	},
	diffProperties: {
		'no updated properties'() {
			const properties = { id: 'id', foo: 'bar' };
			const widgetBase = new WidgetBase();
			const result = widgetBase.diffProperties({ id: 'id', foo: 'bar' }, properties);
			assert.lengthOf(result.changedKeys, 0);
		},
		'updated properties'() {
			const widgetBase = new WidgetBase();
			const properties = { id: 'id', foo: 'baz' };
			const result = widgetBase.diffProperties({ id: 'id', foo: 'bar' }, properties);
			assert.lengthOf(result.changedKeys, 1);
		},
		'new properties'() {
			const widgetBase = new WidgetBase();
			const properties = { id: 'id', foo: 'bar', bar: 'baz' };
			const result = widgetBase.diffProperties({ id: 'id', foo: 'bar' }, properties);
			assert.lengthOf(result.changedKeys, 1);
		},
		'updated / new properties with falsy values'() {
			const widgetBase = new WidgetBase();
			const properties = { id: 'id', foo: '', bar: null, baz: 0, qux: false };
			const result = widgetBase.diffProperties({ id: 'id', foo: 'bar' }, properties);
			assert.lengthOf(result.changedKeys, 4);
			assert.deepEqual(result.changedKeys, [ 'foo', 'bar', 'baz', 'qux']);
		}
	},
	diffProperty: {
		decorator() {
			let callCount = 0;

			class TestWidget extends WidgetBase<any> {

				@diffProperty('foo')
				diffPropertyFoo(this: any, previousProperty: any, newProperty: any): any {
					callCount++;
					assert.equal(newProperty, 'bar');
					return {
						changed: false,
						value: newProperty
					};
				}
			}

			const testWidget = new TestWidget();
			testWidget.setProperties({ foo: 'bar' });

			assert.equal(callCount, 1);
		},
		'non decorator'() {
			let callCount = 0;

			class TestWidget extends WidgetBase<any> {

				constructor() {
					super();
					this.addDecorator('diffProperty', { propertyName: 'foo', diffFunction: this.diffPropertyFoo });
				}

				diffPropertyFoo(this: any, previousProperty: any, newProperty: any): any {
					callCount++;
					assert.equal(newProperty, 'bar');
					return {
						changed: false,
						value: newProperty
					};
				}
			}

			const testWidget = new TestWidget();
			testWidget.setProperties({ foo: 'bar' });

			assert.equal(callCount, 1);
		}
	},
	setProperties: {
		'result from diff property override diff and assign'() {
			class TestWidget extends WidgetBase<any> {

				@diffProperty('foo')
				diffPropertyFoo(this: any, previousProperty: any, newProperty: any): any {
					return {
						changed: true,
						value: newProperty
					};
				}

				@diffProperty('baz')
				diffPropertyBaz(this: any, previousProperty: any, newProperty: any): any {
					return {
						changed: false,
						value: newProperty
					};
				}
			}

			const widget = new TestWidget();
			widget.setProperties({ foo: 'bar', baz: 'qux' });

			widget.on('properties:changed', (event: any) => {
				assert.include(event.changedPropertyKeys, 'foo');
				assert.notInclude(event.changedPropertyKeys, 'baz');
			});

			widget.setProperties({ foo: 'bar', baz: 'bar' });
		},
		'uses base diff when an individual property diff returns null'() {
			class TestWidget extends WidgetBase<any> {

				@diffProperty('foo')
				diffPropertyFoo(this: any, previousProperty: any, newProperty: any): any {
					return null;
				}
			}

			const widget: any = new TestWidget();
			widget.setProperties({ foo: 'bar' });

			widget.on('properties:changed', (event: any) => {
				assert.include(event.changedPropertyKeys, 'foo');
			});

			widget.setProperties({ foo: 'baz' });
		},
		'widgets function properties are bound to the parent by default'() {
			class TestChildWidget extends WidgetBase<any> {
				render() {
					this.properties.foo();
					return v('div');
				}
			}

			class TestWidget extends WidgetBase<any> {
				count: number;
				constructor() {
					super();
					this.count = 0;
				}

				foo() {
					this.count++;
				}

				render(): DNode {
					return w(TestChildWidget, { foo: this.foo, bar: Math.random() });
				}
			}

			const testWidget: any = new TestWidget();
			testWidget.__render__();
			assert.strictEqual(testWidget.count, 1);
			testWidget.invalidate();
			testWidget.__render__();
			assert.strictEqual(testWidget.count, 2);
		},
		'widget function properties can be bound to a custom scope'() {
			class TestChildWidget extends WidgetBase<any> {
				render() {
					this.properties.foo();
					return v('div');
				}
			}

			const foo = {
				count: 0,
				foo(this: any) {
					this.count += 1;
				}
			};

			class TestWidget extends WidgetBase<any> {
				count: number;
				constructor() {
					super();
					this.count = 0;
				}

				foo() {
					this.count++;
				}

				render(): DNode {
					return w(TestChildWidget, {
						foo: foo.foo,
						bar: Math.random(),
						bind: foo
					});
				}
			}

			const testWidget: any = new TestWidget();
			testWidget.__render__();
			assert.strictEqual(foo.count, 1);
			testWidget.invalidate();
			testWidget.__render__();
			assert.strictEqual(foo.count, 2);
		},
		'widget function properties can have different bound scopes'() {
			class TestChildWidget extends WidgetBase<any> {
				render() {
					this.properties.foo();
					return v('div');
				}
			}

			const foo = {
				count: 0,
				foo(this: any) {
					this.count += 1;
				}
			};

			class TestWidget extends WidgetBase<any> {
				count: number;

				foo(this: any) {
					this.count++;
				}

				constructor() {
					super();
					this.count = 0;
				}

				render(): DNode {
					const bind = this.count ? foo : this;
					return w(TestChildWidget, {
						foo: this.foo,
						bar: Math.random(),
						bind
					});
				}
			}

			const testWidget: any = new TestWidget();
			testWidget.__render__();
			assert.strictEqual(foo.count, 0);
			assert.strictEqual(testWidget.count, 1);
			testWidget.invalidate();
			testWidget.__render__();
			assert.strictEqual(foo.count, 1);
			assert.strictEqual(testWidget.count, 1);
		},
		'widget function properties do not get re-bound when nested'() {
			class TestChildWidget extends WidgetBase<any> {
				render() {
					this.properties.foo();
					return v('div');
				}
			}

			class TestNestedWidget extends WidgetBase<any> {
				render(): DNode {
					const { foo, bar } = this.properties;

					return w(TestChildWidget, { foo, bar });
				}
			}

			class TestWidget extends WidgetBase<any> {
				count: number;

				foo(this: any) {
					this.count++;
				}

				constructor() {
					super();
					this.count = 0;
				}

				render(): DNode {
					return w(TestNestedWidget, { foo: this.foo, bar: Math.random() });
				}
			}

			const testWidget: any = new TestWidget();
			testWidget.__render__();
			assert.strictEqual(testWidget.count, 1);
			testWidget.invalidate();
			testWidget.__render__();
			assert.strictEqual(testWidget.count, 2);
		},
		'widget function properties can be un-bound'() {
			class TestChildWidget extends WidgetBase<any> {
				render() {
					this.properties.foo();
					return v('div');
				}
			}

			class TestWidget extends WidgetBase<any> {
				count: number;

				foo(this: any) {
					this.count++;
				}

				constructor() {
					super();
					this.count = 0;
				}

				render(): DNode {
					return w(TestChildWidget, {
						foo: this.foo,
						bar: Math.random(),
						bind: undefined
					});
				}
			}

			const testWidget: any = new TestWidget();
			try {
				testWidget.__render__();
			} catch (e) {
				assert.strictEqual(testWidget.count, 0);
			}
		}
	},
	afterRender: {
		decorator() {
			let afterRenderCount = 1;
			class TestWidget extends WidgetBase<any> {
				@afterRender
				firstAfterRender(result: DNode): DNode {
					assert.strictEqual(afterRenderCount++, 1);
					return result;
				}
				@afterRender
				secondAfterRender(result: DNode): DNode {
					assert.strictEqual(afterRenderCount++, 2);
					return result;
				}
			}

			class ExtendedTestWidget extends TestWidget {
				@afterRender
				thirdAfterRender(result: DNode): DNode {
					assert.strictEqual(afterRenderCount, 3);
					return result;
				}
			}

			const widget = new ExtendedTestWidget();
			widget.__render__();
			assert.strictEqual(afterRenderCount, 3);
		},
		'non decorator'() {
			let afterRenderCount = 1;
			class TestWidget extends WidgetBase<any> {

				constructor() {
					super();
					this.addDecorator('afterRender', this.firstAfterRender);
					this.addDecorator('afterRender', [ this.secondAfterRender ]);
				}

				firstAfterRender(result: DNode): DNode {
					assert.strictEqual(afterRenderCount++, 1);
					return result;
				}

				secondAfterRender(result: DNode): DNode {
					assert.strictEqual(afterRenderCount++, 2);
					return result;
				}
			}

			class ExtendedTestWidget extends TestWidget {

				constructor() {
					super();
					this.addDecorator('afterRender', this.thirdAfterRender);
				}

				thirdAfterRender(result: DNode): DNode {
					assert.strictEqual(afterRenderCount, 3);
					return result;
				}
			}

			const widget = new ExtendedTestWidget();
			widget.__render__();
			assert.strictEqual(afterRenderCount, 3);
		}
	},
	'properties:changed event': {
		decorator() {
			let onPropertiesChangedCount = 1;
			class TestWidget extends WidgetBase<any> {
				@onPropertiesChanged
				firstOnPropertiesChanged() {
					assert.strictEqual(onPropertiesChangedCount++, 1);
				}
				@onPropertiesChanged
				secondOnPropertiesChanged() {
					assert.strictEqual(onPropertiesChangedCount++, 2);
				}
			}

			class ExtendedTestWidget extends TestWidget {
				@onPropertiesChanged
				thirdOnPropertiesChanged() {
					assert.strictEqual(onPropertiesChangedCount, 3);
				}
			}

			const widget = new ExtendedTestWidget();
			widget.emit({ type: 'properties:changed' });
			assert.strictEqual(onPropertiesChangedCount, 3);
		},
		'non decorator'() {

			let onPropertiesChangedCount = 1;
			class TestWidget extends WidgetBase<any> {
				constructor() {
					super();
					this.addDecorator('onPropertiesChanged', this.firstOnPropertiesChanged);
					this.addDecorator('onPropertiesChanged', this.secondOnPropertiesChanged);
				}
				firstOnPropertiesChanged() {
					assert.strictEqual(onPropertiesChangedCount++, 1);
				}
				secondOnPropertiesChanged() {
					assert.strictEqual(onPropertiesChangedCount++, 2);
				}
			}

			class ExtendedTestWidget extends TestWidget {
				constructor() {
					super();
					this.addDecorator('onPropertiesChanged', this.thirdOnPropertiesChanged);
				}
				thirdOnPropertiesChanged() {
					assert.strictEqual(onPropertiesChangedCount, 3);
				}
			}

			const widget = new ExtendedTestWidget();
			widget.emit({ type: 'properties:changed' });
			assert.strictEqual(onPropertiesChangedCount, 3);
		}
	},
	render: {
		'render with non widget children'() {
			class TestWidget extends WidgetBase<any> {
				render() {
					return v('div', [
						v('header')
					]);
				}
			}

			const widget: any = new TestWidget();
			const result = <VNode> widget.__render__();
			assert.lengthOf(result.children, 1);
			assert.strictEqual(result.children && result.children[0].vnodeSelector, 'header');
		},
		'async factories only initialise once'() {
			let resolveFunction: any;
			const loadFunction = () => {
				return new Promise((resolve) => {
					resolveFunction = resolve;
				});
			};
			registry.define('my-header', loadFunction);

			class TestWidget extends WidgetBase<any> {
				render() {
					return v('div', [
						w('my-header', <any> undefined)
					]);
				}
			}

			class TestHeaderWidget extends WidgetBase<any> {
				render() {
					return v('header');
				}
			}

			let invalidateCount = 0;

			const myWidget: any = new TestWidget();
			myWidget.on('invalidated', () => {
				invalidateCount++;
			});

			let result = <VNode> myWidget.__render__();
			assert.lengthOf(result.children, 0);

			myWidget.invalidate();
			myWidget.__render__();
			myWidget.invalidate();
			myWidget.__render__();

			resolveFunction(TestHeaderWidget);

			const promise = new Promise((resolve) => setTimeout(resolve, 100));
			return promise.then(() => {
				assert.equal(invalidateCount, 3);
				result = <VNode> myWidget.__render__();
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

			class TestWidget extends WidgetBase<any> {
				render() {
					return v('div', [
						w('my-header1', <any> undefined)
					]);
				}
			}

			class TestHeaderWidget extends WidgetBase<any> {
				render() {
					return v('header');
				}
			}

			const myWidget: any = new TestWidget();

			let result = <VNode> myWidget.__render__();
			assert.lengthOf(result.children, 0);

			resolveFunction(TestHeaderWidget);
			return new Promise((resolve) => {
				myWidget.on('invalidated', () => {
					result = <VNode> myWidget.__render__();
					assert.lengthOf(result.children, 1);
					assert.strictEqual(result.children![0].vnodeSelector, 'header');
					resolve();
				});
			});
		},
		'warn for unknown factory registry'() {
			const factory = 'unknown-entry';
			class TestWidget extends WidgetBase<any> {
				render() {
					return v('div', [
						w(factory, {})
					]);
				}
			}

			const myWidget: any = new TestWidget();
			const consoleStub = stub(console, 'warn');
			let result = <VNode> myWidget.__render__();
			assert.lengthOf(result.children, 0);
			assert.isTrue(consoleStub.calledOnce);
			assert.isTrue(consoleStub.calledWith(`Unable to render unknown widget factory ${factory}`));
			consoleStub.restore();
		},
		'render using scoped factory registry'() {
			class TestHeaderWidget extends WidgetBase<any> {
				render() {
					return v('header');
				}
			}

			const registry = new FactoryRegistry();
			registry.define('my-header', TestHeaderWidget);

			class TestWidget extends WidgetBase<any> {
				constructor() {
					super();
					this.registry = registry;
				}

				render() {
					return v('div', [
						w('my-header', <any> undefined)
					]);
				}
			}

			const myWidget: any = new TestWidget();

			let result = <VNode> myWidget.__render__();
			assert.lengthOf(result.children, 1);
			assert.strictEqual(result.children![0].vnodeSelector, 'header');
		},
		'render with nested children'() {
			class TestWidget extends WidgetBase<any> {
				render() {
					return v('div', [
						v('header', [
							v('section')
						])
					]);
				}
			}

			const widget: any = new TestWidget();
			const result = <VNode> widget.__render__();
			assert.lengthOf(result.children, 1);
			assert.strictEqual(result.children![0].vnodeSelector, 'header');
			assert.strictEqual(result.children![0].children![0].vnodeSelector, 'section');
		},
		'render with a text node children'() {
			class TestWidget extends WidgetBase<any> {
				render() {
					return v('div', [ 'I am a text node' ]);
				}
			}

			const widget: any = new TestWidget();
			const result = <VNode> widget.__render__();
			assert.isUndefined(result.children);
			assert.equal(result.text, 'I am a text node');
		},
		'instance gets passed to VNodeProperties as bind to widget and all children'() {
			class TestWidget extends WidgetBase<any> {
				render() {
					return v('div', [
						v('header', [
							v('section')
						])
					]);
				}
			}

			const widget: any = new TestWidget();
			const result = <VNode> widget.__render__();
			assert.lengthOf(result.children, 1);
			assert.strictEqual(result.properties!.bind, widget);
			assert.strictEqual(result.children![0].properties!.bind, widget);
			assert.strictEqual(result.children![0].children![0].properties!.bind, widget);
		},
		'bind does not get overriden when specifically configured for the element'() {
			const customThis = {};
			class TestWidget extends WidgetBase<any> {
				render() {
					return v('div', [
						v('header', { bind: customThis }, [
							v('section')
						])
					]);
				}
			}

			const widget: any = new TestWidget();
			const result = <VNode> widget.__render__();
			assert.lengthOf(result.children, 1);
			assert.strictEqual(result.properties!.bind, widget);
			assert.strictEqual(result.children![0].properties!.bind, customThis);
			assert.strictEqual(result.children![0].children![0].properties!.bind, widget);
		},
		'render with multiple text node children'() {
			class TestWidget extends WidgetBase<any> {
				render() {
					return v('div', [ 'I am a text node', 'Second text node' ]);
				}
			}

			const widget: any = new TestWidget();
			const result = <VNode> widget.__render__();
			assert.isUndefined(result.text);
			assert.lengthOf(result.children, 2);
			assert.strictEqual(result.children![0].text, 'I am a text node');
			assert.strictEqual(result.children![1].text, 'Second text node');
		},
		'render with widget children'() {
			let countWidgetCreated = 0;
			let countWidgetDestroyed = 0;

			class TestChildWidget extends WidgetBase<any> {
				constructor() {
					super();
					countWidgetCreated++;
				}

				render() {
					return v('footer', this.children);
				}

				destroy() {
					countWidgetDestroyed++;
					return super.destroy();
				}
			}

			class TestWidget extends WidgetBase<any> {
				render() {
					const properties = this.properties.classes ? { classes: this.properties.classes } : {};

					return v('div', [
						this.properties.hide ? null : w(TestChildWidget, properties),
						this.properties.hide ? null : w(TestChildWidget, properties),
						this.properties.hide ? null : w(TestChildWidget, properties),
						this.properties.hide ? null : w(TestChildWidget, properties)
					]);
				}
			}

			const widget: any = new TestWidget();
			const firstRenderResult = <VNode> widget.__render__();
			assert.strictEqual(countWidgetCreated, 4);
			assert.strictEqual(countWidgetDestroyed, 0);
			assert.lengthOf(firstRenderResult.children, 4);
			const firstRenderChild: any = firstRenderResult.children && firstRenderResult.children[0];
			assert.strictEqual(firstRenderChild.vnodeSelector, 'footer');

			widget.invalidate();

			const secondRenderResult = <VNode> widget.__render__();
			assert.strictEqual(countWidgetCreated, 4);
			assert.strictEqual(countWidgetDestroyed, 0);
			assert.lengthOf(secondRenderResult.children, 4);
			const secondRenderChild: any = secondRenderResult.children && secondRenderResult.children[0];
			assert.strictEqual(secondRenderChild.vnodeSelector, 'footer');

			widget.setProperties(<any> { hide: true });
			widget.invalidate();

			const thirdRenderResult = <VNode> widget.__render__();
			assert.strictEqual(countWidgetCreated, 4);
			assert.strictEqual(countWidgetDestroyed, 4);
			assert.lengthOf(thirdRenderResult.children, 0);

			widget.setProperties(<any> { hide: false });
			widget.invalidate();

			const lastRenderResult = <VNode> widget.__render__();
			assert.strictEqual(countWidgetCreated, 8);
			assert.strictEqual(countWidgetDestroyed, 4);
			assert.lengthOf(lastRenderResult.children, 4);
			const lastRenderChild: any = lastRenderResult.children && lastRenderResult.children[0];
			assert.strictEqual(lastRenderChild.vnodeSelector, 'footer');
		},
		'render with multiple children of the same type without an id'() {
			const warnMsg = 'It is recommended to provide a unique `key` property when using the same widget factory multiple times';
			class TestWidgetOne extends WidgetBase<any> {}
			class TestWidgetTwo extends WidgetBase<any> {}

			class TestWidget extends WidgetBase<any> {
				render() {
					return v('div', [
						w(TestWidgetOne, {}),
						w(TestWidgetTwo, {}),
						w(TestWidgetTwo, {})
					]);
				}
			}

			const widget: any = new TestWidget();
			const consoleStub = stub(console, 'warn');
			widget.__render__();
			assert.isTrue(consoleStub.calledOnce);
			assert.isTrue(consoleStub.calledWith(warnMsg));
			widget.invalidate();
			widget.__render__();
			assert.isTrue(consoleStub.calledThrice);
			assert.isTrue(consoleStub.calledWith(warnMsg));
			consoleStub.restore();
		},
		'__render__ with updated array properties'() {
			const properties = {
				items: [
					'a', 'b'
				]
			};

			const myWidget = new WidgetBase<any>();
			myWidget.setProperties(properties);
			assert.deepEqual((<any> myWidget.properties).items, [ 'a', 'b' ]);
			properties.items.push('c');
			myWidget.setProperties(properties);
			assert.deepEqual((<any> myWidget.properties).items , [ 'a', 'b', 'c' ]);
			properties.items.push('d');
			myWidget.setProperties(properties);
			assert.deepEqual((<any> myWidget.properties).items , [ 'a', 'b', 'c', 'd' ]);
		},
		'__render__ with internally updated array state'() {
			const properties = {
				items: [
					'a', 'b'
				]
			};

			const myWidget: any = new WidgetBase();
			myWidget.setProperties(properties);
			myWidget.__render__();
			assert.deepEqual((<any> myWidget.properties).items, [ 'a', 'b' ]);
			myWidget.setProperties(<any> { items: [ 'a', 'b', 'c'] });
			myWidget.__render__();
			assert.deepEqual((<any> myWidget.properties).items , [ 'a', 'b', 'c' ]);
		},
		'__render__() and invalidate()'() {
			const widgetBase: any = new WidgetBase();
			widgetBase.setProperties({ id: 'foo', label: 'foo' });
			const result1 = <VNode> widgetBase.__render__();
			const result2 = <VNode> widgetBase.__render__();
			widgetBase.invalidate();
			const result3 = widgetBase.__render__();
			const result4 = widgetBase.__render__();
			assert.strictEqual(result1, result2);
			assert.strictEqual(result3, result4);
			assert.notStrictEqual(result1, result3);
			assert.notStrictEqual(result2, result4);
			assert.deepEqual(result1, result3);
			assert.deepEqual(result2, result4);
			assert.strictEqual(result1.vnodeSelector, 'div');
		},
		'render multiple child widgets using the same factory'() {
			let childWidgetInstantiatedCount = 0;

			class TestChildWidget extends WidgetBase<any> {
				constructor() {
					super();
					childWidgetInstantiatedCount++;
				}
			}

			class TestWidget extends WidgetBase<any> {
				render() {
					return v('div', [
						w(TestChildWidget, {}),
						v('div', {}, [
							'text',
							w(TestChildWidget, {}, [
								w(TestChildWidget, {})
							]),
							v('div', {}, [
								w(TestChildWidget, {})
							])
						]),
						w(TestChildWidget, {})
					]);
				}
			}

			const testWidget: any = new TestWidget();
			testWidget.__render__();

			assert.equal(childWidgetInstantiatedCount, 5);
		},
		'support updating factories for children with an `key`'() {
			let renderWidgetOne = true;
			let widgetOneInstantiated = false;
			let widgetTwoInstantiated = false;

			class WidgetOne extends WidgetBase<any> {
				constructor() {
					super();
					widgetOneInstantiated = true;
				}
			}
			class WidgetTwo extends WidgetBase<any> {
				constructor() {
					super();
					widgetTwoInstantiated = true;
				}
			}
			class TestWidget extends WidgetBase<any> {
				render() {
					return v('div', [
						renderWidgetOne ? w(WidgetOne, { key: '1' }) : w(WidgetTwo, { key: '1' })
					]);
				}
			}

			const myWidget: any = new TestWidget();
			myWidget.__render__();
			assert.isTrue(widgetOneInstantiated);
			renderWidgetOne = false;
			myWidget.invalidate();
			myWidget.__render__();
			assert.isTrue(widgetTwoInstantiated);
		}
	},
	'invalidate emits invalidated event'() {
		const widgetBase = new WidgetBase();
		let count = 0;
		widgetBase.on('invalidated', function() {
			console.log('invalid');
			count++;
		});
		(<any> widgetBase).__render__();
		widgetBase.invalidate();
		assert.strictEqual(count, 1);
	},
	'child invalidation invalidates parent'() {
		let childInvalidate = () => {};
		let childInvalidateCalled = false;
		let parentInvalidateCalled = false;

		class TestChildWidget extends WidgetBase<any> {
			constructor() {
				super();
				childInvalidate = () => {
					childInvalidateCalled = true;
					this.invalidate();
				};
			}
		}

		class Widget extends WidgetBase<any> {
			render(): any {
				return v('div', [
					w(TestChildWidget, {})
				]);
			}
			invalidate() {
				super.invalidate();
				parentInvalidateCalled = true;
			}
		}

		const widget = new Widget();

		(<any> widget).__render__();
		childInvalidate();
		assert.isTrue(childInvalidateCalled);
		assert.isTrue(parentInvalidateCalled);
	},
	'setting children should mark the enclosing widget as dirty'() {
		let foo = 0;
		class FooWidget extends WidgetBase<any> {
			render() {
				foo = this.properties.foo;
				return v('div', []);
			}
		}

		class ContainerWidget extends WidgetBase<any> {
			render() {
				return v('div', {}, this.children);
			}
		}

		class TestWidget extends WidgetBase<any> {
			private foo = 0;

			render() {
				this.foo++;
				return w(ContainerWidget, {}, [
					w(FooWidget, { foo: this.foo })
				]);
			}
		}

		const widget: any = new TestWidget();
		widget.__render__();
		assert.equal(foo, 1);
		widget.invalidate();
		widget.__render__();
		assert.equal(foo, 2);
	},
	'properties:changed should mark as dirty but not invalidate'() {
		let foo = 0;

		class FooWidget extends WidgetBase<any> {
			render() {
				foo = this.properties.foo;
				return v('div', []);
			}
		}

		class TestWidget extends WidgetBase<any> {
			private foo = 0;

			render() {
				this.foo++;
				return w(FooWidget, { foo: this.foo });
			}
		}

		const widget: any = new TestWidget();
		const invalidateSpy = spy(widget, 'invalidate');
		widget.__render__();
		assert.equal(foo, 1);
		widget.invalidate();
		widget.__render__();
		assert.equal(foo, 2);
		assert.equal(invalidateSpy.callCount, 1);
	}
});
