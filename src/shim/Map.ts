import { ArrayLike } from './array';
import { hasClass } from './decorators';
import { is } from './object';

/**
 * An implementation analogous to the Map specification in ES2015,
 * with the exception of iterators.  The entries, keys, and values methods
 * are omitted, since forEach essentially provides the same functionality.
 */
export default class Map<K, V> {
	protected _keys: K[] = [];
	protected _values: V[] = [];

	/*
	 * An alternative to Array.prototype.indexOf using Object.is
	 * to check for equality. See http://mzl.la/1zuKO2V
	 */
	protected _indexOfKey(keys: K[], key: K): number {
		for (let i = 0, length = keys.length; i < length; i++) {
			if (is(keys[i], key)) {
				return i;
			}
		}
		return -1;
	}

	/**
	 * Creates a new Map
	 *
	 * @constructor
	 *
	 * @param arrayLike
	 * Array or array-like object containing two-item tuples used to initially populate the map.
	 * The first item in each tuple corresponds to the key of the map entry.
	 * The second item corresponds to the value of the map entry.
	 */
	constructor(arrayLike?: ArrayLike<[ K, V ]>) {
		if (arrayLike) {
			for (let i = 0, length = arrayLike.length; i < length; i++) {
				this.set(arrayLike[i][0], arrayLike[i][1]);
			}
		}
	}

	/**
	 * Returns the number of key / value pairs in the Map.
	 *
	 * @return the number of key / value pairs in the Map
	 */
	get size(): number {
		return this._keys.length;
	}

	/**
	 * Deletes all keys and their associated values.
	 */
	clear(): void {
		this._keys.length = this._values.length = 0;
	}

	/**
	 * Deletes a given key and its associated value.
	 *
	 * @param key The key to delete
	 * @return true if the key exists, false if it does not
	 */
	delete(key: K): boolean {
		const index = this._indexOfKey(this._keys, key);
		if (index < 0) {
			return false;
		}
		this._keys.splice(index, 1);
		this._values.splice(index, 1);
		return true;
	}

	/**
	 * Executes a given function for each map entry. The function
	 * is invoked with three arguments: the element value, the
	 * element key, and the associated Map instance.
	 *
	 * @param callback The function to execute for each map entry,
	 * @param context The value to use for `this` for each execution of the calback
	 */
	forEach(callback: (value: V, key: K, mapInstance: Map<K, V>) => any, context?: {}) {
		const keys = this._keys;
		const values = this._values;
		for (let i = 0, length = keys.length; i < length; i++) {
			callback.call(context, values[i], keys[i], this);
		}
	}

	/**
	 * Returns the value associated with a given key.
	 *
	 * @param key The key to look up
	 * @return The value if one exists or undefined
	 */
	get(key: K): V {
		const index = this._indexOfKey(this._keys, key);
		return index < 0 ? undefined : this._values[index];
	}

	/**
	 * Checks for the presence of a given key.
	 *
	 * @param key The key to check for
	 * @return true if the key exists, false if it does not
	 */
	has(key: K): boolean {
		return this._indexOfKey(this._keys, key) > -1;
	}

	/**
	 * Sets the value associated with a given key.
	 *
	 * @param key The key to define a value to
	 * @param value The value to assign
	 * @return The Map instance
	 */
	set(key: K, value: V): Map<K, V> {
		let index = this._indexOfKey(this._keys, key);
		index = index < 0 ? this._keys.length : index;
		this._keys[index] = key;
		this._values[index] = value;
		return this;
	}
}
