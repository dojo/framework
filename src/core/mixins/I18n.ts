/* tslint:disable:interface-name */
import i18n, { Bundle, formatMessage, getCachedMessages, Messages } from '../../i18n/i18n';
import Map from '../../shim/Map';
import { isVNode } from './../vdom';
import { afterRender } from './../decorators/afterRender';
import { inject } from './../decorators/inject';
import { Constructor, DNode, VNodeProperties } from './../interfaces';
import { Injector } from './../Injector';
import { Registry } from './../Registry';
import { WidgetBase } from './../WidgetBase';
import { decorate } from '../util';

export const INJECTOR_KEY = '__i18n_injector';

export interface LocaleData {
	/**
	 * The locale for the widget. If not specified, then the root locale (as determined by `@dojo/i18n`) is assumed.
	 * If specified, the widget's node will have a `lang` property set to the locale.
	 */
	locale?: string;

	/**
	 * An optional flag indicating the widget's text direction. If `true`, then the underlying node's `dir`
	 * property is set to "rtl". If it is `false`, then the `dir` property is set to "ltr". Otherwise, the property
	 * is not set.
	 */
	rtl?: boolean;
}

export interface I18nProperties extends LocaleData {
	/**
	 * An optional override for the bundle passed to the `localizeBundle`. If the override contains a `messages` object,
	 * then it will completely replace the underlying bundle. Otherwise, a new bundle will be created with the additional
	 * locale loaders.
	 */
	i18nBundle?: Bundle<Messages> | Map<Bundle<Messages>, Bundle<Messages>>;
}

/**
 * @private
 * An internal helper interface for defining locale and text direction attributes on widget nodes.
 */
interface I18nVNodeProperties extends VNodeProperties {
	dir: string;
	lang: string;
}

export type LocalizedMessages<T extends Messages> = {
	/**
	 * Indicates whether the messages are placeholders while waiting for the actual localized messages to load.
	 * This is always `false` if the associated bundle does not list any supported locales.
	 */
	readonly isPlaceholder: boolean;

	/**
	 * Formats an ICU-formatted message template for the represented bundle.
	 *
	 * @param key
	 * The message key.
	 *
	 * @param options
	 * The values to pass to the formatter.
	 *
	 * @return
	 * The formatted string.
	 */
	format(key: string, options?: any): string;

	/**
	 * The localized messages if available, or either the default messages or a blank bundle depending on the
	 * call signature for `localizeBundle`.
	 */
	readonly messages: T;
};

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

export function registerI18nInjector(localeData: LocaleData, registry: Registry): Injector {
	const injector = new Injector(localeData);
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

		/**
		 * Return a localized messages object for the provided bundle, deferring to the `i18nBundle` property
		 * when present. If the localized messages have not yet been loaded, return either a blank bundle or the
		 * default messages.
		 *
		 * @param bundle
		 * The bundle to localize
		 *
		 * @param useDefaults
		 * If `true`, the default messages will be used when the localized messages have not yet been loaded. If `false`
		 * (the default), then a blank bundle will be returned (i.e., each key's value will be an empty string).
		 */
		public localizeBundle<T extends Messages>(
			baseBundle: Bundle<T>,
			useDefaults: boolean = false
		): LocalizedMessages<T> {
			const bundle = this._resolveBundle(baseBundle);
			const messages = this._getLocaleMessages(bundle);
			const isPlaceholder = !messages;
			const { locale } = this.properties;
			const format =
				isPlaceholder && !useDefaults
					? (key: string, options?: any) => ''
					: (key: string, options?: any) => formatMessage(bundle, key, options, locale);

			return Object.create({
				format,
				isPlaceholder,
				messages: messages || (useDefaults ? bundle.messages : this._getBlankMessages(bundle))
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

		/**
		 * @private
		 * Return a message bundle containing an empty string for each key in the provided bundle.
		 *
		 * @param bundle
		 * The message bundle
		 *
		 * @return
		 * The blank message bundle
		 */
		private _getBlankMessages(bundle: Bundle<Messages>): Messages {
			const blank = {} as Messages;
			return Object.keys(bundle.messages).reduce((blank, key) => {
				blank[key] = '';
				return blank;
			}, blank);
		}

		/**
		 * @private
		 * Return the cached dictionary for the specified bundle and locale, if it exists. If the requested dictionary does not
		 * exist, then load it and update the instance's state with the appropriate messages.
		 *
		 * @param bundle
		 * The bundle for which to load a locale-specific dictionary.
		 *
		 * @return
		 * The locale-specific dictionary, if it has already been loaded and cached.
		 */
		private _getLocaleMessages(bundle: Bundle<Messages>): Messages | void {
			const { properties } = this;
			const locale = properties.locale || i18n.locale;
			const localeMessages = getCachedMessages(bundle, locale);

			if (localeMessages) {
				return localeMessages;
			}

			i18n(bundle, locale).then(() => {
				this.invalidate();
			});
		}

		/**
		 * @private
		 * Resolve the bundle to use for the widget's messages to either the provided bundle or to the
		 * `i18nBundle` property.
		 *
		 * @param bundle
		 * The base bundle
		 *
		 * @return
		 * Either override bundle or the original bundle.
		 */
		private _resolveBundle(bundle: Bundle<Messages>): Bundle<Messages> {
			let { i18nBundle } = this.properties;
			if (i18nBundle) {
				if (i18nBundle instanceof Map) {
					i18nBundle = i18nBundle.get(bundle);

					if (!i18nBundle) {
						return bundle;
					}
				}

				return i18nBundle;
			}
			return bundle;
		}
	}

	return I18n;
}

export default I18nMixin;
