const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import {
	ChildrenType,
	initializeElement,
	DomToWidgetWrapper,
	handleAttributeChanged,
	CustomElementDescriptor
} from '../../src/customElements';
import { WidgetBase } from '../../src/WidgetBase';
import global from '@dojo/shim/global';
import { assign } from '@dojo/core/lang';
import * as projector from '../../src/mixins/Projector';
import * as sinon from 'sinon';
import sendEvent from './../support/sendEvent';
import { v } from '../../src/d';
import { InternalVNode } from '../../src/vdom';
import { Constructor } from '../../src/interfaces';
import ProjectorMixin from '../../src/mixins/Projector';

function createFakeElement(attributes: any, descriptor: CustomElementDescriptor): any {
	let widgetInstance: WidgetBase<any> | null;
	let events: Event[] = [];
	let removedChildren: any[] = [];

	return {
		getWidgetInstance: () => widgetInstance!,
		setWidgetInstance(instance: WidgetBase<any>) {
			widgetInstance = instance;
		},
		getWidgetConstructor: () =>
			class extends WidgetBase<any> {
				render() {
					return v('div');
				}
			},
		getDescriptor: () => descriptor,
		children: [],
		getAttribute(name: string) {
			return attributes[name] || null;
		},
		dispatchEvent(event: Event) {
			events.push(event);
		},
		appendChild: function() {},
		getEvents() {
			return events;
		},
		ownerDocument: global.document,
		removeChild(child: any) {
			removedChildren.push(child);
		},
		removedChildren() {
			return removedChildren;
		}
	};
}

let oldCustomEvent: any;
let sandbox: any;

