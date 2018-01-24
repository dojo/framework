const { suite, test } = intern.getInterface('tdd');
const { assert } = intern.getPlugin('chai');
import { Registry } from '@dojo/widget-core/Registry';
import { Injector } from '@dojo/widget-core/Injector';
import { registerRouterInjector } from '../../src/RouterInjector';
import { MemoryHistory } from '../../src/history/MemoryHistory';

suite('RouterInjector', () => {
	test('registerRouterInjector', () => {
		let invalidateCalled = false;
		const registry = new Registry();
		const router = registerRouterInjector([{ path: 'path', outlet: 'path' }], registry, {
			HistoryManager: MemoryHistory
		});
		const injector = registry.getInjector('router') as Injector;
		assert.isNotNull(injector);
		assert.strictEqual(injector.get(), router);
		injector.on('invalidate', () => {
			invalidateCalled = true;
		});
		router.emit({ type: 'navstart' });
		assert.isTrue(invalidateCalled);
	});

	test('registerRouterInjector with custom key', () => {
		let invalidateCalled = false;
		const registry = new Registry();
		const router = registerRouterInjector([{ path: 'path', outlet: 'path' }], registry, {
			HistoryManager: MemoryHistory,
			key: 'custom-key'
		});
		const injector = registry.getInjector('custom-key') as Injector;
		assert.isNotNull(injector);
		const registeredRouter = injector.get();
		assert.strictEqual(injector.get(), registeredRouter);
		injector.on('invalidate', () => {
			invalidateCalled = true;
		});
		router.emit({ type: 'navstart' });
		assert.isTrue(invalidateCalled);
	});

	test('throws error if a second router is registered for the same key', () => {
		const registry = new Registry();
		registerRouterInjector([{ path: 'path', outlet: 'path' }], registry, { HistoryManager: MemoryHistory });
		assert.throws(
			() => {
				registerRouterInjector([{ path: 'path', outlet: 'path' }], registry, { HistoryManager: MemoryHistory });
			},
			Error,
			'Router has already been defined'
		);
	});
});
