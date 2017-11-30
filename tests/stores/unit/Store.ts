const { beforeEach, describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

import { Store } from './../../src/Store';
import { OperationType, PatchOperation } from './../../src/state/Patch';
import { Pointer } from './../../src/state/Pointer';

let store: Store = new Store();

const testPatchOperations: PatchOperation[] = [
	{ op: OperationType.ADD, path: new Pointer('/test'), value: 'test'}
];

describe('store',  () => {
	beforeEach(() => {
		store = new Store();
	});

	it('create store', () => {
		assert.isOk(store);
	});

	it('apply/get', () => {
		const undo = store.apply(testPatchOperations);

				assert.strictEqual(store.get(store.path('test')), 'test');
				assert.deepEqual(undo, [
					{ op: OperationType.TEST, path: new Pointer('/test'), value: 'test' },
					{ op: OperationType.REMOVE, path: new Pointer('/test') }
				]);
	});

	it('invalidate', () => {
		let invalidateEmitted = false;
		store.on('invalidate', () => {
			invalidateEmitted = true;
		});
		store.invalidate();
		assert.isTrue(invalidateEmitted);
	});

	describe('paths', () => {
		let store: Store<{ foo: { bar: string }, baz: number[] }>;

		beforeEach(() => {
			store = new Store<{ foo: { bar: string }, baz: number[] }>();
			store.apply([
				{ op: OperationType.ADD, path: new Pointer('/foo'), value: { bar: 'bar' } },
				{ op: OperationType.ADD, path: new Pointer('/baz'), value: [ 5 ] }
			]);
		});

		it('should return the correct type based on the path provided', () => {
			const bar = store.get(store.path('foo', 'bar'));
			assert.strictEqual(bar.trim(), 'bar');
		});

		it('should be able to combine partial paths', () => {
			const bar = store.get(store.path(store.path('foo'), 'bar'));
			assert.strictEqual(bar.trim(), 'bar');
		});

		it('should be able to return a path for an index in an array', () => {
			const five = store.get(store.at(store.path('baz'), 0));

			assert.strictEqual(five, 5);
		});

		it('should not return the root', () => {
			assert.throws(() => {
				store.get(store.path('' as any));
			}, Error, 'Access to the root is not supported.');
		});
	});
});
