import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as numberUtil from 'src/number';

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

		'constants'() {
			assert.isNumber(numberUtil.EPSILON);
			assert.isNumber(numberUtil.MAX_SAFE_INTEGER);
			assert.isNumber(numberUtil.MIN_SAFE_INTEGER);
		},

		'.isNaN()'() {
			assert.isTrue(numberUtil.isNaN(NaN));
			assert.isFalse(numberUtil.isNaN(42));
			assert.isFalse(numberUtil.isNaN('NaN'));
			testEdgeCases(numberUtil.isNaN);
		},

		'.isFinite()'() {
			assert.isTrue(numberUtil.isFinite(42));
			assert.isTrue(numberUtil.isFinite(numberUtil.MAX_SAFE_INTEGER));
			assert.isFalse(numberUtil.isFinite('42'));
			assert.isFalse(numberUtil.isFinite(Infinity));
			assert.isFalse(numberUtil.isFinite(-Infinity));
			assert.isFalse(numberUtil.isFinite(NaN));
		},

		'.isInteger()'() {
			assert.isTrue(numberUtil.isInteger(42));
			assert.isTrue(numberUtil.isInteger(-42));
			assert.isTrue(numberUtil.isInteger(0));
			assert.isTrue(numberUtil.isInteger(4.0));
			assert.isFalse(numberUtil.isInteger(4.2));
			assert.isFalse(numberUtil.isInteger('42'));
			assert.isFalse(numberUtil.isInteger(NaN));
			testEdgeCases(numberUtil.isInteger);
		},

		'.isSafeInteger()'() {
			assert.isTrue(numberUtil.isSafeInteger(42));
			assert.isTrue(numberUtil.isSafeInteger(numberUtil.MAX_SAFE_INTEGER));
			assert.isFalse(numberUtil.isSafeInteger(numberUtil.MAX_SAFE_INTEGER + 1));
			assert.isFalse(numberUtil.isSafeInteger(42.1));
			assert.isFalse(numberUtil.isSafeInteger('42'));
			assert.isFalse(numberUtil.isSafeInteger(Infinity));
			assert.isFalse(numberUtil.isSafeInteger(NaN));
			testEdgeCases(numberUtil.isSafeInteger);
		}
	}
);
