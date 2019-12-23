const { it, describe, afterEach } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { stub } from 'sinon';

import cacheMiddleware from '../../../../src/core/middleware/cache';
import icacheMiddleware from '../../../../src/core/middleware/icache';

const destroyStub = stub();

describe('cache middleware', () => {
	afterEach(() => {
		destroyStub.resetHistory();
	});

	it('should be able to store and retrieve values from the cache', () => {
		const icache = icacheMiddleware().callback({
			id: 'cache-test',
			middleware: { destroy: stub(), invalidator: stub() },
			properties: () => ({}),
			children: () => []
		});
		const { callback } = cacheMiddleware();
		const cache = callback({
			id: 'test',
			middleware: {
				icache
			},
			properties: () => ({}),
			children: () => []
		});
		assert.isUndefined(cache.get('test'));
		cache.set('test', 'value');
		assert.strictEqual(cache.get('test'), 'value');
	});

	it('should return true if the key exists', () => {
		const icache = icacheMiddleware().callback({
			id: 'cache-test',
			middleware: { destroy: stub(), invalidator: stub() },
			properties: () => ({}),
			children: () => []
		});
		const cache = cacheMiddleware().callback({
			id: 'cache-test',
			middleware: { icache },
			properties: () => ({}),
			children: () => []
		});
		cache.set('test', 'value');
		assert.isTrue(cache.has('test'));
	});

	it('should remove value for the specified key from the cache', () => {
		const icache = icacheMiddleware().callback({
			id: 'cache-test',
			middleware: { destroy: stub(), invalidator: stub() },
			properties: () => ({}),
			children: () => []
		});
		const cache = cacheMiddleware().callback({
			id: 'cache-test',
			middleware: { icache },
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
		const icache = icacheMiddleware().callback({
			id: 'cache-test',
			middleware: { destroy: stub(), invalidator: stub() },
			properties: () => ({}),
			children: () => []
		});
		const { callback } = cacheMiddleware();
		const cache = callback({
			id: 'test',
			middleware: {
				icache
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
