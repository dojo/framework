import global from './global';
import { forOf, IterableIterator, Iterable, ShimIterator } from './iterator';
import has from './support/has';
import './Symbol';

export interface Set<T> {
	/**
	 * Adds a `value` to the `Set`
	 *
	 * @param value The value to add to the set
	 * @returns The instance of the `Set`
	 */
	add(value: T): this;

	/**
	 * Removes all the values from the `Set`.
	 */
	clear(): void;

	/**
	 * Removes a `value` from the set
	 *
	 * @param value The value to be removed
	 * @returns `true` if the value was removed
	 */
	delete(value: T): boolean;

	/**
	 * Returns an iterator that yields each entry.
	 *
	 * @return An iterator for each key/value pair in the instance.
	 */
	entries(): IterableIterator<[T, T]>;

	/**
	 * Executes a given function for each set entry. The function
	 * is invoked with three arguments: the element value, the
	 * element key, and the associated `Set` instance.
	 *
	 * @param callbackfn The function to execute for each map entry,
	 * @param thisArg The value to use for `this` for each execution of the calback
	 */
	forEach(callbackfn: (value: T, value2: T, set: Set<T>) => void, thisArg?: any): void;

	/**
	 * Identifies if a value is part of the set.
	 *
	 * @param value The value to check
	 * @returns `true` if the value is part of the set otherwise `false`
	 */
	has(value: T): boolean;

	/**
	 * Despite its name, returns an iterable of the values in the set,
	 */
	keys(): IterableIterator<T>;

	/**
	 * Returns the number of values in the `Set`.
	 */
	readonly size: number;

	/**
	 * Returns an iterable of values in the set.
	 */
	values(): IterableIterator<T>;

	/** Iterates over values in the set. */
	[Symbol.iterator](): IterableIterator<T>;

	readonly [Symbol.toStringTag]: 'Set';
}

export interface SetConstructor {
	/**
	 * Creates a new Set
	 *
	 * @constructor
	 */
	new (): Set<any>;

	/**
	 * Creates a new Set
	 *
	 * @constructor
	 *
	 * @param iterator The iterable structure to initialize the set with
	 */
	new <T>(iterator?: T[]): Set<T>;

	/**
	 * Creates a new Set
	 *
	 * @constructor
	 *
	 * @param iterator The iterable structure to initialize the set with
	 */
	new <T>(iterator: Iterable<T>): Set<T>;

	readonly prototype: Set<any>;
}

export let Set: SetConstructor = global.Set;

if (!has('es6-set')) {
	Set = class Set<T> {
		private readonly _setData: T[] = [];

		static [Symbol.species] = Set;

		constructor(iterable?: ArrayLike<T> | Iterable<T>) {
			if (iterable) {
				forOf(iterable, (value) => this.add(value));
			}
		};

		add(value: T): this {
			if (this.has(value)) {
				return this;
			}
			this._setData.push(value);
			return this;
		};

		clear(): void {
			this._setData.length = 0;
		};

		delete(value: T): boolean {
			const idx = this._setData.indexOf(value);
			if (idx === -1) {
				return false;
			}
			this._setData.splice(idx, 1);
			return true;
		};

		entries(): IterableIterator<[T, T]> {
			return new ShimIterator<[any, any]>(this._setData.map<[any, any]>((value) => [ value, value ]));
		};

		forEach(callbackfn: (value: T, index: T, set: Set<T>) => void, thisArg?: any): void {
			const iterator = this.values();
			let result = iterator.next();
			while (!result.done) {
				callbackfn.call(thisArg, result.value, result.value, this);
				result = iterator.next();
			}
		};

		has(value: T): boolean {
			return this._setData.indexOf(value) > -1;
		};

		keys(): IterableIterator<T> {
			return new ShimIterator(this._setData);
		};

		get size(): number {
			return this._setData.length;
		};

		values(): IterableIterator<T> {
			return new ShimIterator(this._setData);
		};

		[Symbol.iterator](): IterableIterator<T> {
			return new ShimIterator(this._setData);
		};

		[Symbol.toStringTag]: 'Set' = 'Set';
	};
}

export default Set;
