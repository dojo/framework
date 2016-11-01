/* tslint:disable:interface-name */
import has from 'dojo-core/has';
import global from 'dojo-core/global';
import { Handle } from 'dojo-interfaces/core';
import { assign } from 'dojo-core/lang';
import Map from 'dojo-shim/Map';
import Promise from 'dojo-shim/Promise';

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
	(bundle: Bundle<T>): Promise<T>;
	(bundle: Bundle<T>, context: LocaleContext<LocaleState>): Promise<T>;
	(bundle: Bundle<T>, locale: string): Promise<T>;
	(bundle: Bundle<T>, context?: any): Promise<T>;

	/**
	 * The current namespace as set via `switchLocale`. Defaults to `systemLocale`.
	 */
	readonly locale: string;
}

/**
 * Represents an object from which a locale can be read. If a context object also has both `invalidate` and `own`
 * methods, it will be updated (invalidated) when the locale is changed.
 */
export interface LocaleContext<S extends LocaleState> {
	/**
	 * The state object from which the locale string is read.
	 */
	state: S;

	/**
	 * An optional method to invalidate the context object's state.
	 */
	invalidate?: () => void;

	/**
	 * An optional method that is capable of owning handles, presumably to destroy them when the context object
	 * is destroyed.
	 *
	 * @param handle
	 * A handle that, when destroyed, will prevent the context object from being invalidated when the locale
	 * is changed.
	 *
	 * @return A handle to *unown* the passed handle.
	 */
	own?: (handle: Handle) => Handle;
}

interface LocaleModule<T extends Messages> {
	default?: T;
}

export interface LocaleState {
	locale?: string;
}

/**
 * An object of keys to locale messages.
 */
export interface Messages {
	[key: string]: string;
}

const PATH_SEPARATOR: string = has('host-node') ? global.require('path').sep : '/';
const VALID_PATH_PATTERN = new RegExp(PATH_SEPARATOR + '[^' + PATH_SEPARATOR + ']+$');
const contextObjects: LocaleContext<LocaleState>[] = [];
const bundleMap = new Map<string, Map<string, Messages>>();
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

	if (has('host-node')) {
		return function<T extends Messages>(paths: string[]): Promise<T[]> {
			const modules = paths.map((path: string): LocaleModule<T> => {
				return global.require(path) as LocaleModule<T>;
			});

			return Promise.all(mapMessages(modules));
		};
	}

	return function<T extends Messages>(paths: string[]): Promise<T[]> {
		return new Promise<T[]>((resolve, reject) => {
			const require = global.require;
			require.on('error', (error: Error) => {
				reject(error);
			});
			require(paths, (...modules: LocaleModule<T>[]) => {
				resolve(mapMessages(modules));
			});
		});
	};
})();

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
	const normalized = normalizeLocale(locale);
	const parts = normalized.split('-');
	const result: string[] = [];

	let current = parts[0];

	if (supported.indexOf(current) > -1) {
		result.push(current);
	}

	for (let i = 0; i < parts.length - 1; i += 1) {
		const next = parts[i + 1];

		if (next) {
			current += '-' + next;

			if (supported.indexOf(current) > -1) {
				result.push(current);
			}
		}
	}

	return result;
}

/**
 * @private
 * A type guard that determines whether a context object is stateful and can be invalidated.
 *
 * @param value
 * The target value.
 */
function isContextObject(value: any): boolean {
	return Boolean(value.state) && typeof value.own === 'function' && typeof value.invalidate === 'function';
}

/**
 * @private
 * Normalize a locale so that it can be converted to a bundle path.
 *
 * @param locale
 * The target locale.
 *
 * @return The normalized locale.
 */
const normalizeLocale = (function () {
	if (has('host-node')) {
		return function (locale: string): string {
			if (locale.indexOf('.') === -1) {
				return locale;
			}

			return locale.split('.').slice(0, -1).map((part: string): string => {
				return part.replace(/_/g, '-');
			}).join('-');
		};
	}

	return function (locale: string): string {
		return locale;
	};
})();

/**
 * @private
 * Extract a locale from the provided context. Either the context's locale or the current locale is returned.
 *
 * @param context
 * An optional context containing the locale information.
 */
function resolveLocale(context?: any): string {
	if (context) {
		if (typeof context === 'string') {
			return context;
		}
		else if (context.state.locale) {
			return context.state.locale;
		}
	}
	return rootLocale || systemLocale;
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
	const supportedLocales = getSupportedLocales(locale, bundle.locales);

	if (!supportedLocales.length) {
		return bundle.messages;
	}

	const cached = bundleMap.get(bundlePath);
	if (cached) {
		return cached.get(supportedLocales[supportedLocales.length - 1]) as T;
	}
}

/**
 * Load locale-specific messages for the specified bundle and locale.
 *
 * @param bundle
 * The default bundle that is used to determine where the locale-specific bundles are located.
 *
 * @param context
 * An optional locale, or stateful object that specifies a string locale. If the context is a stateful object with an
 * `invalidate` method, it will be invalidated when the locale is changed. If no context is provided, then the current
 * locale is assumed.
 *
 * @return A promise to the locale-specific messages.
 */
function i18n<T extends Messages>(bundle: Bundle<T>): Promise<T>;
function i18n<T extends Messages>(bundle: Bundle<T>, context: LocaleContext<LocaleState>): Promise<T>;
function i18n<T extends Messages>(bundle: Bundle<T>, locale: string): Promise<T>;
function i18n<T extends Messages>(bundle: Bundle<T>, context?: any): Promise<T> {
	const locale = resolveLocale(context);
	const { bundlePath, locales, messages } = bundle;
	const path = bundlePath.replace(/\/$/, '');

	try {
		validatePath(path);
	}
	catch (error) {
		return Promise.reject(error);
	}

	if (context && isContextObject(context) && contextObjects.indexOf(context) === -1) {
		contextObjects.push(context);
		context.own(<Handle> {
			destroy(this: Handle) {
				this.destroy = () => {};
				const index = contextObjects.indexOf(context);
				contextObjects.splice(index, 1);
			}
		});
	}

	const cachedMessages = getCachedMessages(bundle, locale);
	if (cachedMessages) {
		return Promise.resolve(cachedMessages);
	}

	const localePaths = resolveLocalePaths(path, locale, locales);
	return loadLocaleBundles(localePaths).then((bundles: T[]): T => {
		return bundles.reduce((previous: T, partial: T): T => {
			const localeMessages = assign({}, previous, partial);
			let localeCache = bundleMap.get(bundlePath);

			if (!localeCache) {
				localeCache = new Map<string, Messages>();
				bundleMap.set(bundlePath, localeCache);
			}

			localeCache.set(locale, Object.freeze(localeMessages));
			return localeMessages;
		}, messages);
	});
}

Object.defineProperty(i18n, 'locale', {
	get() {
		return rootLocale || systemLocale;
	}
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
 * Change the root locale, and invalidate any registered statefuls.
 *
 * @param locale
 * The new locale.
 */
export function switchLocale(locale: string): void {
	const previous = rootLocale;
	rootLocale = locale;

	if (previous !== rootLocale) {
		contextObjects.forEach((context: LocaleContext<LocaleState>) => {
			if (!context.state.locale) {
				context.invalidate && context.invalidate();
			}
		});
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
		systemLocale = global.process.env.LANG;
	}
	return systemLocale;
})();
