const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

import * as operations from './../../../src/state/operations';
import { OperationType } from './../../../src/state/Patch';
import { Pointer } from './../../../src/state/Pointer';

describe('state/operations', () => {

	it('add()', () => {
		const result = operations.add({ path: '/test', state: null, value: null }, 'test');
		assert.deepEqual(result, {
			op: OperationType.ADD,
			path: new Pointer('/test'),
			value: 'test'
		});
	});

	it('remove()', () => {
		const result = operations.remove({ path:  '/test', state: null, value: null });
		assert.deepEqual(result, {
			op: OperationType.REMOVE,
			path: new Pointer('/test')
		});
	});

	it('replace()', () => {
		const result = operations.replace({ path: '/test', state: null, value: null }, 'test');
		assert.deepEqual(result, {
			op: OperationType.REPLACE,
			path: new Pointer('/test'),
			value: 'test'
		});
	});

	it('test()', () => {
		const result = operations.test({ path: '/test', state: null, value: null }, 'test');
		assert.deepEqual(result, {
			op: OperationType.TEST,
			path: new Pointer('/test'),
			value: 'test'
		});
	});

});
