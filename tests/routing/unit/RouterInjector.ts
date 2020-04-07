const { suite, test } = intern.getInterface('tdd');
const { assert } = intern.getPlugin('chai');
import { spy } from 'sinon';
import { Registry } from '../../../src/core/Registry';
import { registerRouterInjector } from '../../../src/routing/RouterInjector';
import { MemoryHistory } from '../../../src/routing/history/MemoryHistory';

suite('RouterInjector', () => {
	test('registerRouterInjector', () => {
		const registry = new Registry();
		const router = registerRouterInjector([{ path: 'path', outlet: 'path', id: 'path' }], registry, {
			HistoryManager: MemoryHistory
		});
		const { injector, invalidator } = registry.getInjector('router')!;
		assert.isNotNull(injector);
		assert.strictEqual(injector(), router);
		const invalidatorSpy = spy(invalidator, 'emit');
		router.emit({ type: 'nav' });
		assert.isTrue(invalidatorSpy.calledOnce);
	});

	test('registerRouterInjector with custom key', () => {
		const registry = new Registry();
		const router = registerRouterInjector([{ path: 'path', outlet: 'path', id: 'path' }], registry, {
			HistoryManager: MemoryHistory,
			key: 'custom-key'
		});
		const { injector, invalidator } = registry.getInjector('custom-key')!;
		const invalidatorSpy = spy(invalidator, 'emit');
		assert.isNotNull(injector);
		const registeredRouter = injector();
		assert.strictEqual(router, registeredRouter);
		router.emit({ type: 'nav' });
		assert.isTrue(invalidatorSpy.calledOnce);
	});

	test('throws error if a second router is registered for the same key', () => {
		const registry = new Registry();
		registerRouterInjector([{ path: 'path', outlet: 'path', id: 'path' }], registry, {
			HistoryManager: MemoryHistory
		});
		assert.throws(
			() => {
				registerRouterInjector([{ path: 'path', outlet: 'path', id: 'path' }], registry, {
					HistoryManager: MemoryHistory
				});
			},
			Error,
			'Router has already been defined'
		);
	});
});
