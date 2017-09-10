import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import Promise from '@dojo/shim/Promise';
import RegistryHandler from '../../src/RegistryHandler';
import Registry from '../../src/Registry';
import { WidgetBase } from '../../src/WidgetBase';
import { WidgetBaseConstructor } from './../../src/interfaces';

const foo = Symbol();
const bar = Symbol();

const registry = new Registry();
registry.define('foo', WidgetBase);
registry.define(foo, WidgetBase);

const registryB = new Registry();
registryB.define('bar', WidgetBase);
registryB.define(bar, WidgetBase);

registerSuite({
	name: 'RegistryHandler',
	'add': {
		'add standard registry'() {
			const registryHandler = new RegistryHandler();
			registryHandler.add(registry);
			const widget = registry.get('foo');
			assert.equal(widget, WidgetBase);
		},
		'add default registry'() {
			const registryHandler = new RegistryHandler();
			registryHandler.add(registry);
			assert.equal(registryHandler.defaultRegistry, registry);
			registryHandler.add(registryB, true);
			assert.equal(registryHandler.defaultRegistry, registryB);
		}
	},
	'remove': {
		'existing'() {
			const registryHandler = new RegistryHandler();
			registryHandler.add(registry);
			assert.equal(registry.get('foo'), WidgetBase);
			registryHandler.remove(registry);
			assert.isNull(registryHandler.get('foo'));
		},
		'non-existing'() {
			const registryHandler = new RegistryHandler();
			registryHandler.add(registry);
			assert.equal(registry.get('foo'), WidgetBase);
			assert.isFalse(registryHandler.remove(registryB));
		}
	},
	'replace': {
		'existing'() {
			const registryHandler = new RegistryHandler();
			registryHandler.add(registry);
			assert.equal(registry.get('foo'), WidgetBase);
			registryHandler.replace(registry, registryB);
			assert.isNull(registryHandler.get('foo'));
			assert.equal(registryHandler.get('bar'), WidgetBase);
		},
		'non-existing'() {
			const registryHandler = new RegistryHandler();
			registryHandler.add(registry);
			assert.equal(registry.get('foo'), WidgetBase);
			assert.isFalse(registryHandler.replace(registryB, registry));
		}
	},
	'has'() {
		const registryHandler = new RegistryHandler();
		registryHandler.add(registry);
		registryHandler.add(registryB);
		assert.isTrue(registryHandler.has('foo'));
		assert.isTrue(registryHandler.has('bar'));
		assert.isTrue(registryHandler.has(foo));
		assert.isTrue(registryHandler.has(bar));
	},
	'get'() {
		const promise = new Promise<WidgetBaseConstructor>((resolve) => {
			setTimeout(() => {
				resolve(WidgetBase);
			}, 1);
		});
		const registryHandler = new RegistryHandler();
		registryHandler.add(registry);
		registry.define('baz', promise);
		return promise.then(() => {
			assert.equal(registryHandler.get('baz'), WidgetBase);
		});
	},
	'get with symbol label'() {
		const baz = Symbol();
		const promise = new Promise<WidgetBaseConstructor>((resolve) => {
			setTimeout(() => {
				resolve(WidgetBase);
			}, 1);
		});
		const registryHandler = new RegistryHandler();
		registryHandler.add(registry);
		registry.define(baz, promise);
		return promise.then(() => {
			assert.equal(registryHandler.get(baz), WidgetBase);
		});
	},
	'get passing generic to specify widget type'() {
		class TestWidget extends WidgetBase<{foo: string}> {}
		const promise = new Promise<WidgetBaseConstructor>((resolve) => {
			setTimeout(() => {
				resolve(TestWidget);
			}, 1);
		});
		const registryHandler = new RegistryHandler();
		registryHandler.add(registry);
		registry.define('baz-1', promise);
		return promise.then(() => {
			const RegistryWidget = registryHandler.get<TestWidget>('baz-1');
			assert.equal(RegistryWidget, TestWidget);
			const widget = new RegistryWidget!();

			// demonstrate registry widget is typed as TestWidget
			widget.__setProperties__({ foo: 'baz' });
		});
	},
	'invalidates once registry emits loaded event'() {
		const baz = Symbol();
		let promise: any = Promise.resolve();
		let invalidateCalled = false;
		const lazyWidget = () => {
			promise = new Promise((resolve) => {
				setTimeout(() => {
					resolve(WidgetBase);
				}, 1);
			});
			return promise;
		};
		const registryHandler = new RegistryHandler();
		registryHandler.on('invalidate', () => {
			invalidateCalled = true;
		});

		registryHandler.add(registry);
		registry.define(baz, lazyWidget);
		registryHandler.get(baz);
		return promise.then(() => {
			assert.isTrue(invalidateCalled);
		});
	},
	'noop when event action is not `loaded`'() {
		const baz = Symbol();
		let invalidateCalled = false;
		let promise: Promise<any> = Promise.resolve();
		const lazyWidget: any = () => {
			promise = new Promise((resolve) => {
			});
			return promise;
		};
		const registryHandler = new RegistryHandler();
		registryHandler.on('invalidate', () => {
			invalidateCalled = true;
		});

		registryHandler.add(registry);
		registry.define(baz, lazyWidget);
		registryHandler.get(baz);
		registry.emit({ type: baz, action: 'other' });
		assert.isFalse(invalidateCalled);
	}
});
