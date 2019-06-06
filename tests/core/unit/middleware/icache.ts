const { it, describe, afterEach } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { sandbox } from 'sinon';

import iCacheMiddleware from '../../../../src/core/middleware/icache';
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
			properties: {}
		});
		const icache = callback({
			id: 'test',
			middleware: {
				cache,
				invalidator: invalidatorStub
			},
			properties: {}
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
			properties: {}
		});
		const icache = callback({
			id: 'test',
			middleware: {
				cache,
				invalidator: invalidatorStub
			},
			properties: {}
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
			properties: {}
		});
		const icache = callback({
			id: 'test',
			middleware: {
				cache,
				invalidator: invalidatorStub
			},
			properties: {}
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

	it('should be able to clear the cache', () => {
		const cache = cacheMiddleware().callback({
			id: 'cache-test',
			middleware: { destroy: sb.stub() },
			properties: {}
		});
		const icache = callback({
			id: 'test',
			middleware: {
				cache,
				invalidator: invalidatorStub
			},
			properties: {}
		});
		assert.isUndefined(icache.get('test'));
		icache.set('test', 'value');
		assert.strictEqual(icache.get('test'), 'value');
		icache.clear();
		assert.isUndefined(icache.get('test'));
	});
});
