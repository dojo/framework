import FactoryRegistry from './../../src/FactoryRegistry';
import createWidgetBase from './../../src/createWidgetBase';
import Promise from '@dojo/shim/Promise';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';

registerSuite({
	name: 'FactoryRegistry',
	'api'() {
		const factoryRegistry = new FactoryRegistry();

		assert.isFunction(factoryRegistry.define);
		assert.isFunction(factoryRegistry.has);
		assert.isFunction(factoryRegistry.get);
	},
	'has'() {
		const factoryRegistry = new FactoryRegistry();
		assert.isFalse(factoryRegistry.has('my-widget'));
		factoryRegistry.define('my-widget', createWidgetBase);
		assert.isTrue(factoryRegistry.has('my-widget'));
	},
	define: {
		'able to define factories and lazy factories'() {
			const lazyFactory = () => {
				return Promise.resolve(createWidgetBase);
			};
			const factoryRegistry = new FactoryRegistry();
			factoryRegistry.define('my-widget', createWidgetBase);
			factoryRegistry.define('my-lazy-widget', lazyFactory);
			assert.isTrue(factoryRegistry.has('my-widget'));
			assert.isTrue(factoryRegistry.has('my-lazy-widget'));
		},
		'throw an error using a previously registered factory label'() {
			const factoryRegistry = new FactoryRegistry();
			factoryRegistry.define('my-widget', createWidgetBase);
			try {
				factoryRegistry.define('my-widget', createWidgetBase);
				assert.fail();
			}
			catch (error) {
				assert.isTrue(error instanceof Error);
				assert.equal(error.message, 'factory has already been registered for \'my-widget\'');
			}
		}
	},
	get: {
		'get a registered factory'() {
			const factoryRegistry = new FactoryRegistry();
			factoryRegistry.define('my-widget', createWidgetBase);
			const factory = factoryRegistry.get('my-widget');
			assert.strictEqual(factory, createWidgetBase);
		},
		'throws an error if factory has not been registered.'() {
			const factoryRegistry = new FactoryRegistry();
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
			const factoryRegistry = new FactoryRegistry();
			factoryRegistry.define('my-widget', lazyFactory);
			factoryRegistry.get('my-widget');
			resolveFunction(createWidgetBase);
			return promise.then(() => {
				const factory = factoryRegistry.get('my-widget');
				assert.strictEqual(factory, createWidgetBase);
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
			const factoryRegistry = new FactoryRegistry();
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
