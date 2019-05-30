const { describe, it, beforeEach, afterEach } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { spy, stub, SinonStub } from 'sinon';

import { WidgetBase } from '../../../src/core/WidgetBase';
import { widgetInstanceMap } from '../../../src/core/vdom';
import { v } from '../../../src/core/vdom';
import { WIDGET_BASE_TYPE } from '../../../src/core/Registry';
import { VNode, WidgetMetaConstructor, MetaBase } from '../../../src/core/interfaces';
import { handleDecorator } from '../../../src/core/decorators/handleDecorator';
import { diffProperty } from '../../../src/core/decorators/diffProperty';
import { Base } from '../../../src/core/meta/Base';
import { NodeEventType } from '../../../src/core/NodeHandler';
import { afterRender } from '../../../src/core/decorators/afterRender';

interface TestProperties {
	foo?: string;
	bar?: boolean;
	baz?: Function;
	qux?: object;
	quux?: any[];
	foobar?: number;
}

class TestMeta extends Base {
	public widgetEvent = false;

	constructor(options: any) {
		super(options);
		this.nodeHandler.on(NodeEventType.Widget, () => {
			this.widgetEvent = true;
		});
	}

	get(key: string | number) {
		return this.getNode(key);
	}
}

class BaseTestWidget extends WidgetBase<TestProperties> {
	public meta<T extends MetaBase>(metaType: WidgetMetaConstructor<T>) {
		return super.meta(metaType) as T;
	}

	public render() {
		return super.render();
	}

	callGetDecorator(decoratorKey: string) {
		return this.getDecorator(decoratorKey);
	}
}

function testDecorator(func?: Function) {
	return handleDecorator((target, propertyKey) => {
		target.addDecorator('test-decorator', func);
	});
}

let consoleStub: SinonStub;

