import { localizeBundle, Bundle, Messages, setLocale, getCurrentLocale } from '../../i18n/i18n';
import { create, invalidator, getRegistry, diffProperty } from '../vdom';
import injector from './injector';
import Injector from '../Injector';
import Registry from '../Registry';
import { I18nProperties, LocalizedMessages, LocaleData } from '../interfaces';
import { isThenable } from '../../shim/Promise';

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
	const i18nInjector = injector.get(INJECTOR_KEY);
	if (!i18nInjector) {
		const registry = getRegistry();
		if (registry) {
			registerI18nInjector({}, registry.base);
		}
	}

	diffProperty('locale', properties, (current, next) => {
		const localeDataInjector = injector.get<Injector<LocaleData | undefined>>(INJECTOR_KEY);
		let injectedLocale: string | undefined;
		if (localeDataInjector) {
			const injectLocaleData = localeDataInjector.get();
			if (injectLocaleData) {
				injectedLocale = injectLocaleData.locale;
			}
		}
		if (next.locale && current.locale !== next.locale) {
			const result = setLocale({ locale: next.locale, local: true });
			if (isThenable(result)) {
				result.then(() => {
					invalidator();
				});
				return current.locale || injectedLocale || getCurrentLocale();
			}
		}
		if (current.locale !== next.locale) {
			invalidator();
		}
		return next.locale || injectedLocale || getCurrentLocale();
	});

	injector.subscribe(INJECTOR_KEY);

	return {
		localize<T extends Messages>(bundle: Bundle<T>): LocalizedMessages<T> {
			let { locale, i18nBundle } = properties();
			if (i18nBundle) {
				if (i18nBundle instanceof Map) {
					bundle = i18nBundle.get(bundle) || bundle;
				} else {
					bundle = i18nBundle as Bundle<T>;
				}
			}
			return localizeBundle(bundle, { locale, invalidator });
		},
		set(localeData?: LocaleData) {
			const localeDataInjector = injector.get<Injector<LocaleData | undefined>>(INJECTOR_KEY);
			if (localeDataInjector) {
				if (localeData && localeData.locale) {
					const result = setLocale({ locale: localeData.locale });
					if (isThenable(result)) {
						result.then(() => {
							localeDataInjector.set(localeData);
						});
						return;
					}
				}
				localeDataInjector.set(localeData);
			}
		},
		get() {
			const localeDataInjector = injector.get<Injector<LocaleData | undefined>>(INJECTOR_KEY);
			if (localeDataInjector) {
				return localeDataInjector.get();
			}
		}
	};
});

export default i18n;
