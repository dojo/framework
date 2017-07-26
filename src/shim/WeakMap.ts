import global from './global';
import { forOf, Iterable } from './iterator';
import has from './support/has';
import './Symbol';

export interface WeakMap<K extends object, V> {
	/**
	 * Remove a `key` from the map
	 *
	 * @param key The key to remove
	 * @return `true` if the value was removed, otherwise `false`
	 */
	delete(key: K): boolean;

	/**
	 * Retrieve the value, based on the supplied `key`
	 *
	 * @param key The key to retrieve the `value` for
	 * @return the `value` based on the `key` if found, otherwise `false`
	 */
	get(key: K): V | undefined;

	/**
	 * Determines if a `key` is present in the map
	 *
	 * @param key The `key` to check
	 * @return `true` if the key is part of the map, otherwise `false`.
	 */
	has(key: K): boolean;

	/**
	 * Set a `value` for a particular `key`.
	 *
	 * @param key The `key` to set the `value` for
	 * @param value The `value` to set
	 * @return the instances
	 */
	set(key: K, value: V): this;

	readonly [Symbol.toStringTag]: 'WeakMap';
}

export interface WeakMapConstructor {
	/**
	 * Create a new instance of a `WeakMap`
	 *
	 * @constructor
	 */
	new (): WeakMap<object, any>;

	/**
	 * Create a new instance of a `WeakMap`
	 *
	 * @constructor
	 *
	 * @param iterable An iterable that contains yields up key/value pair entries
	 */
	new <K extends object, V>(iterable?: [K, V][]): WeakMap<K, V>;

	/**
	 * Create a new instance of a `WeakMap`
	 *
	 * @constructor
	 *
	 * @param iterable An iterable that contains yields up key/value pair entries
	 */
	new <K extends object, V>(iterable: Iterable<[K, V]>): WeakMap<K, V>;

	readonly prototype: WeakMap<object, any>;
}

export let WeakMap: WeakMapConstructor = global.WeakMap;

interface Entry<K, V> {
	key: K;
	value: V;
}

if (!has('es6-weakmap')) {
	const DELETED: any = {};

	const getUID = function getUID(): number {
		return Math.floor(Math.random() * 100000000);
	};

	const generateName = (function () {
		let startId = Math.floor(Date.now() % 100000000);

		return function generateName(): string {
			return '__wm' + getUID() + (startId++ + '__');
		};
	})();

	WeakMap = class WeakMap<K, V> {
		private readonly _name: string;
		private readonly _frozenEntries: Entry<K, V>[];

		constructor(iterable?: ArrayLike<[K, V]> | Iterable<[K, V]>) {
			Object.defineProperty(this, '_name', {
				value: generateName()
			});

			this._frozenEntries = [];

			if (iterable) {
				forOf(iterable, ([ key, value ]: [K, V]) => this.set(key, value));
			}
		}

		private _getFrozenEntryIndex(key: any): number {
			for (let i = 0; i < this._frozenEntries.length; i++) {
				if (this._frozenEntries[i].key === key) {
					return i;
				}
			}

			return -1;
		}

		delete(key: any): boolean {
			if (key === undefined || key === null) {
				return false;
			}

			const entry: Entry<K, V> = key[this._name];
			if (entry && entry.key === key && entry.value !== DELETED) {
				entry.value = DELETED;
				return true;
			}

			const frozenIndex = this._getFrozenEntryIndex(key);
			if (frozenIndex >= 0) {
				this._frozenEntries.splice(frozenIndex, 1);
				return true;
			}

			return false;
		}

		get(key: any): V | undefined {
			if (key === undefined || key === null) {
				return undefined;
			}

			const entry: Entry<K, V> = key[this._name];
			if (entry && entry.key === key && entry.value !== DELETED) {
				return entry.value;
			}

			const frozenIndex = this._getFrozenEntryIndex(key);
			if (frozenIndex >= 0) {
				return this._frozenEntries[frozenIndex].value;
			}
		}

		has(key: any): boolean {
			if (key === undefined || key === null) {
				return false;
			}

			const entry: Entry<K, V> = key[this._name];
			if (Boolean(entry && entry.key === key && entry.value !== DELETED)) {
				return true;
			}

			const frozenIndex = this._getFrozenEntryIndex(key);
			if (frozenIndex >= 0) {
				return true;
			}

			return false;
		}

		set(key: any, value?: any): this {
			if (!key || (typeof key !== 'object' && typeof key !== 'function')) {
				throw new TypeError('Invalid value used as weak map key');
			}
			let entry: Entry<K, V> = key[this._name];
			if (!entry || entry.key !== key) {
				entry = Object.create(null, {
					key: { value: key }
				});

				if (Object.isFrozen(key)) {
					this._frozenEntries.push(entry);
				}
				else {
					Object.defineProperty(key, this._name, {
						value: entry
					});
				}
			}
			entry.value = value;
			return this;
		}

		[Symbol.toStringTag]: 'WeakMap' = 'WeakMap';
	};
}

export default WeakMap;
