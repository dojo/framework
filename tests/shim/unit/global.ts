import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import global from 'src/global';

registerSuite({
	name: 'global',

	'global references the global object for the target environment'() {
		assert.strictEqual(global, Function('return this')());
	}
});
