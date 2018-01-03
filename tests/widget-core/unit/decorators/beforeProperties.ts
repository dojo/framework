const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

import { beforeProperties } from './../../../src/decorators/beforeProperties';
import { WidgetBase } from './../../../src/WidgetBase';
import { WidgetProperties } from './../../../src/interfaces';

registerSuite('decorators/beforeProperties', {
	beforeProperties() {
		function before(properties: WidgetProperties): WidgetProperties {
			return { key: 'foo' };
		}

		@beforeProperties(before)
		class TestWidget extends WidgetBase<any> {}
		const widget = new TestWidget();
		widget.__setProperties__({});
		assert.strictEqual(widget.properties.key, 'foo');
	},
	'multiple beforeProperties decorators'() {
		function beforeOne(properties: WidgetProperties): WidgetProperties {
			return { key: 'foo' };
		}
		function beforeTwo(properties: any): any {
			return { other: 'bar' };
		}

		@beforeProperties(beforeOne)
		@beforeProperties(beforeTwo)
		class TestWidget extends WidgetBase<any> {}
		const widget = new TestWidget();
		widget.__setProperties__({});
		assert.strictEqual(widget.properties.key, 'foo');
		assert.strictEqual(widget.properties.other, 'bar');
	},
	'beforeProperties on class method'() {
		class TestWidget extends WidgetBase<any> {
			@beforeProperties()
			before(properties: WidgetProperties): WidgetProperties {
				return { key: 'foo' };
			}
		}
		const widget = new TestWidget();
		widget.__setProperties__({});
		assert.strictEqual(widget.properties.key, 'foo');
	},
	'programmatic beforeProperties'() {
		function beforeOne(properties: WidgetProperties): WidgetProperties {
			return { key: 'foo' };
		}
		function beforeTwo(properties: any): any {
			return { other: 'bar' };
		}

		class TestWidget extends WidgetBase<any> {
			constructor() {
				super();
				beforeProperties(beforeOne)(this);
				beforeProperties(beforeTwo)(this);
			}
		}
		const widget = new TestWidget();
		widget.__setProperties__({});
		assert.strictEqual(widget.properties.key, 'foo');
		assert.strictEqual(widget.properties.other, 'bar');
	}
});
