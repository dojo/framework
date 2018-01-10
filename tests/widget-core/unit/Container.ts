const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import { v, w } from '../../src/d';
import { WidgetBase } from '../../src/WidgetBase';
import { Container } from './../../src/Container';
import { Registry } from './../../src/Registry';
import { Injector } from './../../src/Injector';
import { ProjectorMixin } from './../../src/mixins/Projector';

interface TestWidgetProperties {
	foo: string;
	boo: number;
}

class TestWidget extends WidgetBase<TestWidgetProperties> {
	render() {
		assertRender(this.properties);
		return v('test', this.properties);
	}
}

let childrenCalled = false;
let propertiesCalled = false;
let assertRender = (properties: any) => {};

function getProperties(toInject: any, properties: any) {
	propertiesCalled = true;
	return properties;
}

const registry = new Registry();
const injector = new Injector({});
registry.defineInjector('test-state-1', injector);
registry.define('test-widget', TestWidget);

registerSuite('mixins/Container', {
	beforeEach() {
		childrenCalled = false;
		propertiesCalled = false;
		assertRender = (properties: any) => {};
	},

	tests: {
		'container with no default mappers'() {
			assertRender = (properties: any) => {
				properties.getChildren();
				properties.getProperties();
				assert.isTrue(childrenCalled);
				assert.isTrue(propertiesCalled);
				assert.deepEqual(properties.properties, { foo: 'bar', registry });
				assert.deepEqual(properties.children, []);
			};
			const TestWidgetContainer = Container(TestWidget, 'test-state-1', { getProperties });
			const widget = new TestWidgetContainer();
			widget.__setCoreProperties__({ bind: widget, baseRegistry: registry });
			widget.__setProperties__({ foo: 'bar' });
			widget.__setChildren__([]);
			widget.__render__();
		},
		'container with custom getProperties mapper only'() {
			const child = v('sub-widget');
			assertRender = (properties: any) => {
				const children = properties.getChildren();
				properties.getProperties();
				assert.isFalse(childrenCalled);
				assert.isTrue(propertiesCalled);
				assert.deepEqual(children, []);
				assert.deepEqual(properties.properties, { foo: 'bar', registry });
				assert.lengthOf(properties.children, 1);
				assert.deepEqual(properties.children[0], child);
			};
			const TestWidgetContainer = Container(TestWidget, 'test-state-1', { getProperties });
			const widget = new TestWidgetContainer();
			widget.__setCoreProperties__({ bind: widget, baseRegistry: registry });
			widget.__setProperties__({ foo: 'bar' });
			widget.__setChildren__([child]);
			widget.__render__();
		},
		'container for registry item'() {
			assertRender = (properties: any) => {
				const calculatedChildren = properties.getChildren();
				const calculatedProperties = properties.getProperties();
				assert.isFalse(childrenCalled);
				assert.isFalse(propertiesCalled);
				assert.deepEqual(calculatedProperties, {});
				assert.deepEqual(calculatedChildren, []);
				assert.deepEqual(properties.properties, { foo: 'bar' });
				assert.deepEqual(properties.children, []);
			};

			const TestWidgetContainer = Container<TestWidget>('test-widget', 'test-state-1', { getProperties });
			const widget = new TestWidgetContainer();
			const renderResult: any = widget.__render__();

			assert.strictEqual(renderResult.widgetConstructor, 'test-widget');
		},
		'Container should always render but not invalidate parent when properties have not changed'() {
			let parentInvalidateCount = 0;
			let renderCount = 0;
			class Child extends WidgetBase<{ foo: string }> {}
			class ContainerClass extends Container(Child, 'test-state-1', { getProperties }) {
				render() {
					renderCount++;
					return super.render();
				}
			}
			class Parent extends ProjectorMixin(WidgetBase) {
				invalidate() {
					parentInvalidateCount++;
					super.invalidate();
				}
				render() {
					return w(ContainerClass, {});
				}
			}
			const projector = new Parent();
			projector.setProperties({ registry });
			projector.async = false;
			projector.append();
			parentInvalidateCount = 0;
			renderCount = 0;

			injector.set({});
			assert.strictEqual(parentInvalidateCount, 1);
			assert.strictEqual(renderCount, 1);

			injector.set({});
			assert.strictEqual(parentInvalidateCount, 2);
			assert.strictEqual(renderCount, 2);

			injector.set({});
			assert.strictEqual(parentInvalidateCount, 3);
			assert.strictEqual(renderCount, 3);
		}
	}
});
