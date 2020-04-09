import { LocaleData } from './interfaces';
import { setLocale, getComputedLocale } from '../i18n/i18n';
import { Injector } from './Injector';
import Registry from './Registry';
import { isThenable } from '../shim/Promise';

export const INJECTOR_KEY = '__i18n_injector';

export class I18nInjector extends Injector {
	set(localeData: LocaleData = {}) {
		const result = setLocale({ locale: localeData.locale || getComputedLocale() });
		if (isThenable(result)) {
			result.then(() => {
				super.set(localeData);
			});
			return;
		}
		super.set(localeData);
	}
}

export function registerI18nInjector(localeData: LocaleData, registry: Registry): I18nInjector {
	const injector = new I18nInjector(localeData);
	registry.defineInjector(INJECTOR_KEY, (invalidator) => {
		injector.setInvalidator(invalidator);
		return () => injector;
	});
	return injector;
}

export default I18nInjector;
