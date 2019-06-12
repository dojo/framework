const { it, describe, afterEach } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { sandbox } from 'sinon';

import themeMiddleware from '../../../../src/core/middleware/theme';
import cacheMiddleware from '../../../../src/core/middleware/cache';
import Injector from '../../../../src/core/Injector';

const sb = sandbox.create();
const invalidator = sb.stub();
const diffProperties = sb.stub();
const injector = {
	subscribe: sb.stub(),
	get: sb.stub()
};
const defineInjector = sb.stub();
const getRegistry = sb.stub();
const registryHandler = {
	base: {
		defineInjector
	}
};
getRegistry.returns(registryHandler);

describe('theme middleware', () => {
	afterEach(() => {
		sb.resetHistory();
	});

	it('Should register injector and allow theme to be set', () => {
		const cache = cacheMiddleware().callback({ middleware: { destroy: sb.stub() }, properties: {}, id: 'blah' });
		const { callback } = themeMiddleware();
		defineInjector.callsFake((...args: any[]) => {
			injector.get.withArgs(args[0]).returns(new Injector('blah'));
		});
		const theme = callback({
			id: 'test',
			middleware: {
				invalidator,
				cache,
				diffProperties,
				injector,
				getRegistry
			},
			properties: {}
		});

		assert.isTrue(diffProperties.calledOnce);
		assert.isTrue(injector.subscribe.calledOnce);
		const testTheme = {
			foo: {
				bar: 'themed-root'
			}
		};
		theme.set(testTheme);
		const css = {
			' _key': 'foo',
			bar: 'root'
		};
		const result = theme.classes(css);
		assert.deepEqual(result, { bar: 'themed-root' });
		const resultTwo = theme.classes(css);
		assert.strictEqual(resultTwo, result);
		assert.strictEqual(theme.get(), testTheme);
		theme.set({
			foo: {
				bar: 'other-themed-root'
			}
		});
		injector.subscribe.getCall(0).callArg(1);
		assert.isTrue(invalidator.calledOnce);
		const resultThree = theme.classes(css);
		assert.notStrictEqual(resultThree, resultTwo);
		assert.deepEqual(resultThree, { bar: 'other-themed-root' });
	});

	it('Should give precedence to theme from properties over an injected theme', () => {
		const cache = cacheMiddleware().callback({ middleware: { destroy: sb.stub() }, properties: {}, id: 'blah' });
		const { callback } = themeMiddleware();
		defineInjector.callsFake((...args: any[]) => {
			injector.get.withArgs(args[0]).returns(new Injector('blah'));
		});
		const propertyTheme = {
			foo: {
				bar: 'other-themed-root'
			}
		};
		const theme = callback({
			id: 'test',
			middleware: {
				invalidator,
				cache,
				diffProperties,
				injector,
				getRegistry
			},
			properties: {
				theme: propertyTheme
			}
		});

		assert.isTrue(diffProperties.calledOnce);
		assert.isTrue(injector.subscribe.calledOnce);
		assert.isTrue(invalidator.notCalled);

		theme.set({
			foo: {
				bar: 'themed-root'
			}
		});
		const css = {
			' _key': 'foo',
			bar: 'root'
		};
		const result = theme.classes(css);
		assert.deepEqual(result, { bar: 'other-themed-root' });
		const currentTheme = { ...propertyTheme };
		propertyTheme.foo.bar = 'updated-themed-root';
		diffProperties.getCall(0).callArgWith(0, { theme: currentTheme }, { theme: propertyTheme });
		assert.isTrue(invalidator.calledOnce);
		const resultTwo = theme.classes(css);
		assert.deepEqual(resultTwo, { bar: 'updated-themed-root' });
		diffProperties.getCall(0).callArgWith(0, { theme: propertyTheme }, { theme: propertyTheme });
		assert.isTrue(invalidator.calledOnce);
		const resultThree = theme.classes(css);
		assert.deepEqual(resultThree, { bar: 'updated-themed-root' });
	});

	it('Should support classes property for adding additional classes', () => {
		const cache = cacheMiddleware().callback({ middleware: { destroy: sb.stub() }, properties: {}, id: 'blah' });
		const { callback } = themeMiddleware();
		defineInjector.callsFake((...args: any[]) => {
			injector.get.withArgs(args[0]).returns(new Injector('blah'));
		});
		const theme = callback({
			id: 'test',
			middleware: {
				invalidator,
				cache,
				diffProperties,
				injector,
				getRegistry
			},
			properties: {
				classes: {
					foo: {
						bar: ['extra-extra'],
						other: ['extra-extra-extra']
					},
					other: {
						bar: ['extra-extra-extra']
					}
				}
			}
		});

		assert.isTrue(diffProperties.calledOnce);
		assert.isTrue(injector.subscribe.calledOnce);
		assert.isTrue(invalidator.notCalled);

		theme.set({
			foo: {
				bar: 'themed-root'
			}
		});
		const css = {
			' _key': 'foo',
			bar: 'root'
		};
		const result = theme.classes(css);
		assert.deepEqual(result, { bar: 'themed-root extra-extra' });
	});
});
