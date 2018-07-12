const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import global from '../../src/global';
import shimGlobal from '@dojo/shim/global';

registerSuite('global', {
	'global is a re-export of @dojo/shim/global'() {
		assert.strictEqual(global, shimGlobal, 'globals should match');
	}
});
