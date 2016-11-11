import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import createWidget from '../../src/createWidget';

registerSuite({
	name: 'createWidget',
	'basic'() {
		assert(createWidget);
		const widget = createWidget();
		assert(widget);
	},
	'destroy()'() {
		const widget = createWidget();
		return widget.destroy();
	},
	'getNodeAttributes()'() {
		const widget1 = createWidget({
			listeners: {
				'click'() {}
			},
			state: {
				id: 'foo'
			},
			tagName: 'h1'
		});

		const nodeAttributes1 = widget1.getNodeAttributes();
		assert.strictEqual(Object.keys(nodeAttributes1).length, 5, 'should have five keys only');
		assert.strictEqual(nodeAttributes1['data-widget-id'], 'foo');
		assert.isFunction(nodeAttributes1.onclick, 'onclick is a function');
		assert.deepEqual(nodeAttributes1.classes, {});

		const widget2 = createWidget({
			listeners: {
				'click'() {}
			}
		});
		const nodeAttributes2 = widget2.getNodeAttributes();
		assert.strictEqual(Object.keys(nodeAttributes2).length, 4, 'should have only three keys');
		assert.isFunction(nodeAttributes1.onclick, 'onclick is a function');
	}
});
