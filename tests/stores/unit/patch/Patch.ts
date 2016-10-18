import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import  { diff } from '../../../src/patch/Patch';
import { createData } from '../support/createData';

registerSuite({
	name: 'Patch',

	'Should only works with objects'(this: any) {
		const data = createData();
		const patch = diff(data[0].id, data[1].id);
		assert.isTrue(patch.operations.length === 0, 'operations should not be created.');
	},

	'Should have a toString that describes the operations.'(this: any) {
		const from = { prop1: 'foo', prop2: 1 };
		const to = { prop1: 'bar', prop2: 5 };
		const patch = diff(from, to);
		assert.strictEqual(patch.toString(), '[{"op":"replace","path":"prop1","value":"bar"},{"op":"replace","path":"prop2","value":5}]');
	},

	'Replace operation should replace "from" value based on diff.'(this: any) {
		const data = createData();
		const from = data[0].nestedProperty;
		const to = data[1].nestedProperty;
		const patch = diff(from, to);

		const result = patch.apply(from);

		assert.deepEqual(result, to);
	},

	'Should treat "undefined" in "to" normally.'(this: any) {
		const data = createData();
		const from = data[0].nestedProperty;
		const to = data[1].nestedProperty;
		to.value = undefined;
		const patch = diff(from, to);

		const result = patch.apply(from);

		assert.isTrue('value' in result);
		assert.deepEqual(result, to);
	},

	'Should treat "undefined" in "from" normally.'(this: any) {
		const data = createData();
		const from = data[0].nestedProperty;
		const to = data[1].nestedProperty;
		from.value = undefined;
		const patch = diff(from, to);

		const result = patch.apply(from);

		assert.isTrue('value' in result);
		assert.deepEqual(result, to);
	},

	'Remove operation should remove "from" value based on diff.'(this: any) {
		const data = createData();
		const from = data[0].nestedProperty;
		const to = data[1].nestedProperty;
		delete to.value;
		const patch = diff(from, to);

		const result = patch.apply(from);

		assert.isNotTrue('value' in result);
		assert.deepEqual(result, to);
	},

	'Add operation should add "from" value based on diff.'(this: any) {
		const data = createData();
		const from = data[0].nestedProperty;
		const to = data[1].nestedProperty;
		delete from.value;
		const patch = diff(from, to);

		const result = patch.apply(from);

		assert.isTrue('value' in result);
		assert.deepEqual(result, to);
	}
});
