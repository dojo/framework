import request from '@dojo/core/request';
import has from '@dojo/has/has';
import '@dojo/shim/Promise';
import loadCldrData, { CldrData, isLoaded } from '../../src/cldr/load';

declare const require: any;

/**
 * Thenable represents any object with a callable `then` property.
 */
export interface Thenable<T> {
	then<U>(onFulfilled?: (value?: T) => U | Thenable<U>, onRejected?: (error?: any) => U | Thenable<U>): Thenable<U>;
}

export function isEventuallyRejected<T>(promise: Thenable<T>): Thenable<boolean> {
	return promise.then<any>(
		function() {
			throw new Error('unexpected code path');
		},
		function() {
			return true; // expect rejection
		}
	);
}

export function throwImmediatly() {
	throw new Error('unexpected code path');
}

const getJson: (paths: string[]) => Promise<CldrData[]> = (function() {
	if (has('host-node')) {
		return function(paths: string[]): Promise<CldrData[]> {
			return Promise.resolve(paths.map((path) => require(path) as CldrData));
		};
	}

	return function(paths: string[]): Promise<CldrData[]> {
		return Promise.all(
			paths.map((path: string): Promise<CldrData> => {
				if (typeof require.toUrl === 'function') {
					path = require.toUrl(path);
				}

				return <Promise<CldrData>>request
					.get(path)
					.then((response) => response.json())
					.then((data: CldrData) => {
						return data;
					});
			})
		);
	};
})();

/**
 * Load into Globalize.js all CLDR data for the specified locales.
 */
export async function fetchCldrData(locales: string | string[]): Promise<void> {
	locales = Array.isArray(locales) ? locales : [locales];

	await locales.map((locale: string) => {
		if (isLoaded('main', locale)) {
			return Promise.resolve();
		}

		const paths = ['ca-gregorian', 'currencies', 'dateFields', 'numbers', 'timeZoneNames', 'units'].map(
			(name: string) => `cldr-data/main/${locale}/${name}.json`
		);
		return getJson(paths).then((result: CldrData[]) => {
			return result.map((data) => loadCldrData(data));
		});
	});

	if (!isLoaded('supplemental', 'likelySubtags')) {
		const supplementalPaths = [
			'currencyData',
			'likelySubtags',
			'numberingSystems',
			'ordinals',
			'plurals',
			'timeData',
			'weekData'
		].map((name: string) => `cldr-data/supplemental/${name}.json`);

		await getJson(supplementalPaths).then((result: CldrData[]) => {
			return result.map((data) => loadCldrData(data));
		});
	}
}
