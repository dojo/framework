import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import  { createOperation, OperationType } from '../../../src/patch/Operation';

registerSuite({
	name: 'Operation',

	'Basic Operations.': {
		'Add operation should add property and value to the target.'(this: any) {
			const target = {};
			const operation = createOperation(OperationType.Add, ['prop1'], 1);
			const result = operation.apply(target);

			assert.deepEqual(result, { prop1: 1 });
		},

		'Remove operation should remove property from the target.'(this: any) {
			const target = { prop1: 1 };
			const operation = createOperation(OperationType.Remove, ['prop1']);
			const result = operation.apply(target);

			assert.deepEqual(result, {});
		},

		'Replace operation should replace property value of the target.'(this: any) {
			const target = { prop1: 1 };
			const operation = createOperation(OperationType.Replace, ['prop1'], 2);
			const result = operation.apply(target);

			assert.deepEqual(result, { prop1: 2});
		},

		'Replace operation should treat "undefined" normally.'(this: any) {
			const target = { prop1: undefined as number };
			const operation = createOperation(OperationType.Replace, ['prop1'], 2);
			const result = operation.apply(target);

			assert.deepEqual(result, { prop1: 2});
		},

		'Replace operation should throw an error when target property is missing.'(this: any) {
			const target = {};
			const operation = createOperation(OperationType.Replace, ['prop1'], 2);
			assert.throws(function() {
				operation.apply(target);
			}, /Cannot replace undefined path/);
		}
	},
	'Copy and Move Operation.': {
		'Copy operation should copy property over to the new property of the target.'(this: any) {
			const target = { prop1: 1 };
			const operation = createOperation(OperationType.Copy, ['prop2'], null, ['prop1']);
			const result = operation.apply(target);

			assert.deepEqual(result, { prop1: 1, prop2: 1});
		},

		'Copy operation should treat "undefined" normally.'(this: any) {
			const target = { prop1: undefined as number };
			const operation = createOperation(OperationType.Copy, ['prop2'], null, ['prop1']);
			const result = operation.apply(target);

			assert.deepEqual(result, { prop1: undefined, prop2: undefined});
		},

		'Copy operation should throw an error when fromPath is missing.'(this: any) {
			const fromPath: string[] = null;
			assert.throws(function() {
				createOperation(OperationType.Copy, ['any'], null, fromPath);
			}, /From value is required/);
		},

		'Copy operation should throw an error when source property is missing.'(this: any) {
			const target = {};
			const operation = createOperation(OperationType.Copy, ['prop2'], null, ['prop1']);
			assert.throws(function() {
				operation.apply(target);
			}, /Cannot move from undefined path/);

		},

		'Move operation should move property over to the new target.'(this: any) {
			const target = { prop1: 1 };
			const operation = createOperation(OperationType.Move, ['prop2'], null, ['prop1']);
			const result = operation.apply(target);

			assert.deepEqual(result, { prop2: 1});
		},

		'Move operation should treat "undefined" normally.'(this: any) {
			const target = { prop1: undefined as number };
			const operation = createOperation(OperationType.Move, ['prop2'], null, ['prop1']);
			const result = operation.apply(target);

			assert.deepEqual(result, { prop2: undefined});
		},

		'Move operation should throw an error when fromPath is missing.'(this: any) {
			const fromPath: string[] = null;
			assert.throws(function() {
				createOperation(OperationType.Move, ['any'], null, fromPath);
			}, /From value is required/);
		},

		'Move operation should throw an error when source property is missing.'(this: any) {
			const target = {};
			const operation = createOperation(OperationType.Move, ['prop2'], null, ['prop1']);
			assert.throws(function() {
				operation.apply(target);
			}, /Cannot move from undefined path/);

		}
	},
	'Test Operations.': {
		'Test operation should return true when testing property value matches given value.'(this: any) {
			const target = { prop1: 1 };
			const operation = createOperation(OperationType.Test, ['prop1'], 1);
			const result = operation.apply(target);

			assert.isTrue(result);
		},
		'Test operation should return false when testing property value doesn\'t match given value.'(this: any) {
			const target = { prop1: 1 };
			const operation = createOperation(OperationType.Test, ['prop1'], 2);
			const result = operation.apply(target);

			assert.isNotTrue(result);
		}
	},
	'Should throw an error when target is null.'(this: any) {
		const target = null as {};
		const operation = createOperation(OperationType.Add, ['prop1'], 1);
		assert.throws(function() {
			operation.apply(target);
		}, /Invalid path/);
	},
	'Should throw an error when path is not found.'(this: any) {
		const target = {};
		const operation = createOperation(OperationType.Add, ['prop1', 'prop2'], 1);
		assert.throws(function() {
			operation.apply(target);
		}, /Invalid path/);
	},
	'Should have a toString that describes the operation details.'(this: any) {

		const operation = createOperation(OperationType.Copy, ['prop1'], null, ['prop2']);
		assert.strictEqual(operation.toString(), '{"op":"copy","path":"prop1","from":"prop2"}');
	}
});
