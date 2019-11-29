/* tslint:disable:interface-name */
import i18nCore, { Bundle, formatMessage, getCachedMessages, Messages } from '../../i18n/i18n';
import { create, invalidator, getRegistry } from '../vdom';
import injector from './injector';
import Map from '../../shim/Map';
import Injector from '../Injector';
import Registry from '../Registry';
import { I18nProperties, LocalizedMessages, LocaleData } from '../interfaces';
export { LocalizedMessages, I18nProperties, LocaleData } from './../interfaces';

export const INJECTOR_KEY = '__i18n_injector';

export function registerI18nInjector(localeData: LocaleData, registry: Registry): Injector {
	const injector = new Injector(localeData);
	registry.defineInjector(INJECTOR_KEY, (invalidator) => {
		injector.setInvalidator(invalidator);
		return () => injector;
	});
	return injector;
}

const factory = create({ invalidator, injector, getRegistry }).properties<I18nProperties>();

export const i18n = factory(({ properties, middleware: { invalidator, injector, getRegistry } }) => {
	const i18nInjector = injector.get(INJECTOR_KEY);
	if (!i18nInjector) {
		const registry = getRegistry();
		if (registry) {
			registerI18nInjector({}, registry.base);
		}
	}
	injector.subscribe(INJECTOR_KEY);

	function getLocaleMessages(bundle: Bundle<Messages>): Messages | void {
		let { locale } = properties();
		if (!locale) {
			const injectedLocale = injector.get<Injector<LocaleData>>(INJECTOR_KEY);
			if (injectedLocale) {
				locale = injectedLocale.get().locale;
			}
		}
		locale = locale || i18nCore.locale;
		const localeMessages = getCachedMessages(bundle, locale);

		if (localeMessages) {
			return localeMessages;
		}

		i18nCore(bundle, locale).then(() => {
			invalidator();
		});
	}

	function resolveBundle<T extends Messages>(bundle: Bundle<T>): Bundle<T> {
		let { i18nBundle } = properties();
		if (i18nBundle) {
			if (i18nBundle instanceof Map) {
				i18nBundle = i18nBundle.get(bundle);

				if (!i18nBundle) {
					return bundle;
				}
			}

			return i18nBundle as Bundle<T>;
		}
		return bundle;
	}

	function getBlankMessages<T extends Messages>(bundle: Bundle<T>): T {
		const blank = {} as Messages;
		return Object.keys(bundle.messages).reduce((blank, key) => {
			blank[key] = '';
			return blank;
		}, blank) as T;
	}

	return {
		localize<T extends Messages>(bundle: Bundle<T>, useDefaults = false): LocalizedMessages<T> {
			let { locale } = properties();
			bundle = resolveBundle(bundle);
			const messages = getLocaleMessages(bundle);
			const isPlaceholder = !messages;
			if (!locale) {
				const injectedLocale = injector.get<Injector<LocaleData>>(INJECTOR_KEY);
				if (injectedLocale) {
					locale = injectedLocale.get().locale;
				}
			}

			const format =
				isPlaceholder && !useDefaults
					? () => ''
					: (key: keyof T, options?: any) => formatMessage(bundle, key as string, options, locale);

			return Object.create({
				format,
				isPlaceholder,
				messages: messages || (useDefaults ? bundle.messages : getBlankMessages(bundle))
			});
		},
		set(localeData?: LocaleData) {
			const currentLocale = injector.get<Injector<LocaleData | undefined>>(INJECTOR_KEY);
			if (currentLocale) {
				currentLocale.set(localeData);
			}
		},
		get() {
			const currentLocale = injector.get<Injector<LocaleData | undefined>>(INJECTOR_KEY);
			if (currentLocale) {
				return currentLocale.get();
			}
		}
	};
});

export default i18n;
