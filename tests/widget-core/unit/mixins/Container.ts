import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { v, registry } from '../../../src/d';
import { WidgetBase } from '../../../src/WidgetBase';
import Container from './../../../src/mixins/Container';

class TestWidget extends WidgetBase<any> {
	render() {
		return v('test', this.properties);
	}
}

let childrenCalled = false;
let propertiesCalled = false;
let assertRender = (properties: any) => {};

function getChildren() {
	childrenCalled = true;
}

function getProperties() {
	propertiesCalled = true;
}

class StubInjector extends WidgetBase<any> {
	render() {
		assertRender(this.properties);
		return this.properties.render();
	}
}
registry.define('test-state', StubInjector);

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
			assert.deepEqual(properties.properties, { foo: 'bar' });
			assert.deepEqual(properties.children, []);
		};
		const TestWidgetContainer = Container(TestWidget, 'test-state');
		const widget = new TestWidgetContainer();
		widget.__setProperties__({ foo: 'bar' });
		widget.__render__();
	},
	'container with no default mappers'() {
		assertRender = (properties: any) => {
			properties.getChildren();
			properties.getProperties();
			assert.isTrue(childrenCalled);
			assert.isTrue(propertiesCalled);
			assert.deepEqual(properties.properties, { foo: 'bar' });
			assert.deepEqual(properties.children, []);
		};
		const TestWidgetContainer = Container(TestWidget, 'test-state', { getProperties, getChildren });
		const widget = new TestWidgetContainer();
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
			assert.deepEqual(properties.properties, { foo: 'bar' });
			assert.lengthOf(properties.children, 1);
			assert.deepEqual(properties.children[0], child);
		};
		const TestWidgetContainer = Container(TestWidget, 'test-state', { getProperties });
		const widget = new TestWidgetContainer();
		widget.__setProperties__({ foo: 'bar' });
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
			assert.deepEqual(properties.properties, { foo: 'bar' });
			assert.deepEqual(properties.children, []);
		};
		const TestWidgetContainer = Container(TestWidget, 'test-state', { getChildren });
		const widget = new TestWidgetContainer();
		widget.__setProperties__({ foo: 'bar' });
		widget.__render__();
	}
});
