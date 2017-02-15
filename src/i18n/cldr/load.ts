// required for Globalize/Cldr to properly resolve locales in the browser.
import 'cldrjs/dist/cldr/unresolved';
import load from '@dojo/core/load';
import coreRequest from '@dojo/core/request';
import has from '@dojo/has/has';
import { Require } from '@dojo/interfaces/loader';
import Map from '@dojo/shim/Map';
import Promise from '@dojo/shim/Promise';
import * as Globalize from 'globalize';
import { generateLocales } from '../util/main';
import supportedMain from './locales';

declare const require: Require;
declare const define: {
	(...args: any[]): any;
	amd: any;
};

/**
 * Describes the form of an individual CLDR data object.
 */
export interface CldrData {
	[key: string]: any;
}

export interface CldrDataResponse {
	/**
	 * An array of the supplemental CLDR data required by the i18n ecosystem.
	 */
	supplemental: CldrData[];

	/**
	 * An array of locale-specific CLDR data.
	 */
	[locale: string]: CldrData[];
}

/**
 * The paths for all locale-specific CLDR data required by the i18n ecosystem.
 */
export const localeCldrPaths = Object.freeze([
	'cldr-data/main/{locale}/numbers',
	'cldr-data/main/{locale}/currencies',
	'cldr-data/main/{locale}/ca-gregorian',
	'cldr-data/main/{locale}/timeZoneNames',
	'cldr-data/main/{locale}/dateFields',
	'cldr-data/main/{locale}/units'
]);

/**
 * The paths for all supplemental CLDR data required by the i18n ecosystem.
 */
export const supplementalCldrPaths = Object.freeze([
	'cldr-data/supplemental/likelySubtags',
	'cldr-data/supplemental/numberingSystems',
	'cldr-data/supplemental/plurals',
	'cldr-data/supplemental/ordinals',
	'cldr-data/supplemental/currencyData',
	'cldr-data/supplemental/timeData',
	'cldr-data/supplemental/weekData'
]);

/**
 * @private
 * Load the CLDR JSON files at the specified paths. Note that the paths should not include an extension (i.e., ".json").
 *
 * @param {paths}
 * The JSON paths.
 *
 * @return
 * A promise to the CLDR data for each path.
 */
const getJson: (paths: ReadonlyArray<string>) => Promise<CldrData[]> = (function () {
	if (has('host-node')) {
		return function (paths: string[]): Promise<{}[]> {
			paths = paths.map(path => path + '.json');
			return load(require, ...paths);
		};
	}

	return function (paths: string[]): Promise<CldrData[]> {
		return Promise.all(paths.map((path: string): Promise<CldrData> => {
			if (typeof require.toUrl === 'function') {
				path = require.toUrl(path);
			}

			return <Promise<CldrData>> coreRequest.get(`${path}.json`)
				.then(response => response.json())
				.then((data: CldrData) => {
					return data;
				});
		}));
	};
})();

/**
 * @private
 * Return the most specific locale for which there are CLDR data.
 *
 * For example, the following values are returned for their corresponding locales.
 * en-US => en // there is no "en-US" directory
 * en-US-POSIX => en-US-POSIX
 * ar-JO => ar-JO
 * made-up => undefined
 *
 * @param {locale}
 * The required locale.
 *
 * @return
 * The next available supported locale, or undefined if none is found.
 */
function getNextSupportedLocale(locale: string): string | void {
	const options = generateLocales(locale);

	for (let i = options.length - 1; i >= 0; i--) {
		const option = options[i];

		if (supportedMain.indexOf(option) > -1) {
			return option;
		}
	}
}

/**
 * Load all supplemental data required by the i18n ecosystem. Note that data are loaded once and cached thereafter.
 *
 * @return
 * A promise to the supplemental CLDR data.
 */
export const loadSupplementalData = (function () {
	let supplementalPromise: Promise<CldrData[]>;
	return function (): Promise<CldrData[]> {
		if (supplementalPromise) {
			return supplementalPromise;
		}

		supplementalPromise = getJson(supplementalCldrPaths).then((data: CldrData[]) => {
			Globalize.load(...data);
			return Object.freeze(data.map((item) => Object.freeze(item)));
		});
		return supplementalPromise;
	};
})();

/**
 * Load all locale-specific data required by the i18n ecosystem. Note that data are loaded once and cached thereafter.
 *
 * @param {locale}
 * The required locale.
 *
 * @return
 * A promise to the locale-specific CLDR data.
 */
export const loadLocaleData = (function () {
	const loadedLocaleMap = new Map<string, Promise<CldrData[]>>();
	return function (locale: string, fallback?: string): Promise<CldrData[]> {
		let dataPromise = loadedLocaleMap.get(locale);

		if (dataPromise) {
			return dataPromise;
		}

		const available = getNextSupportedLocale(locale);
		if (!available) {
			if (fallback && fallback !== locale) {
				return loadLocaleData(fallback);
			}

			return Promise.reject(new Error(`No CLDR data for locale: ${locale}.`));
		}

		dataPromise = getJson(localeCldrPaths.map((path) => path.replace('{locale}', available)))
			.then((data: CldrData[]) => {
				Globalize.load(...data);
				return Object.freeze(data.map((item) => Object.freeze(item)));
			});

		loadedLocaleMap.set(locale, dataPromise);
		return dataPromise;
	};
})();

/**
 * Load all supplemental CLDR data, as well as all CLDR data specific to the provided locale(s). If a single locale is
 * provided, then an optional fallback can also be provided; if the specified locale is not supported, then the data
 * for the fallback will be loaded instead.
 *
 * @param {locales}
 * The required locale or list of locales.
 *
 * @param {fallback}
 * An optional fallback locale to be used in the event that the first locale is unsupported (i.e., has no
 * corresponding CLDR data). Note that a fallback can only be used when a single locale is provided.
 *
 * @return
 * A promise to the CLDR data, separated into supplemental and locale-specific collections.
 */
export default function loadCldrData(locales: string[]): Promise<CldrDataResponse>;
export default function loadCldrData(locale: string, fallback?: string): Promise<CldrDataResponse>;
export default function loadCldrData(locales: any, fallback?: string): Promise<CldrDataResponse> {
	locales = Array.isArray(locales) ? locales : [ locales ];
	return Promise.all([ loadSupplementalData() ].concat(locales.map((locale: string) => {
		return locales.length === 1 ? loadLocaleData(locale, fallback) : loadLocaleData(locale);
	}))).then((data) => {
		return data.reduce((result: CldrDataResponse, values: CldrData[], i: number) => {
			if (i === 0) {
				result['supplemental'] = values;
			}
			else {
				const locale = locales[i - 1];
				result[locale] = values;
			}

			return result;
		}, {} as CldrDataResponse);
	}, (error) => {
		throw error;
	});
}
