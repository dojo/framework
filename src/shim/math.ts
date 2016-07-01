import has from './support/has';

const FRACTION_UNITS = Math.pow(2, 23);
const MAX_FLOAT32 = 3.4028234663852886e+38;
const MIN_FLOAT32 = 1.401298464324817e-45;

export namespace Shim {
	export function acosh(n: number): number {
		return Math.log(n + Math.sqrt(n * n - 1));
	}

	export function asinh(n: number): number {
		if (n === -Infinity) {
			return n;
		}
		else {
			return Math.log(n + Math.sqrt(n * n + 1));
		}
	}

	export function atanh(n: number): number {
		return Math.log((1 + n) / (1 - n)) / 2;
	}

	export function cbrt(n: number): number {
		const y = Math.pow(Math.abs(n), 1 / 3);
		return n < 0 ? -y : y;
	}

	export function clz32(n: number): number {
		n = Number(n) >>> 0;
		return n ? 32 - n.toString(2).length : 32;
	}

	export function cosh(n: number): number {
		const m = Math.exp(n);
		return (m + 1 / m) / 2;
	}

	export function expm1(n: number): number {
		return Math.exp(n) - 1;
	}

	export const fround: (n: number) => number = has('float32array') ? function (n: number): number {
		return new Float32Array([n])[0];
	} :
	function (n: number): number {
		// Further fallback for IE9, which doesn't support Float32Array.
		// This gives a fair approximation in most cases.

		if (n === 0 || !isFinite(n)) {
			return n;
		}
		if (Math.abs(n) > MAX_FLOAT32) {
			return n > 0 ? Infinity : -Infinity;
		}
		if (Math.abs(n) < MIN_FLOAT32) {
			return 0;
		}
		const exponent = Math.floor(log2(Math.abs(n)));
		return (Math.round((n / Math.pow(2, exponent) - 1) * FRACTION_UNITS) / FRACTION_UNITS + 1) * Math.pow(2, exponent);
	};

	export function hypot(...args: number[]): number {
		// See: http://mzl.la/1HDi6xP
		let n = 0;

		for (let arg of args) {
			if (arg === Infinity || arg === -Infinity) {
				return Infinity;
			}
			n += arg * arg;
		}
		return Math.sqrt(n);
	}

	export function imul(n: number, m: number): number {
		// See: http://mzl.la/1K279FK
		const ah = (n >>> 16) & 0xffff;
		const al = n & 0xffff;
		const bh = (m >>> 16) & 0xffff;
		const bl = m & 0xffff;
		return ((al * bl) + (((ah * bl + al * bh) << 16) >>> 0) | 0);
	}

	export function log2(n: number): number {
		return Math.log(n) / Math.LN2;
	}

	export function log10(n: number): number {
		return Math.log(n) / Math.LN10;
	}

	export function log1p(n: number): number {
		return Math.log(1 + n);
	}

	export function sign(n: number): number {
		n = Number(n);
		if (n === 0 || n !== n) {
			return n;
		}
		return n > 0 ? 1 : -1;
	}

	export function sinh(n: number): number {
		const m = Math.exp(n);
		return (m - 1 / m) / 2;
	}

	export function tanh(n: number): number {
		if (n === Infinity) {
			return 1;
		}
		else if (n === -Infinity) {
			return -1;
		}
		else {
			const y = Math.exp(2 * n);
			return (y - 1) / (y + 1);
		}
	}

	export function trunc(n: number): number {
		return n < 0 ? Math.ceil(n) : Math.floor(n);
	}
}

/**
 * Returns the hyperbolic arccosine of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export const acosh: (n: number) => number = has('es6-math-acosh')
	? (<any> Math).acosh
	: Shim.acosh;

/**
 * Returns the hyperbolic arcsine of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export const asinh: (n: number) => number = 'asinh' in Math
	? (<any> Math).asinh
	: Shim.asinh;

/**
 * Returns the hyperbolic arctangent of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export const atanh: (n: number) => number = 'atanh' in Math
	? (<any> Math).atanh
	: Shim.atanh;

/**
 * Returns the cube root of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export const cbrt: (n: number) => number = 'cbrt' in Math
	? (<any> Math).cbrt
	: Shim.cbrt;

/**
 * Returns the number of leading zero bits in the 32-bit
 * binary representation of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export const clz32: (n: number) => number = 'clz32' in Math
	? (<any> Math).clz32
	: Shim.clz32;

/**
 * Returns the hyperbolic cosine of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export const cosh: (n: number) => number = 'cosh' in Math
	? (<any> Math).cosh
	: Shim.cosh;

/**
 * Returns e raised to the specified power minus one.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export const expm1: (n: number) => number = 'expm1' in Math
	? (<any> Math).expm1
	: Shim.expm1;

/**
 * Returns the nearest single-precision float representation of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export const fround: (n: number) => number = 'fround' in Math
	? (<any> Math).fround
	: Shim.fround;

/**
 * Returns the square root of the sum of squares of its arguments.
 *
 * @return The result
 */
export const hypot: (...args: number[]) => number = 'hypot' in Math
	? (<any> Math).hypot
	: Shim.hypot;

/**
 * Returns the result of the 32-bit multiplication of the two parameters.
 *
 * @param n The number to use in calculation
 * @param m The number to use in calculation
 * @return The result
 */
export const imul: (n: number, m: number) => number = has('es6-math-imul')
	? (<any> Math).imul
	: Shim.imul;

/**
 * Returns the base 2 logarithm of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export const log2: (n: number) => number = 'log2' in Math
	? (<any> Math).log2
	: Shim.log2;

/**
 * Returns the base 10 logarithm of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export const log10: (n: number) => number = 'log10' in Math
	? (<any> Math).log10
	: Shim.log10;

/**
 * Returns the natural logarithm of 1 + a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export const log1p: (n: number) => number = 'log1p' in Math
	? (<any> Math).log1p
	: Shim.log1p;

/**
 * Returns the sign of a number, indicating whether the number is positive.
 *
 * @param n The number to use in calculation
 * @return 1 if the number is positive, -1 if the number is negative, or 0 if the number is 0
 */
export const sign: (n: number) => number = 'sign' in Math
	? (<any> Math).sign
	: Shim.sign;

/**
 * Returns the hyperbolic sine of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export const sinh: (n: number) => number = 'sinh' in Math
	? (<any> Math).sinh
	: Shim.sinh;

/**
 * Returns the hyperbolic tangent of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export const tanh: (n: number) => number = 'tanh' in Math
	? (<any> Math).tanh
	: Shim.tanh;

/**
 * Returns the integral part of a number by removing any fractional digits.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export const trunc: (n: number) => number = 'trunc' in Math
	? (<any> Math).trunc
	: Shim.trunc;
