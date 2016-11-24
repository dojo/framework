import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as main from '../../src/main';

registerSuite({
	name: 'main',
	'validate api'() {
		assert.isFunction(main.createButton);
		assert.isFunction(main.createDijit);
		assert.isFunction(main.createTextInput);
	}
});
