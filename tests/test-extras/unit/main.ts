import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as main from '../../src/main';
import harness, { assignChildProperties, assignProperties, replaceChild, replaceChildProperties, replaceProperties } from '../../src/harness';
import assertRender from '../../src/support/assertRender';
import sendEvent from '../../src/support/sendEvent';
import ClientErrorCollector from '../../src/intern/ClientErrorCollector';

registerSuite({
	name: 'main',

	'validate api'() {
		assert(main);

		assert.isFunction(main.assertRender);
		assert.strictEqual(main.assertRender, assertRender);

		assert.isFunction(main.assignChildProperties);
		assert.strictEqual(main.assignChildProperties, assignChildProperties);

		assert.isFunction(main.assignProperties);
		assert.strictEqual(main.assignProperties, assignProperties);

		assert.isFunction(main.ClientErrorCollector);
		assert.strictEqual(main.ClientErrorCollector, ClientErrorCollector);

		assert.isFunction(main.harness);
		assert.strictEqual(main.harness, harness);

		assert.isFunction(main.replaceChild);
		assert.strictEqual(main.replaceChild, replaceChild);

		assert.isFunction(main.replaceChildProperties);
		assert.strictEqual(main.replaceChildProperties, replaceChildProperties);

		assert.isFunction(main.replaceProperties);
		assert.strictEqual(main.replaceProperties, replaceProperties);

		assert.isFunction(main.sendEvent);
		assert.strictEqual(main.sendEvent, sendEvent);
	}
});
