/**
 * Determines whether two values are the same value.
 *
 * @param value1 The first value to compare
 * @param value2 The second value to compare
 * @return true if the values are the same; false otherwise
 */
export function is(value1: any, value2: any): boolean {
	if (value1 === value2) {
		return value1 !== 0 || 1 / value1 === 1 / value2; // -0
	}
	return value1 !== value1 && value2 !== value2; // NaN
}
