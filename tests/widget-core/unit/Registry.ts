const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import Registry, { ESMDefaultWidgetBase } from './../../src/Registry';
import { WidgetBase } from './../../src/WidgetBase';
import Promise from '@dojo/shim/Promise';
import { Injector } from './../../src/Injector';

const testInjector = new Injector({});

registerSuite('Registry', {
	api() {
		const factoryRegistry = new Registry();

		assert.isFunction(factoryRegistry.define);
		assert.isFunction(factoryRegistry.has);
		assert.isFunction(factoryRegistry.get);
		assert.isFunction(factoryRegistry.defineInjector);
		assert.isFunction(factoryRegistry.hasInjector);
		assert.isFunction(factoryRegistry.getInjector);
	},
	Widget: {
		has() {
			const factoryRegistry = new Registry();
			assert.isFalse(factoryRegistry.has('my-widget'));
			factoryRegistry.define('my-widget', WidgetBase);
			assert.isTrue(factoryRegistry.has('my-widget'));
		},
		define: {
			'able to define factories and lazy factories'() {
				const lazyFactory = () => {
					return Promise.resolve(WidgetBase);
				};
				const factoryRegistry = new Registry();
				factoryRegistry.define('my-widget', WidgetBase);
				factoryRegistry.define('my-lazy-widget', lazyFactory);
				const symbolLabel = Symbol();
				factoryRegistry.define(symbolLabel, lazyFactory);
				assert.isTrue(factoryRegistry.has('my-widget'));
				assert.isTrue(factoryRegistry.has('my-lazy-widget'));
				assert.isTrue(factoryRegistry.has(symbolLabel));
			},
			'throw an error using a previously registered factory string label'() {
				const factoryRegistry = new Registry();
				factoryRegistry.define('my-widget', WidgetBase);
				try {
					factoryRegistry.define('my-widget', WidgetBase);
					assert.fail();
				} catch (error) {
					assert.isTrue(error instanceof Error);
					assert.equal(error.message, "widget has already been registered for 'my-widget'");
				}
			},
			'throw an error using a previously registered factory symbol label'() {
				const myWidget = Symbol('symbol registry label');
				const factoryRegistry = new Registry();
				factoryRegistry.define(myWidget, WidgetBase);
				try {
					factoryRegistry.define(myWidget, WidgetBase);
					assert.fail();
				} catch (error) {
					assert.isTrue(error instanceof Error);
					assert.include(error.message, 'widget has already been registered for');
					assert.include(error.message, 'symbol registry label');
				}
			}
		},
		get: {
			'get a registered factory'() {
				const factoryRegistry = new Registry();
				factoryRegistry.define('my-widget', WidgetBase);
				const factory = factoryRegistry.get('my-widget');
				assert.strictEqual(factory, WidgetBase);
			},
			'get a factory registered with a Symbol'() {
				const symbolLabel = Symbol();
				const factoryRegistry = new Registry();
				factoryRegistry.define(symbolLabel, WidgetBase);
				const factory = factoryRegistry.get(symbolLabel);
				assert.strictEqual(factory, WidgetBase);
			},
			'get allows a generic to passed that defines the type of registry item'() {
				class TestWidget extends WidgetBase<{ foo: string }> {}
				const factoryRegistry = new Registry();
				factoryRegistry.define('test-widget', TestWidget);
				const RegistryTestWidget = factoryRegistry.get<TestWidget>('test-widget');
				assert.isNotNull(RegistryTestWidget);
				const widget = new RegistryTestWidget!();
				// demonstrates the design time typing
				widget.__setProperties__({ foo: 'bar' });
			},
			'throws an error if factory has not been registered.'() {
				const factoryRegistry = new Registry();
				const item = factoryRegistry.get('my-widget');
				assert.isNull(item);
			},
			'replaces promise with result on resolution'() {
				let resolveFunction: (widget: typeof WidgetBase) => void;
				const promise: Promise<any> = new Promise((resolve) => {
					resolveFunction = resolve;
				});

				const factoryRegistry = new Registry();
				factoryRegistry.define('my-widget', promise);
				factoryRegistry.get('my-widget');
				resolveFunction!(WidgetBase);

				return promise.then(() => {
					const factory = factoryRegistry.get('my-widget');
					assert.strictEqual(factory, WidgetBase);
				});
			},
			'replaces promise created by function with result on resolution'() {
				let resolveFunction: (widget: typeof WidgetBase) => void;
				const promise: Promise<any> = new Promise((resolve) => {
					resolveFunction = resolve;
				});
				const lazyFactory = () => promise;

				const factoryRegistry = new Registry();
				factoryRegistry.define('my-widget', lazyFactory);
				factoryRegistry.get('my-widget');
				resolveFunction!(WidgetBase);

				return promise.then(() => {
					const factory = factoryRegistry.get('my-widget');
					assert.strictEqual(factory, WidgetBase);
				});
			},
			'throws error from rejected promise'() {
				let rejectFunction: (error: Error) => void;
				const promise: Promise<any> = new Promise((_resolve, reject) => {
					rejectFunction = reject;
				}).then(
					() => {
						assert.fail();
					},
					(error) => {
						assert.isTrue(error instanceof Error);
						assert.equal(error.message, 'reject error');
					}
				);
				const lazyFactory = () => promise;

				const factoryRegistry = new Registry();
				factoryRegistry.define('my-widget', lazyFactory);
				factoryRegistry.get('my-widget');
				rejectFunction!(new Error('reject error'));

				return promise;
			},
			'recognises esm modules with widget constructor as default'() {
				let resolveFunction: (widget: ESMDefaultWidgetBase<WidgetBase>) => void;
				const promise: Promise<any> = new Promise((resolve) => {
					resolveFunction = resolve;
				});
				const lazyFactory = () => promise;

				const factoryRegistry = new Registry();
				factoryRegistry.define('my-widget', lazyFactory);
				factoryRegistry.get('my-widget');

				resolveFunction!({
					default: WidgetBase,
					__esModule: true
				});

				return promise.then(() => {
					const factory = factoryRegistry.get('my-widget');
					assert.strictEqual(factory, WidgetBase);
				});
			}
		},
		emit: {
			'emits loaded event concrete Widget item'() {
				let loadedEvent = false;
				const registry = new Registry();
				registry.on('foo', ({ type }) => {
					loadedEvent = true;
				});
				registry.define('foo', WidgetBase);
				assert.isTrue(loadedEvent);
			},
			'does not emits loaded event when defining a function'() {
				let loadedEvent = false;
				const registry = new Registry();
				registry.on('foo', ({ type }) => {
					loadedEvent = true;
				});
				registry.define('foo', () => Promise.resolve(WidgetBase));
				assert.isFalse(loadedEvent);
			}
		}
	},
	Injector: {
		has() {
			const factoryRegistry = new Registry();
			assert.isFalse(factoryRegistry.hasInjector('my-injector'));
			factoryRegistry.defineInjector('my-injector', testInjector);
			assert.isTrue(factoryRegistry.hasInjector('my-injector'));
		},
		define: {
			'throw an error using a previously registered factory string label'() {
				const factoryRegistry = new Registry();
				factoryRegistry.defineInjector('my-injector', testInjector);
				try {
					factoryRegistry.defineInjector('my-injector', testInjector);
					assert.fail();
				} catch (error) {
					assert.isTrue(error instanceof Error);
					assert.equal(error.message, "injector has already been registered for 'my-injector'");
				}
			},
			'throw an error using a previously registered factory symbol label'() {
				const myInjector = Symbol('symbol registry label');
				const factoryRegistry = new Registry();
				factoryRegistry.defineInjector(myInjector, testInjector);
				try {
					factoryRegistry.defineInjector(myInjector, testInjector);
					assert.fail();
				} catch (error) {
					assert.isTrue(error instanceof Error);
					assert.include(error.message, 'injector has already been registered for');
					assert.include(error.message, 'symbol registry label');
				}
			}
		},
		get: {
			'get a registered injector'() {
				const factoryRegistry = new Registry();
				factoryRegistry.defineInjector('my-injector', testInjector);
				const injector = factoryRegistry.getInjector('my-injector');
				assert.strictEqual(injector, testInjector);
			},
			'get a registered injector with a Symbol'() {
				const symbolLabel = Symbol();
				const factoryRegistry = new Registry();
				factoryRegistry.defineInjector(symbolLabel, testInjector);
				const injector = factoryRegistry.getInjector(symbolLabel);
				assert.strictEqual(injector, testInjector);
			},
			'returns null when injector is not registered'() {
				const symbolLabel = Symbol();
				const factoryRegistry = new Registry();
				const injector = factoryRegistry.getInjector(symbolLabel);
				assert.isNull(injector);
			}
		}
	},
	'Support injectors and widgets with the same label'() {
		const factoryRegistry = new Registry();
		const injector = new Injector({});
		assert.isFalse(factoryRegistry.hasInjector('my-item'));
		assert.isFalse(factoryRegistry.has('my-item'));
		factoryRegistry.defineInjector('my-item', injector);
		factoryRegistry.define('my-item', WidgetBase);
		assert.isTrue(factoryRegistry.hasInjector('my-item'));
		assert.isTrue(factoryRegistry.has('my-item'));
	}
});
