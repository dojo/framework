/* tslint:disable:interface-name */
import Evented from '@dojo/core/Evented';
import has from '@dojo/core/has';
import { assign } from '@dojo/core/lang';
import load, { useDefault } from '@dojo/core/load';
import { Handle } from '@dojo/core/interfaces';
import global from '@dojo/shim/global';
import Map from '@dojo/shim/Map';
import Observable, { Observer, Subscription, SubscriptionObserver } from '@dojo/shim/Observable';
import Promise from '@dojo/shim/Promise';
import * as Globalize from 'globalize/dist/globalize/message';
import { isLoaded } from './cldr/load';
import { generateLocales, normalizeLocale } from './util/main';

/**
 * A default bundle used as basis for loading locale-specific bundles.
 */
export interface Bundle<T extends Messages> {
	/**
	 * The absolute module ID used by the loader to resolve paths to locale-specific paths. This MUST follow the format
	 * "{basePath}{separator}{filename}". For example, if the module ID for a bundle is "nls/common", the loader will
	 * look for locale-specific bundles at "nls/{locale}/common".
	 */
	readonly bundlePath: string;

	/**
	 * A list of supported locales. Any included locale MUST have an associated bundle.
	 */
	readonly locales?: string[];

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

interface LocaleModule<T extends Messages> {
	default?: T;
}

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

const PATH_SEPARATOR: string = has('host-node') ? require('path').sep : '/';
const TOKEN_PATTERN = /\{([a-z0-9_]+)\}/gi;
const VALID_PATH_PATTERN = new RegExp(`\\${PATH_SEPARATOR}[^\\${PATH_SEPARATOR}]+\$`);
const bundleMap = new Map<string, Map<string, Messages>>();
const formatterMap = new Map<string, MessageFormatter>();
const localeProducer = new Evented();
let rootLocale: string;

/**
 * @private
 * Return a function that formats an ICU-style message, and takes an optional value for token replacement.
 *
 * Usage:
 * const formatter = getMessageFormatter(bundlePath, 'guestInfo', 'fr');
 * const message = formatter({
 *   host: 'Miles',
 *   gender: 'male',
 *   guest: 'Oscar',
 *   guestCount: '15'
 * });
 *
 * @param bundlePath
 * The message's bundle path.
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
function getIcuMessageFormatter(bundlePath: string, key: string, locale?: string): MessageFormatter {
	const normalized = bundlePath.replace(new RegExp(`\\${PATH_SEPARATOR}`, 'g'), '-').replace(/-$/, '');
	locale = normalizeLocale(locale || getRootLocale());
	const formatterKey = `${locale}:${bundlePath}:${key}`;
	let formatter = formatterMap.get(formatterKey);

	if (formatter) {
		return formatter;
	}

	const globalize = locale !== getRootLocale() ? new Globalize(normalizeLocale(locale)) : Globalize;
	formatter = globalize.messageFormatter(`${normalized}/${key}`);

	const cached = bundleMap.get(bundlePath);
	if (cached && cached.get(locale)) {
		formatterMap.set(formatterKey, formatter);
	}

	return formatter;
}

/**
 * @private
 * Load the specified locale-specific bundles, mapping the default exports to simple `Messages` objects.
 */
const loadLocaleBundles = (function () {
	function mapMessages<T extends Messages>(modules: LocaleModule<T>[]): T[] {
		return modules.map((localeModule: LocaleModule<T>): T => useDefault(localeModule));
	}

	return function<T extends Messages>(paths: string[]): Promise<T[]> {
		return load(<any> require, ...paths).then((modules: LocaleModule<T>[]) => {
			return mapMessages(modules);
		});
	};
})();

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
 * @param bundlePath
 * The bundle path
 *
 * @param messages
 * The messages to inject
 *
 * @param locale
 * An optional locale. If not specified, then it is assumed that the messages are the defaults for the given
 * bundle path.
 */
function loadMessages<T extends Messages> (bundlePath: string, messages: T, locale: string = 'root') {
	let cached = bundleMap.get(bundlePath);

	if (!cached) {
		cached = new Map<string, Messages>();
		bundleMap.set(bundlePath, cached);
	}

	cached.set(locale, messages);
	Globalize.loadMessages({
		[locale]: {
			[bundlePath.replace(new RegExp(`\\${PATH_SEPARATOR}`, 'g'), '-')]: messages
		}
	});
}

/**
 * @private
 * Return a list of locale path bundles for a target locale.
 *
 * @param path
 * The default bundle path.
 *
 * @param locale
 * The target locale
 *
 * @param supported
 * A list of locales with their own bundles.
 *
 * @return Paths for locale bundles to be loaded.
 */
function resolveLocalePaths<T extends Messages>(path: string, locale: string, supported?: string[]): string[] {
	validatePath(path);

	let filename: string;
	const parentDirectory = path.replace(VALID_PATH_PATTERN, (matched: string): string => {
		filename = matched;
		return PATH_SEPARATOR;
	});
	const locales = getSupportedLocales(locale, supported);
	return locales.map((locale: string): string => {
		return `${parentDirectory}${locale}${filename}`;
	});
}

/**
 * @private
 * Ensure a path follows the required format for loading locale-specific bundles.
 *
 * @param path
 * The default bundle path to validate.
 */
function validatePath(path: string): void {
	if (!VALID_PATH_PATTERN.test(path)) {
		const message = 'Invalid i18n bundle path. Bundle maps must adhere to the format' +
			' "{basePath}{separator}{bundleName}" so that locale bundles can be resolved.';
		throw new Error(message);
	}
}

/**
 * Return a formatted message.
 *
 * If both the "supplemental/likelySubtags" and "supplemental/plurals-type-cardinal" CLDR data have been loaded, then
 * the ICU message format is supported. Otherwise, a simple token-replacement mechanism is used.
 *
 * Usage:
 * formatMessage(bundle.bundlePath, 'guestInfo', {
 *   host: 'Bill',
 *   guest: 'John'
 * }, 'fr');
 *
 * @param bundlePath
 * The message's bundle path.
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
export function formatMessage(bundlePath: string, key: string, options?: FormatOptions, locale?: string): string {
	return getMessageFormatter(bundlePath, key, locale)(options);
}

/**
 * Return the cached messages for the specified bundle and locale. If messages have not been previously loaded for the
 * specified locale, no value will be returned. If messages for the specified locale were added via
 * `setLocaleMessages`, then those messages will be returned regardless of whether the locale is listed in the bundle's
 * `locales` array.
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
	const { bundlePath, locales, messages } = bundle;
	const cached = bundleMap.get(bundlePath);

	if (!cached) {
		loadMessages(bundlePath, messages);
	}
	else {
		const localeMessages = cached.get(locale);
		if (localeMessages) {
			return localeMessages as T;
		}
	}

	const supportedLocales = getSupportedLocales(locale, locales);
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
 * const formatter = getMessageFormatter(bundlePath, 'guestInfo', 'fr');
 * const message = formatter({
 *   host: 'Miles',
 *   gender: 'male',
 *   guest: 'Oscar',
 *   guestCount: '15'
 * });
 *
 * @param bundlePath
 * The message's bundle path.
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
export function getMessageFormatter(bundlePath: string, key: string, locale?: string): MessageFormatter {
	if (isLoaded('supplemental', 'likelySubtags') && isLoaded('supplemental', 'plurals-type-cardinal')) {
		return getIcuMessageFormatter(bundlePath, key, locale);
	}

	const cached = bundleMap.get(bundlePath);
	const messages = cached ? (cached.get(locale || getRootLocale()) || cached.get('root')) : null;

	if (!messages) {
		throw new Error(`The bundle "${bundlePath}" has not been registered.`);
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
function i18n<T extends Messages>(bundle: Bundle<T>, locale?: string): Promise<T> {
	const { bundlePath, locales, messages } = bundle;
	const path = bundlePath.replace(new RegExp(`\\${PATH_SEPARATOR}\$`), '');
	const currentLocale = locale ? normalizeLocale(locale) : getRootLocale();

	try {
		validatePath(path);
	}
	catch (error) {
		return Promise.reject(error);
	}

	const cachedMessages = getCachedMessages(bundle, currentLocale);
	if (cachedMessages) {
		return Promise.resolve(cachedMessages);
	}

	const localePaths = resolveLocalePaths(path, currentLocale, locales);
	return loadLocaleBundles<T>(localePaths).then((bundles: T[]): T => {
		return bundles.reduce((previous: T, partial: T): T => {
			const localeMessages: T = assign({}, previous, partial);
			loadMessages(bundlePath, <T> Object.freeze(localeMessages), currentLocale);
			return localeMessages;
		}, messages);
	});
}

Object.defineProperty(i18n, 'locale', {
	get: getRootLocale
});

export default i18n as I18n<Messages>;

/**
 * Invalidate the cache for a particular bundle, or invalidate the entire cache. Note that cached messages for all
 * locales for a given bundle will be cleared.
 *
 * @param bundlePath
 * The optional path of the bundle to invalidate. If no path is provided, then the cache is cleared for all bundles.
 */
export function invalidate(bundlePath?: string) {
	if (bundlePath) {
		bundleMap.delete(bundlePath);
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
export function setLocaleMessages<T extends Messages>(bundle: Bundle<T>, localeMessages: T, locale: string): void {
	const messages: T = assign({}, bundle.messages, localeMessages);
	loadMessages(bundle.bundlePath, <T> Object.freeze(messages), locale);
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
