import { hasClass } from './decorators';
import global from './global';

module Native {
	interface NativeWeakMap<K, V> {
		delete(key: K): boolean;
		get(key: K): V;
		has(key: K): boolean;
		set(key: K, value?: V): NativeWeakMap<K, V>;
	}

	// Since ES6 classes aren't inheritable, create a thin wrapper around
	// the native WeakMap with an inheritable TS class
	export class WeakMap<K, V> {
		private _wm: NativeWeakMap<K, V>;

		constructor(iterable?: any) {
			Object.defineProperty(this, '_wm', {
				value: new global.WeakMap(iterable)
			});
		}

		set(key: any, value?: any): Native.WeakMap<K, V> {
			this._wm.set(key, value);
			return this;
		}

		get(key: any): V {
			return this._wm.get(key);
		}

		has(key: any): boolean {
			return this._wm.has(key);
		}

		delete(key: any): boolean {
			return this._wm.delete(key);
		}
	}
}

module Shim {
	function getUID(): number {
		return Math.floor(Math.random() * 100000000);
	}

	let generateName = (function () {
		let startId = Math.floor(Date.now() % 100000000);

		return function generateName(): string {
			return '__wm' + getUID() + (startId++ + '__');
		};
	})();
	let deleted = {};

	export class WeakMap<K, V> {
		private _name: string;

		constructor(iterable?: any) {
			Object.defineProperty(this, '_name', {
				value: generateName()
			});
			// TODO: 
			for (let [ key, value ] of iterable) {
				this.set(key, value);
			}
		}

		set(key: any, value?: any): Shim.WeakMap<K, V> {
			let entry: [ K, V ] = key[this._name];
			if (entry && entry[0] === key) {
				entry[1] = value;
			}
			else {
				entry = [ key, value ];
				Object.defineProperty(entry, '0', {
					value: key
				});
				Object.defineProperty(key, this._name, {
					value: entry
				});
			}
			return this;
		}

		get(key: any): V {
			let entry: [ K, V ] = key[this._name];
			if (entry && entry[0] === key && entry[1] !== deleted) {
				return entry[1];
			}
		}

		has(key: any): boolean {
			let entry: [ K, V ] = key[this._name];
			return Boolean(entry && entry[0] === key && entry[1] !== deleted);
		}

		delete(key: any): boolean {
			let entry: [ K, V ] = key[this._name];
			if (entry && entry[0] === key) {
				this.set(key, <any>deleted);
			}
			return false;
		}
	}
}

@hasClass('weakmap', Native.WeakMap, Shim.WeakMap)
export default class WeakMap<K, V> {
	constructor(iterable?: any) {}

	set(key: K, value?: V): WeakMap<K, V>;
	set(key: any, value?: any): WeakMap<K, V> { throw new Error(); }

	get(key: K): V;
	get(key: any): V { throw new Error(); }

	has(key: K): boolean;
	has(key: any): boolean { throw new Error(); }

	delete(key: K): boolean;
	delete(key: any): boolean { throw new Error(); }
}
