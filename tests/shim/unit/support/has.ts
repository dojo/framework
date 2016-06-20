import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as sinon from 'sinon';
import has, {
	testResultsCache as hasCache,
	testFunctions as hasTestFunctions,
	add as hasAdd,
	exists as hasExists
} from 'src/support/has';

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
		}
	}
);
