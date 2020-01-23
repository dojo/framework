import { localizeBundle, Bundle, Messages, setLocale, getComputedLocale } from '../../i18n/i18n';
import { create, invalidator, getRegistry, diffProperty } from '../vdom';
import injector from './injector';
import Injector from '../Injector';
import Registry from '../Registry';
import { I18nProperties, LocalizedMessages, LocaleData } from '../interfaces';
import { isThenable } from '../../shim/Promise';
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

const factory = create({ invalidator, injector, getRegistry, diffProperty }).properties<I18nProperties>();

export const i18n = factory(({ properties, middleware: { invalidator, injector, getRegistry, diffProperty } }) => {
	let fallbackLocale: string | undefined;
	const i18nInjector = injector.get(INJECTOR_KEY);
	if (!i18nInjector) {
		const registry = getRegistry();
		if (registry) {
			registerI18nInjector({}, registry.base);
		}
	}

	diffProperty('locale', (current, next) => {
		if (next.locale && current.locale !== next.locale) {
			const localeInjector = injector.get<Injector<LocaleData | undefined>>(INJECTOR_KEY);
			if (current.locale) {
				fallbackLocale = current.locale;
			} else if (localeInjector) {
				const currentLocale = localeInjector.get();
				fallbackLocale = currentLocale ? currentLocale.locale || getComputedLocale() : getComputedLocale();
			} else {
				fallbackLocale = getComputedLocale();
			}

			const result = setLocale(next.locale, true);
			if (isThenable(result)) {
				result.then(() => {
					fallbackLocale = undefined;
					invalidator();
				});
			}
		}
	});

	injector.subscribe(INJECTOR_KEY);

	return {
		localize<T extends Messages>(bundle: Bundle<T>): LocalizedMessages<T> {
			let locale = properties().locale;
			if (!locale) {
				const localeInjector = injector.get<Injector<LocaleData | undefined>>(INJECTOR_KEY);
				if (localeInjector) {
					const injectedLocale = localeInjector.get();
					if (injectedLocale && injectedLocale.locale) {
						locale = injectedLocale.locale;
					}
				}
			}
			return localizeBundle(bundle, { locale: fallbackLocale || locale, invalidator });
		},
		set(localeData?: LocaleData) {
			const currentLocale = injector.get<Injector<LocaleData | undefined>>(INJECTOR_KEY);
			if (currentLocale) {
				if (localeData && localeData.locale) {
					const result = setLocale(localeData.locale);
					if (isThenable(result)) {
						result.then(() => {
							currentLocale.set(localeData);
						});
						return;
					}
				}
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
