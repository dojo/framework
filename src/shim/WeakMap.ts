import { hasClass } from './decorators';
import global from './global';

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
	const DELETED: any = {};

	export class WeakMap<K, V> {
		private _name: string;

		constructor(iterable?: any) {
			Object.defineProperty(this, '_name', {
				value: generateName()
			});
			// TODO: 
			for (const [ key, value ] of iterable) {
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
			const entry: [ K, V ] = key[this._name];
			if (entry && entry[0] === key && entry[1] !== DELETED) {
				return entry[1];
			}
		}

		has(key: any): boolean {
			const entry: [ K, V ] = key[this._name];
			return Boolean(entry && entry[0] === key && entry[1] !== DELETED);
		}

		delete(key: any): boolean {
			const entry: [ K, V ] = key[this._name];
			if (entry && entry[0] === key) {
				this.set(key, DELETED);
			}
			return false;
		}
	}
}

@hasClass('weakmap', global.WeakMap, Shim.WeakMap)
export default class WeakMap<K, V> {
	constructor(iterable?: any) {}

	delete(key: K): boolean { throw new Error(); }
	get(key: K): V { throw new Error(); }
	has(key: K): boolean { throw new Error(); }
	set(key: K, value?: V): WeakMap<K, V> { throw new Error(); }
}
