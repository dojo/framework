import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as main from '../../src/main';
import assertRender from '../../src/support/assertRender';
import ClientErrorCollector from '../../src/intern/ClientErrorCollector';

registerSuite({
	name: 'main',
	'validate api'() {
		assert(main);
		assert.isFunction(main.assertRender);
		assert.strictEqual(main.assertRender, assertRender);

		assert.isFunction(main.ClientErrorCollector);
		assert.strictEqual(main.ClientErrorCollector, ClientErrorCollector);
	}
});
