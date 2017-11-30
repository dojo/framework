import load, { Require } from '@dojo/core/load';
import coreRequest from '@dojo/core/request';
import has from '@dojo/has/has';
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
 * @param require
 * The require method used to resolve relative paths.
 *
 * @param paths
 * The JSON paths.
 *
 * @return
 * A promise to the CLDR data for each path.
 */
const getJson: (require: any, paths: string[]) => Promise<CldrData[]> = (function () {
	if (has('host-node')) {
		return function (require: any, paths: string[]): Promise<{}[]> {
			return load(require, ...paths);
		};
	}

	return function (require: any, paths: string[]): Promise<CldrData[]> {
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
 * @param contextRequire
 * An optional contextual require that can be used to resolve relative paths.
 *
 * @param data
 * Either a data object to load directly, or an array of URLs to CLDR data objects. Note that the response for
 * dynamically-loaded data must satisfy the `CldrData` interface.
 *
 * @return
 * A promise that resolves once all data have been loaded and registered.
 */
export default function loadCldrData(contextRequire: Function, data: CldrData | string[]): Promise<void>;
export default function loadCldrData(data: CldrData | string[]): Promise<void>;
export default function loadCldrData(dataOrRequire: Function | CldrData | string[], data?: CldrData | string[]): Promise<void> {
	const contextRequire = typeof dataOrRequire === 'function' ? dataOrRequire : require;
	data = typeof dataOrRequire === 'function' ? data : dataOrRequire;

	if (Array.isArray(data)) {
		return getJson(contextRequire, data).then((result: CldrData[]) => {
			result.forEach(baseLoad);
		});
	}

	return baseLoad(data as CldrData);
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
