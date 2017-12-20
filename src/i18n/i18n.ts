/* tslint:disable:interface-name */
import '@dojo/shim/Promise'; // ensure Promise.all exists
import Evented from '@dojo/core/Evented';
import has from '@dojo/core/has';
import { assign } from '@dojo/core/lang';
import { useDefault } from '@dojo/core/load/util';
import uuid from '@dojo/core/uuid';
import { Handle } from '@dojo/core/interfaces';
import global from '@dojo/shim/global';
import Map from '@dojo/shim/Map';
import Observable, { Observer, Subscription, SubscriptionObserver } from '@dojo/shim/Observable';
import * as Globalize from 'globalize/dist/globalize/message';
import { isLoaded } from './cldr/load';
import { generateLocales, normalizeLocale } from './util/main';

/**
 * A default bundle used as basis for loading locale-specific bundles.
 */
export interface Bundle<T extends Messages> {
	/**
	 * A unique identifier for the bundle that will be generated automatically when it is registered.
	 */
	readonly id?: string;

	/**
	 * A list of supported locales. Any included locale MUST have an associated bundle.
	 */
	readonly locales?: LocaleLoaders<T>;

	/**
	 * The map of default messages that will be used when locale-specific messages are unavailable.
	 * Note that any message key used in the i18n system MUST have a default specified here.
	 */
	readonly messages: T;
}

/**
 * Options object passed to message formatters and used for token replacement.
 */
export interface FormatOptions {
	[key: string]: any;
}

export interface I18n<T extends Messages> {
	(bundle: Bundle<T>, locale?: string): Promise<T>;

	/**
	 * The current namespace as set via `switchLocale`. Defaults to `systemLocale`.
	 */
	readonly locale: string;
}

/**
 * A map of locales to functions responsible for loading their respective translations.
 */
export interface LocaleLoaders<T extends Messages> {
	[locale: string]: () => (LocaleTranslations<T> | Promise<LocaleTranslations<T>>);
}

/**
 * An object of locale-specific translations.
 */
export type LocaleTranslations<T extends Messages> = Partial<T> | { default?: Partial<T> };

/**
 * Describes a compiled ICU message formatter function.
 */
export interface MessageFormatter {
	(options?: FormatOptions): string;
}

/**
 * An object of keys to locale messages.
 */
export interface Messages {
	[key: string]: string;
}

const TOKEN_PATTERN = /\{([a-z0-9_]+)\}/gi;
const bundleMap = new Map<string, Map<string, Messages>>();
const formatterMap = new Map<string, MessageFormatter>();
const localeProducer = new Evented();
let rootLocale: string;

/**
 * Return the bundle's unique identifier, creating one if it does not already exist.
 *
 * @param bundle A message bundle
 * @return The bundle's unique identifier
 */
function getBundleId<T extends Messages>(bundle: Bundle<T>): string {
	if (bundle.id) {
		return bundle.id;
	}

	const id = uuid();
	Object.defineProperty(bundle, 'id', {
		value: id
	});
	return id;
}

/**
 * @private
 * Return a function that formats an ICU-style message, and takes an optional value for token replacement.
 *
 * Usage:
 * const formatter = getMessageFormatter(bundle, 'guestInfo', 'fr');
 * const message = formatter({
 *   host: 'Miles',
 *   gender: 'male',
 *   guest: 'Oscar',
 *   guestCount: '15'
 * });
 *
 * @param id
 * The message's bundle id.
 *
 * @param key
 * The message's key.
 *
 * @param locale
 * An optional locale for the formatter. If no locale is supplied, or if the locale is not supported, the
 * default locale is used.
 *
 * @return
 * The message formatter.
 */
function getIcuMessageFormatter(id: string, key: string, locale?: string): MessageFormatter {
	locale = normalizeLocale(locale || getRootLocale());
	const formatterKey = `${locale}:${id}:${key}`;
	let formatter = formatterMap.get(formatterKey);

	if (formatter) {
		return formatter;
	}

	const globalize = locale !== getRootLocale() ? new Globalize(normalizeLocale(locale)) : Globalize;
	formatter = globalize.messageFormatter(`${id}/${key}`);

	const cached = bundleMap.get(id);
	if (cached && cached.get(locale)) {
		formatterMap.set(formatterKey, formatter);
	}

	return formatter;
}

/**
 * @private
 * Load the specified locale-specific bundles, mapping the default exports to simple `Messages` objects.
 */
function loadLocaleBundles<T extends Messages>(locales: LocaleLoaders<T>, supported: string[]): Promise<T[]> {
	return Promise.all(supported.map(locale => locales[locale]()))
		.then((bundles) => {
			return bundles.map(bundle => useDefault(bundle));
		});
}

