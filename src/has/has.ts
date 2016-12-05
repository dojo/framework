import { Require, Config } from './loader';

/**
 * The valid return types from a feature test
 */
export type FeatureTestResult = boolean | string | number | undefined;

/**
 * A function that tests for a feature and returns a result
 */
export type FeatureTest = () => FeatureTestResult;

/**
 * A cache of results of feature tests
 */
export const testCache: { [feature: string]: FeatureTestResult } = {};

/**
 * A cache of the un-resolved feature tests
 */
export const testFunctions: { [feature: string]: FeatureTest } = {};

export interface StaticHasFeatures {
	[ feature: string ]: FeatureTestResult;
}

export interface DojoHasEnvironment {
	/**
	 * Static features defined in the enviornment that should be used by the `has` module
	 * instead of run-time detection.
	 */
	staticFeatures?: StaticHasFeatures | (() => StaticHasFeatures);
}

declare global {
	interface Window {
		/**
		 * The `dojo/has` enviornment which provides configuration when the module is
		 * loaded.
		 */
		DojoHasEnvironment?: DojoHasEnvironment;
	}
}

/**
 * A reference to the global scope (`window` in a browser, `global` in NodeJS)
 */
const globalScope = (function (): any {
	/* istanbul ignore else */
	if (typeof window !== 'undefined') {
		// Browsers
		return window;
	}
	else if (typeof global !== 'undefined') {
		// Node
		return global;
	}
	else if (typeof self !== 'undefined') {
		// Web workers
		return self;
	}
	/* istanbul ignore next */
	return {};
})();

/* Grab the staticFeatures if there are available */
const { staticFeatures }: DojoHasEnvironment = globalScope.DojoHasEnvironment || {};

/* Cleaning up the DojoHasEnviornment */
if ('DojoHasEnvironment' in globalScope) {
	delete globalScope.DojoHasEnvironment;
}

/**
 * Custom type guard to narrow the `staticFeatures` to either a map or a function that
 * returns a map.
 *
 * @param value The value to guard for
 */
function isStaticFeatureFunction(value: any): value is (() => StaticHasFeatures) {
	return typeof value === 'function';
}

/**
 * The cache of asserted features that were available in the global scope when the
 * module loaded
 */
const staticCache: StaticHasFeatures = staticFeatures
	? isStaticFeatureFunction(staticFeatures)
		? staticFeatures.apply(globalScope)
		: staticFeatures
	: {}; /* Providing an empty cache, if none was in the environment

/**
 * AMD plugin function.
 *
 * Conditional loads modules based on a has feature test value.
 *
 * @param resourceId Gives the resolved module id to load.
 * @param require The loader require function with respect to the module that contained the plugin resource in its
 *                dependency list.
 * @param load Callback to loader that consumes result of plugin demand.
 */
export function load(resourceId: string, require: Require, load: (value?: any) => void, config?: Config): void {
	resourceId ? require([ resourceId ], load) : load();
}

/**
 * AMD plugin function.
 *
 * Resolves resourceId into a module id based on possibly-nested tenary expression that branches on has feature test
 * value(s).
 *
 * @param resourceId The id of the module
 * @param normalize Resolves a relative module id into an absolute module id
 */
export function normalize(resourceId: string, normalize: (moduleId: string) => string): string | null {
	const tokens: RegExpMatchArray = resourceId.match(/[\?:]|[^:\?]*/g) || [];
	let i = 0;

	function get(skip?: boolean): string | null {
		const term = tokens[i++];
		if (term === ':') {
			// empty string module name, resolves to null
			return null;
		}
		else {
			// postfixed with a ? means it is a feature to branch on, the term is the name of the feature
			if (tokens[i++] === '?') {
				if (!skip && has(term)) {
					// matched the feature, get the first value from the options
					return get();
				}
				else {
					// did not match, get the second value, passing over the first
					get(true);
					return get(skip);
				}
			}
			// a module
			return term;
		}
	}

	const id = get();

	return id && normalize(id);
}

/**
 * Check if a feature has already been registered
 *
 * @param feature the name of the feature
 */
export function exists(feature: string): boolean {
	const normalizedFeature = feature.toLowerCase();

	return Boolean(normalizedFeature in staticCache || normalizedFeature in testCache || testFunctions[normalizedFeature]);
}

/**
 * Register a new test for a named feature.
 *
 * @example
 * has.add('dom-addeventlistener', !!document.addEventListener);
 *
 * @example
 * has.add('touch-events', function () {
 *    return 'ontouchstart' in document
 * });
 *
 * @param feature the name of the feature
 * @param value the value reported of the feature, or a function that will be executed once on first test
 * @param overwrite if an existing value should be overwritten. Defaults to false.
 */
export function add(feature: string, value: FeatureTest | FeatureTestResult, overwrite: boolean = false): void {
	const normalizedFeature = feature.toLowerCase();

	if (exists(normalizedFeature) && !overwrite && !(normalizedFeature in staticCache)) {
		throw new TypeError(`Feature "${feature}" exists and overwrite not true.`);
	}

	if (typeof value === 'function') {
		testFunctions[normalizedFeature] = value;
	}
	else {
		testCache[normalizedFeature] = value;
		delete testFunctions[normalizedFeature];
	}
}

/**
 * Return the current value of a named feature.
 *
 * @param feature The name (if a string) or identifier (if an integer) of the feature to test.
 */
export default function has(feature: string): FeatureTestResult {
	let result: FeatureTestResult;

	const normalizedFeature = feature.toLowerCase();

	if (normalizedFeature in staticCache) {
		result = staticCache[normalizedFeature];
	}
	else if (testFunctions[normalizedFeature]) {
		result = testCache[normalizedFeature] = testFunctions[normalizedFeature].call(null);
		delete testFunctions[normalizedFeature];
	}
	else if (normalizedFeature in testCache) {
		result = testCache[normalizedFeature];
	}
	else {
		throw new TypeError(`Attempt to detect unregistered has feature "${feature}"`);
	}

	return result;
}

/*
 * Out of the box feature tests
 */

/* Environments */

/* Used as a value to provide a debug only code path */
add('debug', true);

/* Detects if the environment is "browser like" */
add('host-browser', typeof document !== 'undefined' && typeof location !== 'undefined');

/* Detects if the environment appears to be NodeJS */
add('host-node', function () {
	if (typeof process === 'object' && process.versions && process.versions.node) {
		return process.versions.node;
	}
});
