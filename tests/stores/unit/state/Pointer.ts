const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

import { Pointer, walk } from './../../../src/state/Pointer';

describe('state/Pointer', () => {
	it('create pointer with string path', () => {
		const pointer = new Pointer('/foo/bar');
		assert.strictEqual(pointer.path, '/foo/bar');
		assert.deepEqual(pointer.segments, ['foo', 'bar']);
	});

	it('create pointer with array path', () => {
		const pointer = new Pointer(['foo', 'bar']);
		assert.strictEqual(pointer.path, '/foo/bar');
		assert.deepEqual(pointer.segments, ['foo', 'bar']);
	});

	it('create with special characters', () => {
		const pointer = new Pointer('/foo/bar~0~1');
		assert.strictEqual(pointer.path, '/foo/bar~0~1');
		assert.deepEqual(pointer.segments, ['foo', 'bar~/']);
	});

	it('create pointer for root should error', () => {
		assert.throws(
			() => {
				new Pointer('');
			},
			Error,
			'Access to the root is not supported.'
		);
		assert.throws(
			() => {
				new Pointer(['']);
			},
			Error,
			'Access to the root is not supported.'
		);
		assert.throws(
			() => {
				new Pointer('/');
			},
			Error,
			'Access to the root is not supported.'
		);
		assert.throws(
			() => {
				new Pointer(['/']);
			},
			Error,
			'Access to the root is not supported.'
		);
	});

	it('get', () => {
		const pointer = new Pointer('/foo/bar/3');
		const obj = { foo: { bar: [1, 2, 3, 4, 5, 6, 7] } };
		assert.strictEqual(pointer.get(obj), 4);
	});

	it('get last item in array', () => {
		const pointer = new Pointer('/foo/bar/-');
		const obj = { foo: { bar: [1, 2, 3, 4, 5, 6, 7] } };
		assert.strictEqual(pointer.get(obj), 7);
	});

	it('get deep path that does not exist', () => {
		const pointer = new Pointer('/foo/bar/qux');
		const obj = {};
		assert.strictEqual(pointer.get(obj), undefined);
		assert.deepEqual(obj, {});
	});

	it('walk deep path that does not exist with clone', () => {
		const pointer = new Pointer('/foo/bar/qux');
		const target = walk(pointer.segments, {}, true);
		assert.deepEqual(target.object, { foo: { bar: {} } });
		assert.deepEqual(target.target, {});
		assert.deepEqual(target.segment, 'qux');
	});

	it('walk deep path that does not exist not clone', () => {
		const pointer = new Pointer('/foo/bar/qux');
		const target = walk(pointer.segments, {}, false);
		assert.deepEqual(target.object, { foo: { bar: {} } });
		assert.deepEqual(target.target, {});
		assert.deepEqual(target.segment, 'qux');
	});

	it('should handle a path with no leading slash', () => {
		const pointer = new Pointer('foo/bar/qux');
		const target = walk(pointer.segments, {}, false);

		assert.deepEqual(target.object, { foo: { bar: {} } });
		assert.deepEqual(target.target, {});
		assert.deepEqual(target.segment, 'qux');
	});

	it('converts to a string path with toString', () => {
		const pointer = new Pointer('foo/bar/qux');
		const stringified = pointer.toString();
		assert.strictEqual(stringified, '/foo/bar/qux');
	});

	it('converts to a string path with toJSON', () => {
		const pointer = new Pointer('foo/bar/qux');
		const stringified = JSON.stringify(pointer);
		assert.strictEqual(stringified, '"/foo/bar/qux"');
	});
});
