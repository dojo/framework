import globalObj from '../../src/global';

const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

registerSuite('global', {
	'global references the global object for the target environment'() {
		// If tests are running under CSP, unsafe eval will be denied and this test will fail
		assert.strictEqual(globalObj, Function('return this')(), 'Expecting global object to be in global object');
	}
});
