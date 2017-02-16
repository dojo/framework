import Promise from '@dojo/shim/Promise';
import loadCldrData, { isLoaded } from '../../src/cldr/load';

/**
 * Thenable represents any object with a callable `then` property.
 */
export interface Thenable<T> {
	then<U>(onFulfilled?: (value?: T) => U | Thenable<U>, onRejected?: (error?: any) => U | Thenable<U>): Thenable<U>;
}

export function isEventuallyRejected<T>(promise: Thenable<T>): Thenable<boolean> {
	return promise.then<any>(function () {
		throw new Error('unexpected code path');
	}, function () {
		return true; // expect rejection
	});
}

export function throwImmediatly() {
	throw new Error('unexpected code path');
}

/**
 * Load into Globalize.js all CLDR data for the specified locales.
 */
export function fetchCldrData(locales: string | string[]): Promise<void[]> {
	locales = Array.isArray(locales) ? locales : [ locales ];

	const promises = locales.map((locale: string) => {
		if (isLoaded('main', locale)) {
			return Promise.resolve();
		}

		const paths = [ 'ca-gregorian', 'currencies', 'dateFields', 'numbers', 'timeZoneNames', 'units' ]
			.map((name: string) => `cldr-data/main/${locale}/${name}.json`);
		return loadCldrData(paths);
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
		promises.push(loadCldrData(supplementalPaths));
	}

	return Promise.all(promises);
}
