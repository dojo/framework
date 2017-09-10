import Registry from './../../src/Registry';
import { WidgetBase } from './../../src/WidgetBase';
import Promise from '@dojo/shim/Promise';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';

registerSuite({
	name: 'Registry',
	'api'() {
		const factoryRegistry = new Registry();

		assert.isFunction(factoryRegistry.define);
		assert.isFunction(factoryRegistry.has);
		assert.isFunction(factoryRegistry.get);
	},
	'has'() {
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
			}
			catch (error) {
				assert.isTrue(error instanceof Error);
				assert.equal(error.message, 'widget has already been registered for \'my-widget\'');
			}
		},
		'throw an error using a previously registered factory symbol label'() {
			const myWidget = Symbol('symbol registry label');
			const factoryRegistry = new Registry();
			factoryRegistry.define(myWidget, WidgetBase);
			try {
				factoryRegistry.define(myWidget, WidgetBase);
				assert.fail();
			}
			catch (error) {
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
			class TestWidget extends WidgetBase<{foo: string}> {}
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
			let resolveFunction: any;
			let promise: any;
			const lazyFactory = () => {
				promise = new Promise((resolve) => {
					resolveFunction = resolve;
				});
				return promise;
			};
			const factoryRegistry = new Registry();
			factoryRegistry.define('my-widget', lazyFactory);
			factoryRegistry.get('my-widget');
			resolveFunction(WidgetBase);
			return promise.then(() => {
				const factory = factoryRegistry.get('my-widget');
				assert.strictEqual(factory, WidgetBase);
			});
		},
		'throws error from rejected promise'() {
			let promise: Promise<any> = Promise.resolve();
			let rejectFunc: any;
			const lazyFactory = (): any => {
				promise = new Promise((resolve, reject) => {
					rejectFunc = reject;
				});
				return promise;
			};
			const factoryRegistry = new Registry();
			factoryRegistry.define('my-widget', lazyFactory);
			factoryRegistry.get('my-widget');
			rejectFunc(new Error('reject error'));
			return promise.then(() => {
				assert.fail();
			},
			(error) => {
				assert.isTrue(error instanceof Error);
				assert.equal(error.message, 'reject error');
			});
		}
	}
});
