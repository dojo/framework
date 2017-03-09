import WidgetRegistry from './../../src/WidgetRegistry';
import { WidgetBase } from './../../src/WidgetBase';
import Promise from '@dojo/shim/Promise';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';

registerSuite({
	name: 'WidgetRegistry',
	'api'() {
		const factoryRegistry = new WidgetRegistry();

		assert.isFunction(factoryRegistry.define);
		assert.isFunction(factoryRegistry.has);
		assert.isFunction(factoryRegistry.get);
	},
	'has'() {
		const factoryRegistry = new WidgetRegistry();
		assert.isFalse(factoryRegistry.has('my-widget'));
		factoryRegistry.define('my-widget', WidgetBase);
		assert.isTrue(factoryRegistry.has('my-widget'));
	},
	define: {
		'able to define factories and lazy factories'() {
			const lazyFactory = () => {
				return Promise.resolve(WidgetBase);
			};
			const factoryRegistry = new WidgetRegistry();
			factoryRegistry.define('my-widget', WidgetBase);
			factoryRegistry.define('my-lazy-widget', lazyFactory);
			assert.isTrue(factoryRegistry.has('my-widget'));
			assert.isTrue(factoryRegistry.has('my-lazy-widget'));
		},
		'throw an error using a previously registered factory label'() {
			const factoryRegistry = new WidgetRegistry();
			factoryRegistry.define('my-widget', WidgetBase);
			try {
				factoryRegistry.define('my-widget', WidgetBase);
				assert.fail();
			}
			catch (error) {
				assert.isTrue(error instanceof Error);
				assert.equal(error.message, 'widget has already been registered for \'my-widget\'');
			}
		}
	},
	get: {
		'get a registered factory'() {
			const factoryRegistry = new WidgetRegistry();
			factoryRegistry.define('my-widget', WidgetBase);
			const factory = factoryRegistry.get('my-widget');
			assert.strictEqual(factory, WidgetBase);
		},
		'throws an error if factory has not been registered.'() {
			const factoryRegistry = new WidgetRegistry();
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
			const factoryRegistry = new WidgetRegistry();
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
			const factoryRegistry = new WidgetRegistry();
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
