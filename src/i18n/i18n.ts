import global from '../shim/global';
import WeakMap from '../shim/WeakMap';
import * as Globalize from 'globalize/dist/globalize/message';
const Cldr = require('cldrjs/dist/cldr');
`!has('cldr-elide')`;
import './util/cldr';

export interface Messages {
	[key: string]: string;
}

export interface MessageLoader {
	(): Promise<{ default: Messages }>;
}

export interface CldrLoader {
	(): Promise<{ default: any }[]>;
}

export interface LocaleLoaders {
	[index: string]: Messages | MessageLoader;
}

export interface CldrLoaders {
	[index: string]: CldrLoader | true;
}

export interface Bundle<T extends Messages> {
	readonly locales?: LocaleLoaders;
	readonly messages: T;
}

export interface LocalizeOptions {
	locale?: string;
	useDefault?: boolean;
	invalidator: any;
}

export interface LocalizeResult<T extends Bundle<any>> {
	messages: T['messages'];
	isPlaceholder: boolean;
	format: (key: keyof T['messages'], options: any) => string;
}

interface SetLocaleOptions {
	locale?: string;
	default?: boolean;
	local?: boolean;
	invalidator?: () => void;
}

/**
 * Ensure that the raw bundle is not mutated when
 * the resolved bundles are set
 */
let cldrResolved = Cldr._resolved;

Object.defineProperty(Cldr, '_resolved', {
	get() {
		return { ...cldrResolved };
	},
	set(value: any) {
		cldrResolved = { ...value };
	}
});

const TOKEN_PATTERN = /\{([a-z0-9_]+)\}/gi;
const bundleIdMap = new WeakMap<Bundle<Messages>, string>();
const bundleLoaderMap = new WeakMap<MessageLoader, string>();
const idToBundleLoaderMap = new Map<string, MessageLoader>();
const globalizeInstanceMap = new Map<string, Globalize>();
const MESSAGE_BUNDLE_PATH = 'globalize-messages/{bundle}';
const DOJO_PATH = 'dojo/{bundle}/lookup';

let supportedLocales: string[] = [];
let defaultLocale = '';
// Set to `unknown` to support using default message bundles
// without an application locale configured
let computedLocale = 'unknown';
let currentLocale: string | undefined;
let cldrLoaders: CldrLoaders = {};
let bundleId = 0;
const cldr = new Cldr('');

/**
 * Sets the array of supported locales for the application
 */
export function setSupportedLocales(locales: string[]) {
	supportedLocales = locales;
}

/**
 * Sets the default locale of the application.
 */
export function setDefaultLocale(locale: string) {
	defaultLocale = locale;
}

/**
 * Returns the users locale computed by using the system locale
 * of the environment and the default locale.
 *
 * The users system locale if supported by the application (i.e resolves
 * to one of the set supported locales) otherwise the registered default
 * locale.
 */
export function getComputedLocale() {
	return computedLocale;
}

/**
 * Returns the application's current locale
 */
export function getCurrentLocale() {
	return currentLocale;
}

/**
 * Sets the available cldr loaders for the i18n module
 */
export function setCldrLoaders(loaders: CldrLoaders) {
	cldrLoaders = { ...loaders };
}

/**
 * Returns the matching supported locale for the passed locale. If there
 * is no matching locale then undefined is returned
 */
export function getMatchedSupportedLocale(locale: string): string | undefined {
	let partialLocale = locale.replace(/^([a-z]{2}).*/i, '$1');
	let matchedLocale;
	for (let i = 0; i < supportedLocales.length; i++) {
		const supportedLocale = supportedLocales[i];
		if (locale === supportedLocale) {
			matchedLocale = locale;
			break;
		}
		if (partialLocale === supportedLocale) {
			matchedLocale = partialLocale;
		}
	}
	return matchedLocale;
}

/**
 * Determines if the fallback CLDR data needs to be loaded
 * for the locale
 */
function shouldLoadFallbackCldr(locale: string) {
	return !getMatchedSupportedLocale(locale) && cldrLoaders.fallback && cldrLoaders.fallback !== true;
}

/**
 * Sets the i18n modules locale state based on whether the locale
 * is the default or local
 */
