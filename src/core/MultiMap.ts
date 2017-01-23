import '@dojo/shim/Symbol';
import Map from '@dojo/shim/Map';
import { ArrayLike } from '@dojo/shim/interfaces';
import { from as arrayFrom } from '@dojo/shim/array';
import { forOf, Iterable, IterableIterator, ShimIterator } from '@dojo/shim/iterator';

/**
 * A map implmentation that supports multiple keys for specific value.
 *
 * @param T Accepts the type of the value
 */
export default class MultiMap<T> implements Map<any[], T> {
	private _map: Map<any, any>;
	private _key: symbol;

	/**
	 * @constructor
	 *
	 * @param iterator an array or iterator of tuples to initialize the map with.
	 */
	constructor(iterable?: ArrayLike<[any[], T]> | Iterable<[any[], T]>) {
		this._map = new Map<any, any>();
		this._key = Symbol();
		if (iterable) {
			forOf(iterable, (value: [any[], T]) => {
				this.set(value[0], value[1]);
			});
		}
	}

	/**
	 * Sets the value for the array of keys provided
	 *
	 * @param keys The array of keys to store the value against
	 * @param value the value of the map entry
	 *
	 * @return the multi map instance
	 */
	set(keys: any[], value: T): MultiMap<T> {
		let map = this._map;
		let childMap;

		for (let i = 0; i < keys.length; i++) {
			if (map.get(keys[i])) {
				map = map.get(keys[i]);
				continue;
			}
			childMap = new Map<any, any>();
			map.set(keys[i], childMap);
			map = childMap;
		};

		map.set(this._key, value);
		return this;
	}

	/**
	 * Returns the value entry for the array of keys
	 *
	 * @param keys The array of keys to look up the value for
	 *
	 * @return The value if found otherwise `undefined`
	 */
	get(keys: any[]): T | undefined {
		let map = this._map;

		for (let i = 0; i < keys.length; i++) {
			map = map.get(keys[i]);

			if (!map) {
				return undefined;
			}
		};

		return map.get(this._key);
	}

	/**
	 * Returns a boolean indicating if the key exists in the map
	 *
	 * @return boolean true if the key exists otherwise false
	 */
	has(keys: any[]): boolean {
		let map = this._map;

		for (let i = 0; i < keys.length; i++) {
			map = map.get(keys[i]);
			if (!map) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Returns the size of the map, based on the number of unique keys
	 */
	get size(): number {
		return arrayFrom(this.keys()).length;
	}

	/**
	 * Deletes the entry for the key provided.
	 *
	 * @param keys the key of the entry to remove
	 * @return boolean trus if the entry was deleted, false if the entry was not found
	 */
	delete(keys: any[]): boolean {
		let map = this._map;
		const path = [this._map];

		for (let i = 0; i < keys.length; i++) {
			map = map.get(keys[i]);
			path.push(map);
			if (!map) {
				return false;
			}
		}

		map.delete(this._key);

		for (let i = keys.length - 1; i >= 0; i--) {
			map = path[i].get(keys[i]);
			if (map.size) {
				break;
			}
			path[i].delete(keys[i]);
		}

		return true;
	}

	/**
	 * Return an iterator that yields each value in the map
	 *
	 * @return An iterator containing the instance's values.
	 */
	values(): IterableIterator<T> {
		const values: T[] = [];

		const getValues = (map: Map<any, any>) => {
			map.forEach((value, key) => {
				if (key === this._key) {
					values.push(value);
				}
				else {
					getValues(value);
				}
			});
		};

		getValues(this._map);
		return new ShimIterator<T>(values);
	}

	/**
	 * Return an iterator that yields each key array in the map
	 *
	 * @return An iterator containing the instance's keys.
	 */
	keys(): IterableIterator<any[]> {
		const finalKeys: any[][] = [];

		const getKeys = (map: Map<any, any>, keys: any[] = []) => {
			map.forEach((value, key) => {
				if (key === this._key) {
					finalKeys.push(keys);
				}
				else {
					const nextKeys = [...keys, key];
					getKeys(value, nextKeys);
				}
			});
		};

		getKeys(this._map);
		return new ShimIterator<any[]>(finalKeys);
	}

	/**
	 * Returns an iterator that yields each key/value pair as an array.
	 *
	 * @return An iterator for each key/value pair in the instance.
	 */
	entries(): IterableIterator<[any[], T]> {
		const finalEntries: [ any[], T ][] = [];

		const getKeys = (map: Map<any, any>, keys: any[] = []) => {
			map.forEach((value, key) => {
				if (key === this._key) {
					finalEntries.push([ keys, value ]);
				}
				else {
					const nextKeys = [...keys, key];
					getKeys(value, nextKeys);
				}
			});
		};

		getKeys(this._map);
		return new ShimIterator<[any[], T]>(finalEntries);
	}

	/**
	 * Executes a given function for each map entry. The function
	 * is invoked with three arguments: the element value, the
	 * element key, and the associated Map instance.
	 *
	 * @param callback The function to execute for each map entry,
	 * @param context The value to use for `this` for each execution of the calback
	 */
	forEach(callback: (value: T, key: any[], mapInstance: MultiMap<T>) => any, context?: {}): void {
		const entries = this.entries();

	forOf(entries, (value: [any[], T]) => {
			callback.call(context, value[1], value[0], this);
		});
	}

	/**
	 * Deletes all keys and their associated values.
	 */
	clear(): void {
		this._map.clear();
	}

	[Symbol.iterator](): IterableIterator<[any[], T]> {
		return this.entries();
	}

	[Symbol.toStringTag]: string = 'MultiMap';
}
