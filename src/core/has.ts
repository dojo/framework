import global from '../shim/global';

/**
 * The valid return types from a feature test
 */
export type FeatureTestResult = boolean | string | number | undefined | void;

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
	[feature: string]: FeatureTestResult;
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

/* Grab the staticFeatures if there are available */
const { staticFeatures }: DojoHasEnvironment = global.DojoHasEnvironment || {};

/* Cleaning up the DojoHasEnviornment */
if ('DojoHasEnvironment' in global) {
	delete global.DojoHasEnvironment;
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
		? staticFeatures.apply(global)
		: staticFeatures
	: {}; /* Providing an empty cache, if none was in the environment


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
		} else {
			// postfixed with a ? means it is a feature to branch on, the term is the name of the feature
			if (tokens[i++] === '?') {
				if (!skip && has(term)) {
					// matched the feature, get the first value from the options
					return get();
				} else {
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

	return Boolean(
		normalizedFeature in staticCache || normalizedFeature in testCache || testFunctions[normalizedFeature]
	);
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
	} else {
		testCache[normalizedFeature] = value;
		delete testFunctions[normalizedFeature];
	}
}

/**
 * Return the current value of a named feature.
 *
 * @param feature The name of the feature to test.
 */
export default function has(feature: string, strict: boolean = false): FeatureTestResult {
	let result: FeatureTestResult;

	const normalizedFeature = feature.toLowerCase();

	if (normalizedFeature in staticCache) {
		result = staticCache[normalizedFeature];
	} else if (testFunctions[normalizedFeature]) {
		result = testCache[normalizedFeature] = testFunctions[normalizedFeature].call(null);
		delete testFunctions[normalizedFeature];
	} else if (normalizedFeature in testCache) {
		result = testCache[normalizedFeature];
	} else if (strict) {
		throw new TypeError(`Attempt to detect unregistered has feature "${feature}"`);
	}

	return result;
}

/*
 * Out of the box feature tests
 */
add('public-path', undefined);

/* flag for dojo debug, default to false */
add('dojo-debug', false);

/* Detects if the environment is "browser like" */
add('host-browser', typeof document !== 'undefined' && typeof location !== 'undefined');

/* Detects if the environment is "jsdom" */
add(
	'host-jsdom',
	has('host-browser') && typeof navigator !== 'undefined' && navigator.userAgent.indexOf('jsdom') !== -1
);

/* Detects if the environment appears to be NodeJS */
add('host-node', function() {
	if (typeof process === 'object' && process.versions && process.versions.node) {
		return process.versions.node;
	}
});

add('fetch', 'fetch' in global && typeof global.fetch === 'function', true);

add(
	'es6-array',
	() => {
		return (
			['from', 'of'].every((key) => key in global.Array) &&
			['findIndex', 'find', 'copyWithin'].every((key) => key in global.Array.prototype)
		);
	},
	true
);

add(
	'es6-array-fill',
	() => {
		if ('fill' in global.Array.prototype) {
			/* Some versions of Safari do not properly implement this */
			return ([1] as any).fill(9, Number.POSITIVE_INFINITY)[0] === 1;
		}
		return false;
	},
	true
);

add('es7-array', () => 'includes' in global.Array.prototype, true);

add('es2019-array', () => 'flat' in global.Array.prototype, true);

/* Map */
add(
	'es6-map',
	() => {
		if (typeof global.Map === 'function') {
			/*
		IE11 and older versions of Safari are missing critical ES6 Map functionality
		We wrap this in a try/catch because sometimes the Map constructor exists, but does not
		take arguments (iOS 8.4)
		 */
			try {
				const map = new global.Map([[0, 1]]);

				return (
					map.has(0) &&
					typeof map.keys === 'function' &&
					has('es6-symbol') &&
					typeof map.values === 'function' &&
					typeof map.entries === 'function'
				);
			} catch (e) {
				/* istanbul ignore next: not testing on iOS at the moment */
				return false;
			}
		}
		return false;
	},
	true
);

add('es6-iterator', () => has('es6-map'));

/* Math */
add(
	'es6-math',
	() => {
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
	},
	true
);

add(
	'es6-math-imul',
	() => {
		if ('imul' in global.Math) {
			/* Some versions of Safari on ios do not properly implement this */
			return (Math as any).imul(0xffffffff, 5) === -5;
		}
		return false;
	},
	true
);

/* Object */
add(
	'es6-object',
	() => {
		return (
			has('es6-symbol') &&
			['assign', 'is', 'getOwnPropertySymbols', 'setPrototypeOf'].every(
				(name) => typeof global.Object[name] === 'function'
			)
		);
	},
	true
);

add(
	'es2017-object',
	() => {
		return ['values', 'entries', 'getOwnPropertyDescriptors'].every(
			(name) => typeof global.Object[name] === 'function'
		);
	},
	true
);

/* Observable */
add('es-observable', () => typeof global.Observable !== 'undefined', true);

/* Promise */
add('es6-promise', () => typeof global.Promise !== 'undefined' && has('es6-symbol'), true);

add(
	'es2018-promise-finally',
	() => has('es6-promise') && typeof global.Promise.prototype.finally !== 'undefined',
	true
);

/* Set */
add(
	'es6-set',
	() => {
		if (typeof global.Set === 'function') {
			/* IE11 and older versions of Safari are missing critical ES6 Set functionality */
			const set = new global.Set([1]);
			return set.has(1) && 'keys' in set && typeof set.keys === 'function' && has('es6-symbol');
		}
		return false;
	},
	true
);

/* String */
add(
	'es6-string',
	() => {
		return (
			[
				/* static methods */
				'fromCodePoint'
			].every((key) => typeof global.String[key] === 'function') &&
			[
				/* instance methods */
				'codePointAt',
				'normalize',
				'repeat',
				'startsWith',
				'endsWith',
				'includes'
			].every((key) => typeof global.String.prototype[key] === 'function')
		);
	},
	true
);

add(
	'es6-string-raw',
	() => {
		function getCallSite(callSite: TemplateStringsArray, ...substitutions: any[]) {
			const result = [...callSite];
			(result as any).raw = callSite.raw;
			return result;
		}

		if ('raw' in global.String) {
			let b = 1;
			let callSite = getCallSite`a\n${b}`;

			(callSite as any).raw = ['a\\n'];
			const supportsTrunc = global.String.raw(callSite, 42) === 'a\\n';

			return supportsTrunc;
		}

		return false;
	},
	true
);

add(
	'es2017-string',
	() => {
		return ['padStart', 'padEnd'].every((key) => typeof global.String.prototype[key] === 'function');
	},
	true
);

/* Symbol */
add('es6-symbol', () => typeof global.Symbol !== 'undefined' && typeof Symbol() === 'symbol', true);

/* WeakMap */
add(
	'es6-weakmap',
	() => {
		if (typeof global.WeakMap !== 'undefined') {
			/* IE11 and older versions of Safari are missing critical ES6 Map functionality */
			const key1 = {};
			const key2 = {};
			const map = new global.WeakMap([[key1, 1]]);
			Object.freeze(key1);
			return map.get(key1) === 1 && map.set(key2, 2) === map && has('es6-symbol');
		}
		return false;
	},
	true
);

/* Miscellaneous features */
add('microtasks', () => has('es6-promise') || has('host-node') || has('dom-mutationobserver'), true);
add(
	'postmessage',
	() => {
		// If window is undefined, and we have postMessage, it probably means we're in a web worker. Web workers have
		// post message but it doesn't work how we expect it to, so it's best just to pretend it doesn't exist.
		return typeof global.window !== 'undefined' && typeof global.postMessage === 'function';
	},
	true
);
add('raf', () => typeof global.requestAnimationFrame === 'function', true);
add('setimmediate', () => typeof global.setImmediate !== 'undefined', true);

/* DOM Features */

add(
	'dom-mutationobserver',
	() => {
		if (has('host-browser') && Boolean(global.MutationObserver || global.WebKitMutationObserver)) {
			// IE11 has an unreliable MutationObserver implementation where setProperty() does not
			// generate a mutation event, observers can crash, and the queue does not drain
			// reliably. The following feature test was adapted from
			// https://gist.github.com/t10ko/4aceb8c71681fdb275e33efe5e576b14
			const example = document.createElement('div');
			/* tslint:disable-next-line:variable-name */
			const HostMutationObserver = global.MutationObserver || global.WebKitMutationObserver;
			const observer = new HostMutationObserver(function() {});
			observer.observe(example, { attributes: true });

			example.style.setProperty('display', 'block');

			return Boolean(observer.takeRecords().length);
		}
		return false;
	},
	true
);

add(
	'dom-webanimation',
	() => has('host-browser') && global.Animation !== undefined && global.KeyframeEffect !== undefined,
	true
);

add('abort-controller', () => typeof global.AbortController !== 'undefined');

add('abort-signal', () => typeof global.AbortSignal !== 'undefined');

add('dom-intersection-observer', () => has('host-browser') && global.IntersectionObserver !== undefined, true);

add('dom-resize-observer', () => has('host-browser') && global.ResizeObserver !== undefined, true);

add('dom-pointer-events', () => has('host-browser') && global.onpointerdown !== undefined, true);

add(
	'dom-css-variables',
	() =>
		has('host-browser') &&
		!has('host-jsdom') &&
		global.window.CSS &&
		global.window.CSS.supports &&
		global.window.CSS.supports('(--a: 0)'),
	true
);

add('dom-inert', () => has('host-browser') && Element.prototype.hasOwnProperty('inert'), true);

add(
	'dom-passive-event',
	() => {
		let supportsPassive = false;
		if ('host-browser') {
			try {
				const opts = Object.defineProperty({}, 'passive', {
					get() {
						supportsPassive = true;
					}
				});
				const f = () => {};
				window.addEventListener('testPassive', f, opts);
				window.removeEventListener('testPassive', f, opts);
			} catch (e) {}
		}
		return supportsPassive;
	},
	true
);

add('build-elide', false);

add('test', false);

add('global-this', () => typeof global.globalThis !== 'undefined');
