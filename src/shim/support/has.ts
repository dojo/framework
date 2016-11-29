import global from './global';
import has from 'dojo-has/has';
import { add } from 'dojo-has/has';

export default has;
export * from 'dojo-has/has';

/* ECMAScript 6 and 7 Features */

/*
 * Determine whether or not native Symbol exists. If it doesn't, we don't want to use
 * a few other native implementations like Map, WeakMap, Set.  Consider a polyfill that provides Symbol,
 * Map, etc in the global namespace. If the polyfill's Symbol is not compatible with our Symbol, neither
 * will be anything that uses their iterator symbol, like Map, Set, etc.
 */

/* Symbol */
add('es6-symbol', typeof global.Symbol !== 'undefined' && typeof Symbol() === 'symbol');

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
add('es6-string-raw', function () {
	function getCallSite(callSite: TemplateStringsArray, ...substitutions: any[]) {
		return callSite;
	}

	if ('raw' in global.String) {
		let b = 1;
		let callSite = getCallSite`a\n${b}`;

		(<any> callSite).raw = [ 'a\\n' ];
		const supportsTrunc = global.String.raw(callSite, 42) === 'a:\\n';

		return supportsTrunc;
	}

	return false;
});
add('es6-string-fromcodepoint', 'fromCodePoint' in global.String);
add('es6-string-codepointat', 'codePointAt' in global.String.prototype);
add('es6-string-normalize', 'normalize' in global.String.prototype);
add('es6-string-repeat', 'repeat' in global.String.prototype);
add('es6-string-startswith', 'startsWith' in global.String.prototype);
add('es6-string-endswith', 'endsWith' in global.String.prototype);
add('es6-string-includes', 'includes' in global.String.prototype);
add('es6-string-padstart', 'padStart' in global.String.prototype);
add('es6-string-padend', 'padEnd' in global.String.prototype);

/* Math */

add('es6-math-acosh', typeof global.Math.acosh === 'function');
add('es6-math-clz32', typeof global.Math.clz32 === 'function');
add('es6-math-imul', () => {
	if ('imul' in global.Math) {
		/* Some versions of Safari on ios do not properly implement this */
		return (<any> Math).imul(0xffffffff, 5) === -5;
	}
	return false;
});

/* Promise */
add('es6-promise', typeof global.Promise !== 'undefined' && has('es6-symbol'));

/* Set */
add('es6-set', () => {
	if (typeof global.Set === 'function') {
		/* IE11 and older versions of Safari are missing critical ES6 Set functionality */
		const set = new global.Set([1]);
		return set.has(1) && 'keys' in set && typeof set.keys === 'function' && has('es6-symbol');
	}
	return false;
});

/* Map */
add('es6-map', function () {
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
});

/* WeakMap */
add('es6-weakmap', function () {
	if (typeof global.WeakMap !== 'undefined') {
		/* IE11 and older versions of Safari are missing critical ES6 Map functionality */
		const key1 = {};
		const key2 = {};
		const map = new global.WeakMap([ [ key1, 1 ] ]);
		Object.freeze(key1);
		return map.get(key1) === 1 && map.set(key2, 2) === map && has('es6-symbol');
	}
	return false;
});

/* Miscellaneous features */

add('float32array', 'Float32Array' in global);
add('setimmediate', typeof global.setImmediate !== 'undefined');
add('postmessage', typeof postMessage === 'function');
add('microtasks', () => has('es6-promise') || has('host-node') || has('dom-mutationobserver'));

/* DOM Features */

add('dom-mutationobserver', () => has('host-browser') && Boolean(global.MutationObserver || global.WebKitMutationObserver));
