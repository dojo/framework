import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import global from '../../../src/support/global';

registerSuite({
	name: 'global',

	'global references the global object for the target environment'() {
		assert.isTrue('global' in global, 'Expecting global object to be in global object');
	}
});
