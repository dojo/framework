import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import global from 'src/global';

registerSuite({
	name: 'global',

	'global references the global object for the target environment'() {
		assert.strictEqual(global, Function('return this')());
	}
});
