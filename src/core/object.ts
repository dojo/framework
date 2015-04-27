/**
 * Copies the values of all enumerable own properties of one or more source objects to the target object.
 * @return The modified target object
 */
export function assign(target: any, ...sources: any[]): any {
	if (target == null) {
		throw new TypeError('Cannot convert first argument to object');
	}

	target = Object(target);

	for (var i = 0, length = sources.length, source: any; i < length; i++) {
		source = sources[i];

		if (source) {
			source = Object(source);
			var keys = Object.keys(source);

			for (var j = 0, keysLength = keys.length, key: string; j < keysLength; j++) {
				key = keys[j];
				target[key] = source[key];
			}
		}
	}
	return target;
}

/**
 * Determines whether two values are the same value.
 * @return true if the values are the same; false otherwise
 */
export function is(value1: any, value2: any): boolean {
	if (value1 === value2) {
		return value1 !== 0 || 1 / value1 === 1 / value2; // -0
	}
	return value1 !== value1 && value2 !== value2; // NaN
}
