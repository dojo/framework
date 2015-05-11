import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import * as number from 'src/number';

function testEdgeCases(op: (value: any) => boolean) {
	assert.isFalse(op({}));
	assert.isFalse(op(undefined));
	assert.isFalse(op(null));
	assert.isFalse(op(true));
	assert.isFalse(op(' '));
	assert.isFalse(op(''));
	assert.isFalse(op(Infinity));
	assert.isFalse(op(-Infinity));
}

registerSuite({
		name: 'number',

		'.isNaN()'() {
			assert.isTrue(number.isNaN(NaN));
			assert.isFalse(number.isNaN(42));
			assert.isFalse(number.isNaN('NaN'));
			testEdgeCases(number.isNaN);
		},

		'.isFinite()'() {
			assert.isTrue(number.isFinite(42));
			assert.isTrue(number.isFinite(number.MAX_SAFE_INTEGER));
			assert.isFalse(number.isFinite('42'));
			assert.isFalse(number.isFinite(Infinity));
			assert.isFalse(number.isFinite(-Infinity));
			assert.isFalse(number.isFinite(NaN));
		},

		'.isInteger()'() {
			assert.isTrue(number.isInteger(42));
			assert.isTrue(number.isInteger(-42));
			assert.isTrue(number.isInteger(0));
			assert.isTrue(number.isInteger(4.0));
			assert.isFalse(number.isInteger(4.2));
			assert.isFalse(number.isInteger('42'));
			assert.isFalse(number.isInteger(NaN));
			testEdgeCases(number.isInteger);
		},

		'.isSafeInteger()'() {
			assert.isTrue(number.isSafeInteger(42));
			assert.isTrue(number.isSafeInteger(number.MAX_SAFE_INTEGER));
			assert.isFalse(number.isSafeInteger(number.MAX_SAFE_INTEGER + 1));
			assert.isFalse(number.isSafeInteger(42.1));
			assert.isFalse(number.isSafeInteger('42'));
			assert.isFalse(number.isSafeInteger(Infinity));
			assert.isFalse(number.isSafeInteger(NaN));
			testEdgeCases(number.isSafeInteger);
		}
	}
);
