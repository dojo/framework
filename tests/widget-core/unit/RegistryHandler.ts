const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import RegistryHandler from '../../src/RegistryHandler';
import Registry from '../../src/Registry';
import { WidgetBase } from '../../src/WidgetBase';
import { Injector } from './../../src/Injector';

const foo = Symbol();
const bar = Symbol();

class GlobalWidget extends WidgetBase {}
const globalInjector = new Injector({});

const registry = new Registry();
registry.define('foo', GlobalWidget);
registry.define(foo, GlobalWidget);
registry.defineInjector('foo', globalInjector);
registry.defineInjector(foo, globalInjector);

class LocalWidget extends WidgetBase {}

registerSuite('RegistryHandler', {
	widget: {
		has: {
			base() {
				const registryHandler = new RegistryHandler();
				registryHandler.base = registry;
				assert.isTrue(registryHandler.has('foo'));
				assert.isTrue(registryHandler.has(foo));
			},
			local() {
				const registryHandler = new RegistryHandler();
				registryHandler.base = registry;
				registryHandler.define('bar', LocalWidget);
				registryHandler.define(bar, LocalWidget);
				assert.isTrue(registryHandler.has('bar'));
				assert.isTrue(registryHandler.has(bar));
			}
		},
		get: {
			base() {
				const registryHandler = new RegistryHandler();
				registryHandler.base = registry;
				assert.equal(registryHandler.get('foo'), GlobalWidget);
				assert.equal(registryHandler.get(foo), GlobalWidget);
			},
			local() {
				const registryHandler = new RegistryHandler();
				registryHandler.base = registry;
				registryHandler.define('foo', LocalWidget);
				registryHandler.define(foo, LocalWidget);
				assert.equal(registryHandler.get('foo'), LocalWidget);
				assert.equal(registryHandler.get(foo), LocalWidget);
			},
			'with global precedence'() {
				const registryHandler = new RegistryHandler();
				registryHandler.base = registry;
				registryHandler.define('foo', LocalWidget);
				registryHandler.define(foo, LocalWidget);
				assert.equal(registryHandler.get('foo', true), GlobalWidget);
				assert.equal(registryHandler.get(foo, true), GlobalWidget);
			},
			'invalidates when registry emits loaded event (only once)'() {
				const registryHandler = new RegistryHandler();
				const registry = new Registry();
				registryHandler.base = registry;
				let invalidateCount = 0;
				registryHandler.on('invalidate', () => {
					invalidateCount++;
				});

				registryHandler.get('global');
				registryHandler.get('global');
				registryHandler.get('global');
				registry.define('global', GlobalWidget);
				assert.strictEqual(invalidateCount, 1);
			},
			'invalidates when primary registry emits loaded event even when widget is loaded in secondary registry'() {
				const registryHandler = new RegistryHandler();
				const registry = new Registry();
				registryHandler.base = registry;
				let invalidateCount = 0;
				registryHandler.on('invalidate', () => {
					invalidateCount++;
				});

				registryHandler.get('global');
				registryHandler.get('global');
				registry.define('global', GlobalWidget);
				assert.strictEqual(invalidateCount, 1);
				registryHandler.define('global', LocalWidget);
				assert.strictEqual(invalidateCount, 2);
			},
			'no loaded event listeners once the widget is fully loaded (into primary registry)'() {
				const registryHandler = new RegistryHandler();
				const registry = new Registry();
				registryHandler.base = registry;
				let invalidateCount = 0;
				registryHandler.on('invalidate', () => {
					invalidateCount++;
				});

				registryHandler.get('global');
				registryHandler.define('global', LocalWidget);
				assert.strictEqual(invalidateCount, 1);
				registry.emit({ type: 'global', action: 'other' });
				assert.strictEqual(invalidateCount, 1);
			},
			'no `invalidate` events emitted once the with registry with the highest precedence has loaded'() {
				const registryHandler = new RegistryHandler();
				const registry = new Registry();
				registryHandler.base = registry;
				let invalidateCount = 0;
				registryHandler.on('invalidate', () => {
					invalidateCount++;
				});
				registryHandler.get('widget');
				registryHandler.define('widget', LocalWidget);
				assert.strictEqual(invalidateCount, 1);
				registry.define('widget', GlobalWidget);
				assert.strictEqual(invalidateCount, 1);
			},
			'no `invalidate` events emitted once the with registry with the highest precedence has loaded - with global'() {
				const registryHandler = new RegistryHandler();
				const registry = new Registry();
				registryHandler.base = registry;
				let invalidateCount = 0;
				registryHandler.on('invalidate', () => {
					invalidateCount++;
				});
				registryHandler.get('widget', true);
				registry.define('widget', GlobalWidget);
				assert.strictEqual(invalidateCount, 1);
				registryHandler.define('widget', LocalWidget);
				assert.strictEqual(invalidateCount, 1);
			},
			'ignores unknown event actions'() {
				const registryHandler = new RegistryHandler();
				const registry = new Registry();
				let invalidateCount = 0;
				registryHandler.on('invalidate', () => {
					invalidateCount++;
				});

				registryHandler.get('global');
				registryHandler.base = registry;
				registryHandler.get('global');
				registry.emit({ type: 'global', action: 'other' });
				assert.strictEqual(invalidateCount, 0);
				registryHandler.get('global', true);
				registry.emit({ type: 'global', action: 'other' });
				assert.strictEqual(invalidateCount, 0);
			}
		}
	},
	injector: {
		has: {
			base() {
				const registryHandler = new RegistryHandler();
				registryHandler.base = registry;
				assert.isTrue(registryHandler.hasInjector('foo'));
				assert.isTrue(registryHandler.hasInjector(foo));
			},
			local() {
				const registryHandler = new RegistryHandler();
				registryHandler.base = registry;
				const localInjector = new Injector({});
				registryHandler.defineInjector('bar', localInjector);
				registryHandler.defineInjector(bar, localInjector);
				assert.isTrue(registryHandler.hasInjector('bar'));
				assert.isTrue(registryHandler.hasInjector(bar));
			}
		},
		get: {
			base() {
				const registryHandler = new RegistryHandler();
				registryHandler.base = registry;
				assert.equal(registryHandler.getInjector('foo'), globalInjector);
				assert.equal(registryHandler.getInjector(foo), globalInjector);
			},
			local() {
				const registryHandler = new RegistryHandler();
				registryHandler.base = registry;
				const localInjector = new Injector({});
				registryHandler.defineInjector('foo', localInjector);
				registryHandler.defineInjector(foo, localInjector);
				assert.equal(registryHandler.getInjector('foo'), localInjector);
				assert.equal(registryHandler.getInjector(foo), localInjector);
			},
			'with global precedence'() {
				const registryHandler = new RegistryHandler();
				registryHandler.base = registry;
				const localInjector = new Injector({});
				registryHandler.defineInjector('foo', localInjector);
				registryHandler.defineInjector(foo, localInjector);
				assert.equal(registryHandler.getInjector('foo', true), globalInjector);
				assert.equal(registryHandler.getInjector(foo, true), globalInjector);
			},
			'invalidates when registry emits loaded event (only once)'() {
				const registryHandler = new RegistryHandler();
				const registry = new Registry();
				registryHandler.base = registry;
				let invalidateCount = 0;
				registryHandler.on('invalidate', () => {
					invalidateCount++;
				});

				registryHandler.getInjector('global');
				registryHandler.getInjector('global');
				registryHandler.getInjector('global');
				registry.defineInjector('global', globalInjector);
				assert.strictEqual(invalidateCount, 1);
			},
			'invalidates when primary registry emits loaded event even when widget is loaded in secondary registry'() {
				const registryHandler = new RegistryHandler();
				const registry = new Registry();
				const localInjector = new Injector({});
				registryHandler.base = registry;
				let invalidateCount = 0;
				registryHandler.on('invalidate', () => {
					invalidateCount++;
				});

				registryHandler.getInjector('global');
				registryHandler.getInjector('global');
				registry.defineInjector('global', globalInjector);
				assert.strictEqual(invalidateCount, 1);
				registryHandler.defineInjector('global', localInjector);
				assert.strictEqual(invalidateCount, 2);
			},
			'no loaded event listeners once the widget is fully loaded (into primary registry)'() {
				const registryHandler = new RegistryHandler();
				registryHandler.base = registry;
				const localInjector = new Injector({});
				let invalidateCount = 0;
				registryHandler.on('invalidate', () => {
					invalidateCount++;
				});

				registryHandler.getInjector('global');
				registryHandler.defineInjector('global', localInjector);
				assert.strictEqual(invalidateCount, 1);
				registry.emit({ type: 'global', action: 'other' });
				assert.strictEqual(invalidateCount, 1);
			},
			'no `invalidate` events emitted once the with registry with the highest precedence has loaded'() {
				const registryHandler = new RegistryHandler();
				const registry = new Registry();
				registryHandler.base = registry;
				const localInjector = new Injector({});
				let invalidateCount = 0;
				registryHandler.on('invalidate', () => {
					invalidateCount++;
				});
				registryHandler.getInjector('injector');
				registryHandler.defineInjector('injector', localInjector);
				assert.strictEqual(invalidateCount, 1);
				registry.defineInjector('injector', globalInjector);
				assert.strictEqual(invalidateCount, 1);
			},
			'no `invalidate` events emitted once the with registry with the highest precedence has loaded - with global'() {
				const registryHandler = new RegistryHandler();
				const registry = new Registry();
				registryHandler.base = registry;
				const localInjector = new Injector({});
				let invalidateCount = 0;
				registryHandler.on('invalidate', () => {
					invalidateCount++;
				});
				registryHandler.getInjector('injector', true);
				registry.defineInjector('injector', globalInjector);
				assert.strictEqual(invalidateCount, 1);
				registryHandler.defineInjector('injector', localInjector);
				assert.strictEqual(invalidateCount, 1);
			},
			'ignores unknown event actions'() {
				const registryHandler = new RegistryHandler();
				const registry = new Registry();
				registryHandler.base = registry;
				let invalidateCount = 0;
				registryHandler.on('invalidate', () => {
					invalidateCount++;
				});

				registryHandler.getInjector('global');
				registry.emit({ type: 'global', action: 'other' });
				assert.strictEqual(invalidateCount, 0);
				registryHandler.getInjector('global', true);
				registry.emit({ type: 'global', action: 'other' });
				assert.strictEqual(invalidateCount, 0);
			}
		}
	}
});
