import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { initializeElement, handleAttributeChanged, CustomElementDescriptor } from '../../src/customElements';
import { Widget } from '../../src/interfaces';
import createWidget from '../../src/createWidgetBase';
import global from '@dojo/core/global';
import { assign } from '@dojo/core/lang';

function createFakeElement(attributes: any, descriptor: CustomElementDescriptor): any {
	let widgetInstance: Widget<any> | null;
	let events: Event[] = [];
	let removedChildren: any[] = [];

	return {
		getWidgetInstance: () => widgetInstance!,
		setWidgetInstance(instance: Widget<any>) {
			widgetInstance = instance;
		},
		getWidgetFactory: () => createWidget,
		getDescriptor: () => descriptor,
		children: [],
		getAttribute(name: string) {
			return attributes[ name ] || null;
		},
		dispatchEvent(event: Event) {
			events.push(event);
		},
		appendChild: function () {
		},
		getEvents() {
			return events;
		},
		removeChild(child: any) {
			removedChildren.push(child);
		},
		removedChildren() {
			return removedChildren;
		}
	};
}

let oldCustomEvent: any;

registerSuite({
	name: 'customElements',

	'attributes': {
		'attributes are set as properties'() {
			let element = createFakeElement({
				'a': '1',
				'my-attribute': '2',
				'convert': '4'
			}, {
				tagName: 'test',
				widgetFactory: createWidget,
				attributes: [
					{
						attributeName: 'a'
					},
					{
						attributeName: 'my-attribute',
						propertyName: 'b'
					},
					{
						attributeName: 'convert',
						value: (value: string | null) => {
							return parseInt(value || '0', 10) * 2;
						}
					}
				]
			});

			initializeElement(element);

			assert.deepEqual(element.getWidgetInstance().properties, {
				'a': '1',
				'b': '2',
				'convert': 8
			});
		},

		'attributes also create properties'() {
			let element = createFakeElement({
				'a': '1',
				'my-attribute': '2'
			}, {
				tagName: 'test',
				widgetFactory: createWidget,
				attributes: [
					{
						attributeName: 'a'
					},
					{
						attributeName: 'my-attribute',
						propertyName: 'b'
					}
				]
			});

			initializeElement(element);

			assert.strictEqual(element.a, '1');
			assert.strictEqual(element.b, '2');
		},

		'setting attribute properties sets the widget properties'() {
			let element = createFakeElement({
				'a': '1',
				'my-attribute': '2'
			}, {
				tagName: 'test',
				widgetFactory: createWidget,
				attributes: [
					{
						attributeName: 'a'
					},
					{
						attributeName: 'my-attribute',
						propertyName: 'b'
					}
				]
			});

			initializeElement(element);

			element.a = 4;

			assert.strictEqual(element.getWidgetInstance().properties.a, 4);
		},

		'attribute changes are sent to widget'() {
			let element = createFakeElement({}, {
				tagName: 'test',
				widgetFactory: createWidget,
				attributes: [
					{
						attributeName: 'a'
					}
				]
			});

			initializeElement(element);

			handleAttributeChanged(element, 'a', 'test', null);
			handleAttributeChanged(element, 'b', 'test', null);

			assert.strictEqual(element.getWidgetInstance().properties.a, 'test');
			assert.isUndefined(element.getWidgetInstance().properties.b);
		},

		'unregistered attribute changes do nothing'() {
			let element = createFakeElement({}, {
				widgetFactory: createWidget,
				tagName: 'test'
			});

			initializeElement(element);

			handleAttributeChanged(element, 'b', 'test', null);

			assert.isUndefined(element.getWidgetInstance().properties.b);
		}
	},
	'properties': {
		'property names default to provided name'() {
			let element = createFakeElement({}, {
				tagName: 'test',
				widgetFactory: createWidget,
				properties: [
					{
						propertyName: 'a'
					}
				]
			});

			initializeElement(element);
			element.getWidgetInstance().setProperties({
				a: 'test'
			});

			assert.deepEqual(element.a, 'test');

			element.a = 'blah';
			assert.deepEqual(element.getWidgetInstance().properties.a, 'blah');
		},
		'widget property names can be specified'() {
			let element = createFakeElement({}, {
				tagName: 'test',
				widgetFactory: createWidget,
				properties: [
					{
						propertyName: 'a',
						widgetPropertyName: 'test'
					}
				]
			});

			initializeElement(element);
			element.getWidgetInstance().setProperties({
				test: 'test'
			});

			assert.deepEqual(element.a, 'test');
		},
		'properties can transform with getter'() {
			let element = createFakeElement({}, {
				tagName: 'test',
				widgetFactory: createWidget,
				properties: [
					{
						propertyName: 'a',
						getValue: (value: any) => {
							return value * 2;
						}
					}
				]
			});

			initializeElement(element);
			element.getWidgetInstance().setProperties({
				a: 4
			});

			assert.deepEqual(element.a, 8);
		},
		'properties can transform with a setter'() {
			let element = createFakeElement({}, {
				tagName: 'test',
				widgetFactory: createWidget,
				properties: [
					{
						propertyName: 'a',
						setValue: (value: any) => {
							return value * 2;
						}
					}
				]
			});

			initializeElement(element);
			element.a = 4;

			assert.deepEqual(element.getWidgetInstance().properties.a, 8);
		}
	},
	'events': {
		beforeEach() {
			oldCustomEvent = global.CustomEvent;
			global.CustomEvent = function (this: any, type: string, args: any) {
				args.type = type;
				assign(this, args);
			};
		},

		afterEach() {
			global.CustomEvent = oldCustomEvent;
		},

		'events are created'() {
			let element = createFakeElement({}, {
				tagName: 'test',
				widgetFactory: createWidget,
				events: [
					{
						propertyName: 'onTest',
						eventName: 'test'
					}
				]
			});

			initializeElement(element);

			assert.isFunction(element.getWidgetInstance().properties.onTest);
			element.getWidgetInstance().properties.onTest('detail here');

			assert.lengthOf(element.getEvents(), 1);
			assert.strictEqual(element.getEvents()[ 0 ].type, 'test');
			assert.strictEqual(element.getEvents()[ 0 ].detail, 'detail here');
		}
	},

	'children': {
		'children get wrapped in dom wrappers'() {
			let element = createFakeElement({}, {
				tagName: 'test',
				widgetFactory: createWidget
			});
			element.children = [ {
				key: 'test',
				parentNode: element
			} ];

			// so.. this is going to fail in maquette, since we don't have a DOM, but,
			// it's ok because all of our code has already run by now
			try {
				initializeElement(element);
			}
			catch (e) {
			}

			assert.lengthOf(element.removedChildren(), 1);
			assert.lengthOf(element.getWidgetInstance().children, 1);
		}
	},

	'initialization': {
		'properties are sent to widget'() {
			let element = createFakeElement({}, {
				tagName: 'test',
				widgetFactory: createWidget,
				initialization(properties: any) {
					properties.prop1 = 'test';
				}
			});

			initializeElement(element);

			assert.strictEqual(element.getWidgetInstance().properties.prop1, 'test');
		}
	}
});
