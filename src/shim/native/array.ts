import { wrapNative } from '../support/util';
import { Iterable } from './iterator';

export interface MapCallback<T> {
	/**
	 * A callback function when mapping
	 *
	 * @param element The element that is currently being mapped
	 * @param index The current index of the element
	 */
	(element: T, index: number): T;
}

export interface FindCallback<T> {
	/**
	 * A callback function when using find
	 *
	 * @param element The element that is currenty being analysed
	 * @param index The current index of the element that is being analysed
	 * @param array The source array
	 */
	(element: T, index: number, array: ArrayLike<T>): boolean;
}

/* ES6 Array static methods */

export interface From {
	(arrayLike: string, mapFunction?: MapCallback<string>, thisArg?: {}): Array<string>;
	<T>(arrayLike: Iterable<T> | ArrayLike<T>, mapFunction?: MapCallback<T>, thisArg?: {}): Array<T>;
	/**
	 * The Array.from() method creates a new Array instance from an array-like or iterable object.
	 *
	 * @param arrayLike An array-like or iterable object to convert to an array
	 * @param mapFunction A map function to call on each element in the array
	 * @param thisArg The execution context for the map function
	 * @return The new Array
	 */
	<T>(arrayLike: (string | Iterable<T> | ArrayLike<T>), mapFunction?: MapCallback<T>, thisArg?: {}): Array<T>;
}

export const from: From = (<any> Array).from;

/**
 * Creates a new array from the function parameters.
 *
 * @param arguments Any number of arguments for the array
 * @return An array from the given arguments
 */
export const of: (...items: any[]) => any[] = (<any> Array).of;

/* ES6 Array instance methods */

/**
 * Copies data internally within an array or array-like object.
 *
 * @param target The target array-like object
 * @param offset The index to start copying values to; if negative, it counts backwards from length
 * @param start The first (inclusive) index to copy; if negative, it counts backwards from length
 * @param end The last (exclusive) index to copy; if negative, it counts backwards from length
 * @return The target
 */
export const copyWithin: <T>(target: ArrayLike<T>, offset: number, start: number, end?: number) => ArrayLike<T> = wrapNative((<any> Array.prototype).copyWithin);

/**
 * Fills elements of an array-like object with the specified value.
 *
 * @param target The target to fill
 * @param value The value to fill each element of the target with
 * @param start The first index to fill
 * @param end The (exclusive) index at which to stop filling
 * @return The filled target
 */
export const fill: <T>(target: ArrayLike<T>, value: any, start?: number, end?: number) => ArrayLike<T> = wrapNative((<any> Array.prototype).fill);

/**
 * Finds and returns the first instance matching the callback or undefined if one is not found.
 *
 * @param target An array-like object
 * @param callback A function returning if the current value matches a criteria
 * @param [thisArg] The execution context for the find function
 * @return The first element matching the callback, or undefined if one does not exist
 */
export const find: <T>(target: ArrayLike<T>, callback: FindCallback<T>, thisArg?: {}) => T = wrapNative((<any> Array.prototype).find);

/**
 * Performs a linear search and returns the first index whose value satisfies the passed callback,
 * or -1 if no values satisfy it.
 *
 * @param target An array-like object
 * @param callback A function returning true if the current value satisfies its criteria
 * @param [thisArg] The execution context for the find function
 * @return The first index whose value satisfies the passed callback, or -1 if no values satisfy it
 */
export const findIndex: <T>(target: ArrayLike<T>, callback: FindCallback<T>, thisArg?: {}) => number = wrapNative((<any> Array.prototype).findIndex);

/* ES7 Array instance methods */

/**
 * Determines whether an array includes a given value
 *
 * @param target the target array-like object
 * @param searchElement the item to search for
 * @param fromIndex the starting index to search from
 */
export const includes: <T>(target: ArrayLike<T>, searchElement: T, fromIndex?: number) => boolean = wrapNative((<any> Array.prototype).includes);
