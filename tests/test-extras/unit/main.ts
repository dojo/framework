const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

import * as main from '../../src/main';
import harness from '../../src/harness';
import assertRender from '../../src/support/assertRender';
import callListener from '../../src/support/callListener';
import sendEvent from '../../src/support/sendEvent';
import { assignChildProperties, assignProperties, findIndex, findKey, replaceChild, replaceChildProperties, replaceProperties } from '../../src/support/d';

registerSuite('main', {

	'validate api'() {
		assert(main);

		assert.isFunction(main.assertRender);
		assert.strictEqual(main.assertRender, assertRender);

		assert.isFunction(main.assignChildProperties);
		assert.strictEqual(main.assignChildProperties, assignChildProperties);

		assert.isFunction(main.assignProperties);
		assert.strictEqual(main.assignProperties, assignProperties);

		assert.isFunction(main.callListener);
		assert.strictEqual(main.callListener, callListener);

		assert.isFunction(main.findIndex);
		assert.strictEqual(main.findIndex, findIndex);

		assert.isFunction(main.findKey);
		assert.strictEqual(main.findKey, findKey);

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

		assert.strictEqual(Object.keys(main).length, 11, 'should have 11 exports');
	}
});
