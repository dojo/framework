import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import has from '../../../src/request/has';
import global from '../../../src/global';

registerSuite({
	name: 'request/has',
	'has("node-buffer")': function() {
		const value = has('node-buffer');
		if (has('host-node')) {
			assert.ok(value, 'Should be true running under node');
		}
		else {
			assert.notOk(value, 'Should be false running under node');
		}
	},
	'has("fetch")'() {
		assert.equal(has('fetch'), 'fetch' in global);
	}
});
