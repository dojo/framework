import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import * as main from '../../src/main';

registerSuite({
	name: 'main',
	'validate API'() {
		assert.isObject(main.aspect);
	}
});
