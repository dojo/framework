import global from './global';
import { Hash } from './interfaces';

export type TestResult = boolean | string | number;
export type TestMethod = () => TestResult;

export const cache: Hash<TestResult> = Object.create(null);
export const testFunctions: Hash<TestMethod> = Object.create(null);

/**
 * Conditional loading of AMD modules based on a has feature test value.
 *
 * @param resourceId Gives the resolved module id to load.
 * @param require The loader require function with respect to the module that contained the plugin resource in it's dependency list.
 * @param load Callback to loader that consumes result of plugin demand.
 */
export function load(resourceId: string, require: DojoLoader.Require, load: (value?: any) => void, config?: DojoLoader.Config): void {
	if (resourceId) {
		require([ resourceId ], load);
	}
	else {
		load();
	}
}

/**
 * Resolves resourceId into a module id based on possibly-nested tenary expression that branches on has feature test value(s).
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
 * @return if the feature has been registered
 */
export function exists(feature: string): boolean {
	return feature in cache || feature in testFunctions;
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
 * @return if the feature test was successfully added
 */
export function add(feature: string, value: TestResult | TestMethod, overwrite: boolean = false): boolean {
	if (exists(feature) && !overwrite) {
		return false;
	}

	if (typeof value === 'function') {
		testFunctions[feature] = <TestMethod> value;
	}
	else {
		cache[feature] = <TestResult> value;
		// Ensure we don't have stale tests sitting around that could overwrite a cache value being set
		delete testFunctions[feature];
	}
	return true;
}

/**
 * Return the current value of a named feature.
 *
 * @param feature The name (if a string) or identifier (if an integer) of the feature to test.
 * @return The value of a given feature test
 */
export default function has(feature: string): TestResult {
	let result: any;

	if (testFunctions[feature]) {
		result = cache[feature] = testFunctions[feature].call(null);
		testFunctions[feature] = null;
	}
	else {
		result = cache[feature];
	}

	return result;
}

/*
 * OOTB feature tests
 */
add('host-browser', typeof document !== 'undefined' && typeof location !== 'undefined');
add('host-node', function () {
	if (typeof process === 'object' && process.versions && process.versions.node) {
		return process.versions.node;
	}
});
add('float32array', 'Float32Array' in global);
add('setimmediate', typeof global.setImmediate !== 'undefined');
add('dom-mutationobserver', function(): boolean {
	return has('host-browser') && Boolean(global.MutationObserver || global.WebKitMutationObserver);
});
add('microtasks', function () {
	return has('promise') || has('host-node') || has('dom-mutationobserver');
});
add('object-assign', typeof (<any> Object).assign === 'function');
add('object-observe', typeof (<any> Object).observe === 'function');
add('postmessage', typeof postMessage === 'function');
add('promise', typeof global.Promise !== 'undefined');
add('raf', typeof requestAnimationFrame === 'function');
add('weakmap', function () {
	if (typeof global.WeakMap !== 'undefined') {
		const key1 = {};
		const key2 = {};
		const map = new global.WeakMap([ [ key1, 1 ] ]);
		return map.get(key1) === 1 && map.set(key2, 2) === map;
	}
	return false;
});
add('arraybuffer', typeof global.ArrayBuffer !== 'undefined');
add('formdata', typeof global.FormData !== 'undefined');
add('xhr', typeof global.XMLHttpRequest !== 'undefined');
add('xhr2', has('xhr') && 'responseType' in global.XMLHttpRequest.prototype);
add('xhr2-blob', function () {
	if (!has('xhr2')) {
		return false;
	}

	const request = new XMLHttpRequest();
	request.open('GET', '/', true);
	request.responseType = 'blob';
	request.abort();
	return request.responseType === 'blob';
});
// Native Array methods
add('es6-array-from', 'from' in global.Array);
add('es6-array-of', 'of' in global.Array);
add('es6-array-fill', 'fill' in global.Array.prototype);
add('es6-array-findIndex', 'findIndex' in global.Array.prototype);
add('es6-array-find', 'find' in global.Array.prototype);
add('es6-array-copyWithin', 'copyWithin' in global.Array.prototype);
add('es7-array-includes', 'includes' in global.Array.prototype);
add('es6-symbol', typeof global.Symbol === 'function');
add('es6-set', () => {
	if (typeof global.Set === 'function') {
		/* IE11 and older versions of Safari are missing critical ES6 Set functionality */
		const set = new global.Set([1]);
		return set.has(1) && 'keys' in set && typeof set.keys === 'function';
	}
	return false;
});
