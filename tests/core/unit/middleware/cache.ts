const { it, describe, afterEach } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { stub } from 'sinon';

import cacheMiddleware from '../../../../src/core/middleware/cache';

const destroyStub = stub();

describe('cache middleware', () => {
	afterEach(() => {
		destroyStub.resetHistory();
	});

	it('should be able to store and retrieve values from the cache', () => {
		const { callback } = cacheMiddleware();
		const cache = callback({
			id: 'test',
			middleware: {
				destroy: destroyStub
			},
			properties: () => ({}),
			children: () => []
		});
		assert.isUndefined(cache.get('test'));
		cache.set('test', 'value');
		assert.strictEqual(cache.get('test'), 'value');
	});

	it('should register destroy to clear the map', () => {
		const { callback } = cacheMiddleware();
		const cache = callback({
			id: 'test',
			middleware: {
				destroy: destroyStub
			},
			properties: () => ({}),
			children: () => []
		});
		cache.set('test', 'value');
		assert.isTrue(destroyStub.calledOnce);
		destroyStub.getCall(0).callArg(0);
		assert.isUndefined(cache.get('test'));
	});

	it('should return true if the key exists', () => {
		const cache = cacheMiddleware().callback({
			id: 'cache-test',
			middleware: { destroy: destroyStub },
			properties: () => ({}),
			children: () => []
		});
		cache.set('test', 'value');
		assert.isTrue(cache.has('test'));
	});

	it('should remove value for the specified key from the cache', () => {
		const cache = cacheMiddleware().callback({
			id: 'cache-test',
			middleware: { destroy: destroyStub },
			properties: () => ({}),
			children: () => []
		});
		assert.isUndefined(cache.get('test'));
		cache.set('test', 'value');
		cache.set('test-two', 'value');
		assert.strictEqual(cache.get('test'), 'value');
		assert.strictEqual(cache.get('test-two'), 'value');
		cache.delete('test');
		assert.isUndefined(cache.get('test'));
		assert.strictEqual(cache.get('test-two'), 'value');
	});

	it('should be able to clear the cache', () => {
		const { callback } = cacheMiddleware();
		const cache = callback({
			id: 'test',
			middleware: {
				destroy: destroyStub
			},
			properties: () => ({}),
			children: () => []
		});
		assert.isUndefined(cache.get('test'));
		cache.set('test', 'value');
		assert.strictEqual(cache.get('test'), 'value');
		cache.clear();
		assert.isUndefined(cache.get('test'));
	});
});
