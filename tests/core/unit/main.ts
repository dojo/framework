const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import * as main from '../../src/main';

registerSuite('main', {
	'validate API'() {
		assert.isObject(main.aspect);
	}
});
