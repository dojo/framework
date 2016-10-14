import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as main from '../../src/main';

registerSuite({
	name: 'main',
	'validate api'() {
		assert.isFunction(main.default);
		assert.isFunction(main.add);
		assert.isFunction(main.exists);
		assert.isFunction(main.normalize);
		assert.isFunction(main.load);
		assert.isObject(main.testCache);
		assert.isObject(main.testFunctions);
	}
});
