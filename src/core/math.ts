import has from './has';
import global from './global';

const FRACTION_UNITS = Math.pow(2, 23);
const MAX_FLOAT32 = 3.4028234663852886e+38;
const MIN_FLOAT32 = 1.401298464324817e-45;

/**
 * Returns the hyperbolic arccosine of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export function acosh(n: number): number {
	return Math.log(n + Math.sqrt(n * n - 1));
}

/**
 * Returns the hyperbolic arcsine of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export function asinh(n: number): number {
	if (n === -Infinity) {
		return n;
	}
	else {
		return Math.log(n + Math.sqrt(n * n + 1));
	}
}

/**
 * Returns the hyperbolic arctangent of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export function atanh(n: number): number {
	return Math.log((1 + n) / (1 - n)) / 2;
}

/**
 * Returns the cube root of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export function cbrt(n: number): number {
	const y = Math.pow(Math.abs(n), 1 / 3);
	return n < 0 ? -y : y;
}

/**
 * Returns the number of leading zero bits in the 32-bit
 * binary representation of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export function clz32(n: number): number {
	n = Number(n) >>> 0;
	return n ? 32 - n.toString(2).length : 32;
}

/**
 * Returns the hyperbolic cosine of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export function cosh(n: number): number {
	const m = Math.exp(n);
	return (m + 1 / m) / 2;
}

/**
 * Returns e raised to the specified power minus one.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export function expm1(n: number): number {
	return Math.exp(n) - 1;
}

/**
 * Returns the nearest single-precision float representation of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
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

/**
 * Returns the square root of the sum of squares of its arguments.
 *
 * @return The result
 */
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

/**
 * Returns the result of the 32-bit multiplication of the two parameters.
 *
 * @param n The number to use in calculation
 * @param m The number to use in calculation
 * @return The result
 */
export function imul(n: number, m: number): number {
	// See: http://mzl.la/1K279FK
	const ah = (n >>> 16) & 0xffff;
	const al = n & 0xffff;
	const bh = (m >>> 16) & 0xffff;
	const bl = m & 0xffff;
	return ((al * bl) + (((ah * bl + al * bh) << 16) >>> 0) | 0);
}

/**
 * Returns the base 2 logarithm of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export function log2(n: number): number {
	return Math.log(n) / Math.LN2;
}

/**
 * Returns the base 10 logarithm of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export function log10(n: number): number {
	return Math.log(n) / Math.LN10;
}

/**
 * Returns the natural logarithm of 1 + a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export function log1p(n: number): number {
	return Math.log(1 + n);
}

/**
 * Returns the sign of a number, indicating whether the number is positive.
 *
 * @param n The number to use in calculation
 * @return 1 if the number is positive, -1 if the number is negative, or 0 if the number is 0
 */
export function sign(n: number): number {
	n = Number(n);
	if (n === 0 || n !== n) {
		return n;
	}
	return n > 0 ? 1 : -1;
}

/**
 * Returns the hyperbolic sine of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export function sinh(n: number): number {
	const m = Math.exp(n);
	return (m - 1 / m) / 2;
}

/**
 * Returns the hyperbolic tangent of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
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

/**
 * Returns the integral part of a number by removing any fractional digits.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export function trunc(n: number): number {
	return n < 0 ? Math.ceil(n) : Math.floor(n);
}
