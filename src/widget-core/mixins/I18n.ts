/* tslint:disable:interface-name */
import { assign } from '@dojo/core/lang';
import i18n, { Bundle, formatMessage, getCachedMessages, Messages, observeLocale } from '@dojo/i18n/i18n';
import { VNodeProperties } from '@dojo/interfaces/vdom';
import { Constructor, DNode, WidgetProperties } from './../interfaces';
import { WidgetBase, afterRender } from './../WidgetBase';
import { isHNode } from './../d';

export interface I18nProperties extends WidgetProperties {
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

/**
 * @private
 * An internal helper interface for defining locale and text direction attributes on widget nodes.
 */
interface I18nVNodeProperties extends VNodeProperties {
	dir: string | null;
	lang: string | null;
}

export type LocalizedMessages<T extends Messages> = T & {
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
	 * The localized messages, along with a `format` method for formatting ICU-formatted templates.
	 */
	localizeBundle<T extends Messages>(bundle: Bundle<T>): LocalizedMessages<T>;
}

export function I18nMixin<T extends Constructor<WidgetBase<I18nProperties>>>(base: T): T & Constructor<I18nMixin> {
	class I18n extends base {

		constructor(...args: any[]) {
			super(...args);
			const subscription = observeLocale({
				next: () => {
					if (!this.properties.locale) {
						this.invalidate();
					}
				}
			});
			this.own({
				destroy() {
					subscription.unsubscribe();
				}
			});
		}

		public localizeBundle<T extends Messages>(bundle: Bundle<T>): LocalizedMessages<T> {
			const { locale } = this.properties;
			const messages = this.getLocaleMessages(bundle) || bundle.messages;

			return assign(Object.create({
				format(key: string, options?: any) {
					return formatMessage(bundle.bundlePath, key, options, locale);
				}
			}), messages) as LocalizedMessages<T>;
		}

		@afterRender
		protected renderDecorator(result: DNode): DNode {
			if (isHNode(result)) {
				const { locale, rtl } = this.properties;
				const vNodeProperties: I18nVNodeProperties = {
					dir: null,
					lang: null
				};

				if (typeof rtl === 'boolean') {
					vNodeProperties['dir'] = rtl ? 'rtl' : 'ltr';
				}
				if (locale) {
					vNodeProperties['lang'] = locale;
				}

				assign(result.properties, vNodeProperties);
			}
			return result;
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
		private getLocaleMessages(bundle: Bundle<Messages>): Messages | void {
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
	};

	return I18n;
}

export default I18nMixin;
