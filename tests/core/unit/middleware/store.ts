const { it, describe, afterEach, beforeEach } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { sandbox } from 'sinon';

import { createProcess } from '../../../../src/stores/process';
import { replace } from '../../../../src/stores/state/operations';
import Store from '../../../../src/stores/Store';
import createStoreMiddleware from '../../../../src/core/middleware/store';

const sb = sandbox.create();
const destroyStub = sb.stub();
const invalidatorStub = sb.stub();
const injectorStub = {
	get: sb.stub(),
	subscribe: sb.stub()
};
let storeMiddleware = createStoreMiddleware();

describe('store middleware', () => {
	beforeEach(() => {
		storeMiddleware = createStoreMiddleware();
	});

	afterEach(() => {
		sb.resetHistory();
	});

	it('Should return data from store and subscribe to data changes for the path', () => {
		const { callback } = storeMiddleware();
		const store = callback({
			id: 'test',
			middleware: {
				destroy: destroyStub,
				invalidator: invalidatorStub,
				injector: injectorStub
			},
			properties: () => ({}),
			children: () => []
		});
		let result = store.get(store.path('my-state'));
		assert.isUndefined(result);
		const testProcess = createProcess('test', [
			({ path }) => {
				return [replace(path('my-state'), 'test-data')];
			}
		]);
		store.executor(testProcess)({});
		assert.isTrue(invalidatorStub.calledOnce);
		result = store.get(store.path('my-state'));
		assert.strictEqual(result, 'test-data');
	});

	it('Should be able to work with arrays in the store', () => {
		const { callback } = storeMiddleware();
		const store = callback({
			id: 'test',
			middleware: {
				destroy: destroyStub,
				invalidator: invalidatorStub,
				injector: injectorStub
			},
			properties: () => ({}),
			children: () => []
		});
		let result = store.get(store.path('my-state'));
		assert.isUndefined(result);
		let testProcess = createProcess('test', [
			({ path }) => {
				return [replace(path('my-state'), [1])];
			}
		]);
		store.executor(testProcess)({});
		assert.isTrue(invalidatorStub.calledOnce);
		result = store.get(store.at(store.path('my-state'), 0));
		assert.deepEqual(result, 1);
		testProcess = createProcess('test', [
			({ path, at }) => {
				return [replace(at(path('my-state'), 1), 2)];
			}
		]);
		store.executor(testProcess)({});
		assert.isTrue(invalidatorStub.calledTwice);
		result = store.get(store.at(store.path('my-state'), 1));
		assert.deepEqual(result, 2);
	});

	it('Should remove subscription handles when destroyed', () => {
		const { callback } = storeMiddleware();
		const store = callback({
			id: 'test',
			middleware: {
				destroy: destroyStub,
				invalidator: invalidatorStub,
				injector: injectorStub
			},
			properties: () => ({}),
			children: () => []
		});
		let result = store.get(store.path('my-state'));
		assert.isUndefined(result);
		let testProcess = createProcess('test', [
			({ path }) => {
				return [replace(path('my-state'), 'test-data')];
			}
		]);
		store.executor(testProcess)({});
		assert.isTrue(invalidatorStub.calledOnce);
		result = store.get(store.path('my-state'));
		assert.strictEqual(result, 'test-data');
		destroyStub.getCall(0).callArg(0);
		testProcess = createProcess('test', [
			({ path }) => {
				return [replace(path('my-state'), 'test')];
			}
		]);
		store.executor(testProcess)({});
		assert.isTrue(invalidatorStub.calledOnce);
		result = store.get(store.path('my-state'));
		assert.strictEqual(result, 'test');
	});

	it('Should use an injected store if available', () => {
		const { callback } = storeMiddleware();
		const injectedStore = new Store();
		let testProcess = createProcess('test', [
			({ path }) => {
				return [replace(path('my', 'nested', 'state'), 'existing-data')];
			}
		]);
		testProcess(injectedStore)({});
		injectorStub.get.returns(injectedStore);
		const store = callback({
			id: 'test',
			middleware: {
				destroy: destroyStub,
				invalidator: invalidatorStub,
				injector: injectorStub
			},
			properties: () => ({}),
			children: () => []
		});
		const result = store.get(store.path('my', 'nested', 'state'));
		assert.strictEqual(result, 'existing-data');
		const otherStore = callback({
			id: 'test',
			middleware: {
				destroy: destroyStub,
				invalidator: invalidatorStub,
				injector: injectorStub
			},
			properties: () => ({}),
			children: () => []
		});
		const resultTwo = otherStore.get(store.path('my', 'nested', 'state'));
		assert.strictEqual(resultTwo, 'existing-data');
	});

	it('Should run initialize function on creation', () => {
		const init = sb.stub();
		storeMiddleware = createStoreMiddleware(init);
		assert.isTrue(init.calledOnce);
	});
});
