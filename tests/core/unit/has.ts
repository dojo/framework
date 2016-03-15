import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as sinon from 'sinon';
import has, { add as hasAdd, cache as hasCache, normalize as hasNormalize, load as hasLoad } from 'src/has';

let alreadyCached: { [key: string]: boolean } = {};

registerSuite({
		name: 'has',

		// Run cache tests first to validate assumptions made for cleanup in other tests
		'has cache': {

			teardown() {
				delete hasCache['abc'];
				delete hasCache['def'];
				delete hasCache['deferred-cache'];
			},

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

		'adding feature detections': {
			setup() {
				Object.keys(hasCache).forEach(function (key) {
					alreadyCached[key] = true;
				});
			},

			afterEach() {
				Object.keys(hasCache).forEach(function (key) {
					if (!alreadyCached[key]) {
						delete hasCache[key];
					}
				});
			},

			'basic tests with immediate values'() {
				hasAdd('foo', true);
				hasAdd('bar', false);

				assert.isTrue(has('foo'));
				assert.isFalse(has('bar'));
			},

			'deferred feature test evaluation'() {
				let value = false;
				hasAdd('deferred', function () {
					return value;
				});

				value = true;
				assert.isTrue(has('deferred'),
					'Test function should not be run until the first time has is called for that feature');
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

			'overwrite'() {
				hasAdd('one', false);
				assert.isFalse(has('one'));
				hasAdd('one', true, true);
				assert.isTrue(has('one'));
			}
		},

		'has loader tests': {

			teardown() {
				delete hasCache['abc'];
				delete hasCache['def'];
			},

			'both feature and no-feature modules provided'() {
				const expectedHasBrowser = has('host-browser') ? 'intern/main' : 'intern!object';
				const actualHasBrowser = hasNormalize('host-browser?intern:intern!object', (<DojoLoader.Require> require).toAbsMid);
				assert.strictEqual(actualHasBrowser, expectedHasBrowser);

				const expectedHasNode = has('host-node') ? 'intern/main' : 'intern!object';
				const actualHasNode = hasNormalize('host-node?intern:intern!object', (<DojoLoader.Require> require).toAbsMid);
				assert.strictEqual(actualHasNode, expectedHasNode);
			},

			'only feature module provided'() {
				const expectedHasBrowser = has('host-browser') ? 'intern/main' : undefined;
				const actualHasBrowser = hasNormalize('host-browser?intern', (<DojoLoader.Require> require).toAbsMid);
				assert.strictEqual(actualHasBrowser, expectedHasBrowser);

				const expectedHasNode = has('host-node') ? 'intern/main' : undefined;
				const actualHasNode = hasNormalize('host-node?intern', (<DojoLoader.Require> require).toAbsMid);
				assert.strictEqual(actualHasNode, expectedHasNode);
			},

			'only no-feature module provided'() {
				const expectedHasBrowser = has('host-browser') ? 'intern/main' : null;
				const actualHasBrowser = hasNormalize('host-node?:intern', (<DojoLoader.Require> require).toAbsMid);
				assert.strictEqual(actualHasBrowser, expectedHasBrowser);

				const expectedHasNode = has('host-node') ? 'intern/main' : null;
				const actualHasNode = hasNormalize('host-browser?:intern', (<DojoLoader.Require> require).toAbsMid);
				assert.strictEqual(actualHasNode, expectedHasNode);
			},

			'chained ternary test'() {
				const expected1 = 'two';
				const expected2 = 'one';
				const expected3 = 'three';

				hasAdd('abc', true);
				hasAdd('def', false);

				const actual1 = hasNormalize('abc?def?one:two:three', (<DojoLoader.Require> require).toAbsMid);
				const actual2 = hasNormalize('abc?abc?one:two:three', (<DojoLoader.Require> require).toAbsMid);
				const actual3 = hasNormalize('def?abc?one:two:three', (<DojoLoader.Require> require).toAbsMid);

				assert.strictEqual(expected1, actual1);
				assert.strictEqual(expected2, actual2);
				assert.strictEqual(expected3, actual3);
			},

			'custom has test'() {
				const expectedHasFeatureModule = 'intern/main';
				const expectedHasNoFeatureModule = 'intern!object';

				hasAdd('abc', true);
				hasAdd('def', false);

				const actualHasFeatureModule = hasNormalize('abc?intern:intern!object', (<DojoLoader.Require> require).toAbsMid);
				const actualHasNoFeatureModule = hasNormalize('def?intern:intern!object', (<DojoLoader.Require> require).toAbsMid);

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

				hasLoad(resourceId, <DojoLoader.Require> <any> stubbedRequire, loadedStub);
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
