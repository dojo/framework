import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import i18n, { invalidate, switchLocale, systemLocale } from 'dojo-i18n/i18n';
import * as sinon from 'sinon';
import createI18nMixin from '../../../src/mixins/createI18nMixin';
import createWidgetBase from '../../../src/createWidgetBase';
import bundle from '../../support/nls/greetings';

const createLocalized = createWidgetBase.mixin(createI18nMixin);
let localized: any;

registerSuite({
	name: 'mixins/createI18nMixin',

	afterEach() {
		return switchLocale(systemLocale).then(() => {
			invalidate();

			if (localized) {
				localized.destroy();
				localized = null;
			}
		});
	},

	api() {
		const localized = createLocalized();
		assert(localized);
		assert.isFunction(localized.localizeBundle);
	},

	'.localizeBundle()': {
		'Returns default messages when locale bundle not loaded'() {
			return switchLocale('fr').then(() => {
				localized = createLocalized();
				const messages = localized.localizeBundle(bundle);

				assert.strictEqual(messages.hello, 'Hello');
				assert.strictEqual(messages.goodbye, 'Goodbye');
			});
		},

		'Uses `properties.locale` when available'() {
			localized = createLocalized({
				properties: {
					locale: 'fr'
				}
			});
			return i18n(bundle, 'fr').then(() => {
				const messages = localized.localizeBundle(bundle);
				assert.strictEqual(messages.hello, 'Bonjour');
				assert.strictEqual(messages.goodbye, 'Au revoir');
			});
		},

		'Uses default locale when no locale is set'() {
			return switchLocale('fr').then(() => {
				localized = createLocalized();
				return i18n(bundle, 'fr').then(() => {
					const messages = localized.localizeBundle(bundle);
					assert.strictEqual(messages.hello, 'Bonjour');
					assert.strictEqual(messages.goodbye, 'Au revoir');
				});
			});
		},

		'Returns an object with a `format` method'() {
			localized = createLocalized();
			let messages = localized.localizeBundle(bundle);

			assert.isFunction(messages.format);
			assert.strictEqual(messages.format('welcome', { name: 'Bill' }), 'Welcome, Bill!');

			return switchLocale('fr').then(() => {
				return i18n(bundle, 'fr');
			}).then(() => {
				messages = localized.localizeBundle(bundle);
				assert.strictEqual(messages.format('welcome', { name: 'Jean' }), 'Bienvenue, Jean!');
			});
		}
	},

	'root locale switching': {
		'Updates when no `locale` property is set'() {
			localized = createLocalized();
			sinon.spy(localized, 'invalidate');

			return switchLocale('fr').then(() => {
				assert.isTrue((<any> localized).invalidate.called, 'Widget invalidated.');
			});
		},

		'Does not update when `locale` property is set'() {
			localized = createLocalized({
				properties: {
					locale: 'en'
				}
			});
			sinon.spy(localized, 'invalidate');

			return switchLocale('fr').then(() => {
				assert.isFalse((<any> localized).invalidate.called, 'Widget not invalidated.');
			});
		}
	},

	'`properties.locale` updates the widget node\'s `data-locale` property': {
		'when non-empty'() {
			localized = createLocalized({
				properties: { locale: 'ar-JO' }
			});
			const attributes = localized.nodeAttributes.slice(-1)[0].call(localized, {});

			assert.strictEqual(attributes['data-locale'], 'ar-JO');
		},

		'when empty'() {
			localized = createLocalized();
			const attributes = localized.nodeAttributes.slice(-1)[0].call(localized, {});

			assert.isNull(attributes['data-locale']);
		}
	},

	'`properties.rtl`': {
		'The `dir` attribute is "rtl" when true'() {
			localized = createLocalized({
				properties: { rtl: true }
			});
			const attributes = localized.nodeAttributes.slice(-1)[0].call(localized, {});

			assert.strictEqual(attributes.dir, 'rtl');
		},

		'The `dir` attribute is "ltr" when false'() {
			localized = createLocalized({
				properties: { rtl: false }
			});
			const attributes = localized.nodeAttributes.slice(-1)[0].call(localized, {});

			assert.strictEqual(attributes.dir, 'ltr');
		},

		'The `dir` attribute is not set when not a boolean.'() {
			localized = createLocalized();
			const attributes = localized.nodeAttributes.slice(-1)[0].call(localized, {});

			assert.isNull(attributes.dir);
		}
	}
});
