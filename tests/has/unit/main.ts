const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

import * as main from '../../src/main';

registerSuite('main', {
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
