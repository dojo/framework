import './Symbol';

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
	private _list: ArrayLike<T>;
	private _nextIndex: number = -1;
	private _nativeIterator: Iterator<T>;

	constructor(list: ArrayLike<T> | Iterable<T>) {
		if (isIterable(list)) {
			this._nativeIterator = list[ Symbol.iterator ]();
		}
		else {
			this._list = list;
		}
	};

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
				value: this._list[ this._nextIndex ]
			};
		}
		return staticDone;
	};

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
	return value && typeof value[ Symbol.iterator ] === 'function';
}

/**
 * A type guard for checking if something is ArrayLike
 *
 * @param value The value to type guard against
 */
export function isArrayLike(value: any): value is ArrayLike<any> {
	return value && typeof value.length === 'number';
}
