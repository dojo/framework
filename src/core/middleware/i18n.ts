/* tslint:disable:interface-name */
import i18nCore, { Bundle, formatMessage, getCachedMessages, Messages } from '../../i18n/i18n';
import { create, invalidator, injector, diffProperties } from '../vdom';
import Map from '../../shim/Map';
import Injector from '../Injector';

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

const factory = create({ invalidator, injector, diffProperties }).properties<I18nProperties>();

export const i18n = factory(({ middleware: { invalidator, injector, diffProperties }, properties }) => {
	injector.subscribe('__i18n_injector');
	diffProperties((current: I18nProperties, next: I18nProperties) => {
		if (current.locale !== next.locale || current.rtl !== next.rtl) {
			invalidator();
		}
	});

	function getLocaleMessages(bundle: Bundle<Messages>): Messages | void {
		let locale = properties.locale;
		if (!locale) {
			const injectedLocale = injector.get<Injector<LocaleData>>('__i18n_injector');
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
		let { i18nBundle } = properties;
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
		get<T extends Messages>(bundle: Bundle<T>, useDefaults = false): LocalizedMessages<T> {
			bundle = resolveBundle(bundle);
			const messages = getLocaleMessages(bundle);
			const isPlaceholder = !messages;
			let locale = properties.locale;
			if (!locale) {
				const injectedLocale = injector.get<Injector<LocaleData>>('__i18n_injector');
				if (injectedLocale) {
					locale = injectedLocale.get().locale;
				}
			}

			const format =
				isPlaceholder && !useDefaults
					? () => ''
					: (key: string, options?: any) => formatMessage(bundle, key, options, locale);

			return Object.create({
				format,
				isPlaceholder,
				messages: messages || (useDefaults ? bundle.messages : getBlankMessages(bundle))
			});
		},
		set(localeData?: LocaleData) {
			const currentLocale = injector.get<Injector<LocaleData | undefined>>('__i18n_injector');
			if (currentLocale) {
				currentLocale.set(localeData);
			}
		}
	};
});

export default i18n;
