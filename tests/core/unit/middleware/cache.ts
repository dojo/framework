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
			properties: {}
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
			properties: {}
		});
		cache.set('test', 'value');
		assert.isTrue(destroyStub.calledOnce);
		destroyStub.getCall(0).callArg(0);
		assert.isUndefined(cache.get('test'));
	});
});
