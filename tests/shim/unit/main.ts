import * as main from '../../src/main';

const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

registerSuite('main', {
	'validate api'() {
		assert(main);
	}
});
