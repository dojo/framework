import globalObj from '../../../src/shim/global';
import '../../../src/shim/globalThis';

const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

registerSuite('globalThis', {
	'ensures that the global object is available as `globalThis`'() {
		// If tests are running under CSP, unsafe eval will be denied and this test will fail
		assert.strictEqual(globalObj, globalThis);
	}
});
