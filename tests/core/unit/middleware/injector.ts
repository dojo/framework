const { it, describe, afterEach, beforeEach } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { sandbox } from 'sinon';

import injectorMiddleware from '../../../../src/core/middleware/injector';

const sb = sandbox.create();
const getInjector = sb.stub();
const registry = {
	getInjector
};
const getRegistry = sb.stub();
const invalidator = sb.stub();
const eventStub = sb.stub();

describe('injector middleware', () => {
	beforeEach(() => {
		getRegistry.returns(registry);
	});

	afterEach(() => {
		sb.resetHistory();
	});

	describe('get', () => {
		it('should should return the injector if it exists', () => {
			registry.getInjector.returns({
				injector() {
					return 'Test Injector';
				}
			});
			const { callback } = injectorMiddleware();
			const injector = callback({
				id: 'test',
				middleware: {
					getRegistry,
					invalidator
				},
				properties: {}
			});
			const injectorItem = injector.get<string>('test');
			assert.strictEqual(injectorItem, 'Test Injector');
		});

		it('should return null if there is no registry item', () => {
			getInjector.returns(null);
			const { callback } = injectorMiddleware();
			const injector = callback({
				id: 'test',
				middleware: {
					getRegistry,
					invalidator
				},
				properties: {}
			});
			const injectorItem = injector.get<string>('test');
			assert.isNull(injectorItem);
		});

		it('should return null if there is no registry', () => {
			getRegistry.returns(null);
			const { callback } = injectorMiddleware();
			const injector = callback({
				id: 'test',
				middleware: {
					getRegistry,
					invalidator
				},
				properties: {}
			});
			const injectorItem = injector.get<string>('test');
			assert.isNull(injectorItem);
		});
	});
	describe('subscribe', () => {
		it('should subscribe the widgets invalidator to the injectors invalidate event', () => {
			registry.getInjector.returns({
				invalidator: {
					on: eventStub
				}
			});
			const { callback } = injectorMiddleware();
			const injector = callback({
				id: 'test',
				middleware: {
					getRegistry,
					invalidator
				},
				properties: {}
			});
			injector.subscribe('test');
			assert.isTrue(eventStub.calledOnce);
			eventStub.getCall(0).callArg(1);
			assert.isTrue(invalidator.calledOnce);
		});

		it('should subscribe a custom function to the injectors invalidate event', () => {
			registry.getInjector.returns({
				invalidator: {
					on: eventStub
				}
			});
			const { callback } = injectorMiddleware();
			const injector = callback({
				id: 'test',
				middleware: {
					getRegistry,
					invalidator
				},
				properties: {}
			});
			const customCallback = sb.stub();
			injector.subscribe('test', customCallback);
			assert.isTrue(eventStub.calledOnce);
			eventStub.getCall(0).callArg(1);
			assert.isTrue(customCallback.calledOnce);
		});

		it('should ignore the subscription if there is no registry item', () => {
			getInjector.returns(null);
			const { callback } = injectorMiddleware();
			const injector = callback({
				id: 'test',
				middleware: {
					getRegistry,
					invalidator
				},
				properties: {}
			});
			injector.subscribe('test');
			assert.isTrue(eventStub.notCalled);
		});

		it('should ignore the subscription if there is no registry', () => {
			getRegistry.returns(null);
			registry.getInjector.returns({
				invalidator: {
					on: eventStub
				}
			});
			const { callback } = injectorMiddleware();
			const injector = callback({
				id: 'test',
				middleware: {
					getRegistry,
					invalidator
				},
				properties: {}
			});
			injector.subscribe('test');
			assert.isTrue(eventStub.notCalled);
		});
	});
});
