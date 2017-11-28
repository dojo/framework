import has, { add } from '@dojo/has/has';
import global from '../global';

export default has;
export * from '@dojo/has/has';

/* ECMAScript 6 and 7 Features */

/* Array */
add('es6-array', () => {
	return [
		'from',
		'of'
	].every((key) => key in global.Array) && [
		'findIndex',
		'find',
		'copyWithin'
	].every((key) => key in global.Array.prototype);
}, true);

add('es6-array-fill', () => {
	if ('fill' in global.Array.prototype) {
		/* Some versions of Safari do not properly implement this */
		return (<any> [ 1 ]).fill(9, Number.POSITIVE_INFINITY)[0] === 1;
	}
	return false;
}, true);

add('es7-array', () => 'includes' in global.Array.prototype, true);

/* Map */
add('es6-map', () => {
	if (typeof global.Map === 'function') {
		/*
		IE11 and older versions of Safari are missing critical ES6 Map functionality
		We wrap this in a try/catch because sometimes the Map constructor exists, but does not
		take arguments (iOS 8.4)
		 */
		try {
			const map = new global.Map([ [0, 1] ]);

			return map.has(0) &&
				typeof map.keys === 'function' && has('es6-symbol') &&
				typeof map.values === 'function' &&
				typeof map.entries === 'function';
		}
		catch (e) {
			/* istanbul ignore next: not testing on iOS at the moment */
			return false;
		}
	}
	return false;
}, true);

/* Math */
add('es6-math', () => {
	return [
		'clz32',
		'sign',
		'log10',
		'log2',
		'log1p',
		'expm1',
		'cosh',
		'sinh',
		'tanh',
		'acosh',
		'asinh',
		'atanh',
		'trunc',
		'fround',
		'cbrt',
		'hypot'
	].every((name) => typeof global.Math[name] === 'function');
}, true);

add('es6-math-imul', () => {
	if ('imul' in global.Math) {
		/* Some versions of Safari on ios do not properly implement this */
		return (<any> Math).imul(0xffffffff, 5) === -5;
	}
	return false;
}, true);

/* Object */
add('es6-object', () => {
	return has('es6-symbol') && [
		'assign',
		'is',
		'getOwnPropertySymbols',
		'setPrototypeOf'
	].every((name) => typeof global.Object[name] === 'function');
}, true);

add('es2017-object', () => {
	return [
		'values',
		'entries',
		'getOwnPropertyDescriptors'
	].every((name) => typeof global.Object[name] === 'function');
}, true);

/* Observable */
add('es-observable', () => typeof global.Observable !== 'undefined', true);

/* Promise */
add('es6-promise', () => typeof global.Promise !== 'undefined' && has('es6-symbol'), true);

/* Set */
add('es6-set', () => {
	if (typeof global.Set === 'function') {
		/* IE11 and older versions of Safari are missing critical ES6 Set functionality */
		const set = new global.Set([1]);
		return set.has(1) && 'keys' in set && typeof set.keys === 'function' && has('es6-symbol');
	}
	return false;
}, true);

/* String */
add('es6-string', () => {
	return [ /* static methods */
		'fromCodePoint'
	].every((key) => typeof global.String[key] === 'function') && [ /* instance methods */
		'codePointAt',
		'normalize',
		'repeat',
		'startsWith',
		'endsWith',
		'includes'
	].every((key) => typeof global.String.prototype[key] === 'function');
}, true);

add('es6-string-raw', () => {
	function getCallSite(callSite: TemplateStringsArray, ...substitutions: any[]) {
		const result = [ ...callSite ];
		(result as any).raw = callSite.raw;
		return result;
	}

	if ('raw' in global.String) {
		let b = 1;
		let callSite = getCallSite`a\n${b}`;

		(callSite as any).raw = [ 'a\\n' ];
		const supportsTrunc = global.String.raw(callSite, 42) === 'a:\\n';

		return supportsTrunc;
	}

	return false;
}, true);

add('es2017-string', () => {
	return [
		'padStart',
		'padEnd'
	].every((key) => typeof global.String.prototype[key] === 'function');
}, true);

/* Symbol */
add('es6-symbol', () => typeof global.Symbol !== 'undefined' && typeof Symbol() === 'symbol', true);

/* WeakMap */
add('es6-weakmap', () => {
	if (typeof global.WeakMap !== 'undefined') {
		/* IE11 and older versions of Safari are missing critical ES6 Map functionality */
		const key1 = {};
		const key2 = {};
		const map = new global.WeakMap([ [ key1, 1 ] ]);
		Object.freeze(key1);
		return map.get(key1) === 1 && map.set(key2, 2) === map && has('es6-symbol');
	}
	return false;
}, true);

/* Miscellaneous features */
add('microtasks', () => has('es6-promise') || has('host-node') || has('dom-mutationobserver'), true);
add('postmessage', () => {
	 // If window is undefined, and we have postMessage, it probably means we're in a web worker. Web workers have
	 // post message but it doesn't work how we expect it to, so it's best just to pretend it doesn't exist.
	return typeof global.window !== 'undefined' && typeof global.postMessage === 'function';
}, true);
add('raf', () => typeof global.requestAnimationFrame === 'function', true);
add('setimmediate', () => typeof global.setImmediate !== 'undefined', true);

/* DOM Features */

add('dom-mutationobserver', () => {
	if (has('host-browser') && Boolean(global.MutationObserver || global.WebKitMutationObserver)) {
		// IE11 has an unreliable MutationObserver implementation where setProperty() does not
		// generate a mutation event, observers can crash, and the queue does not drain
		// reliably. The following feature test was adapted from
		// https://gist.github.com/t10ko/4aceb8c71681fdb275e33efe5e576b14
		const example = document.createElement('div');
		/* tslint:disable-next-line:variable-name */
		const HostMutationObserver = global.MutationObserver || global.WebKitMutationObserver;
		const observer = new HostMutationObserver(function () {});
		observer.observe(example, { attributes: true });

		example.style.setProperty('display', 'block');

		return Boolean(observer.takeRecords().length);
	}
	return false;
}, true);
