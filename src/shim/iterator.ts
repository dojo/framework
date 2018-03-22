import './Symbol';
import { HIGH_SURROGATE_MAX, HIGH_SURROGATE_MIN } from './string';

export interface IteratorResult<T> {
	readonly done: boolean;
	readonly value: T;
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

const staticDone: IteratorResult<any> = { done: true, value: undefined };

/**
 * A class that _shims_ an iterator interface on array like objects.
 */
export class ShimIterator<T> {
	private _list: ArrayLike<T> | undefined;
	private _nextIndex = -1;
	private _nativeIterator: Iterator<T> | undefined;

	constructor(list: ArrayLike<T> | Iterable<T>) {
		if (isIterable(list)) {
			this._nativeIterator = list[Symbol.iterator]();
		} else {
			this._list = list;
		}
	}

	/**
	 * Return the next iteration result for the Iterator
	 */
	next(): IteratorResult<T> {
		if (this._nativeIterator) {
			return this._nativeIterator.next();
		}
		if (!this._list) {
			return staticDone;
		}
		if (++this._nextIndex < this._list.length) {
			return {
				done: false,
				value: this._list[this._nextIndex]
			};
		}
		return staticDone;
	}

	[Symbol.iterator](): IterableIterator<T> {
		return this;
	}
}

/**
 * A type guard for checking if something has an Iterable interface
 *
 * @param value The value to type guard against
 */
export function isIterable(value: any): value is Iterable<any> {
	return value && typeof value[Symbol.iterator] === 'function';
}

/**
 * A type guard for checking if something is ArrayLike
 *
 * @param value The value to type guard against
 */
export function isArrayLike(value: any): value is ArrayLike<any> {
	return value && typeof value.length === 'number';
}

/**
 * Returns the iterator for an object
 *
 * @param iterable The iterable object to return the iterator for
 */
export function get<T>(iterable: Iterable<T> | ArrayLike<T>): Iterator<T> | undefined {
	if (isIterable(iterable)) {
		return iterable[Symbol.iterator]();
	} else if (isArrayLike(iterable)) {
		return new ShimIterator(iterable);
	}
}

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
export function forOf<T>(
	iterable: Iterable<T> | ArrayLike<T> | string,
	callback: ForOfCallback<T>,
	thisArg?: any
): void {
	let broken = false;

	function doBreak() {
		broken = true;
	}

	/* We need to handle iteration of double byte strings properly */
	if (isArrayLike(iterable) && typeof iterable === 'string') {
		const l = iterable.length;
		for (let i = 0; i < l; ++i) {
			let char = iterable[i];
			if (i + 1 < l) {
				const code = char.charCodeAt(0);
				if (code >= HIGH_SURROGATE_MIN && code <= HIGH_SURROGATE_MAX) {
					char += iterable[++i];
				}
			}
			callback.call(thisArg, char, iterable, doBreak);
			if (broken) {
				return;
			}
		}
	} else {
		const iterator = get(iterable);
		if (iterator) {
			let result = iterator.next();

			while (!result.done) {
				callback.call(thisArg, result.value, iterable, doBreak);
				if (broken) {
					return;
				}
				result = iterator.next();
			}
		}
	}
}
