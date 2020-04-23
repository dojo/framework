`!has('es6-iterator')`;
import { isArrayLike, isIterable, Iterable } from './iterator';
import has from '../core/has';
import { wrapNative } from './support/util';

export interface MapCallback<T, U> {
	/**
	 * A callback function when mapping
	 *
	 * @param element The element that is currently being mapped
	 * @param index The current index of the element
	 */
	(element: T, index: number): U;
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
	/**
	 * The Array.from() method creates a new Array instance from an array-like or iterable object.
	 *
	 * @param source An array-like or iterable object to convert to an array
	 * @param mapFunction A map function to call on each element in the array
	 * @param thisArg The execution context for the map function
	 * @return The new Array
	 */
	<T, U>(source: ArrayLike<T> | Iterable<T>, mapFunction: MapCallback<T, U>, thisArg?: any): Array<U>;

	/**
	 * The Array.from() method creates a new Array instance from an array-like or iterable object.
	 *
	 * @param source An array-like or iterable object to convert to an array
	 * @return The new Array
	 */
	<T>(source: ArrayLike<T> | Iterable<T>): Array<T>;
}

export interface Flat {
	/**
	 * Returns a new array with all sub-array elements concatenated into it recursively up to the
	 * specified depth.
	 *
	 * @param depth The maximum recursion depth
	 */
	<U>(
		arr:
			| ReadonlyArray<U[][][][]>
			| ReadonlyArray<ReadonlyArray<U[][][]>>
			| ReadonlyArray<ReadonlyArray<U[][]>[]>
			| ReadonlyArray<ReadonlyArray<U[]>[][]>
			| ReadonlyArray<ReadonlyArray<U>[][][]>
			| ReadonlyArray<ReadonlyArray<ReadonlyArray<U[][]>>>
			| ReadonlyArray<ReadonlyArray<ReadonlyArray<U>[][]>>
			| ReadonlyArray<ReadonlyArray<ReadonlyArray<U>>[][]>
			| ReadonlyArray<ReadonlyArray<ReadonlyArray<U>[]>[]>
			| ReadonlyArray<ReadonlyArray<ReadonlyArray<U[]>>[]>
			| ReadonlyArray<ReadonlyArray<ReadonlyArray<U[]>[]>>
			| ReadonlyArray<ReadonlyArray<ReadonlyArray<ReadonlyArray<U[]>>>>
			| ReadonlyArray<ReadonlyArray<ReadonlyArray<ReadonlyArray<U>[]>>>
			| ReadonlyArray<ReadonlyArray<ReadonlyArray<ReadonlyArray<U>>[]>>
			| ReadonlyArray<ReadonlyArray<ReadonlyArray<ReadonlyArray<U>>>[]>
			| ReadonlyArray<ReadonlyArray<ReadonlyArray<ReadonlyArray<ReadonlyArray<U>>>>>,
		depth: 4
	): U[];

	/**
	 * Returns a new array with all sub-array elements concatenated into it recursively up to the
	 * specified depth.
	 *
	 * @param depth The maximum recursion depth
	 */
	<U>(
		arr:
			| ReadonlyArray<U[][][]>
			| ReadonlyArray<ReadonlyArray<U>[][]>
			| ReadonlyArray<ReadonlyArray<U[]>[]>
			| ReadonlyArray<ReadonlyArray<U[][]>>
			| ReadonlyArray<ReadonlyArray<ReadonlyArray<U[]>>>
			| ReadonlyArray<ReadonlyArray<ReadonlyArray<U>[]>>
			| ReadonlyArray<ReadonlyArray<ReadonlyArray<U>>[]>
			| ReadonlyArray<ReadonlyArray<ReadonlyArray<ReadonlyArray<U>>>>,
		depth: 3
	): U[];

	/**
	 * Returns a new array with all sub-array elements concatenated into it recursively up to the
	 * specified depth.
	 *
	 * @param depth The maximum recursion depth
	 */
	<U>(
		arr:
			| ReadonlyArray<U[][]>
			| ReadonlyArray<ReadonlyArray<U[]>>
			| ReadonlyArray<ReadonlyArray<U>[]>
			| ReadonlyArray<ReadonlyArray<ReadonlyArray<U>>>,
		depth: 2
	): U[];

	/**
	 * Returns a new array with all sub-array elements concatenated into it recursively up to the
	 * specified depth.
	 *
	 * @param depth The maximum recursion depth
	 */
	<U>(arr: ReadonlyArray<U[]> | ReadonlyArray<ReadonlyArray<U>>, depth?: 1): U[];

	/**
	 * Returns a new array with all sub-array elements concatenated into it recursively up to the
	 * specified depth.
	 *
	 * @param depth The maximum recursion depth
	 */
	<U>(arr: ReadonlyArray<U>, depth: 0): U[];

