import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as main from '../../src/main';

registerSuite({
	name: 'main',
	'validate api'() {
		assert.isFunction(main.createButton);
		assert.isFunction(main.createContainer);
		assert.isFunction(main.createDijit);
		assert.isFunction(main.createLayoutContainer);
		assert.isFunction(main.createList);
		assert.isFunction(main.createPanel);
		assert.isFunction(main.createTabbedPanel);
		assert.isFunction(main.createTextInput);
		assert.isFunction(main.createWidget);
	}
});
