import global from './support/global';

/**
 * The smallest interval between two representable numbers.
 */
export const EPSILON = 1;

/**
 * The maximum safe integer in JavaScript
 */
export const MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;

/**
 * The minimum safe integer in JavaScript
 */
export const MIN_SAFE_INTEGER = -MAX_SAFE_INTEGER;

/**
 * Determines whether the passed value is NaN without coersion.
 *
 * @param value The value to test
 * @return true if the value is NaN, false if it is not
 */
export function isNaN(value: any): boolean {
	return typeof value === 'number' && global.isNaN(value);
}

/**
 * Determines whether the passed value is a finite number without coersion.
 *
 * @param value The value to test
 * @return true if the value is finite, false if it is not
 */
export function isFinite(value: any): boolean {
	return typeof value === 'number' && global.isFinite(value);
}

/**
 * Determines whether the passed value is an integer.
 *
 * @param value The value to test
 * @return true if the value is an integer, false if it is not
 */
export function isInteger(value: any): boolean {
	return isFinite(value) && Math.floor(value) === value;
}

/**
 * Determines whether the passed value is an integer that is 'safe,' meaning:
 *   1. it can be expressed as an IEEE-754 double precision number
 *   2. it has a one-to-one mapping to a mathematical integer, meaning its
 *      IEEE-754 representation cannot be the result of rounding any other
 *      integer to fit the IEEE-754 representation
 *
 * @param value The value to test
 * @return true if the value is an integer, false if it is not
 */
export function isSafeInteger(value: any): boolean {
	return isInteger(value) && Math.abs(value) <= MAX_SAFE_INTEGER;
}