	/**
	 * Returns a new array with all sub-array elements concatenated into it recursively up to the
	 * specified depth. If no depth is provided, flat method defaults to the depth of 1.
	 *
	 * @param depth The maximum recursion depth
	 */
	<U>(arr: any[], depth?: number): any[];
}

export interface FlatMap {
	/**
	 * Calls a defined callback function on each element of an array. Then, flattens the result into
	 * a new array.
	 * This is identical to a map followed by flat with depth 1.
	 *
	 * @param callback A function that accepts up to three arguments. The flatMap method calls the
	 * callback function one time for each element in the array.
	 * @param thisArg An object to which the this keyword can refer in the callback function. If
	 * thisArg is omitted, undefined is used as the this value.
	 */
	<U, T extends any, This = undefined>(
		arr: T[],
		callback: (this: This, value: T, index: number, array: T[]) => U | ReadonlyArray<U>,
		thisArg?: This
	): U[];
}

export let from: From;

/**
 * Creates a new array from the function parameters.
 *
 * @param arguments Any number of arguments for the array
 * @return An array from the given arguments
 */
export let of: <T>(...items: T[]) => Array<T>;

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
export let copyWithin: <T>(target: ArrayLike<T>, offset: number, start: number, end?: number) => ArrayLike<T>;

/**
 * Fills elements of an array-like object with the specified value.
 *
 * @param target The target to fill
 * @param value The value to fill each element of the target with
 * @param start The first index to fill
 * @param end The (exclusive) index at which to stop filling
 * @return The filled target
 */
export let fill: <T>(target: ArrayLike<T>, value: T, start?: number, end?: number) => ArrayLike<T>;

/**
 * Finds and returns the first instance matching the callback or undefined if one is not found.
 *
 * @param target An array-like object
 * @param callback A function returning if the current value matches a criteria
 * @param thisArg The execution context for the find function
 * @return The first element matching the callback, or undefined if one does not exist
 */
export let find: <T>(target: ArrayLike<T>, callback: FindCallback<T>, thisArg?: {}) => T | undefined;

/**
 * Performs a linear search and returns the first index whose value satisfies the passed callback,
 * or -1 if no values satisfy it.
 *
 * @param target An array-like object
 * @param callback A function returning true if the current value satisfies its criteria
 * @param thisArg The execution context for the find function
 * @return The first index whose value satisfies the passed callback, or -1 if no values satisfy it
 */
export let findIndex: <T>(target: ArrayLike<T>, callback: FindCallback<T>, thisArg?: {}) => number;

/* ES7 Array instance methods */

/**
 * Determines whether an array includes a given value
 *
 * @param target the target array-like object
 * @param searchElement the item to search for
 * @param fromIndex the starting index to search from
 * @return `true` if the array includes the element, otherwise `false`
 */
export let includes: <T>(target: ArrayLike<T>, searchElement: T, fromIndex?: number) => boolean;

/**
 * Flattens arrays to the depth specified
 *
 * @param target An array-like object
 * @param depth The depth to flatten too, defaults to 1.
 */
export let flat: Flat;

export let flatMap: FlatMap;

// Util functions for filled implementations

let toLength: any;
let toInteger: any;
let normalizeOffset: any;

if (!has('es6-array') || !has('es6-array-fill') || !has('es7-array')) {
	const MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;

	/**
	 * Ensures a non-negative, non-infinite, safe integer.
	 *
	 * @param length The number to validate
	 * @return A proper length
	 */
	toLength = function toLength(length: number): number {
		if (isNaN(length)) {
			return 0;
		}

		length = Number(length);
		if (isFinite(length)) {
			length = Math.floor(length);
		}
		// Ensure a non-negative, real, safe integer
		return Math.min(Math.max(length, 0), MAX_SAFE_INTEGER);
	};

	/**
	 * From ES6 7.1.4 ToInteger()
	 *
	 * @param value A value to convert
	 * @return An integer
	 */
	toInteger = function toInteger(value: any): number {
		value = Number(value);
		if (isNaN(value)) {
			return 0;
		}
		if (value === 0 || !isFinite(value)) {
			return value;
		}

		return (value > 0 ? 1 : -1) * Math.floor(Math.abs(value));
	};

	/**
	 * Normalizes an offset against a given length, wrapping it if negative.
	 *
	 * @param value The original offset
	 * @param length The total length to normalize against
	 * @return If negative, provide a distance from the end (length); otherwise provide a distance from 0
	 */
	normalizeOffset = function normalizeOffset(value: number, length: number): number {
		return value < 0 ? Math.max(length + value, 0) : Math.min(value, length);
	};
}

