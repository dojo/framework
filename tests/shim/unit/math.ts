import registerSuite = require('intern!object');
import assert = require('intern/chai!assert');
import * as math from 'src/math';

registerSuite({
		name: 'math',

		'.acosh()'() {
			assert.strictEqual(math.acosh(1), 0);
			assert.closeTo(math.acosh(2), 1.3169578969248166, .0000000000001);
			assert.closeTo(math.acosh(3), 1.762747174039086, .0000000000001);
		},

		'.asinh()'() {
			assert.strictEqual(math.asinh(0), 0);
			assert.closeTo(math.asinh(1), 0.8813735870195429, .0000000000001);
			assert.closeTo(math.acosh(2), 1.3169578969248166, .0000000000001);
		},

		'.atanh()'() {
			assert.strictEqual(math.atanh(0), 0);
			assert.strictEqual(math.atanh(1), Infinity);
			assert.closeTo(math.atanh(0.5), 0.5493061443340549, .0000000000001);
		},

		'.cosh()'() {
			assert.closeTo(math.cosh(-1), 1.5430806348152435, .0000000000001);
			assert.strictEqual(math.cosh(0), 1);
			assert.closeTo(math.cosh(1), 1.5430806348152437, .0000000000001);
		},

		'.hypot()'() {
			assert.strictEqual(math.hypot(), 0);
			assert.strictEqual(math.hypot(0), 0);
			assert.closeTo(math.hypot(2, 4), 4.47213595499958, .0000000000001);
			assert.closeTo(math.hypot(2, 4, 6), 7.483314773547883, .0000000000001);
		},

		'.sinh()'() {
			assert.strictEqual(math.sinh(0), 0);
			assert.closeTo(math.sinh(1), 1.1752011936438014, .0000000000001);
			assert.closeTo(math.sinh(2), 3.6268604078470186, .0000000000001);
		},

		'.tanh()'() {
			assert.strictEqual(math.tanh(0), 0);
			assert.strictEqual(math.tanh(Infinity), 1);
			assert.closeTo(math.tanh(1), 0.761594155955765, .0000000000001);
		},

		'.expm1()'() {
			assert.closeTo(math.expm1(-1), -0.6321205588285577, .0000000000001);
			assert.strictEqual(math.expm1(0), 0);
			assert.closeTo(math.expm1(1), 1.718281828459045, .0000000000001);
		},

		'.log2()'() {
			assert.strictEqual(math.log2(0), -Infinity);
			assert.strictEqual(math.log2(1), 0);
			assert.strictEqual(math.log2(2), 1);
			assert.closeTo(math.log2(3), 1.584962500721156, .0000000000001);
		},

		'.log10()'() {
			assert.strictEqual(math.log10(0), -Infinity);
			assert.strictEqual(math.log10(1), 0);
			assert.closeTo(math.log10(2), 0.3010299956639812, .0000000000001);
		},

		'.log1p()'() {
			assert.strictEqual(math.log1p(-1), -Infinity);
			assert.strictEqual(math.log1p(0), 0);
			assert.closeTo(math.log1p(1), 0.6931471805599453, .0000000000001);
		},

		'.cbrt()'() {
			assert.strictEqual(math.cbrt(-1), -1);
			assert.strictEqual(math.cbrt(0), 0);
			assert.strictEqual(math.cbrt(1), 1);
		},

		'.clz32()'() {
			assert.strictEqual(math.clz32(1), 31);
			assert.strictEqual(math.clz32(1000), 22);
			assert.strictEqual(math.clz32(2), 30);
		},

		'.fround()'() {
			assert.strictEqual(math.fround(0), 0);
			assert.strictEqual(math.fround(Infinity), Infinity);
			assert.strictEqual(math.fround(-Infinity), -Infinity);
			assert.strictEqual(math.fround(1), 1);
			assert.strictEqual(math.fround(-1), -1);
			assert.closeTo(math.fround(1.337), 1.3370000123977661, 0.0000000000001);
			assert.closeTo(math.fround(-1.337), -1.3370000123977661, 0.0000000000001);

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

		'.imul()'() {
			assert.strictEqual(math.imul(2, 4), 8);
			assert.strictEqual(math.imul(-1, 8), -8);
			assert.strictEqual(math.imul(0xffffffff, 5), -5);
		},

		'.trunc()'() {
			assert.strictEqual(math.trunc(1.123), 1);
			assert.strictEqual(math.trunc(-17.5), -17);
			assert.strictEqual(math.trunc(42), 42);
		}
	}
);
