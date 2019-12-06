import Math, * as math from '../../../src/shim/math';
import global from '../../../src/shim/global';

const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');

function assertIsNaN(...results: number[]) {
	for (let result of results) {
		assert.notStrictEqual(result, result, 'Expected ' + result + ' to be NaN');
	}
}

registerSuite('math', {
	polyfill() {
		assert.equal(Math, global.Math);
	},
	'.acosh()'() {
		for (let acosh of [Math.acosh, math.acosh]) {
			assertIsNaN(acosh(NaN), acosh(0), acosh(0.9999999), acosh(-0.001));
			assert.strictEqual(acosh(Infinity), Infinity);
			assert.strictEqual(acosh(1), 0);
			assert.closeTo(acosh(2), 1.3169578969248166, 1e-13);
			assert.closeTo(acosh(3), 1.762747174039086, 1e-13);
		}
	},

	'.asinh()'() {
		for (let asinh of [Math.asinh, math.asinh]) {
			assertIsNaN(asinh(NaN));
			assert.strictEqual(asinh(Infinity), Infinity);
			assert.strictEqual(asinh(-Infinity), -Infinity);
			assert.strictEqual(asinh(0), 0);
			assert.closeTo(asinh(1), 0.8813735870195429, 1e-13);
		}
	},

	'.atanh()'() {
		for (let atanh of [Math.atanh, math.atanh]) {
			assertIsNaN(atanh(NaN), atanh(-1.00000001), atanh(1.00000001), atanh(-1e300), atanh(1e300));
			assert.strictEqual(atanh(0), 0);
			assert.strictEqual(atanh(1), Infinity);
			assert.strictEqual(atanh(-1), -Infinity);
			assert.closeTo(atanh(0.5), 0.5493061443340549, 1e-13);
		}
	},

	'.cbrt()'() {
		for (let cbrt of [Math.cbrt, math.cbrt]) {
			assert.strictEqual(cbrt(0), 0);
			assert.strictEqual(cbrt(1), 1);
			assert.strictEqual(cbrt(8), 2);
			assert.strictEqual(cbrt(-1), -1);
			assert.strictEqual(cbrt(-8), -2);
			assert.strictEqual(cbrt(Infinity), Infinity);
			assert.strictEqual(cbrt(-Infinity), -Infinity);
		}
	},

	'.clz32()'() {
		for (let clz32 of [Math.clz32, math.clz32]) {
			assert.strictEqual(clz32(1), 31);
			assert.strictEqual(clz32(0.1), 32);
			assert.strictEqual(clz32(-1), 0);
			assert.strictEqual(clz32(1000), 22);
			assert.strictEqual(clz32(2), 30);
		}
	},

	'.cosh()'() {
		for (let cosh of [Math.cosh, math.cosh]) {
			assertIsNaN(cosh(NaN));
			assert.strictEqual(cosh(0), 1);
			assert.strictEqual(cosh(-Infinity), Infinity);
			assert.strictEqual(cosh(Infinity), Infinity);
			assert.closeTo(cosh(-1), 1.5430806348152435, 1e-13);
			assert.closeTo(cosh(1), 1.5430806348152437, 1e-13);
		}
	},

	'.expm1()'() {
		for (let expm1 of [Math.expm1, math.expm1]) {
			assertIsNaN(expm1(NaN));
			assert.strictEqual(expm1(0), 0);
			assert.strictEqual(expm1(Infinity), Infinity);
			assert.strictEqual(expm1(-Infinity), -1);
			assert.closeTo(expm1(-1), -0.6321205588285577, 1e-13);
			assert.closeTo(expm1(1), 1.718281828459045, 1e-13);
		}
	},

	'.fround()'() {
		for (let fround of [Math.fround, math.fround]) {
			assert.strictEqual(fround(0), 0);
			assert.strictEqual(fround(Infinity), Infinity);
			assert.strictEqual(fround(-Infinity), -Infinity);
			assert.strictEqual(fround(1), 1);
			assert.strictEqual(fround(-1), -1);
			assert.closeTo(fround(1.337), 1.3370000123977661, 1e-13);
			assert.closeTo(fround(-1.337), -1.3370000123977661, 1e-13);

			assert.strictEqual(fround(Number.MAX_VALUE), Infinity);
			assert.strictEqual(fround(-Number.MAX_VALUE), -Infinity);
			assert.strictEqual(fround(Number.MIN_VALUE), 0);
			assert.strictEqual(fround(-Number.MIN_VALUE), 0);

			const MAX_FLOAT32 = 3.4028234663852886e38;
			const MIN_FLOAT32 = 1.401298464324817e-45;
			assert.strictEqual(fround(MAX_FLOAT32), MAX_FLOAT32);
			assert.strictEqual(fround(-MAX_FLOAT32), -MAX_FLOAT32);
			assert.strictEqual(fround(MIN_FLOAT32), MIN_FLOAT32);
			assert.strictEqual(fround(-MIN_FLOAT32), -MIN_FLOAT32);
		}
	},

	'.hypot()'() {
		for (let hypot of [Math.hypot, math.hypot]) {
			assertIsNaN(hypot(NaN), hypot(1, NaN));
			assert.strictEqual(hypot(), 0);
			assert.strictEqual(hypot(0), 0);
			assert.strictEqual(hypot(0, 0), 0);
			assert.strictEqual(hypot(Infinity), Infinity);
			assert.strictEqual(hypot(1, 2, 2), 3);
			assert.closeTo(hypot(2, 4), 4.47213595499958, 1e-13);
			assert.closeTo(hypot(2, 4, 6), 7.483314773547883, 1e-13);
		}
	},

	'.imul()'() {
		for (let imul of [Math.imul, math.imul]) {
			assert.strictEqual(imul(2, 4), 8);
			assert.strictEqual(imul(-1, 8), -8);
			assert.strictEqual(imul(-2, -2), 4);
			assert.strictEqual(imul(0xffffffff, 5), -5);
			assert.strictEqual(imul(0xfffffffe, 5), -10);
		}
	},

	'.log2()'() {
		for (let log2 of [Math.log2, math.log2]) {
			assertIsNaN(log2(NaN));
			assert.strictEqual(log2(0), -Infinity);
			assert.strictEqual(log2(Infinity), Infinity);
			assert.strictEqual(log2(1), 0);
			assert.strictEqual(log2(2), 1);
			assert.closeTo(log2(3), 1.584962500721156, 1e-13);
		}
	},

	'.log10()'() {
		for (let log10 of [Math.log10, math.log10]) {
			assertIsNaN(log10(NaN));
			assert.strictEqual(log10(0), -Infinity);
			assert.strictEqual(log10(Infinity), Infinity);
			assert.strictEqual(log10(1), 0);
			assert.closeTo(log10(2), 0.3010299956639812, 1e-13);
		}
	},

	'.log1p()'() {
		for (let log1p of [Math.log1p, math.log1p]) {
			assertIsNaN(log1p(NaN));
			assert.strictEqual(log1p(Infinity), Infinity);
			assert.strictEqual(log1p(-1), -Infinity);
			assert.strictEqual(log1p(0), 0);
			assert.closeTo(log1p(1), 0.6931471805599453, 1e-13);
		}
	},

	'.sign()'() {
		for (let sign of [Math.sign, math.sign]) {
			assertIsNaN(sign(NaN));
			assert.strictEqual(sign(0), 0);
			assert.strictEqual(sign(1), 1);
			assert.strictEqual(sign(Infinity), 1);
			assert.strictEqual(sign(-1), -1);
			assert.strictEqual(sign(-Infinity), -1);
		}
	},

	'.sinh()'() {
		for (let sinh of [Math.sinh, math.sinh]) {
			assertIsNaN(sinh(NaN));
			assert.strictEqual(sinh(0), 0);
			assert.strictEqual(sinh(Infinity), Infinity);
			assert.strictEqual(sinh(-Infinity), -Infinity);
			assert.closeTo(sinh(1), 1.1752011936438014, 1e-13);
			assert.closeTo(sinh(2), 3.6268604078470186, 1e-13);
		}
	},

	'.tanh()'() {
		for (let tanh of [Math.tanh, math.tanh]) {
			assertIsNaN(tanh(NaN));
			assert.strictEqual(tanh(0), 0);
			assert.strictEqual(tanh(Infinity), 1);
			assert.strictEqual(tanh(-Infinity), -1);
			assert.strictEqual(tanh(90), 1);
			assert.closeTo(tanh(1), 0.761594155955765, 1e-13);
		}
	},

	'.trunc()'() {
		for (let trunc of [Math.trunc, math.trunc]) {
			assert.strictEqual(trunc(Infinity), Infinity);
			assert.strictEqual(trunc(-Infinity), -Infinity);
			assert.strictEqual(trunc(1.1), 1);
			assert.strictEqual(trunc(1.9), 1);
			assert.strictEqual(trunc(-1.1), -1);
			assert.strictEqual(trunc(-1.9), -1);
			assert.strictEqual(trunc(1), 1);
		}
	}
});