if (!has('es6-array')) {
	Array.from = function from(
		this: ArrayConstructor,
		arrayLike: Iterable<any> | ArrayLike<any>,
		mapFunction?: MapCallback<any, any>,
		thisArg?: any
	): Array<any> {
		if (arrayLike == null) {
			throw new TypeError('from: requires an array-like object');
		}

		if (mapFunction && thisArg) {
			mapFunction = mapFunction.bind(thisArg);
		}

		/* tslint:disable-next-line:variable-name */
		const Constructor = this;
		const length: number = toLength((arrayLike as any).length);

		// Support extension
		const array: any[] =
			typeof Constructor === 'function' ? <any[]>Object(new Constructor(length)) : new Array(length);

		if (!isArrayLike(arrayLike) && !isIterable(arrayLike)) {
			return array;
		}

		// if this is an array and the normalized length is 0, just return an empty array. this prevents a problem
		// with the iteration on IE when using a NaN array length.
		if (isArrayLike(arrayLike)) {
			if (length === 0) {
				return [];
			}

			for (let i = 0; i < arrayLike.length; i++) {
				array[i] = mapFunction ? mapFunction(arrayLike[i], i) : arrayLike[i];
			}
		} else {
			let i = 0;
			for (const value of arrayLike) {
				array[i] = mapFunction ? mapFunction(value, i) : value;
				i++;
			}
		}

		if ((arrayLike as any).length !== undefined) {
			array.length = length;
		}

		return array;
	};

	Array.of = function of<T>(...items: T[]): Array<T> {
		return Array.prototype.slice.call(items);
	};

	Array.prototype.copyWithin = function copyWithin(offset: number, start: number, end?: number) {
		if (this == null) {
			throw new TypeError('copyWithin: target must be an array-like object');
		}

		const length = toLength(this.length);
		offset = normalizeOffset(toInteger(offset), length);
		start = normalizeOffset(toInteger(start), length);
		end = normalizeOffset(end === undefined ? length : toInteger(end), length);
		let count = Math.min(end! - start, length - offset);

		let direction = 1;
		if (offset > start && offset < start + count) {
			direction = -1;
			start += count - 1;
			offset += count - 1;
		}

		while (count > 0) {
			if (start in this) {
				this[offset] = this[start];
			} else {
				delete this[offset];
			}

			offset += direction;
			start += direction;
			count--;
		}

		return this;
	};

	type Predicate = (this: {} | void, value: any, index: number, obj: any[]) => boolean;

	Array.prototype.find = function find(callback: Predicate, thisArg?: {}) {
		const index = this.findIndex(callback, thisArg);
		return index !== -1 ? this[index] : undefined;
	};

	Array.prototype.findIndex = function findIndex(callback: Predicate, thisArg?: {}): number {
		const length = toLength(this.length);

		if (!callback) {
			throw new TypeError('find: second argument must be a function');
		}

		if (thisArg) {
			callback = callback.bind(thisArg);
		}

		for (let i = 0; i < length; i++) {
			if (callback(this[i], i, this)) {
				return i;
			}
		}

		return -1;
	};
}

if (!has('es6-array-fill')) {
	Array.prototype.fill = function fill(value: any, start?: number, end?: number) {
		const length = toLength(this.length);
		let i = normalizeOffset(toInteger(start), length);
		end = normalizeOffset(end === undefined ? length : toInteger(end), length);

		while (i < (end || 0)) {
			this[i++] = value;
		}

		return this;
	};
}

if (!has('es7-array')) {
	Array.prototype.includes = function includes(searchElement, fromIndex = 0) {
		let len = toLength(this.length);

		for (let i = fromIndex; i < len; ++i) {
			const currentElement = this[i];
			if (
				searchElement === currentElement ||
				(searchElement !== searchElement && currentElement !== currentElement)
			) {
				return true;
			}
		}

		return false;
	};
}

if (!has('es2019-array')) {
	Array.prototype.flat = function flat(depth: number = 1) {
		return depth > 0
			? this.reduce((acc, val) => acc.concat(Array.isArray(val) ? val.flat(depth - 1) : val), [])
			: this.slice();
	};

	Array.prototype.flatMap = function flatMap(callback: any) {
		return this.map(callback).flat();
	};
}

from = Array.from;
of = Array.of;
copyWithin = wrapNative(Array.prototype.copyWithin);
fill = wrapNative(Array.prototype.fill);
find = wrapNative(Array.prototype.find);
flat = wrapNative(Array.prototype.flat) as any;
flatMap = wrapNative(Array.prototype.flatMap) as any;
findIndex = wrapNative(Array.prototype.findIndex);
includes = wrapNative(Array.prototype.includes);

export default Array;
