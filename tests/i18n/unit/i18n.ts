const { it, describe, beforeEach } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
const Cldr = require('cldrjs/dist/cldr');
import global from '../../../src/shim/global';
import { stub, spy, SinonSpy } from 'sinon';
import {
	localizeBundle,
	setDefaultLocale,
	setSupportedLocales,
	setLocale,
	setCldrLoaders
} from '../../../src/i18n/i18n';

describe('i18n', () => {
	beforeEach(async () => {
		setDefaultLocale('fr');
		setSupportedLocales(['fr']);
		setCldrLoaders({});
		await setLocale('fr');
		if (!global.navigator) {
			global.navigator = {
				language: 'en-GB'
			};
		}
	});

	describe('setLocale', () => {
		it('Should default to use the system locale if no locale is provided and is supported by the available locales', async () => {
			setDefaultLocale('fr');
			setSupportedLocales(['en', 'fr']);
			const locale = await setLocale();
			assert.strictEqual(locale, global.navigator.language);
		});

		it('Should default to the default locale if no locale is provided and is not supported by the available locales', async () => {
			setDefaultLocale('fake');
			setSupportedLocales(['fake']);
			const locale = await setLocale();
			assert.strictEqual(locale, 'fake');
		});

		it('Should compute the locale to the passed if supported by the locales', async () => {
			setDefaultLocale('fr');
			setSupportedLocales(['en', 'fr']);
			const locale = await setLocale('en-GB');
			assert.strictEqual(locale, 'en-GB');
		});

		it('Should compute the locale to the default locale if not supported by the locales', async () => {
			setDefaultLocale('fr');
			setSupportedLocales(['en', 'fr']);
			const locale = await setLocale('ja');
			assert.strictEqual(locale, 'fr');
		});

		it('Should load the cldr for the computed locale', async () => {
			setDefaultLocale('fr');
			setSupportedLocales(['en', 'fr']);
			const expectedSupplemental = { default: { supplemental: { test: 'loaded' } } };
			const expectedEn = { default: { en: { main: { test: 'loaded' } } } };
			const enPromise = Promise.resolve([expectedEn]);
			const supplementalPromise = Promise.resolve([expectedSupplemental]);
			setCldrLoaders({
				en: () => enPromise,
				supplemental: () => supplementalPromise
			});
			const locale = await setLocale('en');
			assert.strictEqual(locale, 'en');
			const cldr = new Cldr('en');
			assert.strictEqual(cldr.get('en/main/test'), 'loaded');
			assert.strictEqual(cldr.get('supplemental/test'), 'loaded');
		});
	});

	describe('localizeBundle', () => {
		it('Resolve sync message bundles', () => {
			const invalidator = stub();
			const bundle = {
				messages: { foo: 'bonjour, {name}', fallback: 'root/fr fallback' },
				locales: {
					ja: { foo: 'こんにちは, {name}' },
					en: { foo: 'Hello, {name}', fallback: 'en fallback' },
					'en-GB': { foo: 'Oi, {name}' }
				}
			};
			let { messages, format, isPlaceholder } = localizeBundle(bundle, { invalidator });
			assert.deepEqual(messages, { foo: 'bonjour, {name}', fallback: 'root/fr fallback' });
			assert.strictEqual(format('foo', { name: 'Steven' }), 'bonjour, Steven');
			assert.isFalse(isPlaceholder);
			({ messages, format, isPlaceholder } = localizeBundle(bundle, { locale: 'ar', invalidator }));
			assert.deepEqual(messages, { foo: 'bonjour, {name}', fallback: 'root/fr fallback' });
			assert.strictEqual(format('foo', { name: 'Steven' }), 'bonjour, Steven');
			assert.isFalse(isPlaceholder);
			({ messages, format, isPlaceholder } = localizeBundle(bundle, { locale: 'ja', invalidator }));
			assert.deepEqual(messages, { foo: 'こんにちは, {name}', fallback: 'root/fr fallback' });
			assert.strictEqual(format('foo', { name: 'Steven' }), 'こんにちは, Steven');
			assert.isFalse(isPlaceholder);
			({ messages, format, isPlaceholder } = localizeBundle(bundle, { locale: 'en-GB', invalidator }));
			assert.deepEqual(messages, { foo: 'Oi, {name}', fallback: 'en fallback' });
			assert.strictEqual(format('foo', { name: 'Steven' }), 'Oi, Steven');
			assert.isFalse(isPlaceholder);
			({ messages, format, isPlaceholder } = localizeBundle(bundle, { locale: 'en', invalidator }));
			assert.deepEqual(messages, { foo: 'Hello, {name}', fallback: 'en fallback' });
			assert.strictEqual(format('foo', { name: 'Steven' }), 'Hello, Steven');
			assert.isFalse(isPlaceholder);
		});

		it('Resolves async messages bundles', async () => {
			const invalidator = stub();
			setDefaultLocale('fr');
			setSupportedLocales(['fr']);
			setCldrLoaders({});
			await setLocale('fr');

			function createAyncMessageLoader(): {
				promise: Promise<any>;
				resolver: Function;
				loader: () => any;
				loaderSpy: SinonSpy;
			} {
				let loaderHelper: any = {};
				loaderHelper.loader = () => {
					loaderHelper.promise = new Promise((resolve) => {
						loaderHelper.resolver = resolve;
					});
					return loaderHelper.promise;
				};
				loaderHelper.loaderSpy = spy(loaderHelper.loader);
				return loaderHelper;
			}

			const enGb = createAyncMessageLoader();
			const en = createAyncMessageLoader();
			const bundle = {
				messages: { foo: 'bonjour, {name}', fallback: 'root/fr fallback' },
				locales: {
					'en-GB': enGb.loader,
					en: en.loader
				}
			};

			let { messages, format, isPlaceholder } = localizeBundle(bundle, { invalidator });
			assert.deepEqual(messages, { foo: 'bonjour, {name}', fallback: 'root/fr fallback' });
			assert.strictEqual(format('foo', { name: 'Steven' }), 'bonjour, Steven');
			assert.isFalse(isPlaceholder);
			({ messages, format, isPlaceholder } = localizeBundle(bundle, { locale: 'fr', invalidator }));
			assert.deepEqual(messages, { foo: 'bonjour, {name}', fallback: 'root/fr fallback' });
			assert.strictEqual(format('foo', { name: 'Steven' }), 'bonjour, Steven');
			assert.isFalse(isPlaceholder);
			({ messages, format, isPlaceholder } = localizeBundle(bundle, { locale: 'en-GB', invalidator }));
			assert.deepEqual(messages, { foo: '', fallback: '' });
			assert.strictEqual(format('foo', { name: 'Steven' }), '');
			assert.isTrue(isPlaceholder);
			enGb.resolver({ default: { foo: 'Oi, {name}' } });
			assert.isTrue(invalidator.notCalled);
			await enGb.promise;
			assert.isTrue(invalidator.calledOnce);
			({ messages, format, isPlaceholder } = localizeBundle(bundle, { locale: 'en-GB', invalidator }));
			assert.deepEqual(messages, { foo: '', fallback: '' });
			assert.strictEqual(format('foo', { name: 'Steven' }), '');
			assert.isTrue(isPlaceholder);
			en.resolver({ default: { foo: 'Hello, {name}', fallback: 'en fallback' } });
			assert.isTrue(invalidator.calledOnce);
			await en.promise;
			assert.isTrue(invalidator.calledTwice);
			({ messages, format, isPlaceholder } = localizeBundle(bundle, { locale: 'en-GB', invalidator }));
			assert.deepEqual(messages, { foo: 'Oi, {name}', fallback: 'en fallback' });
			assert.strictEqual(format('foo', { name: 'Steven' }), 'Oi, Steven');
			assert.isFalse(isPlaceholder);
			({ messages, format, isPlaceholder } = localizeBundle(bundle, { locale: 'en', invalidator }));
			assert.deepEqual(messages, { foo: 'Hello, {name}', fallback: 'en fallback' });
			assert.strictEqual(format('foo', { name: 'Steven' }), 'Hello, Steven');
			assert.isFalse(isPlaceholder);
		});
	});
});
