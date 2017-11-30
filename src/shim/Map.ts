import { isArrayLike, Iterable, IterableIterator, ShimIterator } from './iterator';
import global from './global';
import { is as objectIs } from './object';
import has from './support/has';
import './Symbol';

export interface Map<K, V> {
	/**
	 * Deletes all keys and their associated values.
	 */
	clear(): void;

	/**
	 * Deletes a given key and its associated value.
	 *
	 * @param key The key to delete
	 * @return true if the key exists, false if it does not
	 */
	delete(key: K): boolean;

	/**
	 * Returns an iterator that yields each key/value pair as an array.
	 *
	 * @return An iterator for each key/value pair in the instance.
	 */
	entries(): IterableIterator<[K, V]>;

	/**
	 * Executes a given function for each map entry. The function
	 * is invoked with three arguments: the element value, the
	 * element key, and the associated Map instance.
	 *
	 * @param callbackfn The function to execute for each map entry,
	 * @param thisArg The value to use for `this` for each execution of the calback
	 */
	forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void;

	/**
	 * Returns the value associated with a given key.
	 *
	 * @param key The key to look up
	 * @return The value if one exists or undefined
	 */
	get(key: K): V | undefined;

	/**
	 * Returns an iterator that yields each key in the map.
	 *
	 * @return An iterator containing the instance's keys.
	 */
	keys(): IterableIterator<K>;

	/**
	 * Checks for the presence of a given key.
	 *
	 * @param key The key to check for
	 * @return true if the key exists, false if it does not
	 */
	has(key: K): boolean;

	/**
	 * Sets the value associated with a given key.
	 *
	 * @param key The key to define a value to
	 * @param value The value to assign
	 * @return The Map instance
	 */
	set(key: K, value: V): this;

	/**
	 * Returns the number of key / value pairs in the Map.
	 */
	readonly size: number;

	/**
	 * Returns an iterator that yields each value in the map.
	 *
	 * @return An iterator containing the instance's values.
	 */
	values(): IterableIterator<V>;

	/** Returns an iterable of entries in the map. */
	[Symbol.iterator](): IterableIterator<[K, V]>;

	readonly [Symbol.toStringTag]: string;
}

export interface MapConstructor {
	/**
	 * Creates a new Map
	 *
	 * @constructor
	 */
	new (): Map<any, any>;

	/**
	 * Creates a new Map
	 *
	 * @constructor
	 *
	 * @param iterator
	 * Array or iterator containing two-item tuples used to initially populate the map.
	 * The first item in each tuple corresponds to the key of the map entry.
	 * The second item corresponds to the value of the map entry.
	 */
	new <K, V>(iterator?: [K, V][]): Map<K, V>;

	/**
	 * Creates a new Map
	 *
	 * @constructor
	 *
	 * @param iterator
	 * Array or iterator containing two-item tuples used to initially populate the map.
	 * The first item in each tuple corresponds to the key of the map entry.
	 * The second item corresponds to the value of the map entry.
	 */
	new <K, V>(iterator: Iterable<[K, V]>): Map<K, V>;

	readonly prototype: Map<any, any>;

	readonly [Symbol.species]: MapConstructor;
}

export let Map: MapConstructor = global.Map;

if (!has('es6-map')) {
	Map = class Map<K, V> {
		protected readonly _keys: K[] = [];
		protected readonly _values: V[] = [];

		/**
		 * An alternative to Array.prototype.indexOf using Object.is
		 * to check for equality. See http://mzl.la/1zuKO2V
		 */
		protected _indexOfKey(keys: K[], key: K): number {
			for (let i = 0, length = keys.length; i < length; i++) {
				if (objectIs(keys[i], key)) {
					return i;
				}
			}
			return -1;
		}

		static [Symbol.species] = Map;

		constructor(iterable?: ArrayLike<[ K, V ]> | Iterable<[ K, V ]>) {
			if (iterable) {
				if (isArrayLike(iterable)) {
					for (let i = 0; i < iterable.length; i++) {
						const value = iterable[ i ];
						this.set(value[0], value[1]);
					}
				}
				else {
					for (const value of iterable) {
						this.set(value[0], value[1]);
					}
				}
			}
		}

		get size(): number {
			return this._keys.length;
		}

		clear(): void {
			this._keys.length = this._values.length = 0;
		}

		delete(key: K): boolean {
			const index = this._indexOfKey(this._keys, key);
			if (index < 0) {
				return false;
			}
			this._keys.splice(index, 1);
			this._values.splice(index, 1);
			return true;
		}

		entries(): IterableIterator<[K, V]> {
			const values = this._keys.map((key: K, i: number): [K, V] => {
				return [ key, this._values[i] ];
			});

			return new ShimIterator(values);
		}

		forEach(callback: (value: V, key: K, mapInstance: Map<K, V>) => any, context?: {}) {
			const keys = this._keys;
			const values = this._values;
			for (let i = 0, length = keys.length; i < length; i++) {
				callback.call(context, values[i], keys[i], this);
			}
		}

		get(key: K): V | undefined {
			const index = this._indexOfKey(this._keys, key);
			return index < 0 ? undefined : this._values[index];
		}

		has(key: K): boolean {
			return this._indexOfKey(this._keys, key) > -1;
		}

		keys(): IterableIterator<K> {
			return new ShimIterator(this._keys);
		}

		set(key: K, value: V): Map<K, V> {
			let index = this._indexOfKey(this._keys, key);
			index = index < 0 ? this._keys.length : index;
			this._keys[index] = key;
			this._values[index] = value;
			return this;
		}

		values(): IterableIterator<V> {
			return new ShimIterator(this._values);
		}

		[Symbol.iterator](): IterableIterator<[K, V]> {
			return this.entries();
		}

		[Symbol.toStringTag]: 'Map' = 'Map';
	};
}

export default Map;
