/* tslint:disable:interface-name */
import { localizeBundle, Bundle, Messages, setLocale } from '../../i18n/i18n';
import { isVNode } from './../vdom';
import { afterRender } from './../decorators/afterRender';
import { inject } from './../decorators/inject';
import { Constructor, DNode, VNodeProperties, LocalizedMessages, I18nProperties, LocaleData } from './../interfaces';
import { Injector } from './../Injector';
import { Registry } from './../Registry';
import { WidgetBase } from './../WidgetBase';
import { decorate } from '../util';

export { LocalizedMessages, I18nProperties, LocaleData } from './../interfaces';

export const INJECTOR_KEY = '__i18n_injector';

/**
 * interface for I18n functionality
 */
export interface I18nMixin {
	/**
	 * Return the cached messages for the specified bundle for the current locale, assuming they have already
	 * been loaded. If the locale-specific messages have not been loaded, they are fetched and the widget state
	 * is updated.
	 *
	 * @param bundle
	 * The required bundle object for which available locale messages should be loaded.
	 *
	 * @return
	 * An object containing the localized messages, along with a `format` method for formatting ICU-formatted
	 * templates and an `isPlaceholder` property indicating whether the returned messages are the defaults.
	 */
	localizeBundle<T extends Messages>(bundle: Bundle<T>): LocalizedMessages<T>;

	properties: I18nProperties;
}

/**
 * @private
 * An internal helper interface for defining locale and text direction attributes on widget nodes.
 */
interface I18nVNodeProperties extends VNodeProperties {
	dir: string;
	lang: string;
}

class I18nInjector extends Injector {
	set(localeData: LocaleData) {
		if (localeData.locale) {
			setLocale(localeData.locale).then(() => {
				super.set(localeData);
			});
		} else {
			super.set(localeData);
		}
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

export function I18nMixin<T extends Constructor<WidgetBase<any>>>(Base: T): T & Constructor<I18nMixin> {
	@inject({
		name: INJECTOR_KEY,
		getProperties: (localeData: Injector<LocaleData>, properties: I18nProperties) => {
			const { locale = localeData.get().locale, rtl = localeData.get().rtl } = properties;
			return { locale, rtl };
		}
	})
	abstract class I18n extends Base {
		public abstract properties: I18nProperties;

		public localizeBundle<T extends Messages>(baseBundle: Bundle<T>): LocalizedMessages<T> {
			return localizeBundle(baseBundle, {
				locale: this.properties.locale,
				invalidator: () => {
					this.invalidate();
				}
			});
		}

		@afterRender()
		protected renderDecorator(result: DNode | DNode[]): DNode | DNode[] {
			decorate(result, {
				modifier: (node, breaker) => {
					const { locale, rtl } = this.properties;
					const properties: Partial<I18nVNodeProperties> = {};
					if (typeof rtl === 'boolean') {
						properties['dir'] = rtl ? 'rtl' : 'ltr';
					}
					if (locale) {
						properties['lang'] = locale;
					}
					node.properties = { ...node.properties, ...properties };
					breaker();
				},
				predicate: isVNode
			});
			return result;
		}
	}

	return I18n;
}

export default I18nMixin;
