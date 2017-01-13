import { forOf, Iterable, IterableIterator, ShimIterator } from '@dojo/shim/iterator';
import WeakMap from '@dojo/shim/WeakMap';

const listItems: WeakMap<List<any>, any[]> = new WeakMap<List<any>, any[]>();

function getListItems<T>(list: List<T>): T[] {
	return (listItems.get(list) || []) as T[];
}

export default class List<T> {
	[Symbol.iterator]() {
		return this.values();
	}

	get size(): number {
		return getListItems(this).length;
	}

	constructor(source?: Iterable<T> | ArrayLike<T>) {
		listItems.set(this, []);

		if (source) {
			forOf(source, (item: T) => {
				this.add(item);
			});
		}
	}

	add(value: T): this {
		getListItems(this).push(value);
		return this;
	}

	clear(): void {
		listItems.set(this, []);
	}

	delete(idx: number): boolean {
		if (idx < this.size) {
			getListItems(this).splice(idx, 1);
			return true;
		}

		return false;
	}

	entries(): IterableIterator<[number, T]> {
		return new ShimIterator<[number, T]>(getListItems(this).map<[number, T]>((value, index) => [ index, value ]));
	}

	forEach(fn: (value: T, idx: number, list: this) => void, thisArg?: any): void {
		getListItems(this).forEach(fn.bind(thisArg ? thisArg : this));
	}

	has(idx: number): boolean {
		return this.size > idx;
	}

	includes(value: T): boolean {
		return getListItems(this).indexOf(value) >= 0;
	}

	indexOf(value: T): number {
		return getListItems(this).indexOf(value);
	}

	join(separator: string = ','): string {
		return getListItems(this).join(separator);
	}

	keys(): IterableIterator<number> {
		return new ShimIterator<number>(getListItems(this).map<number>((_, index) => index));
	}

	lastIndexOf(value: T): number {
		return getListItems(this).lastIndexOf(value);
	}

	push(value: T): void {
		this.add(value);
	}

	pop(): T | undefined {
		return getListItems(this).pop();
	}

	splice(start: number, deleteCount?: number, ...newItems: T[]): T[] {
		return getListItems(this).splice(start,
			deleteCount === undefined ? (this.size - start) : deleteCount,
			...newItems
		);
	}

	values(): IterableIterator<T> {
		return new ShimIterator<T>(getListItems(this).map<T>((value) => value));
	}
}
