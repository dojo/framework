import * as main from '../../../src/shim/main';

const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

registerSuite('shim/main', {
	'validate api'() {
		assert(main);
	}
});
