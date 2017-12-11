const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import i18n, { invalidate, switchLocale, systemLocale } from '@dojo/i18n/i18n';
import { INJECTOR_KEY, I18nMixin, I18nProperties, registerI18nInjector } from '../../../src/mixins/I18n';
import { Injector } from '../../../src/Injector';
import { Registry } from '../../../src/Registry';
import { WidgetBase } from '../../../src/WidgetBase';
import bundle from '../../support/nls/greetings';
import { fetchCldrData } from '../../support/util';
import { w } from './../../../src/d';
import { ThemedMixin } from './../../../src/mixins/Themed';

class Localized extends I18nMixin(ThemedMixin(WidgetBase))<I18nProperties> { }

let localized: any;

registerSuite('mixins/I18nMixin', {

	before() {
		return <Promise<any>> fetchCldrData();
	},

	afterEach() {
		invalidate();
		switchLocale(systemLocale);

		if (localized) {
			localized = null;
		}
	},

	tests: {
		api() {
			const localized = new Localized();
			assert(localized);
			assert.isFunction(localized.localizeBundle);
		},

		'.localizeBundle()': {
			'Returns default messages when locale bundle not loaded'() {
				switchLocale('fr');

				localized = new Localized();
				const messages = localized.localizeBundle(bundle);

				assert.strictEqual(messages.hello, 'Hello');
				assert.strictEqual(messages.goodbye, 'Goodbye');
			},

			'Uses `properties.locale` when available'() {
				localized = new Localized();
				localized.__setProperties__({ locale: 'fr' });
				return i18n(bundle, 'fr').then(() => {
					const messages = localized.localizeBundle(bundle);
					assert.strictEqual(messages.hello, 'Bonjour');
					assert.strictEqual(messages.goodbye, 'Au revoir');
				});
			},

			'Uses default locale when no locale is set'() {
				switchLocale('fr');

				localized = new Localized();
				return i18n(bundle, 'fr').then(() => {
					const messages = localized.localizeBundle(bundle);
					assert.strictEqual(messages.hello, 'Bonjour');
					assert.strictEqual(messages.goodbye, 'Au revoir');
				});
			},

			'Returns an object with a `format` method'() {
				localized = new Localized();
				let messages = localized.localizeBundle(bundle);

				assert.isFunction(messages.format);
				assert.strictEqual(messages.format('welcome', { name: 'Bill' }), 'Welcome, Bill!');

				switchLocale('fr');

				return i18n(bundle, 'fr').then(() => {
					messages = localized.localizeBundle(bundle);
					assert.strictEqual(messages.format('welcome', { name: 'Jean' }), 'Bienvenue, Jean!');
				});
			}
		},
		'locale data can be injected by defining an Injector with a registry': {
			'defaults to the injector data'() {
				const injector = new Injector({ locale: 'ar', rtl: true });
				const registry = new Registry();

				registry.defineInjector(INJECTOR_KEY, injector);
				localized = new Localized();
				localized.__setCoreProperties__({ bind: localized, baseRegistry: registry });
				localized.__setProperties__({});

				const result = localized.__render__();
				assert.strictEqual(result.properties!['lang'], 'ar');
				assert.strictEqual(result.properties!['dir'], 'rtl');
			},

			'does not override property values'() {
				const injector = new Injector({ locale: 'ar', rtl: true });
				const registry = new Registry();

				registry.defineInjector(INJECTOR_KEY, injector);
				localized = new Localized();
				localized.__setCoreProperties__({ bind: localized, baseRegistry: registry });
				localized.__setProperties__({ locale: 'fr', rtl: false });

				const result = localized.__render__();
				assert.strictEqual(result.properties!['lang'], 'fr');
				assert.strictEqual(result.properties!['dir'], 'ltr');
			},

			'properties can be registered with helper'() {
				const registry = new Registry();
				const injector = registerI18nInjector({ locale: 'fr' }, registry);

				localized = new Localized();
				localized.__setCoreProperties__({ bind: localized, baseRegistry: registry });
				localized.__setProperties__({});

				let result = localized.__render__();
				assert.strictEqual(result.properties!['lang'], 'fr');

				injector.set({ locale: 'jp' });
				localized.__setProperties__({});
				result = localized.__render__();
				assert.strictEqual(result.properties!['lang'], 'jp');
			}
		},
		'does not decorate properties for wNode'() {
			class LocalizedExtended extends Localized {
				render() {
					return w(Localized, {});
				}
			}

			localized = new LocalizedExtended();
			localized.__setProperties__({locale: 'ar-JO'});

			const result = localized.__render__();
			assert.isOk(result);
			assert.isUndefined(result.properties!['lang']);
		},
		'`properties.locale` updates the widget node\'s `lang` property': {
			'when non-empty'() {
				localized = new Localized();
				localized.__setProperties__({locale: 'ar-JO'});

				const result = localized.__render__();
				assert.isOk(result);
				assert.strictEqual(result.properties!['lang'], 'ar-JO');
			},

			'when empty'() {
				localized = new Localized();

				const result = localized.__render__();
				assert.isOk(result);
				assert.isNull(result.properties!['lang']);
			}
		},

		'`properties.rtl`': {
			'The `dir` attribute is "rtl" when true'() {
				localized = new Localized();
				localized.__setProperties__({ rtl: true });

				const result = localized.__render__();
				assert.isOk(result);
				assert.strictEqual(result.properties!['dir'], 'rtl');
			},

			'The `dir` attribute is "ltr" when false'() {
				localized = new Localized();
				localized.__setProperties__({ rtl: false });

				const result = localized.__render__();
				assert.isOk(result);
				assert.strictEqual(result.properties!['dir'], 'ltr');
			},

			'The `dir` attribute is not set when not a boolean.'() {
				localized = new Localized();

				const result = localized.__render__();
				assert.isOk(result);
				assert.isNull(result.properties!['dir']);
			}
		}
	}
});
