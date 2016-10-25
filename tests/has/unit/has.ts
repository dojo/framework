import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as sinon from 'sinon';
import has, {
	testCache as hasCache,
	testFunctions as hasTestFunctions,
	add as hasAdd,
	exists as hasExists,
	normalize as hasNormalize,
	load as hasLoad
} from '../../src/has';

const globalScope: any = (function (): any {
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

let alreadyCached: { [ feature: string ]: boolean };
let alreadyTest: { [ feature: string ]: boolean };
const feature = 'feature';  // default feature name for lazy devs

registerSuite({
	name: 'has',

	setup() {
		alreadyCached = {};
		Object.keys(hasCache).forEach(function (key) {
			alreadyCached[key] = true;
		});

		alreadyTest = {};
		Object.keys(hasTestFunctions).forEach(function (key) {
			alreadyTest[key] = true;
		});
	},

	afterEach() {
		for (let key of Object.keys(hasCache)) {
			if (!alreadyCached[key]) {
				delete hasCache[key];
			}
		}
		for (let key of Object.keys(hasTestFunctions)) {
			if (!alreadyTest[key]) {
				delete hasTestFunctions[key];
			}
		}
	},

	'has.cache': {
		'basic true/false tests'() {
			hasAdd('abc', true);
			assert.isTrue(hasCache['abc']);
			hasAdd('def', false);
			assert.isFalse(hasCache['def']);

			delete hasCache['abc'];
			assert.throws(() => {
				has('abc');
			}, TypeError, 'Attempt to detect unregistered has feature');
		},

		'deferred feature test should not populate cache until evaluated'() {
			hasAdd('deferred-cache', function () {
				return true;
			});
			assert.notProperty(hasCache, 'deferred-cache');
			has('deferred-cache');
			assert.property(hasCache, 'deferred-cache');
		}
	},

	'has.add()': {
		'basic tests with immediate values'() {
			hasAdd('foo', true);
			hasAdd('bar', false);

			assert.isTrue(has('foo'));
			assert.isFalse(has('bar'));
		},

		'deferred feature test evaluation'() {
			const testMethod = sinon.stub().returns(true);
			const feature = 'deferred-cache';
			hasAdd(feature, testMethod);

			assert.isTrue(hasExists(feature));
			assert.isFalse(testMethod.called);

			assert.isTrue(has(feature));
			assert.isTrue(testMethod.called);

			// ensure we only call the testMethod once
			has(feature);
			assert.isTrue(testMethod.calledOnce);
		},

		'tests should not coerce'() {
			let answer = 42;

			hasAdd('answer', answer);
			assert.strictEqual(has('answer'), answer,
				'has feature should report original uncoerced value');

			hasAdd('answer-function', function () {
				return answer;
			});
			assert.strictEqual(has('answer-function'), answer,
				'deferred has feature test should report uncoerced value');
		},

		'null test should not throw'() {
			assert.doesNotThrow(function () {
				hasAdd('baz', <any> null);
			}, TypeError);
		},

		'feature is already defined; throws'() {
			hasAdd(feature, true);
			assert.throws(() => {
				hasAdd(feature, false);
			}, TypeError, 'exists and overwrite not true');
		},

		overwrite: {
			'value with value'() {
				hasAdd(feature, 'old');
				hasAdd(feature, 'new', true);

				assert.strictEqual(has(feature), 'new');
			},

			'value with test method'() {
				hasAdd(feature, 'old');
				hasAdd(feature, () => 'new', true);

				assert.strictEqual(has(feature), 'new');
			},

			'test method with value'() {
				hasAdd(feature, () => 'old');
				hasAdd(feature, 'new', true);

				assert.strictEqual(has(feature), 'new');
			},

			'test method with test method'() {
				hasAdd(feature, () => 'old');
				hasAdd(feature, () => 'new', true);

				assert.strictEqual(has(feature), 'new');
			}
		}
	},

	'has.exists()': {
		'no test exists; returns false'() {
			assert.isFalse(hasExists(feature));
		},

		'test value exists; returns true'() {
			hasAdd(feature, true);
			assert.isTrue(hasExists(feature));
		},

		'test method exists; returns true'() {
			hasAdd(feature, () => true);
			assert.isTrue(hasExists(feature));
		},

		'null test value counts as being defined'() {
			hasAdd(feature, <any> null);
			assert.isTrue(hasExists(feature));
		}
	},

	'has loader tests': {
		'both feature and no-feature modules provided'() {
			hasAdd('abc', true);
			hasAdd('def', false);
			assert.strictEqual(hasNormalize('abc?intern:intern!object', (<any> require).toAbsMid), 'intern/main');
			assert.strictEqual(hasNormalize('def?intern:intern!object', (<any> require).toAbsMid), 'intern!object');
		},

		'only feature module provided'() {
			hasAdd('abc', true);
			hasAdd('def', false);
			assert.strictEqual(hasNormalize('abc?intern', (<any> require).toAbsMid), 'intern/main');
			assert.isUndefined(hasNormalize('def?intern', (<any> require).toAbsMid));
		},

		'only no-feature module provided'() {
			hasAdd('abc', true);
			hasAdd('def', false);
			assert.isNull(hasNormalize('abc?:intern', (<any> require).toAbsMid));
			assert.strictEqual(hasNormalize('def?:intern', (<any> require).toAbsMid), 'intern/main');
		},

		'chained ternary test'() {
			const expected1 = 'two';
			const expected2 = 'one';
			const expected3 = 'three';

			hasAdd('abc', true);
			hasAdd('def', false);

			const actual1 = hasNormalize('abc?def?one:two:three', (<any> require).toAbsMid);
			const actual2 = hasNormalize('abc?abc?one:two:three', (<any> require).toAbsMid);
			const actual3 = hasNormalize('def?abc?one:two:three', (<any> require).toAbsMid);

			assert.strictEqual(expected1, actual1);
			assert.strictEqual(expected2, actual2);
			assert.strictEqual(expected3, actual3);
		},

		'custom has test'() {
			const expectedHasFeatureModule = 'intern/main';
			const expectedHasNoFeatureModule = 'intern!object';

			hasAdd('abc', true);
			hasAdd('def', false);

			const actualHasFeatureModule = hasNormalize('abc?intern:intern!object', (<any> require).toAbsMid);
			const actualHasNoFeatureModule = hasNormalize('def?intern:intern!object', (<any> require).toAbsMid);

			assert.strictEqual(expectedHasFeatureModule, actualHasFeatureModule);
			assert.strictEqual(expectedHasNoFeatureModule, actualHasNoFeatureModule);
		},

		'normalize method is called once'() {
			const normalizeStub = sinon.stub();
			const resourceId = 'abc?intern:intern!object';

			hasAdd('abc', true);
			hasNormalize(resourceId, normalizeStub);

			assert.isTrue(normalizeStub.calledOnce);
			assert.strictEqual(normalizeStub.lastCall.args[0], 'intern');
		},

		'load test resourceId provided'() {
			const stubbedRequire = sinon.stub().callsArg(1);
			const loadedStub = sinon.stub();
			hasAdd('abc', true);
			const resourceId = 'src/has!abc?intern:intern!object';

			hasLoad(resourceId, <any> stubbedRequire, loadedStub);
			assert.isTrue(stubbedRequire.calledOnce, 'Require should be called once');
			assert.isTrue(loadedStub.calledOnce, 'Load stub should be called once');
			assert.isTrue(loadedStub.calledAfter(stubbedRequire), 'Load stub should be called after require');
			assert.strictEqual(stubbedRequire.firstCall.args[0][0], resourceId);
			assert.strictEqual(stubbedRequire.firstCall.args[1], loadedStub);
		},

		'load test resourceId not provided'() {
			const requireSpy = sinon.spy(require);
			const loadedStub = sinon.stub();

			hasLoad(<any> null, <any> require, loadedStub);
			assert.isTrue(loadedStub.calledOnce);
			assert.isFalse(requireSpy.calledOnce);
		}
	},

	'built in feature flags': {
		'host-browser'() {
			assert.isTrue(hasExists('host-browser'));
			assert.strictEqual(has('host-browser'), typeof document !== 'undefined' && typeof location !== 'undefined');
		},
		'host-node'() {
			assert.isTrue(hasExists('host-node'));
			assert.strictEqual(has('host-node'), (typeof process === 'object' && process.versions && process.versions.node) || undefined);
		}
	},

	'static has features': {
		'staticFeatures object'(this: any) {
			const dfd = this.async();
			(<any> require).undef('src/has');
			globalScope.DojoHasEnvironment = {
				staticFeatures: {
					'foo': 1,
					'bar': 'bar',
					'baz': false
				}
			};
			(<any> require)([ 'src/has' ], dfd.callback((mod: { default: typeof has }) => {
				const h = mod.default;
				assert(!('DojoHasEnvironment' in globalScope));
				assert.strictEqual(h('foo'), 1);
				assert.strictEqual(h('bar'), 'bar');
				assert.isFalse(h('baz'));
			}));
		},
		'staticFeatures function'(this: any) {
			const dfd = this.async();
			(<any> require).undef('src/has');
			globalScope.DojoHasEnvironment = {
				staticFeatures: function () {
					return {
						'foo': 1,
						'bar': 'bar',
						'baz': false
					};
				}
			};
			(<any> require)([ 'src/has' ], dfd.callback((mod: { default: typeof has }) => {
				const h = mod.default;
				assert(!('DojoHasEnvironment' in globalScope));
				assert.strictEqual(h('foo'), 1);
				assert.strictEqual(h('bar'), 'bar');
				assert.isFalse(h('baz'));
			}));
		}
	}
});
