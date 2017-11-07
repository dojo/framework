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

				assert.strictEqual(store.get('/test'), 'test');
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

});
