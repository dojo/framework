const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import global from '../../../src/core/global';
import shimGlobal from '../../../src/shim/global';

registerSuite('core/global', {
	'global is a re-export of ../../../src/shim/global'() {
		assert.strictEqual(global, shimGlobal, 'globals should match');
	}
});
