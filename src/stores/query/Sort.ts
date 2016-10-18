import { Query, QueryType } from './createQuery';
import JsonPointer, { navigate, createPointer } from '../patch/JsonPointer';

export interface Sort<T> extends Query<T, T> {
	readonly comparatorOrProperty: ((a: T, b: T) => number) | string | JsonPointer;
	readonly descending?: boolean;
}

export function createSort<T>(
	comparatorOrProperty: ((a: T, b: T) => number) | string | JsonPointer,
	descending?: boolean,
	serializer?: (sort: Sort<T>) => string): Sort<T> {

	const isFunction = typeof comparatorOrProperty === 'function';
	let comparator: (a: T, b: T) => number;

	if (isFunction) {
		comparator = <any> comparatorOrProperty;
	}
	else {
		let pointer: JsonPointer;
		if (typeof comparatorOrProperty === 'string') {
			pointer = createPointer(comparatorOrProperty);
		}
		else {
			pointer = <JsonPointer> comparatorOrProperty;
		}
		comparator = function(a: T, b: T) {
			return sortValue(navigate(pointer, a), navigate(pointer, b));
		};
	}

	if (descending) {
		comparator = flip(comparator);
	}
	return {
		apply(data: T[]) {
			return data.sort(comparator);
		},
		comparatorOrProperty: comparatorOrProperty,
		descending: descending,
		queryType: QueryType.Sort,
		toString(this: Sort<T>, sortSerializer: ((query: Query<any, any>) => string) | ((sort: Sort<T>) => string)) {
			if (isFunction) {
				throw Error('Cannot parse this sort type to an RQL query string');
			}
			return (sortSerializer || serializer || serialize)(this);
		},
		incremental: true
	};
}

function flip<T>(comparator: (a: T, b: T) => number) {
	return function(a: T, b: T) {
		return -1 * comparator(a, b);
	};
}

function serialize(sort: Sort<any>) {
	return `Sort(${sort.comparatorOrProperty}, ${sort.descending ? '-' : '+'})`;
}
// the `a == null` check returns `true` when a is `null` or `undefined`.
function sortValue(a: any, b: any) {
	let comparison: number;
	if (a == null && b == null) {
		comparison = 0;
	}
	else if (a == null && b != null) {
		comparison = -1;
	}
	else if (b == null && a != null) {
		comparison = 1;
	}
	else if (a < b) {
		comparison = -1;
	}
	else if (a > b) {
		comparison = 1;
	}
	else {
		comparison = 0;
	}
	return comparison;
}
