import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as math from '../../src/math';

function assertIsNaN(...results: number[]) {
	for (let result of results) {
		assert.notStrictEqual(result, result, 'Expected ' + result + ' to be NaN');
	}
}

registerSuite({
		name: 'math',

		'.acosh()'() {
			assertIsNaN(math.acosh(NaN), math.acosh(0), math.acosh(0.9999999), math.acosh(-0.001));
			assert.strictEqual(math.acosh(Infinity), Infinity);
			assert.strictEqual(math.acosh(1), 0);
			assert.closeTo(math.acosh(2), 1.3169578969248166, 1e-13);
			assert.closeTo(math.acosh(3), 1.762747174039086, 1e-13);
		},

		'.asinh()'() {
			assertIsNaN(math.asinh(NaN));
			assert.strictEqual(math.asinh(Infinity), Infinity);
			assert.strictEqual(math.asinh(-Infinity), -Infinity);
			assert.strictEqual(math.asinh(0), 0);
			assert.closeTo(math.asinh(1), 0.8813735870195429, 1e-13);
			assert.closeTo(math.acosh(2), 1.3169578969248166, 1e-13);
		},

		'.atanh()'() {
			assertIsNaN(math.atanh(NaN), math.atanh(-1.00000001), math.atanh(1.00000001),
				math.atanh(-1e300), math.atanh(1e300));
			assert.strictEqual(math.atanh(0), 0);
			assert.strictEqual(math.atanh(1), Infinity);
			assert.strictEqual(math.atanh(-1), -Infinity);
			assert.closeTo(math.atanh(0.5), 0.5493061443340549, 1e-13);
		},

		'.cbrt()'() {
			assert.strictEqual(math.cbrt(0), 0);
			assert.strictEqual(math.cbrt(1), 1);
			assert.strictEqual(math.cbrt(8), 2);
			assert.strictEqual(math.cbrt(-1), -1);
			assert.strictEqual(math.cbrt(-8), -2);
			assert.strictEqual(math.cbrt(Infinity), Infinity);
			assert.strictEqual(math.cbrt(-Infinity), -Infinity);
		},

		'.clz32()'() {
			assert.strictEqual(math.clz32(1), 31);
			assert.strictEqual(math.clz32(0.1), 32);
			assert.strictEqual(math.clz32(-1), 0);
			assert.strictEqual(math.clz32(1000), 22);
			assert.strictEqual(math.clz32(2), 30);
		},

		'.cosh()'() {
			assertIsNaN(math.cosh(NaN));
			assert.strictEqual(math.cosh(0), 1);
			assert.strictEqual(math.cosh(-Infinity), Infinity);
			assert.strictEqual(math.cosh(Infinity), Infinity);
			assert.closeTo(math.cosh(-1), 1.5430806348152435, 1e-13);
			assert.closeTo(math.cosh(1), 1.5430806348152437, 1e-13);
		},

		'.expm1()'() {
			assertIsNaN(math.expm1(NaN));
			assert.strictEqual(math.expm1(0), 0);
			assert.strictEqual(math.expm1(Infinity), Infinity);
			assert.strictEqual(math.expm1(-Infinity), -1);
			assert.closeTo(math.expm1(-1), -0.6321205588285577, 1e-13);
			assert.closeTo(math.expm1(1), 1.718281828459045, 1e-13);
		},

		'.fround()'() {
			assert.strictEqual(math.fround(0), 0);
			assert.strictEqual(math.fround(Infinity), Infinity);
			assert.strictEqual(math.fround(-Infinity), -Infinity);
			assert.strictEqual(math.fround(1), 1);
			assert.strictEqual(math.fround(-1), -1);
			assert.closeTo(math.fround(1.337), 1.3370000123977661, 1e-13);
			assert.closeTo(math.fround(-1.337), -1.3370000123977661, 1e-13);

			assert.strictEqual(math.fround(Number.MAX_VALUE), Infinity);
			assert.strictEqual(math.fround(-Number.MAX_VALUE), -Infinity);
			assert.strictEqual(math.fround(Number.MIN_VALUE), 0);
			assert.strictEqual(math.fround(-Number.MIN_VALUE), 0);

			const MAX_FLOAT32 = 3.4028234663852886e+38;
			const MIN_FLOAT32 = 1.401298464324817e-45;
			assert.strictEqual(math.fround(MAX_FLOAT32), MAX_FLOAT32);
			assert.strictEqual(math.fround(-MAX_FLOAT32), -MAX_FLOAT32);
			assert.strictEqual(math.fround(MIN_FLOAT32), MIN_FLOAT32);
			assert.strictEqual(math.fround(-MIN_FLOAT32), -MIN_FLOAT32);
		},

		'.hypot()'() {
			assertIsNaN(math.hypot(NaN), math.hypot(1, NaN));
			assert.strictEqual(math.hypot(), 0);
			assert.strictEqual(math.hypot(0), 0);
			assert.strictEqual(math.hypot(0, 0), 0);
			assert.strictEqual(math.hypot(Infinity), Infinity);
			assert.strictEqual(math.hypot(Infinity, NaN), Infinity);
			assert.strictEqual(math.hypot(1, 2, 2), 3);
			assert.closeTo(math.hypot(2, 4), 4.47213595499958, 1e-13);
			assert.closeTo(math.hypot(2, 4, 6), 7.483314773547883, 1e-13);
		},

		'.imul()'() {
			assert.strictEqual(math.imul(2, 4), 8);
			assert.strictEqual(math.imul(-1, 8), -8);
			assert.strictEqual(math.imul(-2, -2), 4);
			assert.strictEqual(math.imul(0xffffffff, 5), -5);
			assert.strictEqual(math.imul(0xfffffffe, 5), -10);
		},

		'.log2()'() {
			assertIsNaN(math.log2(NaN));
			assert.strictEqual(math.log2(0), -Infinity);
			assert.strictEqual(math.log2(Infinity), Infinity);
			assert.strictEqual(math.log2(1), 0);
			assert.strictEqual(math.log2(2), 1);
			assert.closeTo(math.log2(3), 1.584962500721156, 1e-13);
		},

		'.log10()'() {
			assertIsNaN(math.log10(NaN));
			assert.strictEqual(math.log10(0), -Infinity);
			assert.strictEqual(math.log10(Infinity), Infinity);
			assert.strictEqual(math.log10(1), 0);
			assert.closeTo(math.log10(2), 0.3010299956639812, 1e-13);
		},

		'.log1p()'() {
			assertIsNaN(math.log1p(NaN));
			assert.strictEqual(math.log1p(Infinity), Infinity);
			assert.strictEqual(math.log1p(-1), -Infinity);
			assert.strictEqual(math.log1p(0), 0);
			assert.closeTo(math.log1p(1), 0.6931471805599453, 1e-13);
		},

		'.sign()'() {
			assertIsNaN(math.sign(NaN));
			assert.strictEqual(math.sign(0), 0);
			assert.strictEqual(math.sign(1), 1);
			assert.strictEqual(math.sign(Infinity), 1);
			assert.strictEqual(math.sign(-1), -1);
			assert.strictEqual(math.sign(-Infinity), -1);
		},

		'.sinh()'() {
			assertIsNaN(math.sinh(NaN));
			assert.strictEqual(math.sinh(0), 0);
			assert.strictEqual(math.sinh(Infinity), Infinity);
			assert.strictEqual(math.sinh(-Infinity), -Infinity);
			assert.closeTo(math.sinh(1), 1.1752011936438014, 1e-13);
			assert.closeTo(math.sinh(2), 3.6268604078470186, 1e-13);
		},

		'.tanh()'() {
			assertIsNaN(math.tanh(NaN));
			assert.strictEqual(math.tanh(0), 0);
			assert.strictEqual(math.tanh(Infinity), 1);
			assert.strictEqual(math.tanh(-Infinity), -1);
			assert.strictEqual(math.tanh(90), 1);
			assert.closeTo(math.tanh(1), 0.761594155955765, 1e-13);
		},

		'.trunc()'() {
			assert.strictEqual(math.trunc(Infinity), Infinity);
			assert.strictEqual(math.trunc(-Infinity), -Infinity);
			assert.strictEqual(math.trunc(1.1), 1);
			assert.strictEqual(math.trunc(1.9), 1);
			assert.strictEqual(math.trunc(-1.1), -1);
			assert.strictEqual(math.trunc(-1.9), -1);
			assert.strictEqual(math.trunc(1), 1);
		}
	}
);
