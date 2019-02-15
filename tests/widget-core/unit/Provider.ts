const { describe, it, beforeEach, afterEach } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

import Registry from '../../../src/widget-core/Registry';
import Provider from '../../../src/widget-core/Provider';
import { VNode } from '../../../src/widget-core/interfaces';
import { SinonStub, stub } from 'sinon';
import { add } from '../../../src/has/has';
import { Injector } from '../../../src/widget-core/Injector';

let consoleWarnStub: SinonStub;

describe('Provider', () => {
	beforeEach(() => {
		add('dojo-debug', true, true);
		consoleWarnStub = stub(console, 'warn');
	});

	afterEach(() => {
		consoleWarnStub.restore();
	});

	it('Should inject custom injector into renderer', () => {
		const registry = new Registry();
		registry.defineInjector('test', () => {
			return () => 'injected value';
		});
		const widget = new Provider();
		widget.registry.base = registry;
		widget.__setProperties__({
			registryLabel: 'test',
			renderer: (injector) => {
				return injector;
			}
		});
		const result = widget.__render__() as VNode;
		assert.strictEqual(result.text, 'injected value');
	});

	it('Should warn in debug mode and return null when injector is not found', () => {
		const widget = new Provider();
		widget.__setProperties__({
			registryLabel: 'test',
			renderer: (injector) => {
				return injector;
			}
		});
		const result = widget.__render__() as VNode;
		assert.isUndefined(result);
		assert.isTrue(consoleWarnStub.calledOnce);
		assert.strictEqual(consoleWarnStub.firstCall.args[0], "Injector has not been registered with label: 'test'");
	});

	it('Should not warn in non debug mode and return null when injector is not found', () => {
		add('dojo-debug', false, true);
		const widget = new Provider();
		widget.__setProperties__({
			registryLabel: 'test',
			renderer: (injector) => {
				return injector;
			}
		});
		const result = widget.__render__() as VNode;
		assert.isUndefined(result);
		assert.isTrue(consoleWarnStub.notCalled);
	});

	it('should handle registry label change and ensure the initial injector is detached from the Provider', () => {
		const registry = new Registry();
		const injectorOne = new Injector('injected value');
		const injectorTwo = new Injector('other injected value');
		registry.defineInjector('testOne', (i) => {
			injectorOne.setInvalidator(i);
			return () => injectorOne;
		});
		registry.defineInjector('testTwo', (i) => {
			injectorOne.setInvalidator(i);
			return () => injectorTwo;
		});

		let invalidateCount = 0;

		class TestProvider extends Provider {
			invalidate() {
				super.invalidate();
				invalidateCount++;
			}
		}
		const widget = new TestProvider();
		widget.registry.base = registry;
		widget.__setProperties__({
			registryLabel: 'testOne',
			renderer: (injector) => {
				return injector.get();
			}
		});
		let result = widget.__render__() as VNode;
		assert.strictEqual(result.text, 'injected value');

		widget.__setProperties__({
			registryLabel: 'testTwo',
			renderer: (injector) => {
				return injector.get();
			}
		});
		result = widget.__render__() as VNode;
		assert.strictEqual(result.text, 'other injected value');
		assert.strictEqual(invalidateCount, 4);

		injectorOne.set('hello world');
		// this would have increased by 2 if the injector was still connected
		assert.strictEqual(invalidateCount, 5);
		result = widget.__render__() as VNode;
		assert.strictEqual(result.text, 'other injected value');

		injectorTwo.set('new text');
		result = widget.__render__() as VNode;
		assert.strictEqual(result.text, 'new text');
	});
});
