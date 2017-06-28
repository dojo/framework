import { ArrayLike } from './interfaces';
import { hasClass } from './support/decorators';
import global from './global';
import { forOf, Iterable } from './iterator';
import './Symbol';

module Shim {
	const DELETED: any = {};

	interface Entry<K, V> {
		key: K;
		value: V;
	}

	function getUID(): number {
		return Math.floor(Math.random() * 100000000);
	}

	let generateName = (function () {
		let startId = Math.floor(Date.now() % 100000000);

		return function generateName(): string {
			return '__wm' + getUID() + (startId++ + '__');
		};
	})();

	export class WeakMap<K, V> {
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

		set(key: any, value?: any): Shim.WeakMap<K, V> {
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

		[Symbol.toStringTag] = 'WeakMap';
	}
}

@hasClass('es6-weakmap', global.WeakMap, Shim.WeakMap)
export default class WeakMap<K, V> {
	/* istanbul ignore next */
	constructor(iterable?: ArrayLike<[K, V]> | Iterable<[K, V]>) {}

	/* istanbul ignore next */
	delete(key: K): boolean { throw new Error(); }
	/* istanbul ignore next */
	get(key: K): V { throw new Error(); }
	/* istanbul ignore next */
	has(key: K): boolean { throw new Error(); }
	/* istanbul ignore next */
	set(key: K, value?: V): WeakMap<K, V> { throw new Error(); }
	/* istanbul ignore next */
	[Symbol.toStringTag] = 'WeakMap';
}