function setI18nLocales(locale: string, isDefault: boolean, local: boolean): void {
	if (isDefault) {
		Globalize.locale(locale);
		computedLocale = locale;
		currentLocale = locale;
	} else if (!local) {
		currentLocale = locale;
	}
}

/**
 * Load required CLDR data based on the registered loaders and support
 * for the requested locale
 */
async function loadCldrData(
	loaderPromises: Promise<any>[],
	userLocale: string,
	requestedLocale: string,
	calculatedLocale: string,
	isDefault: boolean,
	isLocal: boolean,
	invalidator?: () => void
): Promise<any> {
	return Promise.all(loaderPromises).then((loaderData) => {
		cldrLoaders[userLocale] = true;
		cldrLoaders.supplemental = true;
		loaderData.forEach((results) => {
			results.forEach((result: any) => {
				Globalize.load(result.default);
			});
		});
		if (shouldLoadFallbackCldr(requestedLocale)) {
			cldrLoaders.fallback = true;
			const data = cldr.get('dojo') || {};
			const locales = Object.keys(data);
			for (let i = 0; i < locales.length; i++) {
				const locale = locales[i];
				if (data[locale].bundles) {
					Globalize.loadMessages({ [locale]: data[locale].bundles });
				}
			}
			if (requestedLocale && locales.indexOf(requestedLocale) === -1) {
				Globalize.loadMessages({ [requestedLocale]: {} });
			}
		}
		setI18nLocales(calculatedLocale, isDefault, isLocal);
		invalidator && invalidator();
		return calculatedLocale;
	});
}

/**
 * Sets the i18n locale information for the application, loading any CLDR data or NLS
 * messages required to support the change.
 */
export function setLocale(options: SetLocaleOptions = {}): Promise<string> | string {
	const {
		local: isLocal = false,
		default: isDefault = false,
		locale: requestedLocale = global.navigator.language || global.navigator.userLanguage,
		invalidator
	} = options;
	const matchedLocale = getMatchedSupportedLocale(requestedLocale);
	const userLocale = matchedLocale || defaultLocale;
	const calculatedLocale = matchedLocale ? requestedLocale : defaultLocale;

	const loaderPromises: Promise<any>[] = [];
	const supplementalLoader = cldrLoaders.supplemental;
	const fallbackLoader = cldrLoaders.fallback;

	if (supplementalLoader && supplementalLoader !== true) {
		loaderPromises.push(supplementalLoader());
	}
	const localeCldrLoader = cldrLoaders[userLocale];
	if (localeCldrLoader && localeCldrLoader !== true) {
		loaderPromises.push(localeCldrLoader());
	}
	const loadFallback = !matchedLocale && fallbackLoader && fallbackLoader !== true;
	if (loadFallback && fallbackLoader && fallbackLoader !== true) {
		loaderPromises.push(fallbackLoader());
	}

	if (loaderPromises.length) {
		return loadCldrData(
			loaderPromises,
			userLocale,
			requestedLocale,
			calculatedLocale,
			isDefault,
			isLocal,
			invalidator
		);
	} else if (!matchedLocale) {
		Globalize.loadMessages({ [requestedLocale]: {} });
	}

	setI18nLocales(calculatedLocale, isDefault, isLocal);
	return calculatedLocale;
}

function getPlaceholderBundle<T extends Messages>(bundle: Bundle<T>) {
	return {
		messages: Object.keys(bundle.messages).reduce(
			(messages, key) => {
				messages[key] = '';
				return messages;
			},
			{} as any
		),
		isPlaceholder: true,
		format: () => ''
	};
}

function getBundleId() {
	return `id-${++bundleId}`;
}

function markBundleAsLoaded(locale: string, bundleId: string) {
	Cldr.load({
		dojo: {
			[locale]: {
				lookup: {
					[bundleId]: {
						locale: undefined,
						id: undefined,
						loading: undefined
					}
				}
			}
		}
	});
}

/**
 * Registers all locale loaders for the bundle
 */
