import { ArrayLike } from 'dojo-interfaces/shim';
import { hasClass } from './support/decorators';
import global from './support/global';
import { forOf, IterableIterator, Iterable, ShimIterator } from './iterator';
import './Symbol';

export namespace Shim {
	export class Set<T> {
		private _setData: T[] = [];

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

		[Symbol.toStringTag]: string = 'Set';
	}
}

@hasClass('es6-set', global.Set, Shim.Set)
export default class Set<T> {
	/* istanbul ignore next */
	constructor(iterable?: ArrayLike<T> | Iterable<T>) { };

	/* istanbul ignore next */
	add(value: T): this { throw new Error('Abstract method'); };
	/* istanbul ignore next */
	clear(): void { throw new Error('Abstract method'); };
	/* istanbul ignore next */
	delete(value: T): boolean { throw new Error('Abstract method'); };
	/* istanbul ignore next */
	entries(): IterableIterator<[T, T]> { throw new Error('Abstract method'); };
	/* istanbul ignore next */
	forEach(callbackfn: (value: T, index: T, set: Set<T>) => void, thisArg?: any): void { throw new Error('Abstract method'); };
	/* istanbul ignore next */
	has(value: T): boolean { throw new Error('Abstract method'); };
	/* istanbul ignore next */
	keys(): IterableIterator<T> { throw new Error('Abstract method'); };
	/* istanbul ignore next */
	get size(): number { throw new Error('Abstract method'); };
	/* istanbul ignore next */
	values(): IterableIterator<T> { throw new Error('Abstract method'); };
	/* istanbul ignore next */
	[Symbol.iterator](): IterableIterator<T> { throw new Error('Abstract method'); };
	/* istanbul ignore next */
	[Symbol.toStringTag]: string = 'Set';
}
