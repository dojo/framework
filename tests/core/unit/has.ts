const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import has from '../../../src/core/has';

registerSuite('core/has', {
	'has("node-buffer")': function() {
		const value = has('node-buffer');
		if (has('host-node')) {
			assert.ok(value, 'Should be true running under node');
		} else {
			assert.notOk(value, 'Should be false running under node');
		}
	}
});
