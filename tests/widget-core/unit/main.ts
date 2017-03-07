import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as main from '../../src/main';

registerSuite({
	name: 'Main module',

	'has a main module export'() {
		// it wouldn't do to manually test every export, so we're going to just
		// make sure that _something_ is exported.
		assert.isTrue(Object.keys(main).length > 0);
	}
});
