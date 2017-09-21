import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { v , w } from '../../src/d';
import { WidgetBase } from '../../src/WidgetBase';
import { diffProperty } from './../../src/decorators/diffProperty';
import { always } from '../../src/diff';
import { Container } from './../../src/Container';
import { Registry } from './../../src/Registry';
import { Injector } from './../../src/Injector';

import createTestWidget from './../support/createTestWidget';

interface TestWidgetProperties {
	foo: string;
	boo: number;
}

class TestWidget extends WidgetBase<TestWidgetProperties> {
	render() {
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

registerSuite({
	name: 'mixins/Container',
	beforeEach() {
		childrenCalled = false;
		propertiesCalled = false;
		assertRender = (properties: any) => {};
	},
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
		widget.__setChildren__([ child ]);
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
		const widget = createTestWidget(TestWidgetContainer, { foo: 'bar', registry });
		const renderResult: any = widget.__render__();
		assert.strictEqual(renderResult.vnodeSelector, 'test');
	},
	'container always updates'() {
		@diffProperty('foo', always)
		class Child extends WidgetBase<{ foo: string }> {}
		const ChildContainer = Container(Child, 'test-state-1', { getProperties });

		class Parent extends WidgetBase<any> {
			render() {
				const { foo } = this.properties;
				return w(ChildContainer, { foo });
			}

		}
		const widget = new Parent();
		widget.__setCoreProperties__({ bind: widget, baseRegistry: registry });
		widget.__setProperties__({ foo: 'bar'});
		const renderResult = widget.__render__();
		injector.set({ foo: 'bar' });
		const injectorUpdatedRenderResult = widget.__render__();
		assert.notStrictEqual(injectorUpdatedRenderResult, renderResult);
		widget.__setProperties__({ foo: 'bar', bar: 'foo' });
		const updatedRenderResult = widget.__render__();
		assert.notStrictEqual(updatedRenderResult, injectorUpdatedRenderResult);
	}
});
