import { hasClass } from './decorators';
import global from './global';

module Shim {
	const DELETED: any = {};

	interface Entry<K, V> {
		key: K;
		value: V;
	}

	let generateName = (function () {
		let startId = Math.floor(Date.now() % 100000000);

		return function generateName(): string {
			return '__wm' + getUID() + (startId++ + '__');
		};
	})();

	function getUID(): number {
		return Math.floor(Math.random() * 100000000);
	}

	export class WeakMap<K, V> {
		private _name: string;

		constructor(iterable?: any) {
			Object.defineProperty(this, '_name', {
				value: generateName()
			});
			if (iterable) {
				for (const [ key, value ] of iterable) {
					this.set(key, value);
				}
			}
		}

		delete(key: any): boolean {
			const entry: Entry<K, V> = key[this._name];
			if (entry && entry.key === key && entry.value !== DELETED) {
				entry.value = DELETED;
				return true;
			}
			return false;
		}

		get(key: any): V {
			const entry: Entry<K, V> = key[this._name];
			if (entry && entry.key === key && entry.value !== DELETED) {
				return entry.value;
			}
		}

		has(key: any): boolean {
			const entry: Entry<K, V> = key[this._name];
			return Boolean(entry && entry.key === key && entry.value !== DELETED);
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
				Object.defineProperty(key, this._name, {
					value: entry
				});
			}
			entry.value = value;
			return this;
		}
	}
}

@hasClass('weakmap', global.WeakMap, Shim.WeakMap)
export default class WeakMap<K, V> {
	/* istanbul ignore next */
	constructor(iterable?: any) {}

	/* istanbul ignore next */
	delete(key: K): boolean { throw new Error(); }
	/* istanbul ignore next */
	get(key: K): V { throw new Error(); }
	/* istanbul ignore next */
	has(key: K): boolean { throw new Error(); }
	/* istanbul ignore next */
	set(key: K, value?: V): WeakMap<K, V> { throw new Error(); }
}