function registerBundle<T extends Messages>(bundle: Bundle<T>): string {
	const { locales: localeBundleLoaders = {} } = bundle;
	const locales = Object.keys(localeBundleLoaders);
	let bundleId = bundleIdMap.get(bundle);
	if (!bundleId) {
		bundleId = getBundleId();
		bundleIdMap.set(bundle, bundleId);
		const messageBundles: { [index: string]: any } = {};
		const lookup: { [index: string]: any } = {};

		for (let i = 0; i < locales.length; i++) {
			const locale = locales[i];
			const isSupportedLocale = !!getMatchedSupportedLocale(locale);
			const bundleLoader = localeBundleLoaders[locale];
			let messages = {};
			if (typeof bundleLoader === 'function') {
				const id = getBundleId();
				bundleLoaderMap.set(bundleLoader, id);
				idToBundleLoaderMap.set(id, bundleLoader);
				lookup[locale] = { lookup: { [bundleId]: { locale, id } } };
			} else {
				messages = bundleLoader;
			}
			if (isSupportedLocale) {
				messageBundles[locale] = {
					[bundleId]: messages
				};
			} else if (lookup[locale]) {
				lookup[locale].bundles = { [bundleId]: messages };
			} else {
				lookup[locale] = {
					bundles: { [bundleId]: messages }
				};
			}
		}
		Globalize.loadMessages({
			root: { [bundleId]: bundle.messages },
			[computedLocale]: { [bundleId]: bundle.messages },
			[defaultLocale]: { [bundleId]: bundle.messages },
			...messageBundles
		});
		Cldr.load({ dojo: lookup });
	}
	return bundleId;
}

const cachedBundleMap = new WeakMap<Bundle<any>, Map<string, LocalizeResult<Bundle<any>>>>();

export function localizeBundle<T extends Messages>(
	bundle: Bundle<T>,
	options: LocalizeOptions
): LocalizeResult<Bundle<T>> {
	let { locale = computedLocale, invalidator } = options;
	if (computedLocale === 'unknown') {
		return {
			messages: bundle.messages,
			isPlaceholder: false,
			format: (key, options) => {
				return bundle.messages[key].replace(TOKEN_PATTERN, (token, property) => {
					const value = options[property];
					if (typeof value === 'undefined') {
						return token;
					}
					return value;
				});
			}
		};
	}
	if (shouldLoadFallbackCldr(locale)) {
		setLocale({ default: false, local: true, locale, invalidator });
		return getPlaceholderBundle(bundle);
	}
	const bundleId = registerBundle(bundle);
	const globalize = globalizeInstanceMap.get(locale) || new Globalize(new Cldr(locale));
	globalizeInstanceMap.set(locale, globalize);
	const lookupId = globalize.cldr.get(`${DOJO_PATH}/${bundleId}/id`);
	const lookupLocale = globalize.cldr.get(`${DOJO_PATH}/${bundleId}/locale`);
	if (lookupId && lookupLocale) {
		let bundleLoader = idToBundleLoaderMap.get(lookupId);
		if (bundleLoader) {
			Cldr.load({
				dojo: {
					[lookupLocale]: { lookup: { [bundleId]: { loading: true } } }
				}
			});
			const loaderPromise = bundleLoader();
			loaderPromise.then((messages) => {
				markBundleAsLoaded(lookupLocale, bundleId as string);
				Globalize.loadMessages({ [lookupLocale]: { [bundleId as string]: messages.default } });
				invalidator();
			});
		}
	}
	const lookupLoading = globalize.cldr.get(`${DOJO_PATH}/${bundleId}/loading`);

	if (lookupLoading) {
		return getPlaceholderBundle(bundle);
	}

	const cachedLocaleMessagesMap = cachedBundleMap.get(bundle) || new Map<string, LocalizeResult<Bundle<any>>>();
	let localizedBundleMessages = cachedLocaleMessagesMap.get(locale);
	if (!localizedBundleMessages) {
		localizedBundleMessages = {
			messages: Object.keys(bundle.messages).reduce(
				(messages, key) => {
					const message = globalize.cldr.get(`${MESSAGE_BUNDLE_PATH}/${bundleId}/${key}`);
					messages[key] = message;
					return messages;
				},
				{} as any
			),
			isPlaceholder: false,
			format: (key: any, options: {}) => {
				return globalize.formatMessage(`${bundleId}/${key}`, options);
			}
		};
		cachedLocaleMessagesMap.set(locale, localizedBundleMessages);
		cachedBundleMap.set(bundle, cachedLocaleMessagesMap);
	}
	return localizedBundleMessages;
}
