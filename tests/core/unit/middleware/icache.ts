const { it, describe, afterEach } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { sandbox } from 'sinon';

import iCacheMiddleware, { createICacheMiddleware } from '../../../../src/core/middleware/icache';

const sb = sandbox.create();
const invalidatorStub = sb.stub();
const { callback } = iCacheMiddleware();

describe('icache middleware', () => {
	afterEach(() => {
		sb.resetHistory();
	});

	it('should invalidate when value is set to the cache', () => {
		const icache = callback({
			id: 'test',
			middleware: {
				destroy: sb.stub(),
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
		const icache = callback({
			id: 'test',
			middleware: {
				destroy: sb.stub(),
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
		const icache = callback({
			id: 'test',
			middleware: {
				destroy: sb.stub(),
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
		const icache = callback({
			id: 'test',
			middleware: {
				destroy: sb.stub(),
				invalidator: invalidatorStub
			},
			properties: () => ({}),
			children: () => []
		});

		icache.set('test', 'value', false);
		assert.strictEqual(icache.get('test'), 'value');
		assert.isTrue(invalidatorStub.notCalled);
	});

	it('should support passing a promise factory to set and invalidate once resolved', async () => {
		const icache = callback({
			id: 'test',
			middleware: {
				destroy: sb.stub(),
				invalidator: invalidatorStub
			},
			properties: () => ({}),
			children: () => []
		});
		let resolverOne: any;
		const promiseOne = new Promise<string>((resolve) => {
			resolverOne = resolve;
		});
		assert.isFalse(icache.pending('test'));
		icache.set('test', () => promiseOne);
		assert.isUndefined(icache.get('test'));
		assert.isTrue(icache.pending('test'));
		assert.isTrue(invalidatorStub.calledOnce);
		resolverOne('value');
		await promiseOne;

		assert.isTrue(invalidatorStub.calledTwice);
		assert.isFalse(icache.pending('test'));
		assert.strictEqual(icache.get('test'), 'value');
	});

	it('should return true if the key exists', () => {
		const icache = callback({
			id: 'test',
			middleware: {
				destroy: sb.stub(),
				invalidator: invalidatorStub
			},
			properties: () => ({}),
			children: () => []
		});
		icache.set('test', 'value');
		assert.isTrue(icache.has('test'));
	});

	it('should inject current value into function', () => {
		const icache = callback({
			id: 'test',
			middleware: {
				destroy: sb.stub(),
				invalidator: invalidatorStub
			},
			properties: () => ({}),
			children: () => []
		});
		let value = icache.set('test', (value) => {
			return `${value}-next`;
		});
		assert.strictEqual(value, 'undefined-next');
		value = icache.set('test', (value) => {
			return `${value}-next`;
		});
		assert.strictEqual(value, 'undefined-next-next');
		assert.strictEqual(icache.get('test'), 'undefined-next-next');
	});

	it('should remove value for the specified key from the cache', () => {
		const icache = callback({
			id: 'test',
			middleware: {
				destroy: sb.stub(),
				invalidator: invalidatorStub
			},
			properties: () => ({}),
			children: () => []
		});
		assert.isUndefined(icache.get('test'));
		icache.set('test', 'value');
		icache.set('test-two', 'value');
		assert.isTrue(invalidatorStub.calledTwice);
		assert.strictEqual(icache.get('test'), 'value');
		assert.strictEqual(icache.get('test-two'), 'value');
		icache.delete('test');
		assert.isTrue(invalidatorStub.calledThrice);
		assert.isUndefined(icache.get('test'));
		assert.strictEqual(icache.get('test-two'), 'value');
		icache.delete('test', false);
		assert.isTrue(invalidatorStub.calledThrice);
	});

	it('should be able to clear the cache', () => {
		const icache = callback({
			id: 'test',
			middleware: {
				destroy: sb.stub(),
				invalidator: invalidatorStub
			},
			properties: () => ({}),
			children: () => []
		});
		assert.isUndefined(icache.get('test'));
		icache.set('test', 'value');
		assert.isTrue(invalidatorStub.calledOnce);
		assert.strictEqual(icache.get('test'), 'value');
		icache.clear();
		assert.isTrue(invalidatorStub.calledTwice);
		assert.isUndefined(icache.get('test'));
		icache.clear(false);
		assert.isTrue(invalidatorStub.calledTwice);
	});

	describe('icache factory', () => {
		interface CacheContents {
			foo: string;
			bar: number;
		}

		it('should support setting the cache with a value, function or promise factory', async () => {
			const typedICache = createICacheMiddleware<CacheContents>();
			const icache = typedICache().callback({
				id: 'test',
				middleware: {
					destroy: sb.stub(),
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

		it('should inject current value into function', () => {
			const typedICache = createICacheMiddleware<CacheContents>();
			const icache = typedICache().callback({
				id: 'test',
				middleware: {
					destroy: sb.stub(),
					invalidator: invalidatorStub
				},
				properties: () => ({}),
				children: () => []
			});
			let value = icache.set('bar', (value) => {
				return value === undefined ? 0 : value + 1;
			});
			assert.strictEqual(value, 0);
			value = icache.set('bar', (value) => {
				return value === undefined ? 0 : value + 1;
			});
			assert.strictEqual(value, 1);
			assert.strictEqual(icache.get('bar'), 1);
		});
	});
});