registerSuite('customElements', {
	attributes: {
		'attributes are set as properties'() {
			let element = createFakeElement(
				{
					a: '1',
					'my-attribute': '2',
					convert: '4'
				},
				{
					tagName: 'test',
					widgetConstructor: WidgetBase,
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
				}
			);

			initializeElement(element)();

			const result = element.getWidgetInstance().properties;
			assert.strictEqual(result.a, '1');
			assert.strictEqual(result.b, '2');
			assert.strictEqual(result.convert, 8);
		},

		'attributes also create properties'() {
			let element = createFakeElement(
				{
					a: '1',
					'my-attribute': '2'
				},
				{
					tagName: 'test',
					widgetConstructor: WidgetBase,
					attributes: [
						{
							attributeName: 'a'
						},
						{
							attributeName: 'my-attribute',
							propertyName: 'b'
						}
					]
				}
			);

			initializeElement(element)();

			assert.strictEqual(element.a, '1');
			assert.strictEqual(element.b, '2');
		},

		'setting attribute properties sets the widget properties'() {
			let element = createFakeElement(
				{
					a: '1',
					'my-attribute': '2'
				},
				{
					tagName: 'test',
					widgetConstructor: WidgetBase,
					attributes: [
						{
							attributeName: 'a'
						},
						{
							attributeName: 'my-attribute',
							propertyName: 'b'
						}
					]
				}
			);

			initializeElement(element)();

			element.a = 4;

			assert.strictEqual(element.getWidgetInstance().properties.a, 4);
		},

		'attribute changes are sent to widget'() {
			let element = createFakeElement(
				{},
				{
					tagName: 'test',
					widgetConstructor: WidgetBase,
					attributes: [
						{
							attributeName: 'a'
						}
					]
				}
			);

			initializeElement(element)();

			handleAttributeChanged(element, 'a', 'test', null);
			handleAttributeChanged(element, 'b', 'test', null);

			assert.strictEqual(element.getWidgetInstance().properties.a, 'test');
			assert.isUndefined(element.getWidgetInstance().properties.b);
		},

		'unregistered attribute changes do nothing'() {
			let element = createFakeElement(
				{},
				{
					widgetConstructor: WidgetBase,
					tagName: 'test'
				}
			);

			initializeElement(element)();

			handleAttributeChanged(element, 'b', 'test', null);

			assert.isUndefined(element.getWidgetInstance().properties.b);
		}
	},
	properties: {
		'property names default to provided name'() {
			let element = createFakeElement(
				{},
				{
					tagName: 'test',
					widgetConstructor: WidgetBase,
					properties: [
						{
							propertyName: 'a'
						}
					]
				}
			);

			initializeElement(element)();
			element.getWidgetInstance().__setProperties__({
				a: 'test'
			});

			assert.deepEqual(element.a, 'test');

			element.a = 'blah';
			assert.deepEqual(element.getWidgetInstance().properties.a, 'blah');
		},
		'widget property names can be specified'() {
			let element = createFakeElement(
				{},
				{
					tagName: 'test',
					widgetConstructor: WidgetBase,
					properties: [
						{
							propertyName: 'a',
							widgetPropertyName: 'test'
						}
					]
				}
			);

			initializeElement(element)();
			element.getWidgetInstance().__setProperties__({
				test: 'test'
			});

			assert.deepEqual(element.a, 'test');
		},
		'properties can transform with getter'() {
			let element = createFakeElement(
				{},
				{
					tagName: 'test',
					widgetConstructor: WidgetBase,
					properties: [
						{
							propertyName: 'a',
							getValue: (value: any) => {
								return value * 2;
							}
						}
					]
				}
			);

			initializeElement(element)();
			element.getWidgetInstance().__setProperties__({
				a: 4
			});

			assert.deepEqual(element.a, 8);
		},
		'properties can transform with a setter'() {
			let element = createFakeElement(
				{},
				{
					tagName: 'test',
					widgetConstructor: WidgetBase,
					properties: [
						{
							propertyName: 'a',
							setValue: (value: any) => {
								return value * 2;
							}
						}
					]
				}
			);

			initializeElement(element)();
			element.a = 4;

			assert.deepEqual(element.getWidgetInstance().properties.a, 8);
		}
	},
	events: {
		beforeEach() {
			oldCustomEvent = global.CustomEvent;
			global.CustomEvent = function(this: any, type: string, args: any) {
				args.type = type;
				assign(this, args);
			};
		},

		afterEach() {
			global.CustomEvent = oldCustomEvent;
		},

		tests: {
			'events are created'() {
				let element = createFakeElement(
					{},
					{
						tagName: 'test',
						widgetConstructor: WidgetBase,
						events: [
							{
								propertyName: 'onTest',
								eventName: 'test'
							}
						]
					}
				);

				initializeElement(element)();

				assert.isFunction(element.getWidgetInstance().properties.onTest);
				element.getWidgetInstance().properties.onTest('detail here');

				assert.lengthOf(element.getEvents(), 1);
				assert.strictEqual(element.getEvents()[0].type, 'test');
				assert.strictEqual(element.getEvents()[0].detail, 'detail here');
			}
		}
	},

	children: {
		'element children get wrapped in DomWrapper'() {
			if (!(WidgetBase as any).name) {
				this.skip();
			}
			let element = createFakeElement(
				{},
				{
					tagName: 'test',
					widgetConstructor: WidgetBase,
					childrenType: ChildrenType.ELEMENT
				}
			);
			element.children = [
				{
					key: 'test',
					parentNode: element,
					addEventListener() {}
				}
			];

			initializeElement(element)();

			assert.lengthOf(element.removedChildren(), 1);
			assert.lengthOf(element.getWidgetInstance().children, 1);
			assert.strictEqual(element.getWidgetInstance().children[0].widgetConstructor.name, 'DomWrapper');
		},

		'widget children get wrapped in DomToWidgetWrapper'() {
			if (!(WidgetBase as any).name) {
				this.skip();
			}
			let element = createFakeElement(
				{},
				{
					tagName: 'test',
					widgetConstructor: WidgetBase
				}
			);
			element.children = [
				{
					key: 'test',
					parentNode: element,
					addEventListener() {}
				}
			];

			initializeElement(element)();

			assert.lengthOf(element.removedChildren(), 1);
			assert.lengthOf(element.getWidgetInstance().children, 1);
			assert.strictEqual(element.getWidgetInstance().children[0].widgetConstructor.name, 'DomToWidgetWrapper');
		}
	},

	DomToWidgetWrapper() {
		const widgetInstance = new (projector.ProjectorMixin(WidgetBase))();
		const div: any = document.createElement('div');
		div.getWidgetInstance = () => {
			return widgetInstance;
		};
		const Wrapper = DomToWidgetWrapper(div);
		const widget = new Wrapper();
		widget.__setProperties__({ foo: 'bar' });
		const invalidateSpy = sinon.spy(widget, 'invalidate');
		const renderResult = widget.__render__() as InternalVNode;
		assert.strictEqual(renderResult.tag, 'DIV');
		assert.strictEqual(renderResult.domNode, div);
		assert.deepEqual(renderResult.properties, {});
		assert.deepEqual(widget.properties, { foo: 'bar' });
		assert.deepEqual(widgetInstance.properties, {});
		assert.isTrue(invalidateSpy.notCalled);
		sendEvent(div, 'connected');
		assert.isTrue(invalidateSpy.calledOnce);
		widget.__render__() as InternalVNode;
		assert.deepEqual(widgetInstance.properties, { key: 'root', foo: 'bar' } as any);
	},

	initialization: {
		'properties are sent to widget'() {
			let element = createFakeElement(
				{},
				{
					tagName: 'test',
					widgetConstructor: WidgetBase,
					initialization(properties: any) {
						properties.prop1 = 'test';
					}
				}
			);

			initializeElement(element)();

			assert.strictEqual(element.getWidgetInstance().properties.prop1, 'test');
		}
	},

	appender: {
		beforeEach() {
			sandbox = sinon.sandbox.create();
		},

		afterEach() {
			sandbox.restore();
		},

		tests: {
			'appender is returned as a function'(this: any) {
				let rendered = false;

				const appendStub = sandbox.stub();

				const OrigProjectorMixin = projector.ProjectorMixin;

				function TestProjectorMixin<P, T extends Constructor<WidgetBase<P>>>(
					Base: T
				): T & Constructor<ProjectorMixin<P>> {
					const Mixed = OrigProjectorMixin(Base);
					Mixed.prototype.append = appendStub;
					return Mixed;
				}

				sandbox.stub(projector, 'ProjectorMixin').callsFake(TestProjectorMixin);

				let element = createFakeElement(
					{},
					{
						tagName: 'test',
						widgetConstructor: class extends WidgetBase<any> {
							render() {
								rendered = true;
								return v('div');
							}
						}
					}
				);

				const appender = initializeElement(element);

				assert.isFalse(rendered);
				assert.isFunction(appender);

				appender();

				assert.isTrue(appendStub.called);
			}
		}
	}
});
