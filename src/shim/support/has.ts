import global from './global';

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
export const testResultsCache: { [feature: string]: FeatureTestResult } = {};

/**
 * A cache of the un-resolved feature tests
 */
export const testFunctions: { [feature: string]: FeatureTest } = {};

/**
 * Check if a feature has already been registered
 *
 * @param feature the name of the feature
 */
export function exists(feature: string): boolean {
	return Boolean('feature' in testResultsCache || testFunctions[feature]);
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
		testResultsCache[feature] = value;
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
		result = testResultsCache[feature] = testFunctions[feature].call(null);
		delete testFunctions[feature];
	}
	else if (feature in testResultsCache) {
		result = testResultsCache[feature];
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

/* ECMAScript 6 and 7 Features */

/* Object */
add('es6-object-assign', typeof (<any> Object).assign === 'function');

/* Array */
add('es6-array-from', 'from' in global.Array);
add('es6-array-of', 'of' in global.Array);
add('es6-array-fill', () => {
	if ('fill' in global.Array.prototype) {
		/* Some versions of Safari do not properly implement this */
		return (<any> [ 1 ]).fill(9, Number.POSITIVE_INFINITY)[0] === 1;
	}
	return false;
});
add('es6-array-findindex', 'findIndex' in global.Array.prototype);
add('es6-array-find', 'find' in global.Array.prototype);
add('es6-array-copywithin', 'copyWithin' in global.Array.prototype);
add('es7-array-includes', 'includes' in global.Array.prototype);

/* String */
add('es6-string-raw', 'raw' in global.String);
add('es6-string-fromcodepoint', 'fromCodePoint' in global.String);
add('es6-string-codepointat', 'codePointAt' in global.String.prototype);
add('es6-string-normalize', 'normalize' in global.String.prototype);
add('es6-string-repeat', 'repeat' in global.String.prototype);
add('es6-string-startswith', 'startsWith' in global.String.prototype);
add('es6-string-endswith', 'endsWith' in global.String.prototype);
add('es6-string-includes', 'includes' in global.String.prototype);

/* Math */

add('es6-math-imul', () => {
	if ('imul' in global.Math) {
		/* Some versions of Safari on ios do not properly implement this */
		return (<any> Math).imul(0xffffffff, 5) === -5;
	}
	return false;
});

/* Promise */
add('es6-promise', typeof global.Promise !== 'undefined');

/* Set */
add('es6-set', () => {
	if (typeof global.Set === 'function') {
		/* IE11 and older versions of Safari are missing critical ES6 Set functionality */
		const set = new global.Set([1]);
		return set.has(1) && 'keys' in set && typeof set.keys === 'function';
	}
	return false;
});

/* Map */
add('es6-map', function () {
	if (typeof global.Map === 'function') {
		/* IE11 and older versions of Safari are missing critical ES6 Map functionality */
		const map = new global.Map([ [0, 1] ]);
		return map.has(0) && typeof map.keys === 'function' &&
			typeof map.values === 'function' && typeof map.entries === 'function';
	}
	return false;
});

/* WeakMap */
add('es6-weakmap', function () {
	if (typeof global.WeakMap !== 'undefined') {
		/* IE11 and older versions of Safari are missing critical ES6 Map functionality */
		const key1 = {};
		const key2 = {};
		const map = new global.WeakMap([ [ key1, 1 ] ]);
		return map.get(key1) === 1 && map.set(key2, 2) === map;
	}
	return false;
});

/* Symbol */
add('es6-symbol', typeof global.Symbol === 'function');

/* Miscellaneous features */

add('arraybuffer', typeof global.ArrayBuffer !== 'undefined');
add('float32array', 'Float32Array' in global);
add('setimmediate', typeof global.setImmediate !== 'undefined');
add('postmessage', typeof postMessage === 'function');
add('microtasks', () => has('es6-promise') || has('host-node') || has('dom-mutationobserver'));

/* DOM Features */

add('dom-mutationobserver', () => has('host-browser') && Boolean(global.MutationObserver || global.WebKitMutationObserver));
