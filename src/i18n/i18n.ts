import global from '../shim/global';
import WeakMap from '../shim/WeakMap';
import * as Globalize from 'globalize/dist/globalize/message';
const Cldr = require('cldrjs/dist/cldr');
`!has('cldr-elide')`;
import './util/cldr';
import has from '../core/has';
import { isThenable } from '../shim/Promise';

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
let cldrLoaders: CldrLoaders = {};
let bundleId = 0;

function getBundleId() {
	return `id-${++bundleId}`;
}

function markBundleAsLoaded(locale: string, bundleId: string) {
	Globalize.loadMessages({
		[locale]: {
			lookup: {
				[bundleId]: {
					locale: undefined,
					id: undefined,
					loading: undefined
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

export function setCldrLoaders(loaders: CldrLoaders) {
	cldrLoaders = { ...loaders };
}

function loadSupplementalFallback(invalidator?: Function) {
	const fallback = cldrLoaders.fallback;
	if (typeof fallback === 'function') {
		if (has('dojo-debug')) {
			console.warn(
				`Loading fallback supplemental cldr bundle, please make sure that all supported locales are specified in the '.dojorc'.`
			);
		}
		return fallback().then((results) => {
			results.forEach((result) => {
				Globalize.load(result.default);
			});
			cldrLoaders.fallback = true;
			invalidator && invalidator();
		});
	} else if (fallback === undefined) {
		throw new Error('Unable to load fallback supplemental cldr bundle.');
	}
}

export function setLocale(requestedLocale = global.navigator.language || global.navigator.userLanguage, local = false) {
	let partialSystemLocale = requestedLocale.replace(/^([a-z]{2}).*/i, '$1');
	const locales = supportedLocales;
	let userLocale = defaultLocale;

	let hasMatch = false;

	for (let i = 0; i < locales.length; i++) {
		const locale = locales[i];
		if (requestedLocale === locale) {
			userLocale = requestedLocale;
			hasMatch = true;
			break;
		}

		if (partialSystemLocale === locale) {
			userLocale = partialSystemLocale;
			hasMatch = true;
		}
	}

	const calculatedLocale = hasMatch ? requestedLocale : defaultLocale;

	const loaderPromises: Promise<any>[] = [];
	const supplementalLoader = cldrLoaders.supplemental;
	if (supplementalLoader && supplementalLoader !== true) {
		loaderPromises.push(supplementalLoader());
	}
	const localCldrLoader = cldrLoaders[userLocale];
	if (localCldrLoader && localCldrLoader !== true) {
		loaderPromises.push(localCldrLoader());
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
			if (!local) {
				Globalize.locale(computedLocale);
				computedLocale = calculatedLocale;
			}
			return calculatedLocale;
		});
	}
	if (!local) {
		try {
			Globalize.locale(computedLocale);
			computedLocale = calculatedLocale;
		} catch {
			const fallbackResult = loadSupplementalFallback();
			if (isThenable(fallbackResult)) {
				return fallbackResult.then(() => {
					Globalize.locale(computedLocale);
					computedLocale = calculatedLocale;
					return calculatedLocale;
				});
			}
		}
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
		const lookupBundles = locales.reduce(
			(lookup, locale) => {
				const bundleLoader = localeBundleLoaders[locale];
				if (typeof bundleLoader === 'function') {
					const id = getBundleId();
					bundleLoaderMap.set(bundleLoader, id);
					idToBundleLoaderMap.set(id, bundleLoader);
					lookup[locale] = {
						lookup: {
							[bundleId as any]: {
								locale,
								id
							}
						}
					};
				} else {
					lookup[locale] = {
						[bundleId as any]: bundleLoader
					};
				}
				return lookup;
			},
			{} as any
		);
		Globalize.loadMessages({
			root: { [bundleId]: bundle.messages },
			[defaultLocale]: { [bundleId]: bundle.messages },
			...lookupBundles
		});
	}

	if (locales.indexOf(locale) === -1) {
		Globalize.loadMessages({
			[locale]: { [bundleId]: bundle.messages }
		});
	}

	try {
		let globalize = globalizeInstanceMap.get(locale) || new Globalize(locale);
		globalizeInstanceMap.set(locale, globalize);

		let lookupId = globalize.cldr.get(`${MESSAGE_BUNDLE_PATH}/lookup/${bundleId}/id`);
		let lookupLocale = globalize.cldr.get(`${MESSAGE_BUNDLE_PATH}/lookup/${bundleId}/locale`);
		if (lookupId && lookupLocale) {
			let bundleLoader = idToBundleLoaderMap.get(lookupId);
			if (bundleLoader) {
				Globalize.loadMessages({ [lookupLocale]: { lookup: { [bundleId]: { loading: true } } } });
				const loaderPromise = bundleLoader();
				loaderPromise.then((messages) => {
					markBundleAsLoaded(lookupLocale, bundleId as string);
					Globalize.loadMessages({ [lookupLocale]: { [bundleId as string]: messages.default } });
					invalidator();
				});
			}
		}
		const lookupLoading = globalize.cldr.get(`${MESSAGE_BUNDLE_PATH}/lookup/${bundleId}/loading`);

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
	} catch {
		loadSupplementalFallback(invalidator);
		return getPlaceholderBundle(bundle);
	}
}
