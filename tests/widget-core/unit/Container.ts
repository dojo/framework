import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { v } from '../../src/d';
import { WidgetBase } from '../../src/WidgetBase';
import { Container } from './../../src/Container';
import { Registry } from './../../src/Registry';

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

function getChildren(toInject: any, children: any) {
	childrenCalled = true;
	return children;
}

function getProperties(toInject: any, properties: any) {
	propertiesCalled = true;
	return properties;
}

class StubInjector extends WidgetBase<any> {
	render() {
		assertRender(this.properties);
		return this.properties.render();
	}
}

const registry = new Registry();
registry.define('test-state-1', StubInjector);
registry.define('test-widget', TestWidget);

registerSuite({
	name: 'mixins/Container',
	beforeEach() {
		childrenCalled = false;
		propertiesCalled = false;
		assertRender = (properties: any) => {};
	},
	'container with default mappers'() {
		assertRender = (properties: any) => {
			const calculatedChildren = properties.getChildren();
			const calculatedProperties = properties.getProperties();
			assert.isFalse(childrenCalled);
			assert.isFalse(propertiesCalled);
			assert.deepEqual(calculatedProperties, {});
			assert.deepEqual(calculatedChildren, []);
			assert.deepEqual(properties.properties, { foo: 'bar', registry });
			assert.deepEqual(properties.children, []);
		};
		const TestWidgetContainer = Container(TestWidget, 'test-state-1');
		const widget = new TestWidgetContainer();
		widget.__setProperties__({ foo: 'bar', registry });
		widget.__render__();
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
		const TestWidgetContainer = Container(TestWidget, 'test-state-1', { getProperties, getChildren });
		const widget = new TestWidgetContainer();
		widget.__setProperties__({ foo: 'bar', registry });
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
		widget.__setProperties__({ foo: 'bar', registry });
		widget.__setChildren__([ child ]);
		widget.__render__();
	},
	'container with custom getChildren mapper only'() {
		assertRender = (properties: any) => {
			properties.getChildren();
			const calculatedProperties = properties.getProperties();
			assert.isTrue(childrenCalled);
			assert.isFalse(propertiesCalled);
			assert.deepEqual(calculatedProperties, {});
			assert.deepEqual(properties.properties, { foo: 'bar', registry });
			assert.deepEqual(properties.children, []);
		};
		const TestWidgetContainer = Container(TestWidget, 'test-state-1', { getChildren });
		const widget = new TestWidgetContainer();
		widget.__setProperties__({ foo: 'bar', registry });
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

		const TestWidgetContainer = Container<TestWidget>('test-widget', 'test-state-1');
		const widget = createTestWidget(TestWidgetContainer, { foo: 'bar' });
		widget.__setCoreProperties__({ bind: this, registry });
		const renderResult: any = widget.__render__();
		assert.strictEqual(renderResult.vnodeSelector, 'test');
	}
});
