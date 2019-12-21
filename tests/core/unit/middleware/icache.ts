const { it, describe, afterEach } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { sandbox } from 'sinon';

import iCacheMiddleware, { createICacheMiddleware } from '../../../../src/core/middleware/icache';
import cacheMiddleware from '../../../../src/core/middleware/cache';

const sb = sandbox.create();
const invalidatorStub = sb.stub();
const { callback } = iCacheMiddleware();

describe('icache middleware', () => {
	afterEach(() => {
		sb.resetHistory();
	});

	it('should invalidate when value is set to the cache', () => {
		const cache = cacheMiddleware().callback({
			id: 'cache-test',
			middleware: { destroy: sb.stub() },
			properties: () => ({}),
			children: () => []
		});
		const icache = callback({
			id: 'test',
			middleware: {
				cache,
				invalidator: invalidatorStub
			},
			properties: () => ({}),
			children: () => []
		});
		assert.isUndefined(icache.get('test'));
		assert.strictEqual('test', icache.getOrSet('test', 'test'));
		assert.isTrue(invalidatorStub.calledOnce);
		assert.strictEqual('test-two', icache.getOrSet('test-two', () => 'test-two'));
		assert.isTrue(invalidatorStub.calledTwice);
	});

	it('should invalidate when cache value is resolved and set resolved value as result', () => {
		const cache = cacheMiddleware().callback({
			id: 'cache-test',
			middleware: { destroy: sb.stub() },
			properties: () => ({}),
			children: () => []
		});
		const icache = callback({
			id: 'test',
			middleware: {
				cache,
				invalidator: invalidatorStub
			},
			properties: () => ({}),
			children: () => []
		});
		let resolverOne: any;
		let resolverTwo: any;
		const promiseOne = new Promise<string>((resolve) => {
			resolverOne = resolve;
		});
		const promiseTwo = new Promise<string>((resolve) => {
			resolverTwo = resolve;
		});
		assert.isUndefined(icache.getOrSet('test', () => promiseOne));
		assert.isUndefined(icache.getOrSet('test', () => promiseTwo));
		resolverTwo('two');
		return promiseTwo.then(() => {
			assert.isTrue(invalidatorStub.notCalled);
			resolverOne('one');
			return promiseOne.then(() => {
				assert.isTrue(invalidatorStub.calledOnce);
				assert.strictEqual('one', icache.getOrSet('test', () => promiseOne));
			});
		});
	});

	it('should invalidate allow cache value to replaced when calling set directly', () => {
		const cache = cacheMiddleware().callback({
			id: 'cache-test',
			middleware: { destroy: sb.stub() },
			properties: () => ({}),
			children: () => []
		});
		const icache = callback({
			id: 'test',
			middleware: {
				cache,
				invalidator: invalidatorStub
			},
			properties: () => ({}),
			children: () => []
		});
		let resolverOne: any;
		let resolverTwo: any;
		const promiseOne = new Promise<string>((resolve) => {
			resolverOne = resolve;
		});
		const promiseTwo = new Promise<string>((resolve) => {
			resolverTwo = resolve;
		});
		icache.set('test', () => promiseOne);
		assert.isUndefined(icache.get('test'));
		icache.set('test', () => promiseTwo);
		assert.isUndefined(icache.get('test'));
		resolverTwo('two');
		return promiseTwo.then(() => {
			assert.isTrue(invalidatorStub.calledOnce);
			resolverOne('one');
			return promiseOne.then(() => {
				assert.isTrue(invalidatorStub.calledOnce);
				assert.strictEqual('two', icache.getOrSet('test', () => promiseOne));
			});
		});
	});

	it('should not invalidate on set when invalidate option is set to false', () => {
		const cache = cacheMiddleware().callback({
			id: 'cache-test',
			middleware: { destroy: sb.stub() },
			properties: () => ({}),
			children: () => []
		});
		const icache = callback({
			id: 'test',
			middleware: {
				cache,
				invalidator: invalidatorStub
			},
			properties: () => ({}),
			children: () => []
		});

		icache.set('test', 'value');
		assert.strictEqual(icache.get('test'), 'value');
		assert.isTrue(invalidatorStub.calledOnce);
	});

	it('should support passing a promise factory to set and invalidate once resolved', async () => {
		const cache = cacheMiddleware().callback({
			id: 'cache-test',
			middleware: { destroy: sb.stub() },
			properties: () => ({}),
			children: () => []
		});
		const icache = callback({
			id: 'test',
			middleware: {
				cache,
				invalidator: invalidatorStub
			},
			properties: () => ({}),
			children: () => []
		});
		let resolverOne: any;
		const promiseOne = new Promise<string>((resolve) => {
			resolverOne = resolve;
		});
		icache.set('test', () => promiseOne);
		assert.isUndefined(icache.get('test'));
		invalidatorStub.notCalled;
		resolverOne('value');
		await promiseOne;

		assert.isTrue(invalidatorStub.calledOnce);
		assert.strictEqual(icache.get('test'), 'value');
	});

	it('should return true if the key exists', () => {
		const cache = cacheMiddleware().callback({
			id: 'cache-test',
			middleware: { destroy: sb.stub() },
			properties: () => ({}),
			children: () => []
		});
		const icache = callback({
			id: 'test',
			middleware: {
				cache,
				invalidator: invalidatorStub
			},
			properties: () => ({}),
			children: () => []
		});
		icache.set('test', 'value');
		assert.isTrue(icache.has('test'));
	});

	it('should remove value for the specified key from the cache', () => {
		const cache = cacheMiddleware().callback({
			id: 'cache-test',
			middleware: { destroy: sb.stub() },
			properties: () => ({}),
			children: () => []
		});
		const icache = callback({
			id: 'test',
			middleware: {
				cache,
				invalidator: invalidatorStub
			},
			properties: () => ({}),
			children: () => []
		});
		assert.isUndefined(icache.get('test'));
		icache.set('test', 'value');
		icache.set('test-two', 'value');
		assert.strictEqual(icache.get('test'), 'value');
		assert.strictEqual(icache.get('test-two'), 'value');
		icache.delete('test');
		assert.isUndefined(icache.get('test'));
		assert.strictEqual(icache.get('test-two'), 'value');
	});

	it('should be able to clear the cache', () => {
		const cache = cacheMiddleware().callback({
			id: 'cache-test',
			middleware: { destroy: sb.stub() },
			properties: () => ({}),
			children: () => []
		});
		const icache = callback({
			id: 'test',
			middleware: {
				cache,
				invalidator: invalidatorStub
			},
			properties: () => ({}),
			children: () => []
		});
		assert.isUndefined(icache.get('test'));
		icache.set('test', 'value');
		assert.strictEqual(icache.get('test'), 'value');
		icache.clear();
		assert.isUndefined(icache.get('test'));
	});

	describe('icache factory', () => {
		interface CacheContents {
			foo: string;
			bar: number;
		}

		it('should support setting the cache with a value, function or promise factory', async () => {
			const typedICache = createICacheMiddleware<CacheContents>();
			const cache = cacheMiddleware().callback({
				id: 'cache-test',
				middleware: { destroy: sb.stub() },
				properties: () => ({}),
				children: () => []
			});
			const icache = typedICache().callback({
				id: 'test',
				middleware: {
					cache,
					invalidator: invalidatorStub
				},
				properties: () => ({}),
				children: () => []
			});

			let resolver: any;
			const promise = new Promise<number>((resolve) => {
				resolver = resolve;
			});

			// type error for the icache key
			// assert.isUndefined(icache.get('other'));
			assert.isUndefined(icache.get('foo'));
			icache.set('foo', () => 'hello, typed world!');
			icache.set('bar', () => promise);
			// type error for returning an invalid type
			// icache.set('foo', () => 1);
			// icache.set('bar', () => new Promise((resolve) => resolve('')));
			resolver(34);
			await promise;
			assert.strictEqual(icache.get('foo'), 'hello, typed world!');
			assert.strictEqual(icache.get('bar'), 34);
		});
	});
});
