import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { createPointer, navigate } from '../../../src/patch/JsonPointer';

registerSuite({
	name: 'JsonPointer',
	'Should work with simple path.'(this: any) {
		const target = { prop1: 1 };
		const path = createPointer('prop1');
		const result = navigate(path, target);

		assert.strictEqual(result, 1);
	},
	'Should work with multiple paths.'(this: any) {
		const target = { prop1: { prop2: { prop3: 1 } } };
		const path = createPointer('prop1', 'prop2', 'prop3');
		const result = navigate(path, target);

		assert.strictEqual(result, 1);
	},
	'Should create new path using push.'(this: any) {
		const target = { prop1: { prop2: { prop3: 1 } } };
		const path = createPointer('prop1', 'prop2').push('prop3');
		const result = navigate(path, target);

		assert.strictEqual(result, 1);
	},
	'Should create new path using pop.'(this: any) {
		const target = { prop1: { prop2: { prop3: 1 } } };
		const path = createPointer('prop1', 'prop2', 'prop3').pop();
		const result = navigate(path, target);

		assert.deepEqual(result, { prop3: 1 });
	},
	'Should return null if the target is null.'(this: any) {
		const path = createPointer('prop1', 'prop2', 'prop3');
		const result = navigate(path, null);

		assert.isNull(result);
	},
	'Should have a toString that describes the path.'(this: any) {
		const path = createPointer('a', 'b', 'c').toString();

		assert.strictEqual(path, 'a/b/c');
	}
});
