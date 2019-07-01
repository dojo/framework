import has from '../core/has';

export const FRACTION_UNITS = Math.pow(2, 23);
export const MAX_FLOAT32 = 3.4028234663852886e38;
export const MIN_FLOAT32 = 1.401298464324817e-45;

if (!has('es6-math')) {
	Math.acosh = function acosh(n: number): number {
		return Math.log(n + Math.sqrt(n * n - 1));
	};

	Math.asinh = function asinh(n: number): number {
		if (n === -Infinity) {
			return n;
		} else {
			return Math.log(n + Math.sqrt(n * n + 1));
		}
	};

	Math.atanh = function atanh(n: number): number {
		return Math.log((1 + n) / (1 - n)) / 2;
	};

	Math.cbrt = function cbrt(n: number): number {
		const y = Math.pow(Math.abs(n), 1 / 3);
		return n < 0 ? -y : y;
	};

	Math.clz32 = function clz32(n: number): number {
		n = Number(n) >>> 0;
		return n ? 32 - n.toString(2).length : 32;
	};

	Math.cosh = function cosh(n: number): number {
		const m = Math.exp(n);
		return (m + 1 / m) / 2;
	};

	Math.expm1 = function expm1(n: number): number {
		return Math.exp(n) - 1;
	};

	Math.fround = function(n: number): number {
		return new Float32Array([n])[0];
	};

	Math.hypot = function hypot(...args: number[]): number {
		// See: http://mzl.la/1HDi6xP
		let n = 0;

		for (let arg of args) {
			if (arg === Infinity || arg === -Infinity) {
				return Infinity;
			}
			n += arg * arg;
		}
		return Math.sqrt(n);
	};

	Math.log2 = function log2(n: number): number {
		return Math.log(n) / Math.LN2;
	};

	Math.log10 = function log10(n: number): number {
		return Math.log(n) / Math.LN10;
	};

	Math.log1p = function log1p(n: number): number {
		return Math.log(1 + n);
	};

	Math.sign = function sign(n: number): number {
		n = Number(n);
		if (n === 0 || n !== n) {
			return n;
		}
		return n > 0 ? 1 : -1;
	};

	Math.sinh = function sinh(n: number): number {
		const m = Math.exp(n);
		return (m - 1 / m) / 2;
	};

	Math.tanh = function tanh(n: number): number {
		if (n === Infinity) {
			return 1;
		} else if (n === -Infinity) {
			return -1;
		} else {
			const y = Math.exp(2 * n);
			return (y - 1) / (y + 1);
		}
	};

	Math.trunc = function trunc(n: number): number {
		return n < 0 ? Math.ceil(n) : Math.floor(n);
	};
}

if (!has('es6-math-imul')) {
	Math.imul = function imul(n: number, m: number): number {
		// See: http://mzl.la/1K279FK
		const ah = (n >>> 16) & 0xffff;
		const al = n & 0xffff;
		const bh = (m >>> 16) & 0xffff;
		const bl = m & 0xffff;
		return (al * bl + (((ah * bl + al * bh) << 16) >>> 0)) | 0;
	};
}

/**
 * Returns the hyperbolic arccosine of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export let acosh: (n: number) => number = (Math as any).acosh;

/**
 * Returns the hyperbolic arcsine of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export let asinh: (n: number) => number = (Math as any).asinh;

/**
 * Returns the hyperbolic arctangent of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export let atanh: (n: number) => number = (Math as any).atanh;

/**
 * Returns the cube root of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export let cbrt: (n: number) => number = (Math as any).cbrt;

/**
 * Returns the number of leading zero bits in the 32-bit
 * binary representation of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export let clz32: (n: number) => number = (Math as any).clz32;

/**
 * Returns the hyperbolic cosine of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export let cosh: (n: number) => number = (Math as any).cosh;

/**
 * Returns e raised to the specified power minus one.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export let expm1: (n: number) => number = (Math as any).expm1;

/**
 * Returns the nearest single-precision float representation of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export let fround: (n: number) => number = (Math as any).fround;

/**
 * Returns the square root of the sum of squares of its arguments.
 *
 * @return The result
 */
export let hypot: (...args: number[]) => number = (Math as any).hypot;

/**
 * Returns the result of the 32-bit multiplication of the two parameters.
 *
 * @param n The number to use in calculation
 * @param m The number to use in calculation
 * @return The result
 */
export let imul: (n: number, m: number) => number = (Math as any).imul;

/**
 * Returns the base 2 logarithm of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export let log2: (n: number) => number = (Math as any).log2;

/**
 * Returns the base 10 logarithm of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export let log10: (n: number) => number = (Math as any).log10;

/**
 * Returns the natural logarithm of 1 + a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export let log1p: (n: number) => number = (Math as any).log1p;

/**
 * Returns the sign of a number, indicating whether the number is positive.
 *
 * @param n The number to use in calculation
 * @return 1 if the number is positive, -1 if the number is negative, or 0 if the number is 0
 */
export let sign: (n: number) => number = (Math as any).sign;

/**
 * Returns the hyperbolic sine of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export let sinh: (n: number) => number = (Math as any).sinh;

/**
 * Returns the hyperbolic tangent of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export let tanh: (n: number) => number = (Math as any).tanh;

/**
 * Returns the integral part of a number by removing any fractional digits.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export let trunc: (n: number) => number = (Math as any).trunc;

export default Math;
