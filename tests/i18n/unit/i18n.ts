const { it, describe, before } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');
import { stub, spy, SinonSpy } from 'sinon';
import global from '../../../src/shim/global';
import { localizeBundle } from '../../../src/i18n/i18n';

describe('i18n', () => {
	before(() => {
		global.__dojoLocales = {
			userLocale: 'fr',
			defaultLocale: 'fr'
		};
	});

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
		global.__dojoLocales = {
			userLocale: 'fr',
			defaultLocale: 'fr'
		};

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