/**
 * @private
 * Return the root locale. Defaults to the system locale.
 */
function getRootLocale(): string {
	return rootLocale || systemLocale;
}

/**
 * @private
 * Retrieve a list of supported locales that can provide messages for the specified locale.
 *
 * @param locale
 * The target locale.
 *
 * @param supported
 * The locales that are supported by the bundle.
 *
 * @return
 * A list of supported locales that match the target locale.
 */
function getSupportedLocales(locale: string, supported: string[] = []): string[] {
	return generateLocales(locale).filter((locale: string) => supported.indexOf(locale) > -1);
}

/**
 * @private
 * Inject messages for the specified locale into the i18n system.
 *
 * @param id
 * The bundle's unique identifier
 *
 * @param messages
 * The messages to inject
 *
 * @param locale
 * An optional locale. If not specified, then it is assumed that the messages are the defaults for the given
 * bundle path.
 */
function loadMessages<T extends Messages>(id: string, messages: T, locale: string = 'root') {
	let cached = bundleMap.get(id);

	if (!cached) {
		cached = new Map<string, Messages>();
		bundleMap.set(id, cached);
	}

	cached.set(locale, messages);
	Globalize.loadMessages({
		[locale]: {
			[id]: messages
		}
	});
}

/**
 * Return a formatted message.
 *
 * If both the "supplemental/likelySubtags" and "supplemental/plurals-type-cardinal" CLDR data have been loaded, then
 * the ICU message format is supported. Otherwise, a simple token-replacement mechanism is used.
 *
 * Usage:
 * formatMessage(bundle, 'guestInfo', {
 *   host: 'Bill',
 *   guest: 'John'
 * }, 'fr');
 *
 * @param bundle
 * The bundle containing the target message.
 *
 * @param key
 * The message's key.
 *
 * @param options
 * An optional value used by the formatter to replace tokens with values.
 *
 * @param locale
 * An optional locale for the formatter. If no locale is supplied, or if the locale is not supported, the
 * default locale is used.
 *
 * @return
 * The formatted message.
 */
export function formatMessage<T extends Messages>(bundle: Bundle<T>, key: string, options?: FormatOptions, locale?: string): string {
	return getMessageFormatter(bundle, key, locale)(options);
}

/**
 * Return the cached messages for the specified bundle and locale. If messages have not been previously loaded for the
 * specified locale, no value will be returned.
 *
 * @param bundle
 * The default bundle that is used to determine where the locale-specific bundles are located.
 *
 * @param locale
 * The locale of the desired messages.
 *
 * @return The cached messages object, if it exists.
 */
export function getCachedMessages<T extends Messages>(bundle: Bundle<T>, locale: string): T | void {
	const { id = getBundleId(bundle), locales, messages } = bundle;
	const cached = bundleMap.get(id);

	if (!cached) {
		loadMessages(id, messages);
	}
	else {
		const localeMessages = cached.get(locale);
		if (localeMessages) {
			return localeMessages as T;
		}
	}

	const supportedLocales = getSupportedLocales(locale, locales && Object.keys(locales));
	if (!supportedLocales.length) {
		return messages;
	}

	if (cached) {
		return cached.get(supportedLocales[supportedLocales.length - 1]) as T;
	}
}

/**
 * Return a function that formats a specific message, and takes an optional value for token replacement.
 *
 * If both the "supplemental/likelySubtags" and "supplemental/plurals-type-cardinal" CLDR data have been loaded, then
 * the returned function will have ICU message format support. Otherwise, the returned function will perform a simple
 * token replacement on the message string.
 *
 * Usage:
 * const formatter = getMessageFormatter(bundle, 'guestInfo', 'fr');
 * const message = formatter({
 *   host: 'Miles',
 *   gender: 'male',
 *   guest: 'Oscar',
 *   guestCount: '15'
 * });
 *
 * @param bundle
 * The bundle containing the target message.
 *
 * @param key
 * The message's key.
 *
 * @param locale
 * An optional locale for the formatter. If no locale is supplied, or if the locale is not supported, the
 * default locale is used.
 *
 * @return
 * The message formatter.
 */
