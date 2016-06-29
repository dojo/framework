import { Require, Config } from './loader';

/**
 * The valid return types from a feature test
 */
export type FeatureTestResult = boolean | string | number;

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
export function normalize(resourceId: string, normalize: (moduleId: string) => string): string {
	const tokens = resourceId.match(/[\?:]|[^:\?]*/g);
	let i = 0;

	function get(skip?: boolean): string {
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

	resourceId = get();

	return resourceId && normalize(resourceId);
}

/**
 * Check if a feature has already been registered
 *
 * @param feature the name of the feature
 */
export function exists(feature: string): boolean {
	return Boolean(feature in testCache || testFunctions[feature]);
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
	if (exists(feature) && !overwrite) {
		throw new TypeError(`Feature "${feature}" exists and overwrite not true.`);
	}

	if (typeof value === 'function') {
		testFunctions[feature] = value;
	}
	else {
		testCache[feature] = value;
		delete testFunctions[feature];
	}
}

/**
 * Return the current value of a named feature.
 *
 * @param feature The name (if a string) or identifier (if an integer) of the feature to test.
 */
export default function has(feature: string): FeatureTestResult {
	let result: FeatureTestResult;

	if (testFunctions[feature]) {
		result = testCache[feature] = testFunctions[feature].call(null);
		delete testFunctions[feature];
	}
	else if (feature in testCache) {
		result = testCache[feature];
	}
	else {
		throw new TypeError(`Attempt to detect unregistered has feature "${feature}"`);
	}

	return result;
}

/*
 * Out of the box feature tests
 */

/* Evironments */
add('host-browser', typeof document !== 'undefined' && typeof location !== 'undefined');
add('host-node', function () {
	if (typeof process === 'object' && process.versions && process.versions.node) {
		return process.versions.node;
	}
});
