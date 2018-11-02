const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import i18n, { invalidate, switchLocale, systemLocale } from '../../../../src/i18n/i18n';
import Map from '../../../../src/shim/Map';
import { INJECTOR_KEY, I18nMixin, I18nProperties, registerI18nInjector } from '../../../../src/widget-core/mixins/I18n';
import { Registry } from '../../../../src/widget-core/Registry';
import { WidgetBase } from '../../../../src/widget-core/WidgetBase';
import bundle from '../../support/nls/greetings';
import { fetchCldrData } from '../../support/util';
import { v, w } from './../../../../src/widget-core/d';
import { ThemedMixin } from './../../../../src/widget-core/mixins/Themed';
import harness from '../../../../src/testing/harness';

class Localized extends I18nMixin(ThemedMixin(WidgetBase))<I18nProperties> {}

class LocalizedWithWidget extends I18nMixin(ThemedMixin(WidgetBase))<I18nProperties> {
	render() {
		return w(Localized, {}, [v('div', {})]);
	}
}

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

let localized: any;

registerSuite('mixins/I18nMixin', {
	before() {
		return <Promise<any>>fetchCldrData();
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
			const localized = (harness(() => w(Localized, {})).getRender(0) as any).bind;
			assert(localized);
			assert.isFunction(localized.localizeBundle);
		},

		'.localizeBundle()': {
			'Returns blank messages when locale bundle not loaded'() {
				switchLocale('fr');

				localized = (harness(() => w(Localized, {})).getRender(0) as any).bind;
				const { format, isPlaceholder, messages } = localized.localizeBundle(bundle);

				assert.isTrue(isPlaceholder);
				assert.strictEqual(messages.hello, '');
				assert.strictEqual(messages.goodbye, '');
				assert.strictEqual(format('hello'), '');
			},

			'Returns default messages with second argument when locale bundle not loaded'() {
				switchLocale('fr');

				localized = (harness(() => w(Localized, {})).getRender(0) as any).bind;
				const { format, isPlaceholder, messages } = localized.localizeBundle(bundle, true);

				assert.isTrue(isPlaceholder);
				assert.strictEqual(messages.hello, 'Hello');
				assert.strictEqual(messages.goodbye, 'Goodbye');
				assert.strictEqual(format('hello'), 'Hello');
			},

			'Returns default messages when bundle has no supported locales'() {
				switchLocale('fr');

				localized = (harness(() => w(Localized, {})).getRender(0) as any).bind;
				const { isPlaceholder, messages } = localized.localizeBundle({
					messages: {
						hello: 'Hello',
						goodbye: 'Goodbye'
					}
				});

				assert.isFalse(isPlaceholder);
				assert.strictEqual(messages.hello, 'Hello');
				assert.strictEqual(messages.goodbye, 'Goodbye');
			},

			'Uses `properties.locale` when available'() {
				const h = harness(() => w(Localized, { locale: 'fr' }));
				localized = (h.getRender(0) as any).bind;
				return i18n(bundle, 'fr').then(() => {
					const { isPlaceholder, messages } = localized.localizeBundle(bundle);
					assert.isFalse(isPlaceholder);
					assert.strictEqual(messages.hello, 'Bonjour');
					assert.strictEqual(messages.goodbye, 'Au revoir');
				});
			},

			'Uses default locale when no locale is set'() {
				switchLocale('fr');

				const h = harness(() => w(Localized, {}));
				localized = (h.getRender(0) as any).bind;
				return i18n(bundle, 'fr').then(() => {
					const { isPlaceholder, messages } = localized.localizeBundle(bundle);
					assert.isFalse(isPlaceholder);
					assert.strictEqual(messages.hello, 'Bonjour');
					assert.strictEqual(messages.goodbye, 'Au revoir');
				});
			},

			'Returns an object with a `format` method'() {
				localized = (harness(() => w(Localized, {})).getRender(0) as any).bind;
				let { format } = localized.localizeBundle(bundle);

				assert.isFunction(format);
				assert.strictEqual(format('welcome', { name: 'Bill' }), 'Welcome, Bill!');

				switchLocale('fr');

				return i18n(bundle, 'fr').then(() => {
					format = localized.localizeBundle(bundle).format;
					assert.strictEqual(format('welcome', { name: 'Jean' }), 'Bienvenue, Jean!');
				});
			}
		},
		'.localizeBundle() with an override': {
			'Uses the `i18nBundle` property'() {
				localized = (harness(() => w(Localized, { i18nBundle: overrideBundle })).getRender(0) as any).bind;

				switchLocale('es');
				localized.localizeBundle(bundle);

				return i18n(bundle, 'es')
					.then(() => i18n(overrideBundle, 'es'))
					.then(() => {
						const { format, messages } = localized.localizeBundle(bundle);
						assert.strictEqual(messages.hello, 'Hola');
						assert.strictEqual(messages.goodbye, 'Adiós');
						assert.strictEqual(format('welcome', { name: 'Jean' }), 'Bienvenido, Jean');
					});
			},
			'Allows `i18nBundle` to be a `Map`'() {
				const i18nBundleMap = new Map<any, any>();
				i18nBundleMap.set(bundle, overrideBundle);

				localized = (harness(() => w(Localized, { i18nBundle: i18nBundleMap })).getRender(0) as any).bind;

				switchLocale('es');
				localized.localizeBundle(bundle);
				return i18n(bundle, 'es')
					.then(() => i18n(overrideBundle, 'es'))
					.then(() => {
						const { format, messages } = localized.localizeBundle(bundle);
						assert.strictEqual(messages.hello, 'Hola');
						assert.strictEqual(messages.goodbye, 'Adiós');
						assert.strictEqual(format('welcome', { name: 'Jean' }), 'Bienvenido, Jean');
					});
			},
			'Uses the base bundle when the `i18nBundle` map does not contain an override'() {
				const i18nBundleMap = new Map<any, any>();

				localized = (harness(() => w(Localized, { i18nBundle: i18nBundleMap })).getRender(0) as any).bind;

				switchLocale('es');
				localized.localizeBundle(bundle);
				return i18n(bundle, 'es')
					.then(() => i18n(overrideBundle, 'es'))
					.then(() => {
						const { format, messages } = localized.localizeBundle(bundle);
						assert.strictEqual(messages.hello, 'Hello');
						assert.strictEqual(messages.goodbye, 'Goodbye');
						assert.strictEqual(format('hello'), 'Hello');
					});
			}
		},
		'locale data can be injected by defining an Injector with a registry': {
			'defaults to the injector data'() {
				const injector = () => () => ({ locale: 'ar', rtl: true });
				const registry = new Registry();

				registry.defineInjector(INJECTOR_KEY, injector);
				harness(() => w(Localized, {}), { registry }).expect(() =>
					v('div', {
						lang: 'ar',
						dir: 'rtl'
					})
				);
			},

			'does not override property values'() {
				const injector = () => () => ({ locale: 'ar', rtl: true });
				const registry = new Registry();

				registry.defineInjector(INJECTOR_KEY, injector);
				harness(() => w(Localized, { locale: 'fr', rtl: false }), { registry }).expect(() =>
					v('div', {
						lang: 'fr',
						dir: 'ltr'
					})
				);
			},

			'properties can be registered with helper'() {
				const registry = new Registry();
				const injector = registerI18nInjector({ locale: 'fr' }, registry);

				const h = harness(() => w(Localized, {}), { registry });
				h.expect(() => v('div', { lang: 'fr' }));

				injector.set({ locale: 'jp' });
				h.expect(() => v('div', { lang: 'jp' }));
			}
		},
		'does not decorate properties for wNode'() {
			class LocalizedExtended extends Localized {
				render() {
					return w(Localized, {});
				}
			}

			const h = harness(() => w(LocalizedExtended, { locale: 'ar-JO' }));
			h.expect(() => w(Localized, {}));
		},
		"`properties.locale` updates the widget node's `lang` property": {
			'when non-empty'() {
				harness(() => w(Localized, { locale: 'ar-JO' })).expect(() => v('div', { lang: 'ar-JO' }));
			},

			'when empty'() {
				harness(() => w(Localized, {})).expect(() => v('div'));
			}
		},

		'`properties.rtl`': {
			'The `dir` attribute is "rtl" when true'() {
				harness(() => w(Localized, { rtl: true })).expect(() => v('div', { dir: 'rtl' }));
			},

			'The `dir` attribute is "ltr" when false'() {
				harness(() => w(Localized, { rtl: false })).expect(() => v('div', { dir: 'ltr' }));
			},

			'The `dir` attribute is not set when not a boolean.'() {
				harness(() => w(Localized, {})).expect(() => v('div'));
			},

			'The `dir` attribute is added to the first VNode in the render'() {
				harness(() => w(LocalizedWithWidget, { rtl: false })).expect(() =>
					w(Localized, {}, [v('div', { dir: 'ltr' })])
				);
			}
		}
	}
});
