import global from '../global';

/**
 * The smallest interval between two representable numbers.
 */
export const EPSILON = global.Number.EPSILON;

/**
 * The maximum safe integer in JavaScript
 */
export const MAX_SAFE_INTEGER = global.Number.MAX_SAFE_INTEGER;

/**
 * The minimum safe integer in JavaScript
 */
export const MIN_SAFE_INTEGER = global.Number.MIN_SAFE_INTEGER;

/**
 * Determines whether the passed value is NaN without coersion.
 *
 * @param value The value to test
 * @return true if the value is NaN, false if it is not
 */
export const isNaN = global.Number.isNaN;

/**
 * Determines whether the passed value is a finite number without coersion.
 *
 * @param value The value to test
 * @return true if the value is finite, false if it is not
 */
export const isFinite = global.Number.isFinite;

/**
 * Determines whether the passed value is an integer.
 *
 * @param value The value to test
 * @return true if the value is an integer, false if it is not
 */
export const isInteger = global.Number.isInteger;

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
export const isSafeInteger = global.Number.isSafeInteger;
