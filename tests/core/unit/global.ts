import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import global from '../../src/global';
import shimGlobal from '@dojo/shim/global';

registerSuite({
	name: 'global',

	'global is a re-export of @dojo/shim/global'() {
		assert.strictEqual(global, shimGlobal, 'globals should match');
	}
});
