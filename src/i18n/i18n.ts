/* tslint:disable:interface-name */
import createEvented from 'dojo-compose/bases/createEvented';
import has from 'dojo-core/has';
import global from 'dojo-core/global';
import { assign } from 'dojo-core/lang';
import load from 'dojo-core/load';
import { Handle } from 'dojo-interfaces/core';
import Map from 'dojo-shim/Map';
import Observable, { Observer, Subscription, SubscriptionObserver } from 'dojo-shim/Observable';
import Promise from 'dojo-shim/Promise';
import * as Globalize from 'globalize/dist/globalize/message';
import loadCldrData from './cldr/load';
import { generateLocales, normalizeLocale } from './util';

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
	(options?: any): string;
}

/**
 * An object of keys to locale messages.
 */
export interface Messages {
	[key: string]: string;
}

const PATH_SEPARATOR: string = has('host-node') ? require('path').sep : '/';
const VALID_PATH_PATTERN = new RegExp(PATH_SEPARATOR + '[^' + PATH_SEPARATOR + ']+$');
const bundleMap = new Map<string, Map<string, Messages>>();
const formatterMap = new Map<string, MessageFormatter>();
const localeProducer = createEvented();
let rootLocale: string;

/**
 * @private
 * Load the specified locale-specific bundles, mapping the default exports to simple `Messages` objects.
 */
const loadLocaleBundles = (function () {
	function mapMessages<T extends Messages>(modules: LocaleModule<T>[]): T[] {
		return modules.map((localeModule: LocaleModule<T>): T => {
			return localeModule.default as T;
		});
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
 * Return a message formatted according to the ICU message format pattern.
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
export function formatMessage(bundlePath: string, key: string, options: any, locale?: string): string {
	return getMessageFormatter(bundlePath, key, locale)(options || {});
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
	const { bundlePath, locales } = bundle;
	const cached = bundleMap.get(bundlePath);
	const supportedLocales = getSupportedLocales(locale, bundle.locales);

	if (!cached) {
		bundleMap.set(bundlePath, new Map<string, Messages>());
		Globalize.loadMessages({
			root: {
				[bundlePath.replace(/\//g, '-')]: bundle.messages
			}
		});
	}

	if (!supportedLocales.length) {
		return bundle.messages;
	}

	if (cached) {
		return cached.get(supportedLocales[supportedLocales.length - 1]) as T;
	}
}

/**
 * Return a function that formats a specific message, and takes an optional value for token replacement.
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
	const normalized = bundlePath.replace(/\//g, '-').replace(/-$/, '');
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
	const path = bundlePath.replace(/\/$/, '');
	const currentLocale = locale ? normalizeLocale(locale) : getRootLocale();

	try {
		validatePath(path);
	}
	catch (error) {
		return Promise.reject(error);
	}

	const cachedMessages = getCachedMessages(bundle, currentLocale);
	if (cachedMessages) {
		return loadCldrData(currentLocale).then(() => cachedMessages);
	}

	const localePaths = resolveLocalePaths(path, currentLocale, locales);
	return loadCldrData(currentLocale).then(() => {
		return loadLocaleBundles(localePaths);
	}).then((bundles: T[]): T => {
		return bundles.reduce((previous: T, partial: T): T => {
			const localeMessages: T = assign({}, previous, partial);
			const localeCache = bundleMap.get(bundlePath) as Map<string, Messages>;

			localeCache.set(currentLocale, <T> Object.freeze(localeMessages));
			Globalize.loadMessages({
				[currentLocale]: {
					[bundlePath.replace(/\//g, '-')]: localeMessages
				}
			});

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
			localeProducer.on('change', (event) => {
				observer.next(event.target as string);
			}),
			localeProducer.on('error', (event: ErrorEvent) => {
				observer.error(event.error);
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
 * Return a promise that resolves when all CLDR data for the current locale have been loaded.
 *
 * @return
 * A promise that resolves when all data required for the current locale have loaded.
 */
export function ready(): Promise<void> {
	const locale = getRootLocale();
	return loadCldrData(locale).then(() => {
		Globalize.locale(locale);
	});
}

/**
 * Change the root locale, and notify any registered observers.
 *
 * @param locale
 * The new locale.
 */
export function switchLocale(locale: string): Promise<void> {
	const previous = rootLocale;
	rootLocale = locale ? normalizeLocale(locale) : '';

	return ready().then(() => {
		if (previous !== rootLocale) {
			localeProducer.emit({ type: 'change', target: rootLocale });
		}
	}, (error: Error) => {
		rootLocale = previous;
		localeProducer.emit({ type: 'error', error: error });
	});
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
		systemLocale = process.env.LANG;
	}
	return normalizeLocale(systemLocale);
})();
