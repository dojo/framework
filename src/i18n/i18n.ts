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

const bundleIdMap = new WeakMap<Bundle<Messages>, string>();
const bundleLoaderMap = new WeakMap<MessageLoader, string>();
const idToBundleLoaderMap = new Map<string, MessageLoader>();
const globalizeInstanceMap = new Map<string, Globalize>();
const MESSAGE_BUNDLE_PATH = 'globalize-messages/{bundle}';

let supportedLocales: string[] = [];
let defaultLocale = '';
let computedLocale = '';
let currentLocale = '';
let cldrLoaders: CldrLoaders = {};
let bundleId = 0;
const cldr = new Cldr('');

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

export function setSupportedLocales(locales: string[]) {
	supportedLocales = locales;
}

export function setDefaultLocale(locale: string) {
	defaultLocale = locale;
}

export function getComputedLocale() {
	return computedLocale;
}

export function getCurrentLocale() {
	return currentLocale;
}

export function setCldrLoaders(loaders: CldrLoaders) {
	cldrLoaders = { ...loaders };
}

export function getMatchedSupportedLocale(locale: string) {
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

function setComputedLocale(locale: string) {
	Globalize.locale(locale);
	computedLocale = locale;
	currentLocale = locale;
}

interface SetLocaleOptions {
	locale?: string;
	default?: boolean;
	local?: boolean;
}

export function setLocale(options: SetLocaleOptions = {}) {
	const {
		local,
		default: isDefaultLocale,
		locale: requestedLocale = global.navigator.language || global.navigator.userLanguage
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
	const localCldrLoader = cldrLoaders[userLocale];
	if (localCldrLoader && localCldrLoader !== true) {
		loaderPromises.push(localCldrLoader());
	}
	const loadFallback = !getMatchedSupportedLocale(requestedLocale) && fallbackLoader && fallbackLoader !== true;
	if (loadFallback && fallbackLoader && fallbackLoader !== true) {
		loaderPromises.push(fallbackLoader());
	}

	if (loaderPromises.length) {
		return Promise.all(loaderPromises).then((data) => {
			cldrLoaders[userLocale] = true;
			cldrLoaders.supplemental = true;
			data.forEach((results) => {
				results.forEach((result: any) => {
					Globalize.load(result.default);
				});
			});

			if (loadFallback) {
				cldrLoaders.fallback = true;
				const data = cldr.get('dojo');
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

			if (isDefaultLocale) {
				setComputedLocale(calculatedLocale);
			} else if (!local) {
				currentLocale = calculatedLocale;
			}
			return calculatedLocale;
		});
	} else if (!matchedLocale) {
		Globalize.loadMessages({ [requestedLocale]: {} });
	}
	if (isDefaultLocale) {
		setComputedLocale(calculatedLocale);
	} else if (!local) {
		currentLocale = calculatedLocale;
	}
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

export function localizeBundle<T extends Messages>(
	bundle: Bundle<T>,
	options: LocalizeOptions
): LocalizeResult<Bundle<T>> {
	const { locale = computedLocale, invalidator } = options;
	const { locales: localeBundleLoaders = {} } = bundle;
	const locales = Object.keys(localeBundleLoaders);
	let bundleId: string | undefined = bundleIdMap.get(bundle);
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
				messageBundles[locale] = messages;
			} else {
				if (lookup[locale]) {
					lookup[locale].bundles = { [bundleId]: messages };
				} else {
					lookup[locale] = {
						bundles: { [bundleId]: messages }
					};
				}
			}
		}
		Globalize.loadMessages({
			root: { [bundleId]: bundle.messages },
			[computedLocale]: { [bundleId]: bundle.messages },
			...messageBundles
		});
		Cldr.load({
			dojo: lookup
		});
	}

	let globalize = globalizeInstanceMap.get(locale) || new Globalize(locale);
	globalizeInstanceMap.set(locale, globalize);

	let lookupId = globalize.cldr.get(`dojo/{bundle}/lookup/${bundleId}/id`);
	let lookupLocale = globalize.cldr.get(`dojo/{bundle}/lookup/${bundleId}/locale`);
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
	const lookupLoading = globalize.cldr.get(`dojo/{bundle}/lookup/${bundleId}/loading`);

	if (lookupLoading) {
		return getPlaceholderBundle(bundle);
	}

	return {
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
}
