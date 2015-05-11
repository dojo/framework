import global from './global';
export let cache: { [feature: string]: any; } = Object.create(null);
let testFunctions: { [feature: string]: () => any } = Object.create(null);

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
	}
	else {
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
add('object-observe', typeof (<any> Object).observe === 'function');
add('postmessage', typeof postMessage === 'function');
add('promise', typeof global.Promise !== 'undefined');
add('raf', typeof requestAnimationFrame === 'function');
add('weakmap', typeof global.WeakMap !== 'undefined');
