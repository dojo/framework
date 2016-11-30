export interface IteratorResult<T> {
	readonly done: boolean;
	readonly value?: T;
}

export interface Iterator<T> {
	next(value?: any): IteratorResult<T>;
	return?(value?: any): IteratorResult<T>;
	throw?(e?: any): IteratorResult<T>;
}

export interface Iterable<T> {
	[Symbol.iterator](): Iterator<T>;
}

export interface IterableIterator<T> extends Iterator<T> {
	[Symbol.iterator](): IterableIterator<T>;
}

/**
 * A type guard for checking if something has an Iterable interface
 * @param value The value to type guard against
 */
export function isIterable(value: any): value is Iterable<any> {
	return value && typeof value[Symbol.iterator] !== 'undefined';
}

/**
 * A type guard for checking if something is ArrayLike
 * @param value The value to type guard against
 */
export function isArrayLike(value: any): value is ArrayLike<any> {
	return value && typeof value.length !== 'undefined';
}

/**
 * Returns the iterator for an object
 *
 * @param iterable The iterable object to return the iterator for
 */
export function get<T>(iterable: Iterable<T> | ArrayLike<T> | string): Iterator<T> | undefined {
	if (isIterable(iterable)) {
		/* have to cast as any, because the assumed index is implicit any */
		return (<any> iterable)[Symbol.iterator]();
	}
};

export interface ForOfCallback<T> {
	/**
	 * A callback function for a forOf() iteration
	 *
	 * @param value The current value
	 * @param object The object being iterated over
	 * @param doBreak A function, if called, will stop the iteration
	 */
	(value: T, object: Iterable<T> | ArrayLike<T> | string, doBreak: () => void): void;
}

/**
 * Shims the functionality of `for ... of` blocks
 *
 * @param iterable The object the provides an interator interface
 * @param callback The callback which will be called for each item of the iterable
 * @param thisArg Optional scope to pass the callback
 */
export function forOf<T>(iterable: Iterable<T> | ArrayLike<T> | string, callback: ForOfCallback<T>, thisArg?: any): void {
	let broken = false;

	function doBreak() {
		broken = true;
	}

	const iterator = get(iterable);
	if (!iterator) {
		throw new TypeError('Cannot resolve iterator interface.');
	}
	let result = iterator.next();

	/**
	 * TypeScript when targetting ES5 will destructure `foo ... of` only for array like objects
	 * using a `for` loop.  This obviously causes problems when trying to support iterator
	 * functionality and would not make the code transparent between ES5 and ES6, therefore
	 * creating our own iterator loop that would work seemlessly, irrespective of the target
	 */
	while (!result.done) {
		callback.call(thisArg, result.value, iterable, doBreak);
		if (broken) {
			return;
		}
		result = iterator.next();
	}
}
