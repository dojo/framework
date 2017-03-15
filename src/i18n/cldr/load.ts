import load from '@dojo/core/load';
import coreRequest from '@dojo/core/request';
import has from '@dojo/has/has';
import { Require } from '@dojo/interfaces/loader';
import Promise from '@dojo/shim/Promise';

import baseLoad, {
	CldrData,
	CldrGroup,
	LocaleData,
	isLoaded,
	mainPackages,
	reset,
	supplementalPackages
} from './load/default';

declare const require: Require;

/**
 * @private
 * Load the CLDR JSON files at the specified paths.
 *
 * @param {paths}
 * The JSON paths.
 *
 * @return
 * A promise to the CLDR data for each path.
 */
const getJson: (paths: string[]) => Promise<CldrData[]> = (function () {
	if (has('host-node')) {
		return function (paths: string[]): Promise<{}[]> {
			return load(require, ...paths);
		};
	}

	return function (paths: string[]): Promise<CldrData[]> {
		return Promise.all(paths.map((path: string): Promise<CldrData> => {
			if (typeof require.toUrl === 'function') {
				path = require.toUrl(path);
			}

			return <Promise<CldrData>> coreRequest.get(path)
				.then(response => response.json())
				.then((data: CldrData) => {
					return data;
				});
		}));
	};
})();

/**
 * Load the specified CLDR data with the i18n ecosystem.
 *
 * @param data
 * Either a data object to load directly, or an array of URLs to CLDR data objects. Note that the response for
 * dynamically-loaded data must satisfy the `CldrData` interface.
 *
 * @return
 * A promise that resolves once all data have been loaded and registered.
 */
export default function loadCldrData(data: CldrData | string[]): Promise<void> {
	if (Array.isArray(data)) {
		return getJson(data).then((result: CldrData[]) => {
			result.forEach(baseLoad);
		});
	}

	baseLoad(data);

	return Promise.resolve();
}

export {
	CldrData,
	CldrGroup,
	LocaleData,
	isLoaded,
	mainPackages,
	reset,
	supplementalPackages
}
