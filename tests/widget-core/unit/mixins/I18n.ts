import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import i18n, { invalidate, switchLocale, systemLocale } from '@dojo/i18n/i18n';
import * as sinon from 'sinon';
import { VNode } from '@dojo/interfaces/vdom';
import { I18nMixin, I18nProperties } from '../../../src/mixins/I18n';
import { WidgetBase } from '../../../src/WidgetBase';
import { w } from './../../../src/d';
import bundle from '../../support/nls/greetings';

class Localized extends I18nMixin(WidgetBase)<I18nProperties> {}

let localized: any;

registerSuite({
	name: 'mixins/I18nMixin',

	afterEach() {
		return switchLocale(systemLocale).then(() => {
			invalidate();

			if (localized) {
				localized.destroy();
				localized = <any> null;
			}
		});
	},

	api() {
		const localized = new Localized({});
		assert(localized);
		assert.isFunction(localized.localizeBundle);
	},

	'.localizeBundle()': {
		'Returns default messages when locale bundle not loaded'() {
			return switchLocale('fr').then(() => {
				localized = new Localized({});
				const messages = localized.localizeBundle(bundle);

				assert.strictEqual(messages.hello, 'Hello');
				assert.strictEqual(messages.goodbye, 'Goodbye');
			});
		},

		'Uses `properties.locale` when available'() {
			localized = new Localized({ locale: 'fr' });
			return i18n(bundle, 'fr').then(() => {
				const messages = localized.localizeBundle(bundle);
				assert.strictEqual(messages.hello, 'Bonjour');
				assert.strictEqual(messages.goodbye, 'Au revoir');
			});
		},

		'Uses default locale when no locale is set'() {
			return switchLocale('fr').then(() => {
				localized = new Localized({});
				return i18n(bundle, 'fr').then(() => {
					const messages = localized.localizeBundle(bundle);
					assert.strictEqual(messages.hello, 'Bonjour');
					assert.strictEqual(messages.goodbye, 'Au revoir');
				});
			});
		},

		'Returns an object with a `format` method'() {
			localized = new Localized({});
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
			localized = new Localized({});
			sinon.spy(localized, 'invalidate');

			return switchLocale('fr').then(() => {
				assert.isTrue((<any> localized).invalidate.called, 'Widget invalidated.');
			});
		},

		'Does not update when `locale` property is set'() {
			localized = new Localized({
					locale: 'en'
			});
			sinon.spy(localized, 'invalidate');

			return switchLocale('fr').then(() => {
				assert.isFalse((<any> localized).invalidate.called, 'Widget not invalidated.');
			});
		}
	},
	'does not decorate properties for wNode'() {
		class LocalizedExtended extends Localized {
			render() {
				return w(Localized, {});
			}
		}

		localized = new LocalizedExtended({locale: 'ar-JO'});

		const result = <VNode> localized.__render__();
		assert.isOk(result);
		assert.isNull(result.properties!['data-locale']);
	},
	'`properties.locale` updates the widget node\'s `data-locale` property': {
		'when non-empty'() {
			localized = new Localized({locale: 'ar-JO'});

			const result = <VNode> localized.__render__();
			assert.isOk(result);
			assert.strictEqual(result.properties!['data-locale'], 'ar-JO');
		},

		'when empty'() {
			localized = new Localized({});

			const result = localized.__render__();
			assert.isOk(result);
			assert.isNull(result.properties!['data-locale']);
		}
	},

	'`properties.rtl`': {
		'The `dir` attribute is "rtl" when true'() {
			localized = new Localized({ rtl: true });

			const result = localized.__render__();
			assert.isOk(result);
			assert.strictEqual(result.properties!['dir'], 'rtl');
		},

		'The `dir` attribute is "ltr" when false'() {
			localized = new Localized({ rtl: false });

			const result = localized.__render__();
			assert.isOk(result);
			assert.strictEqual(result.properties!['dir'], 'ltr');
		},

		'The `dir` attribute is not set when not a boolean.'() {
			localized = new Localized({});

			const result = localized.__render__();
			assert.isOk(result);
			assert.isNull(result.properties!['dir']);
		}
	}
});
