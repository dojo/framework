const { it, describe, afterEach } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { sandbox } from 'sinon';
import bundle from '../../support/nls/greetings';

import i18nMiddleware from '../../../../src/core/middleware/i18n';
import coreI18n, { switchLocale, invalidate, systemLocale } from '../../../../src/i18n/i18n';
import Injector from '../../../../src/core/Injector';

const sb = sandbox.create();
const invalidatorStub = sb.stub();
const injectorStub = {
	get: sb.stub(),
	subscribe: sb.stub()
};
const defineInjector = sb.stub();
const getRegistryStub = sb.stub();
const registryHandler = {
	base: {
		defineInjector
	}
};
getRegistryStub.returns(registryHandler);

const overrideBundle = {
	locales: {
		es: () => ({
			hello: 'Hola',
			goodbye: 'Adiós',
			welcome: 'Bienvenido, {name}'
		})
	},
	messages: {
		hello: 'Hi!',
		goodbye: 'Bye!',
		welcome: 'Salutations, {name}!'
	}
};

describe('i18n middleware', () => {
	afterEach(() => {
		invalidate();
		switchLocale(systemLocale);
		sb.resetHistory();
		defineInjector.resetBehavior();
		injectorStub.get.resetBehavior();
	});

	it('Returns blank messages when locale bundle not loaded', () => {
		switchLocale('fr');
		const { callback } = i18nMiddleware();
		const i18n = callback({
			id: 'test',
			middleware: {
				injector: injectorStub,
				invalidator: invalidatorStub,
				getRegistry: getRegistryStub
			},
			properties: {}
		});
		const { format, isPlaceholder, messages } = i18n.localize(bundle);

		assert.isTrue(isPlaceholder);
		assert.strictEqual(messages.hello, '');
		assert.strictEqual(messages.goodbye, '');
		assert.strictEqual(format('hello'), '');
	});

	it('Returns default messages with second argument when locale bundle not loaded', () => {
		switchLocale('fr');
		const { callback } = i18nMiddleware();
		const i18n = callback({
			id: 'test',
			middleware: {
				injector: injectorStub,
				invalidator: invalidatorStub,
				getRegistry: getRegistryStub
			},
			properties: {}
		});
		const { format, isPlaceholder, messages } = i18n.localize(bundle, true);

		assert.isTrue(isPlaceholder);
		assert.strictEqual(messages.hello, 'Hello');
		assert.strictEqual(messages.goodbye, 'Goodbye');
		assert.strictEqual(format('hello'), 'Hello');
	});

	it('Returns default messages when bundle has no supported locales', () => {
		switchLocale('fr');
		const { callback } = i18nMiddleware();
		const i18n = callback({
			id: 'test',
			middleware: {
				injector: injectorStub,
				invalidator: invalidatorStub,
				getRegistry: getRegistryStub
			},
			properties: {}
		});
		const { isPlaceholder, messages } = i18n.localize({
			messages: {
				hello: 'Hello',
				goodbye: 'Goodbye'
			}
		});

		assert.isFalse(isPlaceholder);
		assert.strictEqual(messages.hello, 'Hello');
		assert.strictEqual(messages.goodbye, 'Goodbye');
	});

	it('Uses `properties.locale` when available', async () => {
		const { callback } = i18nMiddleware();
		const i18n = callback({
			id: 'test',
			middleware: {
				injector: injectorStub,
				invalidator: invalidatorStub,
				getRegistry: getRegistryStub
			},
			properties: {
				locale: 'fr'
			}
		});
		await coreI18n(bundle, 'fr');
		const { isPlaceholder, messages } = i18n.localize(bundle);
		assert.isFalse(isPlaceholder);
		assert.strictEqual(messages.hello, 'Bonjour');
		assert.strictEqual(messages.goodbye, 'Au revoir');
	});

	it('Uses default locale when no locale is set', async () => {
		switchLocale('fr');
		const { callback } = i18nMiddleware();
		const i18n = callback({
			id: 'test',
			middleware: {
				injector: injectorStub,
				invalidator: invalidatorStub,
				getRegistry: getRegistryStub
			},
			properties: {}
		});
		await coreI18n(bundle, 'fr');
		const { isPlaceholder, messages } = i18n.localize(bundle);
		assert.isFalse(isPlaceholder);
		assert.strictEqual(messages.hello, 'Bonjour');
		assert.strictEqual(messages.goodbye, 'Au revoir');
	});

	it('Returns an object with a `format` method', async () => {
		switchLocale('fr');
		const { callback } = i18nMiddleware();
		const i18n = callback({
			id: 'test',
			middleware: {
				injector: injectorStub,
				invalidator: invalidatorStub,
				getRegistry: getRegistryStub
			},
			properties: {}
		});
		await coreI18n(bundle, 'fr');
		const { format } = i18n.localize(bundle);
		assert.strictEqual(format('welcome', { name: 'Jean' }), 'Bienvenue, Jean!');
	});

	it('localizeBundle() with an override using the `i18nBundle` property', async () => {
		switchLocale('es');
		const { callback } = i18nMiddleware();
		const i18n = callback({
			id: 'test',
			middleware: {
				injector: injectorStub,
				invalidator: invalidatorStub,
				getRegistry: getRegistryStub
			},
			properties: {
				i18nBundle: overrideBundle
			}
		});
		await coreI18n(bundle, 'es');
		await coreI18n(overrideBundle, 'es');
		const { format, messages } = i18n.localize(bundle);
		assert.strictEqual(messages.hello, 'Hola');
		assert.strictEqual(messages.goodbye, 'Adiós');
		assert.strictEqual(format('welcome', { name: 'Jean' }), 'Bienvenido, Jean');
	});

	it('localizeBundle() with an override using a map for the `i18nBundle` property', async () => {
		switchLocale('es');
		const i18nBundleMap = new Map<any, any>();
		i18nBundleMap.set(bundle, overrideBundle);
		const { callback } = i18nMiddleware();
		const i18n = callback({
			id: 'test',
			middleware: {
				injector: injectorStub,
				invalidator: invalidatorStub,
				getRegistry: getRegistryStub
			},
			properties: {
				i18nBundle: i18nBundleMap
			}
		});
		await coreI18n(bundle, 'es');
		await coreI18n(overrideBundle, 'es');
		const { format, messages } = i18n.localize(bundle);
		assert.strictEqual(messages.hello, 'Hola');
		assert.strictEqual(messages.goodbye, 'Adiós');
		assert.strictEqual(format('welcome', { name: 'Jean' }), 'Bienvenido, Jean');
	});

	it('Uses the base bundle when the `i18nBundle` map does not contain an override', async () => {
		switchLocale('es');
		const i18nBundleMap = new Map<any, any>();
		const { callback } = i18nMiddleware();
		const i18n = callback({
			id: 'test',
			middleware: {
				injector: injectorStub,
				invalidator: invalidatorStub,
				getRegistry: getRegistryStub
			},
			properties: {
				i18nBundle: i18nBundleMap
			}
		});
		await coreI18n(bundle, 'es');
		await coreI18n(overrideBundle, 'es');
		const { format, messages } = i18n.localize(bundle);
		assert.strictEqual(messages.hello, 'Hello');
		assert.strictEqual(messages.goodbye, 'Goodbye');
		assert.strictEqual(format('hello'), 'Hello');
	});

	it('defaults to the injector data', async () => {
		const injector = new Injector({ locale: 'fr', rtl: true });
		injectorStub.get.returns(injector);
		const { callback } = i18nMiddleware();
		const i18n = callback({
			id: 'test',
			middleware: {
				injector: injectorStub,
				invalidator: invalidatorStub,
				getRegistry: getRegistryStub
			},
			properties: {}
		});
		await coreI18n(bundle, 'fr');
		const { isPlaceholder, messages } = i18n.localize(bundle);
		assert.isFalse(isPlaceholder);
		assert.strictEqual(messages.hello, 'Bonjour');
		assert.strictEqual(messages.goodbye, 'Au revoir');
	});

	it('injected locale does not override properties', async () => {
		const injector = new Injector({ locale: 'es', rtl: true });
		injectorStub.get.returns(injector);
		const { callback } = i18nMiddleware();
		const i18n = callback({
			id: 'test',
			middleware: {
				injector: injectorStub,
				invalidator: invalidatorStub,
				getRegistry: getRegistryStub
			},
			properties: {
				locale: 'fr'
			}
		});
		await coreI18n(bundle, 'fr');
		const { isPlaceholder, messages } = i18n.localize(bundle);
		assert.isFalse(isPlaceholder);
		assert.strictEqual(messages.hello, 'Bonjour');
		assert.strictEqual(messages.goodbye, 'Au revoir');
	});

	it('can set and get the locale', async () => {
		defineInjector.callsFake(() => {
			injectorStub.get.returns(new Injector({ locale: 'es', rtl: true }));
		});
		const { callback } = i18nMiddleware();
		const i18n = callback({
			id: 'test',
			middleware: {
				injector: injectorStub,
				invalidator: invalidatorStub,
				getRegistry: getRegistryStub
			},
			properties: {}
		});
		assert.isTrue(defineInjector.calledOnce);
		await coreI18n(bundle, 'fr');
		i18n.set({ locale: 'fr', rtl: true });
		const { isPlaceholder, messages } = i18n.localize(bundle);
		assert.isFalse(isPlaceholder);
		assert.strictEqual(messages.hello, 'Bonjour');
		assert.strictEqual(messages.goodbye, 'Au revoir');
		assert.deepEqual<any>(i18n.get(), { locale: 'fr', rtl: true });
	});
});
