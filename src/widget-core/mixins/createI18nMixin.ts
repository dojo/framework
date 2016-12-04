/* tslint:disable:interface-name */
import compose, { ComposeFactory } from 'dojo-compose/compose';
import { assign } from 'dojo-core/lang';
import i18n, { Bundle, formatMessage, getCachedMessages, Messages, observeLocale } from 'dojo-i18n/i18n';
import { VNodeProperties } from 'maquette';
import { NodeAttributeFunction, Widget, WidgetOptions, WidgetProperties, WidgetState } from '../interfaces';

export interface I18nMixin<M extends Messages> {
	/**
	 * An array of node attribute functions which return additional attributes that should be mixed into
	 * the final VNode during a render call. In this particular case, the node's `dir` attribute is optionally
	 * set when `state.rtl` is a boolean, and the node's `data-locale` attribute is set when `state.locale` is
	 * not empty.
	 */
	nodeAttributes: NodeAttributeFunction<I18nWidget<M, I18nProperties>>[];

	/**
	 * Return the cached messages for the specified bundle for the current locale, assuming they have already
	 * benn loaded. If the locale-specific messages have not been loaded, they are fetched and the widget state
	 * is updated.
	 *
	 * @param bundle
	 * The required bundle object for which available locale messages should be loaded.
	 *
	 * @return
	 * The localized messages, along with a `format` method for formatting ICU-formatted templates.
	 */
	localizeBundle(bundle: Bundle<M>): LocalizedMessages<M>;
}

export interface I18nFactory extends ComposeFactory<I18nMixin<Messages>, WidgetOptions<WidgetState, I18nProperties>> {}

export interface I18nProperties extends WidgetProperties {
	/**
	 * The locale for the widget. Is not specified, then the root locale (as determined by `dojo-i18n`) is assumed.
	 * If specified, the widget's node will have a `data-locale` property set to the locale, in order to facilitate
	 * styling localized components if the use case arises.
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
	'data-locale': string | null;
	dir: string | null;
}

export type I18nWidget<M extends Messages, P extends I18nProperties> = I18nMixin<M> & Widget<WidgetState, I18nProperties>;

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
}

/**
 * @private
 * Return the cached dictionary for the specified bundle and locale, if it exists. If the requested dictionary does not
 * exist, then load it and update the instance's state with the appropriate messages.
 *
 * @param instance
 * The widget instance.
 *
 * @param bundle
 * The bundle for which to load a locale-specific dictionary.
 *
 * @return
 * The locale-specific dictionary, if it has already been loaded and cached.
 */
function getLocaleMessages(instance: I18nWidget<Messages, I18nProperties>, bundle: Bundle<Messages>): Messages | void {
	const { properties } = instance;
	const locale = properties.locale || i18n.locale;
	const localeMessages = getCachedMessages(bundle, locale);

	if (localeMessages) {
		return localeMessages;
	}

	i18n(bundle, locale).then(() => {
		instance.invalidate();
	});
}

const createI18nMixin: I18nFactory = compose<I18nMixin<Messages>, WidgetOptions<WidgetState, I18nProperties>>({
	nodeAttributes: [
		function (this: I18nWidget<Messages, I18nProperties>, attributes: VNodeProperties): VNodeProperties {
			const vNodeProperties = {
				'data-locale': null,
				dir: null
			} as I18nVNodeProperties;
			const { locale, rtl } = this.properties;

			if (typeof rtl === 'boolean') {
				vNodeProperties['dir'] = rtl ? 'rtl' : 'ltr';
			}

			if (locale) {
				vNodeProperties['data-locale'] = locale;
			}

			return vNodeProperties;
		}
	],

	localizeBundle(this: I18nWidget<Messages, I18nProperties>, bundle: Bundle<Messages>): LocalizedMessages<Messages> {
		const { locale } = this.properties;
		const messages = getLocaleMessages(this, bundle) || bundle.messages;

		return assign(Object.create({
			format(key: string, options?: any) {
				return formatMessage(bundle.bundlePath, key, options, locale);
			}
		}), messages);
	}
}, (instance: I18nWidget<Messages, I18nProperties>) => {
	const subscription = observeLocale({
		next() {
			if (!instance.properties.locale) {
				instance.invalidate();
			}
		}
	});
	instance.own({
		destroy() {
			subscription.unsubscribe();
		}
	});
});

export default createI18nMixin;
