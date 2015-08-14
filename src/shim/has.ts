import global from './global';
import { Hash } from './interfaces';
export const cache: Hash<any> = Object.create(null);
const testFunctions: Hash<() => any> = Object.create(null);

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
