/**
 * Helper function to generate a value property descriptor
 *
 * @param value        The value the property descriptor should be set to
 * @param enumerable   If the property should be enumberable, defaults to false
 * @param writable     If the property should be writable, defaults to true
 * @param configurable If the property should be configurable, defaults to true
 * @return             The property descriptor object
 */
export function getValueDescriptor<T>(
	value: T,
	enumerable: boolean = false,
	writable: boolean = true,
	configurable: boolean = true
): TypedPropertyDescriptor<T> {
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
export function wrapNative<T, U, R>(nativeFunction: (arg1: U) => R): (target: T, arg1: U) => R;
export function wrapNative<T, U, V, R>(nativeFunction: (arg1: U, arg2: V) => R): (target: T, arg1: U, arg2: V) => R;
export function wrapNative<T, U, V, W, R>(
	nativeFunction: (arg1: U, arg2: V, arg3: W) => R
): (target: T, arg1: U, arg2: V, arg3: W) => R;
export function wrapNative<T, U, V, W, X, R>(
	nativeFunction: (arg1: U, arg2: V, arg3: W) => R
): (target: T, arg1: U, arg2: V, arg3: W) => R;
export function wrapNative<T, U, V, W, X, Y, R>(
	nativeFunction: (arg1: U, arg2: V, arg3: W, arg4: Y) => R
): (target: T, arg1: U, arg2: V, arg3: W, arg4: Y) => R;
export function wrapNative(nativeFunction: (...args: any[]) => any): (target: any, ...args: any[]) => any {
	return function(target: any, ...args: any[]): any {
		return nativeFunction.apply(target, args);
	};
}
