declare var process: any;
export var cache: { [feature: string]: any; } = Object.create(null);
var testFunctions: { [feature: string]: () => any } = Object.create(null);

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
 */
export function add(feature: string, value: any, overwrite: boolean = false): void {
	if ((feature in cache || feature in testFunctions) && !overwrite) {
		return;
	}

	if (typeof value === 'function') {
		testFunctions[feature] = value;
	} else {
		cache[feature] = value;
	}
}

/**
 * Return the current value of a named feature.
 *
 * @param feature The name (if a string) or identifier (if an integer) of the feature to test.
 * @return The value of a given feature test
 */
export default function has(feature: string): any {
	var result: any;

	if (feature in testFunctions && typeof testFunctions[feature] === 'function') {
		result = cache[feature] = testFunctions[feature].call(null);
		testFunctions[feature] = null;
	} else {
		result = cache[feature];
	}

	return result;
}

/*
 * OOTB feature tests
 */
add('host-browser', typeof document !== 'undefined' && typeof location !== 'undefined');
add('host-node', typeof process === 'object' && process.versions && process.versions.node);