describe('WidgetBase', () => {
	beforeEach(() => {
		consoleStub = stub(console, 'warn');
	});

	afterEach(() => {
		consoleStub.restore();
	});

	it('default render returns a `div` with the current widgets children', () => {
		const widget = new BaseTestWidget();
		widget.__setChildren__(['child']);
		const renderResult = widget.render() as VNode;
		assert.strictEqual(renderResult.tag, 'div');
		assert.deepEqual(renderResult.properties, {});
		assert.lengthOf(renderResult.children!, 1);
		assert.strictEqual(renderResult.children![0], 'child');
	});

	it('instance data invalidate is called on invalidate', () => {
		const child = new BaseTestWidget();
		const invalidateStub = stub();
		const instanceData = widgetInstanceMap.get(child)!;
		instanceData.invalidate = invalidateStub;
		child.invalidate();
		assert.isTrue(invalidateStub.calledOnce);
		child.invalidate();
		assert.isTrue(invalidateStub.calledTwice);
	});

	describe('__render__', () => {
		it('returns render result', () => {
			class TestWidget extends BaseTestWidget {
				render() {
					return v('my-app', ['child']);
				}
			}
			const widget = new TestWidget();
			const renderResult = widget.__render__() as VNode;
			assert.strictEqual(renderResult.tag, 'my-app');
			assert.lengthOf(renderResult.children!, 1);
			assert.strictEqual(renderResult.children![0], 'child');
		});
	});

	describe('__setProperties__', () => {
		it('diffs properties using `auto` strategy by default', () => {
			const widget = new BaseTestWidget();
			const invalidateSpy = spy(widget, 'invalidate');

			function baz() {}
			const qux = {
				foo: 'bar',
				bar: 'foo'
			};
			const quux = [1, 2, 3, 4];

			widget.__setProperties__({
				foo: 'bar',
				bar: true,
				baz,
				qux,
				quux
			});

			assert.isTrue(invalidateSpy.calledOnce);
			assert.deepEqual(widget.changedPropertyKeys, ['foo', 'bar', 'qux', 'quux']);

			widget.__setProperties__({
				foo: 'bar',
				bar: true,
				baz,
				qux,
				quux
			});

			assert.isTrue(invalidateSpy.calledOnce);
			assert.deepEqual(widget.changedPropertyKeys, []);

			widget.__setProperties__({
				foo: 'bar',
				bar: true,
				baz,
				quux
			});

			assert.isTrue(invalidateSpy.calledTwice);
			assert.deepEqual(widget.changedPropertyKeys, ['qux']);
		});

		it('Supports custom diffProperty function', () => {
			function customDiff(previousValue: any = 0, newValue: any) {
				return {
					changed: true,
					value: previousValue + newValue
				};
			}
			@diffProperty('foobar', customDiff)
			class TestWidget extends BaseTestWidget {}
			const widget = new TestWidget();
			const invalidateSpy = spy(widget, 'invalidate');

			widget.__setProperties__({ foobar: 2 });
			assert.isTrue(invalidateSpy.calledOnce);
			assert.deepEqual(widget.changedPropertyKeys, ['foobar']);
			assert.strictEqual(widget.properties.foobar, 2);

			widget.__setProperties__({ foobar: 4 });
			assert.isTrue(invalidateSpy.calledTwice);
			assert.deepEqual(widget.changedPropertyKeys, ['foobar']);
			assert.strictEqual(widget.properties.foobar, 6);

			widget.__setProperties__({});
			assert.isTrue(invalidateSpy.calledThrice);
			assert.deepEqual(widget.changedPropertyKeys, ['foobar']);
			assert.isUndefined(widget.properties.foobar);
		});

		it('Does not bind Widget constructor properties', () => {
			const widgetConstructorSpy: any = function(this: any) {
				this.functionIsBound = true;
			};
			widgetConstructorSpy._type = WIDGET_BASE_TYPE;

			class TestWidget extends WidgetBase<any> {
				functionIsBound = false;

				public callWidgetSpy() {
					this.properties.widgetConstructorSpy();
				}
			}

			const testWidget = new TestWidget();
			const properties = {
				widgetConstructorSpy,
				functionIsBound: false
			};
			testWidget.__setProperties__(properties);
			testWidget.callWidgetSpy();
			assert.isFalse(testWidget.functionIsBound);
			assert.isTrue(testWidget.properties.functionIsBound);
		});

		it('properties are only diffed once', () => {
			let diffCounter = 0;
			function testDiff(previousProperty: any, newProperty: any) {
				diffCounter++;
				return {
					value: newProperty,
					changed: false
				};
			}

			@diffProperty('foo', testDiff)
			@diffProperty('bar', testDiff)
			@diffProperty('baz', testDiff)
			class TestWidget extends WidgetBase<any> {}
			const testWidget = new TestWidget();
			const properties = {
				foo: 'foo',
				bar: 'bar',
				baz: 'baz'
			};
			testWidget.__setProperties__(properties);
			assert.strictEqual(diffCounter, 3);
			testWidget.__setProperties__(properties);
			assert.strictEqual(diffCounter, 6);
		});
	});

	it('__setChildren__', () => {
		const widget = new BaseTestWidget();
		const invalidateSpy = spy(widget, 'invalidate');
		widget.__setChildren__([]);
		assert.isTrue(invalidateSpy.notCalled);
		widget.__setChildren__(['child']);
		assert.isTrue(invalidateSpy.calledOnce);
		widget.__setChildren__(['child']);
		assert.isTrue(invalidateSpy.calledTwice);
		widget.__setChildren__([]);
		assert.isTrue(invalidateSpy.calledThrice);
		widget.__setChildren__([]);
		assert.isTrue(invalidateSpy.calledThrice);
	});

	it('destroys registry when WidgetBase is detached', () => {
		const widget = new BaseTestWidget();
		const registry = widget.registry;
		const instanceData = widgetInstanceMap.get(widget)!;
		instanceData.onDetach();
		assert.throws(() => {
			registry.own({ destroy() {} });
		}, 'Call made to destroyed method');
	});

	describe('meta', () => {
		it('meta providers are cached', () => {
			const widget = new BaseTestWidget();
			const meta = widget.meta(Base);
			assert.strictEqual(meta, widget.meta(Base));
		});

		it('elements are added to node handler on create', () => {
			const element = {} as Element;
			const key = '1';
			const widget = new BaseTestWidget();
			const meta = widget.meta(TestMeta);
			const instanceData = widgetInstanceMap.get(widget)!;
			instanceData.nodeHandler.add(element, key);
			assert.isTrue(meta.has(key));
			assert.strictEqual(meta.get(key), element);
		});

		it('elements are added to node handler on update', () => {
			const element = {} as Element;
			const key = '1';
			const widget = new BaseTestWidget();
			const meta = widget.meta(TestMeta);
			const instanceData = widgetInstanceMap.get(widget)!;
			instanceData.nodeHandler.add(element, key);
			assert.isTrue(meta.has(key));
			assert.strictEqual(meta.get(key), element);
		});

		it('root added to node handler on widget create', () => {
			const widget = new BaseTestWidget();
			const meta = widget.meta(TestMeta);
			const instanceData = widgetInstanceMap.get(widget)!;

			instanceData.nodeHandler.addRoot();
			assert.isTrue(meta.widgetEvent);
		});

		it('root added to node handler on widget update', () => {
			const widget = new BaseTestWidget();
			const meta = widget.meta(TestMeta);
			const instanceData = widgetInstanceMap.get(widget)!;

			instanceData.nodeHandler.addRoot();
			assert.isTrue(meta.widgetEvent);
		});

		it('Meta is destroyed when the widget is detached', () => {
			let metaDestroyed = false;
			class DestroyableMeta extends TestMeta {
				destroy() {
					const result = super.destroy();
					metaDestroyed = true;
					return result;
				}
			}
			const widget = new BaseTestWidget();
			widget.meta(DestroyableMeta);
			const instanceData = widgetInstanceMap.get(widget)!;
			instanceData.onDetach();
			assert.isTrue(metaDestroyed);
		});
	});

	describe('decorators', () => {
		it('returns an empty array for decorators that do not exist', () => {
			@testDecorator()
			class TestWidget extends BaseTestWidget {}
			const widget = new TestWidget();
			const decorators = widget.callGetDecorator('unknown-decorator');
			assert.lengthOf(decorators, 0);
		});

		it('decorators are cached', () => {
			@testDecorator()
			class TestWidget extends BaseTestWidget {}

			const widget = new TestWidget();
			const decorators = widget.callGetDecorator('test-decorator');
			assert.lengthOf(decorators, 1);
			const cachedDecorators = widget.callGetDecorator('test-decorator');
			assert.lengthOf(cachedDecorators, 1);
			assert.strictEqual(cachedDecorators, decorators);
		});

		it('should run meta after renders even when a widget has afterRender decorator', () => {
			let metaAfterRenderCalled = false;
			class MetaWithAfterRender extends TestMeta {
				afterRender() {
					metaAfterRenderCalled = true;
				}
			}

			class TestWidget extends WidgetBase {
				@afterRender()
				protected afterRenders() {}

				protected render() {
					this.meta(MetaWithAfterRender).get('');
					return null;
				}
			}

			const widget = new TestWidget();
			widget.__render__();
			assert.isTrue(metaAfterRenderCalled);
		});

		it('decorators applied to subclasses are not applied to base classes', () => {
			@testDecorator()
			class TestWidget extends BaseTestWidget {}
			@testDecorator()
			@testDecorator()
			class TestWidget2 extends TestWidget {}

			const baseWidget = new TestWidget();
			const widget = new TestWidget2();

			assert.equal(baseWidget.callGetDecorator('test-decorator').length, 1);
			assert.equal(widget.callGetDecorator('test-decorator').length, 3);
		});

		it('decorator cache is populated when addDecorator is called after instantiation', () => {
			class TestWidget extends BaseTestWidget {
				constructor() {
					super();
					this.addDecorator('test-decorator-one', function() {});
					this.addDecorator('test-decorator-two', function() {});
				}
			}

			const testWidget = new TestWidget();

			assert.lengthOf(testWidget.callGetDecorator('test-decorator-one'), 1);
			assert.lengthOf(testWidget.callGetDecorator('test-decorator-two'), 1);
		});

		it('addDecorator accepts an array of decorators', () => {
			class TestWidget extends BaseTestWidget {
				constructor() {
					super();
					this.addDecorator('test-decorator', [() => {}, () => {}]);
				}
			}

			const testWidget = new TestWidget();

			assert.lengthOf(testWidget.callGetDecorator('test-decorator'), 2);
		});
	});
});
