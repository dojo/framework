/**
 * Returns the hyperbolic arccosine of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export const acosh: (n: number) => number = (<any> Math).acosh;

/**
 * Returns the hyperbolic arcsine of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export const asinh: (n: number) => number = (<any> Math).asinh;

/**
 * Returns the hyperbolic arctangent of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export const atanh: (n: number) => number = (<any> Math).atanh;

/**
 * Returns the cube root of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export const cbrt: (n: number) => number = (<any> Math).cbrt;

/**
 * Returns the number of leading zero bits in the 32-bit
 * binary representation of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export const clz32: (n: number) => number = (<any> Math).clz32;

/**
 * Returns the hyperbolic cosine of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export const cosh: (n: number) => number = (<any> Math).cosh;

/**
 * Returns e raised to the specified power minus one.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export const expm1: (n: number) => number = (<any> Math).expm1;

/**
 * Returns the nearest single-precision float representation of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export const fround: (n: number) => number = (<any> Math).fround;

/**
 * Returns the square root of the sum of squares of its arguments.
 *
 * @return The result
 */
export const hypot: (...args: number[]) => number = (<any> Math).hypot;

/**
 * Returns the result of the 32-bit multiplication of the two parameters.
 *
 * @param n The number to use in calculation
 * @param m The number to use in calculation
 * @return The result
 */
export const imul: (n: number, m: number) => number = (<any> Math).imul;

/**
 * Returns the base 2 logarithm of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export const log2: (n: number) => number = (<any> Math).log2;

/**
 * Returns the base 10 logarithm of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export const log10: (n: number) => number = (<any> Math).log10;

/**
 * Returns the natural logarithm of 1 + a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export const log1p: (n: number) => number = (<any> Math).log1p;

/**
 * Returns the sign of a number, indicating whether the number is positive.
 *
 * @param n The number to use in calculation
 * @return 1 if the number is positive, -1 if the number is negative, or 0 if the number is 0
 */
export const sign: (n: number) => number = (<any> Math).sign;

/**
 * Returns the hyperbolic sine of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export const sinh: (n: number) => number = (<any> Math).sinh;

/**
 * Returns the hyperbolic tangent of a number.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export const tanh: (n: number) => number = (<any> Math).tanh;

/**
 * Returns the integral part of a number by removing any fractional digits.
 *
 * @param n The number to use in calculation
 * @return The result
 */
export const trunc: (n: number) => number = (<any> Math).trunc;
