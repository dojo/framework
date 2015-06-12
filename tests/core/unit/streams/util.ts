import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import * as util from 'src/streams/util';

const BOOLEAN_SIZE = 4;
const NUMBER_SIZE = 8;

registerSuite({
	name: 'util',

	getApproximateByteSize: {
		boolean() {
			assert.strictEqual(util.getApproximateByteSize(true), BOOLEAN_SIZE);
			assert.strictEqual(util.getApproximateByteSize(false), BOOLEAN_SIZE);
		},

		number() {
			assert.strictEqual(util.getApproximateByteSize(0), NUMBER_SIZE);
			assert.strictEqual(util.getApproximateByteSize(Infinity), NUMBER_SIZE);
			assert.strictEqual(util.getApproximateByteSize(Math.pow(2, 16)), NUMBER_SIZE);
			assert.strictEqual(util.getApproximateByteSize(-Math.pow(2, 16)), NUMBER_SIZE);
		},

		string() {
			assert.strictEqual(util.getApproximateByteSize('a'), 2);
			assert.strictEqual(util.getApproximateByteSize('abc'), 6);
			assert.strictEqual(util.getApproximateByteSize(''), 0);
		},

		array() {
			let array = [
				true,
				1024,
				'abc',
				[
					false,
					8,
					'xyz'
				],
				{
					0: true,
					abc: 'xyz',
					xyz: 16
				}
			];

			assert.strictEqual(util.getApproximateByteSize(array), 58);
		},

		object() {
			let obj = {
				0: true,
				abc: 'xyz',
				xyz: 16,
				_d: [
					true,
					8,
					'abc'
				]
			};
			assert.strictEqual(util.getApproximateByteSize(obj), 50);
		}
	},

	invokeOrNoop() {
		const testParameters = [ 'a', 1 ];
		let passedParameters: Array<any>;
		let callCount = 0;
		let obj = {
			testMethod: function () {
				passedParameters = Array.prototype.slice.call(arguments);
				callCount += 1;
			}
		};

		util.invokeOrNoop(obj, 'testMethod');
		assert.strictEqual(callCount, 1, 'obj.testMethod should be called');
		assert.strictEqual(passedParameters.length, 0, 'obj.testMethod should be called with no parameters');

		util.invokeOrNoop(obj, 'testMethod', testParameters);
		assert.strictEqual(callCount, 2, 'obj.testMethod should be called');
		assert.sameMembers(passedParameters, testParameters, 'obj.testMethod should be called with test parameters');
	},

	promiseInvokeOrFallbackOrNoop() {
		const testParameters = [ 'a', 1 ];
		let passedParameters: Array<any>;
		let callCount = 0;
		let otherParameters: Array<any>;
		let otherCallCount = 0;
		let obj = {
			testMethod: function () {
				passedParameters = Array.prototype.slice.call(arguments);
				callCount += 1;
			},
			otherMethod: function () {
				otherParameters = Array.prototype.slice.call(arguments);
				otherCallCount += 1;
			}
		};

		return util.promiseInvokeOrFallbackOrNoop(obj, 'testMethod', undefined, 'otherMethod').then(function () {
			assert.strictEqual(callCount, 1);
			assert.strictEqual(otherCallCount, 0);

			return util.promiseInvokeOrFallbackOrNoop(obj, 'NOMETHOD', undefined, 'otherMethod');
		}).then(function () {
			assert.strictEqual(callCount, 1);
			assert.strictEqual(otherCallCount, 1);

			return util.promiseInvokeOrFallbackOrNoop(obj, 'testMethod', testParameters, 'otherMethod');
		}).then(function () {
			assert.strictEqual(callCount, 2);
			assert.strictEqual(otherCallCount, 1);
			assert.sameMembers(passedParameters, testParameters, 'obj.testMethod should be called with test parameters');

			return util.promiseInvokeOrFallbackOrNoop(obj, 'NOMETHOD', undefined, 'otherMethod', testParameters);
		}).then(function () {
			assert.strictEqual(callCount, 2);
			assert.strictEqual(otherCallCount, 2);
			assert.sameMembers(otherParameters, testParameters, 'obj.otherMethod should be called with test parameters');
		});
	},

	promiseInvokeOrNoop() {
		const testParameters = [ 'a', 1 ];
		let passedParameters: Array<any>;
		let callCount = 0;
		let obj = {
			testMethod: function () {
				passedParameters = Array.prototype.slice.call(arguments);
				callCount += 1;
			}
		};

		return util.promiseInvokeOrNoop(obj, 'testMethod').then(function () {
			assert.strictEqual(callCount, 1);

			return util.promiseInvokeOrNoop(obj, 'testMethod', testParameters);
		}).then(function () {
			assert.sameMembers(passedParameters, testParameters, 'obj.testMethod should be called with test parameters');
		});
	}
});
