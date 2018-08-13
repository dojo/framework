import global from '../../../../src/shim/global';
const { describe, it, beforeEach } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { stub } from 'sinon';

import { collector, load } from './../../../../src/stores/middleware/localStorage';
import { Store } from './../../../../src/stores/Store';
import { CommandRequest, createProcess } from '../../../../src/stores/process';
import { PatchOperation, OperationType } from '../../../../src/stores/state/Patch';
import { Pointer } from '../../../../src/stores/state/Pointer';

function incrementCounter({ get, path }: CommandRequest<{ counter: number }>): PatchOperation[] {
	let counter = get(path('counter')) || 0;
	return [{ op: OperationType.REPLACE, path: new Pointer('/counter'), value: ++counter }];
}

const localStorageGetStub = stub();
const localStorageSetStub = stub();
const localStorageStub = {
	getItem: localStorageGetStub,
	setItem: localStorageSetStub
};

global.localStorage = localStorageStub;

let store: Store;

describe('middleware - local storage', () => {
	beforeEach(() => {
		store = new Store();
		localStorageGetStub.reset();
		localStorageSetStub.reset();
	});

	it('Should save state to local storage', () => {
		const incrementCounterProcess = createProcess(
			'increment',
			[incrementCounter],
			collector('local-storage-id', (path) => [path('counter')])
		);
		incrementCounterProcess(store)({});
		assert.isTrue(localStorageSetStub.calledWith('local-storage-id', '[{"meta":{"path":"/counter"},"state":1}]'));
	});

	it('Should call next middleware', () => {
		let composedMiddlewareCalled = false;
		const incrementCounterProcess = createProcess(
			'increment',
			[incrementCounter],
			collector(
				'local-storage-id',
				(path) => [path('counter')],
				(error, result) => {
					composedMiddlewareCalled = true;
				}
			)
		);
		incrementCounterProcess(store)({});
		assert.isTrue(composedMiddlewareCalled);
	});

	it('should load from local storage', () => {
		localStorageGetStub.withArgs('local-storage-id').returns('[{"meta":{"path":"/counter"},"state":1}]');
		load('local-storage-id', store);
		assert.deepEqual((store as any)._state, { counter: 1 });
	});

	it('should not load anything or throw an error if data does exist', () => {
		localStorageGetStub.withArgs('other-storage-id').returns('[{"meta":{"path":"/counter"},"state":1}]');
		load('local-storage-id', store);
		assert.deepEqual((store as any)._state, {});
	});
});
