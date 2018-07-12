const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

import { Pointer } from './../../../src/state/Pointer';
import { Patch, OperationType } from './../../../src/state/Patch';
import * as ops from './../../../src/state/operations';

describe('state/Patch', () => {
	describe('add', () => {
		it('value to new path', () => {
			const patch = new Patch(ops.add({ path: 'test', state: null, value: null }, 'test'));
			const obj = {};
			const result = patch.apply(obj);
			assert.notStrictEqual(result.object, obj);
			assert.deepEqual(result.object, { test: 'test' });
			assert.deepEqual(result.undoOperations, [
				{ op: OperationType.TEST, path: new Pointer('/test'), value: 'test' },
				{ op: OperationType.REMOVE, path: new Pointer('/test') }
			]);
		});

		it('value to new nested path', () => {
			const patch = new Patch(ops.add({ path: '/foo/bar/qux', state: null, value: null }, 'test'));
			const obj = {};
			const result = patch.apply(obj);
			assert.notStrictEqual(result.object, obj);
			assert.deepEqual(result.object, { foo: { bar: { qux: 'test' } } });
			assert.deepEqual(result.undoOperations, [
				{ op: OperationType.TEST, path: new Pointer('/foo/bar/qux'), value: 'test' },
				{ op: OperationType.REMOVE, path: new Pointer('/foo/bar/qux') }
			]);
		});

		it('value to existing path', () => {
			const patch = new Patch(ops.add({ path: '/test', state: null, value: null }, 'test'));
			const obj = { test: true };
			const result = patch.apply(obj);
			assert.notStrictEqual(result.object, obj);
			assert.deepEqual(result.object, { test: 'test' });
			assert.deepEqual(result.undoOperations, [
				{ op: OperationType.TEST, path: new Pointer('/test'), value: 'test' },
				{ op: OperationType.REMOVE, path: new Pointer('/test') }
			]);
		});

		it('value to array index path', () => {
			const patch = new Patch(ops.add({ path: '/test/0', state: null, value: null }, 'test'));
			const obj = { test: [] };
			const result = patch.apply(obj);
			assert.notStrictEqual(result.object, obj);
			assert.deepEqual(result.object, { test: ['test'] });
			assert.deepEqual(result.undoOperations, [
				{ op: OperationType.TEST, path: new Pointer('/test/0'), value: 'test' },
				{ op: OperationType.REMOVE, path: new Pointer('/test/0') }
			]);
		});
	});

	describe('replace', () => {
		it('new path', () => {
			const patch = new Patch(ops.replace({ path: '/test', state: null, value: null }, 'test'));
			const obj = {};
			const result = patch.apply(obj);
			assert.notStrictEqual(result.object, obj);
			assert.deepEqual(result.object, { test: 'test' });
			assert.deepEqual(result.undoOperations, [
				{ op: OperationType.TEST, path: new Pointer('/test'), value: 'test' },
				{ op: OperationType.REMOVE, path: new Pointer('/test') }
			]);
		});

		it('value to new nested path', () => {
			const patch = new Patch(ops.replace({ path: '/foo/bar/qux', state: null, value: null }, 'test'));
			const obj = {};
			const result = patch.apply(obj);
			assert.notStrictEqual(result.object, obj);
			assert.deepEqual(result.object, { foo: { bar: { qux: 'test' } } });
			assert.deepEqual(result.undoOperations, [
				{ op: OperationType.TEST, path: new Pointer('/foo/bar/qux'), value: 'test' },
				{ op: OperationType.REMOVE, path: new Pointer('/foo/bar/qux') }
			]);
		});

		it('existing path', () => {
			const patch = new Patch(ops.replace({ path: '/test', state: null, value: null }, 'test'));
			const obj = { test: true };
			const result = patch.apply(obj);
			assert.notStrictEqual(result.object, obj);
			assert.deepEqual(result.object, { test: 'test' });
			assert.deepEqual(result.undoOperations, [
				{ op: OperationType.TEST, path: new Pointer('/test'), value: 'test' },
				{ op: OperationType.REPLACE, path: new Pointer('/test'), value: true }
			]);
		});

		it('array index path', () => {
			const patch = new Patch(ops.replace({ path: '/test/1', state: null, value: null }, 'test'));
			const obj = { test: ['test', 'foo'] };
			const result = patch.apply(obj);
			assert.notStrictEqual(result.object, obj);
			assert.deepEqual(result.object, { test: ['test', 'test'] });
			assert.deepEqual(result.undoOperations, [
				{ op: OperationType.TEST, path: new Pointer('/test/1'), value: 'test' },
				{ op: OperationType.REPLACE, path: new Pointer('/test/1'), value: 'foo' }
			]);
		});
	});

	describe('remove', () => {
		it('new path', () => {
			const patch = new Patch(ops.remove({ path: '/test', state: null, value: null }));
			const obj = { other: true };
			const result = patch.apply(obj);
			assert.notStrictEqual(result.object, obj);
			assert.deepEqual(result.object, { other: true });
			assert.deepEqual(result.undoOperations, [
				{ op: OperationType.ADD, path: new Pointer('/test'), value: undefined }
			]);
		});

		it('existing path', () => {
			const patch = new Patch(ops.remove({ path: '/test', state: null, value: null }));
			const obj = { test: true };
			const result = patch.apply(obj);
			assert.notStrictEqual(result.object, obj);
			assert.deepEqual(result.object, {});
			assert.deepEqual(result.undoOperations, [
				{ op: OperationType.ADD, path: new Pointer('/test'), value: true }
			]);
		});

		it('array index path', () => {
			const patch = new Patch(ops.remove({ path: '/test/1', state: null, value: null }));
			const obj = { test: ['test', 'foo'] };
			const result = patch.apply(obj);
			assert.notStrictEqual(result.object, obj);
			assert.deepEqual(result.object, { test: ['test'] });
			assert.deepEqual(result.undoOperations, [
				{ op: OperationType.ADD, path: new Pointer('/test/1'), value: 'foo' }
			]);
		});
	});

	describe('test', () => {
		it('success', () => {
			const patch = new Patch(ops.test({ path: '/test', state: null, value: null }, 'test'));
			const obj = { test: 'test' };
			const result = patch.apply(obj);
			assert.strictEqual(result.object, obj);
		});

		it('failure', () => {
			const patch = new Patch(ops.test({ path: '/test', state: null, value: null }, true));
			const obj = { test: 'test' };
			assert.throws(
				() => {
					patch.apply(obj);
				},
				Error,
				'Test operation failure. Unable to apply any operations.'
			);
		});

		it('nested path', () => {
			const patch = new Patch(ops.test({ path: '/foo/0/bar/baz/0/qux', state: null, value: null }, true));
			const obj = {
				foo: [
					{
						bar: {
							baz: [
								{
									qux: true
								}
							]
						}
					}
				]
			};
			const result = patch.apply(obj);
			assert.strictEqual(result.object, obj);
		});

		it('complex value', () => {
			const patch = new Patch(
				ops.test({ path: '/foo', state: null, value: null }, [
					{
						bar: {
							baz: [
								{
									qux: true
								}
							]
						}
					}
				])
			);
			const obj = {
				foo: [
					{
						bar: {
							baz: [
								{
									qux: true
								}
							]
						}
					}
				]
			};
			const result = patch.apply(obj);
			assert.strictEqual(result.object, obj);
		});

		it('no value', () => {
			const patch = new Patch(ops.test({ path: '/test', state: null, value: null }, 'test'));
			const obj = { test: 'test' };
			const result = patch.apply(obj);
			assert.strictEqual(result.object, obj);
		});
	});

	it('unknown', () => {
		const patch = new Patch({
			op: 'unknown',
			path: new Pointer('/test')
		} as any);
		assert.throws(
			() => {
				patch.apply({});
			},
			Error,
			'Unknown operation'
		);
	});
});
