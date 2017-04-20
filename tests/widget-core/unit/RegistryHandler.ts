import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import RegistryHandler from '../../src/RegistryHandler';
import WidgetRegistry from '../../src/WidgetRegistry';
import { WidgetBase } from '../../src/WidgetBase';

const registry = new WidgetRegistry();
registry.define('foo', WidgetBase);

const registryB = new WidgetRegistry();
registryB.define('bar', WidgetBase);

registerSuite({
	name: 'RegistryHandler',
	'add'() {
		const registryHandler = new RegistryHandler();
		registryHandler.add(registry);
		const widget = registry.get('foo');
		assert.equal(widget, WidgetBase);
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
	},
	'get'() {
		const promise = new Promise((resolve) => {
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
	}
});
