const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

import * as sinon from 'sinon';
import global from '../../../src/shim/global';
import has, {
	testCache as hasCache,
	testFunctions as hasTestFunctions,
	add as hasAdd,
	exists as hasExists,
	normalize as hasNormalize
} from '../../../src/core/has';

let alreadyCached: { [feature: string]: boolean };
let alreadyTest: { [feature: string]: boolean };
const feature = 'feature'; // default feature name for lazy devs

const normalize: (id: string) => string = (require as any).toAbsMid || ((id: string) => id);
const undef: (id: string) => void = has('host-node')
	? (id: string) => {
			const path = require('path');
			delete require.cache[path.resolve(__dirname, id) + '.js'];
	  }
	: (id: string) => {
			(require as any).undef((require as any).toAbsMid(id));
	  };

registerSuite('has', {
	before() {
		alreadyCached = {};
		Object.keys(hasCache).forEach(function(key) {
			alreadyCached[key] = true;
		});

		alreadyTest = {};
		Object.keys(hasTestFunctions).forEach(function(key) {
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

	tests: {
		'has.cache': {
			'basic true/false tests'() {
				hasAdd('abc', true);
				assert.isTrue(hasCache['abc']);
				hasAdd('def', false);
				assert.isFalse(hasCache['def']);
				delete hasCache['abc'];
			},

			'throws when unregistered in strict mode'() {
				assert.throws(
					() => {
						has('abc', true);
					},
					TypeError,
					'Attempt to detect unregistered has feature'
				);
			},

			'returns undefined when unregistered'() {
				const abc = has('abc');
				assert.equal(abc, undefined);
			},

			'deferred feature test should not populate cache until evaluated'() {
				hasAdd('deferred-cache', function() {
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
				assert.strictEqual(has('answer'), answer, 'has feature should report original uncoerced value');

				hasAdd('answer-function', function() {
					return answer;
				});
				assert.strictEqual(
					has('answer-function'),
					answer,
					'deferred has feature test should report uncoerced value'
				);
			},

			'null test should not throw'() {
				assert.doesNotThrow(function() {
					hasAdd('baz', null as any);
				}, TypeError);
			},

			'case should not matter'() {
				hasAdd('APPLES', true);
				assert.isTrue(has('apples'));
			},

			'feature is already defined; throws'() {
				hasAdd(feature, true);
				assert.throws(
					() => {
						hasAdd(feature, false);
					},
					TypeError,
					'exists and overwrite not true'
				);
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
				hasAdd(feature, null as any);
				assert.isTrue(hasExists(feature));
			},

			'case should not matter'() {
				hasAdd('apples', true);
				assert.isTrue(hasExists('APPLES'));
			}
		},

		'has loader tests': {
			'both feature and no-feature modules provided'() {
				hasAdd('abc', true);
				hasAdd('def', false);
				assert.strictEqual(hasNormalize('abc?intern:intern!object', normalize), 'intern');
				assert.strictEqual(hasNormalize('def?intern:intern!object', normalize), 'intern!object');
			},

			'only feature module provided'() {
				hasAdd('abc', true);
				hasAdd('def', false);
				assert.strictEqual(hasNormalize('abc?intern', normalize), 'intern');
				assert.isUndefined(hasNormalize('def?intern', normalize));
			},

			'only no-feature module provided'() {
				hasAdd('abc', true);
				hasAdd('def', false);
				assert.isNull(hasNormalize('abc?:intern', normalize));
				assert.strictEqual(hasNormalize('def?:intern', normalize), 'intern');
			},

			'chained ternary test'() {
				const expected1 = 'two';
				const expected2 = 'one';
				const expected3 = 'three';

				hasAdd('abc', true);
				hasAdd('def', false);

				const actual1 = hasNormalize('abc?def?one:two:three', normalize);
				const actual2 = hasNormalize('abc?abc?one:two:three', normalize);
				const actual3 = hasNormalize('def?abc?one:two:three', normalize);

				assert.strictEqual(expected1, actual1);
				assert.strictEqual(expected2, actual2);
				assert.strictEqual(expected3, actual3);
			},

			'custom has test'() {
				const expectedHasFeatureModule = 'intern';
				const expectedHasNoFeatureModule = 'intern!object';

				hasAdd('abc', true);
				hasAdd('def', false);

				const actualHasFeatureModule = hasNormalize('abc?intern:intern!object', normalize);
				const actualHasNoFeatureModule = hasNormalize('def?intern:intern!object', normalize);

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
			}
		},

		'built in feature flags': {
			'host-browser'() {
				assert.isTrue(hasExists('host-browser'));
				assert.strictEqual(
					has('host-browser'),
					typeof document !== 'undefined' && typeof location !== 'undefined'
				);
			},
			'host-node'() {
				assert.isTrue(hasExists('host-node'));
				assert.strictEqual(
					has('host-node'),
					(typeof process === 'object' && process.versions && process.versions.node) || undefined
				);
			}
		},

		'static has features': {
			'staticFeatures object'() {
				const dfd = this.async();
				undef('../../../src/core/has');
				global.DojoHasEnvironment = {
					staticFeatures: {
						foo: 1,
						bar: 'bar',
						baz: false
					}
				};
				// tslint:disable-next-line
				import('../../../src/core/has').then(
					dfd.callback((mod: { default: typeof has }) => {
						const h = mod.default;
						assert(!('DojoHasEnvironment' in global));
						assert.strictEqual(h('foo'), 1);
						assert.strictEqual(h('bar'), 'bar');
						assert.isFalse(h('baz'));
					})
				);
			},
			'staticFeatures function'() {
				const dfd = this.async();
				undef('../../../src/core/has');
				global.DojoHasEnvironment = {
					staticFeatures: function() {
						return {
							foo: 1,
							bar: 'bar',
							baz: false
						};
					}
				};
				// tslint:disable-next-line
				import('../../../src/core/has').then(
					dfd.callback((mod: { default: typeof has }) => {
						const h = mod.default;
						assert(!('DojoHasEnvironment' in global));
						assert.strictEqual(h('foo'), 1);
						assert.strictEqual(h('bar'), 'bar');
						assert.isFalse(h('baz'));
					})
				);
			},
			'can override run-time defined features'() {
				const dfd = this.async();
				undef('../../../src/core/has');
				global.DojoHasEnvironment = {
					staticFeatures: {
						debug: false
					}
				};
				// tslint:disable-next-line
				import('../../../src/core/has').then(
					dfd.callback((mod: { default: typeof has; add: typeof hasAdd }) => {
						const h = mod.default;
						const hAdd = mod.add;
						assert.isFalse(h('debug'), 'Static features override "add()"');
						hAdd('debug', true, true);
						assert.isFalse(h('debug'), 'Static features cannot be overwritten');
					})
				);
			}
		},

		'features defined'() {
			[
				'dom-mutationobserver',
				'es-observable',
				'es2017-object',
				'es2017-string',
				'es2018-promise-finally',
				'es6-array',
				'es6-array-fill',
				'es6-map',
				'es6-math',
				'es6-math-imul',
				'es6-object',
				'es6-promise',
				'es6-set',
				'es6-string',
				'es6-string-raw',
				'es6-symbol',
				'es6-weakmap',
				'es7-array',
				'microtasks',
				'postmessage',
				'raf',
				'setimmediate',
				'abort-controller',
				'abort-signal',
				'dom-inert'
			].forEach((feature) => assert.isTrue(hasExists(feature)));
		}
	}
});
