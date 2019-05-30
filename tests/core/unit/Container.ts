const { registerSuite } = intern.getPlugin('jsdom');
const { assert } = intern.getPlugin('chai');
import { WidgetBase } from '../../../src/core/WidgetBase';
import { Container } from '../../../src/core/Container';
import { Registry } from '../../../src/core/Registry';
import { renderer, v, w } from '../../../src/core/vdom';

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
const injector = () => () => ({});
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
			widget.registry.base = registry;
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
			widget.registry.base = registry;
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
			class TestInvalidate {
				invalidator: any;
			}
			const testInvalidate = new TestInvalidate();
			const testInvalidateInjector = (invalidator: any) => {
				testInvalidate.invalidator = invalidator;
				return () => {};
			};
			let renderCount = 0;
			registry.defineInjector('test-always-render', testInvalidateInjector);
			class Child extends WidgetBase<{ foo: string }> {}
			class ContainerClass extends Container(Child, 'test-always-render', { getProperties }) {
				render() {
					renderCount++;
					return super.render();
				}
			}
			class Parent extends WidgetBase {
				render() {
					return w(ContainerClass, {});
				}
			}

			const r = renderer(() => w(Parent, {}));
			r.mount({ sync: true, registry });
			renderCount = 0;

			testInvalidate.invalidator();
			assert.strictEqual(renderCount, 1);

			testInvalidate.invalidator();
			assert.strictEqual(renderCount, 2);

			testInvalidate.invalidator();
			assert.strictEqual(renderCount, 3);
		}
	}
});
