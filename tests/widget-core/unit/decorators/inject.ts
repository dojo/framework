const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

import { inject } from './../../../src/decorators/inject';
import { WidgetBase } from './../../../src/WidgetBase';
import { Registry } from './../../../src/Registry';
import { WidgetProperties } from './../../../src/interfaces';

let injectorOne = () => () => ({ foo: 'bar' });
let injectorTwo = () => () => ({ bar: 'foo' });
let registry: Registry;

registerSuite('decorators/inject', {
	beforeEach() {
		registry = new Registry();
		injectorOne = () => () => ({ foo: 'bar' });
		injectorTwo = () => () => ({ bar: 'foo' });
		registry.defineInjector('inject-one', injectorOne);
		registry.defineInjector('inject-two', injectorTwo);
	},

	tests: {
		beforeProperties() {
			function getProperties(payload: any, properties: WidgetProperties): WidgetProperties {
				return payload;
			}

			@inject({ name: 'inject-one', getProperties })
			class TestWidget extends WidgetBase<any> {}
			const widget = new TestWidget();
			widget.__setCoreProperties__({ bind: widget, baseRegistry: registry });
			widget.__setProperties__({});

			assert.strictEqual(widget.properties.foo, 'bar');
		},
		'multiple injectors'() {
			function getPropertiesOne(payload: any, properties: WidgetProperties): WidgetProperties {
				return payload;
			}
			function getPropertiesTwo(payload: any, properties: WidgetProperties): WidgetProperties {
				return payload;
			}

			@inject({ name: 'inject-one', getProperties: getPropertiesOne })
			@inject({ name: 'inject-two', getProperties: getPropertiesTwo })
			class TestWidget extends WidgetBase<any> {}
			const widget = new TestWidget();
			widget.__setCoreProperties__({ bind: widget, baseRegistry: registry });
			widget.__setProperties__({});
			assert.strictEqual(widget.properties.foo, 'bar');
			assert.strictEqual(widget.properties.bar, 'foo');
		},
		'programmatic registration'() {
			function getPropertiesOne(payload: any, properties: WidgetProperties): WidgetProperties {
				return payload;
			}
			function getPropertiesTwo(payload: any, properties: WidgetProperties): WidgetProperties {
				return payload;
			}

			class TestWidget extends WidgetBase<any> {
				constructor() {
					super();
					inject({ name: 'inject-one', getProperties: getPropertiesOne })(this);
					inject({ name: 'inject-two', getProperties: getPropertiesTwo })(this);
				}
			}
			const widget = new TestWidget();
			widget.__setCoreProperties__({ bind: widget, baseRegistry: registry });
			widget.__setProperties__({});
			assert.strictEqual(widget.properties.foo, 'bar');
			assert.strictEqual(widget.properties.bar, 'foo');
		},
		'invalidate listeners are removed when widget is destroyed'() {
			class TestInvalidate {
				invalidator: any;
			}
			const testInvalidate = new TestInvalidate();
			const testInvalidateInjector = (invalidator: any) => {
				testInvalidate.invalidator = invalidator;
				return () => {};
			};
			registry.defineInjector('invalidate-test', testInvalidateInjector);
			function getProperties(payload: any, properties: WidgetProperties): WidgetProperties {
				return payload;
			}
			let invalidateCounter = 0;
			@inject({ name: 'invalidate-test', getProperties: getProperties })
			class TestWidget extends WidgetBase<any> {
				destroy() {
					super.destroy();
				}
				invalidate() {
					invalidateCounter++;
					super.invalidate();
				}
			}
			const widget = new TestWidget();
			widget.__setCoreProperties__({ bind: widget, baseRegistry: registry });
			widget.__setProperties__({});
			testInvalidate.invalidator();
			assert.strictEqual(invalidateCounter, 2);
			testInvalidate.invalidator();
			assert.strictEqual(invalidateCounter, 3);
			widget.destroy();
			testInvalidate.invalidator();
			assert.strictEqual(invalidateCounter, 3);
		}
	}
});
