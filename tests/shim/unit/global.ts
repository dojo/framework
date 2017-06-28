import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import globalObj from '../../src/global';

registerSuite({
	name: 'global',

	'global references the global object for the target environment'() {
		// If tests are running under CSP, unsafe eval will be denied and this test will fail
		assert.strictEqual(globalObj, Function('return this')(), 'Expecting global object to be in global object');
	}
});
