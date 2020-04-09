/* tslint:disable:interface-name */
import { localizeBundle, Bundle, Messages, setLocale, getCurrentLocale } from '../../i18n/i18n';
import { isVNode } from './../vdom';
import { afterRender } from './../decorators/afterRender';
import { getInjector } from './../decorators/inject';
import { Constructor, DNode, VNodeProperties, LocalizedMessages, I18nProperties, LocaleData } from './../interfaces';
import { Injector } from './../Injector';
import { WidgetBase } from './../WidgetBase';
import { decorate } from '../util';
import { isThenable } from '../../shim/Promise';
import beforeProperties from '../decorators/beforeProperties';
import { INJECTOR_KEY } from '../I18nInjector';

export { LocalizedMessages, I18nProperties, LocaleData } from './../interfaces';
export { INJECTOR_KEY, registerI18nInjector } from '../I18nInjector';

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

const previousLocaleMap: WeakMap<WidgetBase, string> = new WeakMap();

export function I18nMixin<T extends Constructor<WidgetBase<any>>>(Base: T): T & Constructor<I18nMixin> {
	@beforeProperties(function(this: WidgetBase & { own: Function }, properties: any) {
		const injector = getInjector(this, INJECTOR_KEY);
		let injectedLocale: string | undefined;
		let injectedRtl: boolean | undefined;
		if (injector) {
			const injectLocaleData = injector() as Injector<LocaleData>;
			if (injectLocaleData) {
				const injectedLocaleData = injectLocaleData.get();
				if (injectedLocaleData) {
					injectedLocale = injectedLocaleData.locale;
					injectedRtl = injectedLocaleData.rtl;
				}
			}
		}
		const previousLocale = previousLocaleMap.get(this);
		previousLocaleMap.set(this, properties.locale);

		if (properties.locale && previousLocale !== properties.locale) {
			const result = setLocale({ locale: properties.locale, local: true });
			if (isThenable(result)) {
				result.then(() => {
					this.invalidate();
				});
				return {
					locale: previousLocale || injectedLocale || getCurrentLocale(),
					rtl: properties.rtl !== undefined ? properties.rtl : injectedRtl
				};
			}
		}
		return {
			locale: properties.locale || injectedLocale || getCurrentLocale(),
			rtl: properties.rtl !== undefined ? properties.rtl : injectedRtl
		};
	})
	abstract class I18n extends Base {
		public abstract properties: I18nProperties;

		public localizeBundle<T extends Messages>(baseBundle: Bundle<T>): LocalizedMessages<T> {
			let { locale, i18nBundle } = this.properties;
			if (i18nBundle) {
				if (i18nBundle instanceof Map) {
					baseBundle = i18nBundle.get(baseBundle) || baseBundle;
				} else {
					baseBundle = i18nBundle as Bundle<T>;
				}
			}
			return localizeBundle(baseBundle, {
				locale,
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
