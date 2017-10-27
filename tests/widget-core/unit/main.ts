const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import * as main from '../../src/main';

registerSuite('Main module', {

	'has a main module export'() {
		// it wouldn't do to manually test every export, so we're going to just
		// make sure that _something_ is exported.
		assert.isTrue(Object.keys(main).length > 0);
	}
});
