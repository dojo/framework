import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as sinon from 'sinon';
import has, {
	cache as hasCache,
	testFunctions as hasTestFunctions,
	add as hasAdd,
	exists as hasExists,
	normalize as hasNormalize,
	load as hasLoad
} from 'src/has';
import { Hash } from 'src/interfaces';

let alreadyCached: Hash<boolean>;
let alreadyTest: Hash<boolean>;
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
				assert.isUndefined(has('abc'), 'Feature should be undefined after being removed from cache');
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
				assert.isTrue(hasAdd('foo', true));
				assert.isTrue(hasAdd('bar', false));

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
					hasAdd('baz', null);
				}, TypeError);
			},

			'feature is already defined; returns false'() {
				assert.isTrue(hasAdd(feature, true));
				assert.isFalse(hasAdd(feature, false));
			},

			overwrite: {
				'value with value'() {
					assert.isTrue(hasAdd(feature, 'old'));
					assert.isTrue(hasAdd(feature, 'new', true));

					assert.strictEqual(has(feature), 'new');
				},

				'value with test method'() {
					assert.isTrue(hasAdd(feature, 'old'));
					assert.isTrue(hasAdd(feature, () => 'new', true));

					assert.strictEqual(has(feature), 'new');
				},

				'test method with value'() {
					assert.isTrue(hasAdd(feature, () => 'old'));
					assert.isTrue(hasAdd(feature, 'new', true));

					assert.strictEqual(has(feature), 'new');
				},

				'test method with test method'() {
					assert.isTrue(hasAdd(feature, () => 'old'));
					assert.isTrue(hasAdd(feature, () => 'new', true));

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
				hasAdd(feature, null);
				assert.isTrue(hasExists(feature));
			}
		},

		'has loader tests': {
			'both feature and no-feature modules provided'() {
				const expectedHasBrowser = has('host-browser') ? 'intern/main' : 'intern!object';
				const actualHasBrowser = hasNormalize('host-browser?intern:intern!object', (<DojoLoader.RootRequire> require).toAbsMid);
				assert.strictEqual(actualHasBrowser, expectedHasBrowser);

				const expectedHasNode = has('host-node') ? 'intern/main' : 'intern!object';
				const actualHasNode = hasNormalize('host-node?intern:intern!object', (<DojoLoader.RootRequire> require).toAbsMid);
				assert.strictEqual(actualHasNode, expectedHasNode);
			},

			'only feature module provided'() {
				const expectedHasBrowser = has('host-browser') ? 'intern/main' : undefined;
				const actualHasBrowser = hasNormalize('host-browser?intern', (<DojoLoader.RootRequire> require).toAbsMid);
				assert.strictEqual(actualHasBrowser, expectedHasBrowser);

				const expectedHasNode = has('host-node') ? 'intern/main' : undefined;
				const actualHasNode = hasNormalize('host-node?intern', (<DojoLoader.RootRequire> require).toAbsMid);
				assert.strictEqual(actualHasNode, expectedHasNode);
			},

			'only no-feature module provided'() {
				const expectedHasBrowser = has('host-browser') ? 'intern/main' : null;
				const actualHasBrowser = hasNormalize('host-node?:intern', (<DojoLoader.RootRequire> require).toAbsMid);
				assert.strictEqual(actualHasBrowser, expectedHasBrowser);

				const expectedHasNode = has('host-node') ? 'intern/main' : null;
				const actualHasNode = hasNormalize('host-browser?:intern', (<DojoLoader.RootRequire> require).toAbsMid);
				assert.strictEqual(actualHasNode, expectedHasNode);
			},

			'chained ternary test'() {
				const expected1 = 'two';
				const expected2 = 'one';
				const expected3 = 'three';

				hasAdd('abc', true);
				hasAdd('def', false);

				const actual1 = hasNormalize('abc?def?one:two:three', (<DojoLoader.RootRequire> require).toAbsMid);
				const actual2 = hasNormalize('abc?abc?one:two:three', (<DojoLoader.RootRequire> require).toAbsMid);
				const actual3 = hasNormalize('def?abc?one:two:three', (<DojoLoader.RootRequire> require).toAbsMid);

				assert.strictEqual(expected1, actual1);
				assert.strictEqual(expected2, actual2);
				assert.strictEqual(expected3, actual3);
			},

			'custom has test'() {
				const expectedHasFeatureModule = 'intern/main';
				const expectedHasNoFeatureModule = 'intern!object';

				hasAdd('abc', true);
				hasAdd('def', false);

				const actualHasFeatureModule = hasNormalize('abc?intern:intern!object', (<DojoLoader.RootRequire> require).toAbsMid);
				const actualHasNoFeatureModule = hasNormalize('def?intern:intern!object', (<DojoLoader.RootRequire> require).toAbsMid);

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
				const resourceId = 'src/has!host-browser?intern:intern!object';

				hasLoad(resourceId, <DojoLoader.RootRequire> <any> stubbedRequire, loadedStub);
				assert.isTrue(stubbedRequire.calledOnce, 'Require should be called once');
				assert.isTrue(loadedStub.calledOnce, 'Load stub should be called once');
				assert.isTrue(loadedStub.calledAfter(stubbedRequire), 'Load stub should be called after require');
				assert.strictEqual(stubbedRequire.firstCall.args[0][0], resourceId);
				assert.strictEqual(stubbedRequire.firstCall.args[1], loadedStub);
			},

			'load test resourceId not provided'() {
				const requireSpy = sinon.spy(require);
				const loadedStub = sinon.stub();

				hasLoad(null, require, loadedStub);
				assert.isTrue(loadedStub.calledOnce);
				assert.isFalse(requireSpy.calledOnce);
			}
		}
	}
);