export function getMessageFormatter<T extends Messages>(bundle: Bundle<T>, key: string, locale?: string): MessageFormatter {
	const { id = getBundleId(bundle) } = bundle;

	if (isLoaded('supplemental', 'likelySubtags') && isLoaded('supplemental', 'plurals-type-cardinal')) {
		return getIcuMessageFormatter(id, key, locale);
	}

	const cached = bundleMap.get(id);
	const messages = cached ? (cached.get(locale || getRootLocale()) || cached.get('root')) : null;

	if (!messages) {
		throw new Error(`The bundle has not been registered.`);
	}

	return function (options: FormatOptions = Object.create(null)) {
		return messages[key].replace(TOKEN_PATTERN, (token: string, property: string) => {
			const value = options[property];

			if (typeof value === 'undefined') {
				throw new Error(`Missing property ${property}`);
			}

			return value;
		});
	};
}

/**
 * Load locale-specific messages for the specified bundle and locale.
 *
 * @param bundle
 * The default bundle that is used to determine where the locale-specific bundles are located.
 *
 * @param locale
 * An optional locale. If no locale is provided, then the current locale is assumed.
 *
 * @return A promise to the locale-specific messages.
 */
async function i18n<T extends Messages>(bundle: Bundle<T>, locale?: string): Promise<T> {
	const currentLocale = locale ? normalizeLocale(locale) : getRootLocale();
	const cachedMessages = getCachedMessages(bundle, currentLocale);

	if (cachedMessages) {
		return cachedMessages;
	}

	const locales = bundle.locales as LocaleLoaders<T>;
	const supportedLocales = getSupportedLocales(currentLocale, Object.keys(locales));
	const bundles = await loadLocaleBundles<T>(locales, supportedLocales);
	return bundles.reduce((previous: T, partial: T): T => {
		const localeMessages: T = assign({}, previous, partial);
		loadMessages(getBundleId(bundle), <T> Object.freeze(localeMessages), currentLocale);
		return localeMessages;
	}, bundle.messages);
}

Object.defineProperty(i18n, 'locale', {
	get: getRootLocale
});

export default i18n as I18n<Messages>;

/**
 * Invalidate the cache for a particular bundle, or invalidate the entire cache. Note that cached messages for all
 * locales for a given bundle will be cleared.
 *
 * @param bundle
 * An optional bundle to invalidate. If no bundle is provided, then the cache is cleared for all bundles.
 */
export function invalidate<T extends Messages>(bundle?: Bundle<T>) {
	if (bundle) {
		bundle.id && bundleMap.delete(bundle.id);
	}
	else {
		bundleMap.clear();
	}
}

/**
 * Register an observer to be notified when the root locale changes.
 *
 * @param observer
 * The observer whose `next` method will receive the locale string on updates, and whose `error` method will receive
 * an Error object if the locale switch fails.
 *
 * @return
 * A subscription object that can be used to unsubscribe from updates.
 */
export const observeLocale = (function () {
	const localeSource = new Observable<string>((observer: SubscriptionObserver<string>) => {
		const handles: Handle[] = [
			localeProducer.on('change', (event: any) => {
				observer.next(event.target);
			})
		];

		return function () {
			handles.forEach((handle: Handle) => {
				handle.destroy();
			});
		};
	});

	return function (observer: Observer<string>): Subscription {
		return localeSource.subscribe(observer);
	};
})();

/**
 * Pre-load locale-specific messages into the i18n system.
 *
 * @param bundle
 * The default bundle that is used to merge locale-specific messages with the default messages.
 *
 * @param messages
 * The messages to cache.
 *
 * @param locale
 * The locale for the messages
 */
export function setLocaleMessages<T extends Messages>(bundle: Bundle<T>, localeMessages: Partial<T>, locale: string): void {
	const messages: T = assign({}, bundle.messages, localeMessages);
	loadMessages(getBundleId(bundle), <T> Object.freeze(messages), locale);
}

/**
 * Change the root locale, and notify any registered observers.
 *
 * @param locale
 * The new locale.
 */
export function switchLocale(locale: string): void {
	const previous = rootLocale;
	rootLocale = locale ? normalizeLocale(locale) : '';

	if (previous !== rootLocale) {
		if (isLoaded('supplemental', 'likelySubtags')) {
			Globalize.load({
				main: {
					[rootLocale]: {}
				}
			});
			Globalize.locale(rootLocale);
		}

		localeProducer.emit({ type: 'change', target: rootLocale });
	}
}

/**
 * The default environment locale.
 *
 * It should be noted that while the system locale will be normalized to a single
 * format when loading message bundles, this value represents the unaltered
 * locale returned directly by the environment.
 */
export const systemLocale: string = (function () {
	let systemLocale = 'en';
	if (has('host-browser')) {
		const navigator = global.navigator;
		systemLocale = navigator.language || navigator.userLanguage;
	}
	else if (has('host-node')) {
		systemLocale = process.env.LANG || systemLocale;
	}
	return normalizeLocale(systemLocale);
})();
