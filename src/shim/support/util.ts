/**
 * Helper function to generate a value property descriptor
 *
 * @param value        The value the property descriptor should be set to
 * @param enumerable   If the property should be enumberable, defaults to false
 * @param writable     If the property should be writable, defaults to true
 * @param configurable If the property should be configurable, defaults to true
 * @return             The property descriptor object
 */
export function getValueDescriptor<T>(value: T, enumerable: boolean = false, writable: boolean = true, configurable: boolean = true): TypedPropertyDescriptor<T> {
	return {
		value: value,
		enumerable: enumerable,
		writable: writable,
		configurable: configurable
	};
}

/**
 * A helper function which wraps a function where the first argument becomes the scope
 * of the call
 *
 * @param nativeFunction The source function to be wrapped
 */
export function wrapNative<T, U, R>(nativeFunction: (...args: U[]) => R): (target: T, ...args: U[]) => R {
	return function (target: T, ...args: U[]): R {
		return nativeFunction.apply(target, args);
	};
}
