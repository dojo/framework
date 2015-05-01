import { hasClass } from './decorators';
import { is } from './object';
import global from './global';

export default class Map<K, V> {
	private _keys: K[] = [];
	private _values: V[] = [];

	/*
	 * An alternative to Array.prototype.indexOf using Object.is
	 * to check for equality. See http://mzl.la/1zuKO2V
	 */
	private _indexOfKey(keys: K[], key: K): number {
		for (var i = 0; i < keys.length; i++) {
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
	 * @param iterable
	 * An array of two-item tuples used to initially
	 * populate the map. The first item in each tuple
	 * corresponds to the key of the map entry. The second
	 * item corresponds to the value of the map entry.
	 */
	constructor(iterable?: any) {
		if (!(this instanceof Map)) {
			throw new TypeError('Constructor Map requires "new"');
		}

		if (iterable) {
			for (let [key, value] of iterable) {
				this.set(key, value);
			}
		}
	}

	/**
	 * Returns the number of key / value pairs in the Map
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
	 * Returns an array of two-value tuples in the form
	 * of [key, value] in order of insertion.
	 *
	 * @return an array of entries in order of insertion
	 */
	entries(): any[] {
		var entries: any[] = [];
		this._keys.forEach(function(key: K, index: number) {
			entries.push([key, this.get(key)]);
		}, this);
		return entries;
	}

	/**
	 * Executes a given function for each map entry. The function
	 * is invoked with three arguments: the element value, the
	 * element key, and the associated Map instance.
	 *
	 * @param callback The function to execute for each map entry,
	 * @param context The value to use for `this` for each execution
	 * of the calbackv
	 */
	forEach(callback: (key: K, value: V, mapInstance: Map<K, V>) => any, context?: {}) {
		// don't use this.entries to avoid second forEach call
		this._keys.forEach(function(key, index) {
			callback.call(context, key, this.get(key), this);
		}, this);
	}

	/**
	 * Returns the value associated with a given key.
	 *
	 * @param key The key to look up
	 * @return the value if one exists or undefined
	 */
	get(key: K): V {
		var index = this._indexOfKey(this._keys, key);
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
	 * Returns an array of map keys in order of insertion.
	 *
	 * @return an array of keys in order of insertion
	 */
	keys(): K[] {
		return this._keys.slice(0);
	}

	/**
	 * Sets the value associated with a given key.
	 *
	 * @param key The key to define a value to
	 * @param value The value to assign
	 * @return A Map instance
	 */
	set(key: K, value: V): Map<K, V> {
		var index = this._indexOfKey(this._keys, key);
		index = index < 0 ? this._keys.length : index;
		this._keys[index] = key;
		this._values[index] = value;
		return this;
	}

	/**
	 * Returns an array of map values in order of insertion.
	 *
	 * @return an array of values in order of insertion
	 */
	values(): V[] {
		return this._values.slice(0);
	}
}
