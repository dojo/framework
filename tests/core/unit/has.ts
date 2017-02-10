import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import has from '../../src/has';

registerSuite({
	name: 'has',
	'has("node-buffer")': function() {
		const value = has('node-buffer');
		if (has('host-node')) {
			assert.ok(value, 'Should be true running under node');
		}
		else {
			assert.notOk(value, 'Should be false running under node');
		}
	}
});
