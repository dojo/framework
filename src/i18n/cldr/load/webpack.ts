import '@dojo/shim/Promise'; // imported for side effects
import baseLoad, {
	CldrData,
	isLoaded as baseIsLoaded,
	LocaleData,
	mainPackages,
	reset,
	supplementalPackages
} from './default';

declare const __cldrData__: CldrData;

/*
 * Loading the data in this manner allows a global `__cldrData__` to be populated after this module loads
 * in the event that a local equivalent is not injected at build time.
 */
let cldrLoaded = false;
async function loadInjectedData() {
	if (!cldrLoaded) {
		cldrLoaded = true;
		await baseLoad(__cldrData__);
	}
}

/**
 * A webpack-specific function used to load CLDR data from a preset cache.
 */
export default function loadCldrData(contextRequire: Function, data: CldrData | string[]): Promise<void>;
export default function loadCldrData(data: CldrData | string[]): Promise<void>;
export default function loadCldrData(dataOrRequire: Function | CldrData | string[], data?: CldrData | string[]): Promise<void> {
	data = typeof dataOrRequire === 'function' ? data : dataOrRequire;

	if (Array.isArray(data)) {
		return Promise.resolve();
	}

	loadInjectedData();
	return baseLoad(data as CldrData);
}

/**
 * A light wrapper around the base `isLoaded` method that ensures the injected CLDR data have been registered
 * with the i18n ecosystem.
 */
export function isLoaded(groupName: 'main' | 'supplemental', ...args: string[]) {
	loadInjectedData();
	return baseIsLoaded(groupName, ...args);
}

export {
	CldrData,
	LocaleData,
	mainPackages,
	reset,
	supplementalPackages
}
