import { Query, QueryType } from './interfaces';
import { JsonPointer, navigate } from '../patch/createJsonPointer';

export interface Sort<T> extends Query<T> {
	readonly comparatorOrProperty: ((a: T, b: T) => number) | string | JsonPointer;
	readonly descending?: boolean;
}

function createSort<T>(
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
			comparator = function(a: T, b: T) {
				return sortValue((<any> a)[comparatorOrProperty], (<any> b)[comparatorOrProperty], Boolean(descending));
			};
		}
		else {
			pointer = <JsonPointer> comparatorOrProperty;
			comparator = function(a: T, b: T) {
				return sortValue(navigate(pointer, a), navigate(pointer, b), Boolean(descending));
			};
		}
	}

	if (descending && isFunction) {
		comparator = flip(comparator);
	}
	return {
		apply(data: T[]) {
			return data.sort(comparator);
		},
		comparatorOrProperty: comparatorOrProperty,
		descending: descending,
		queryType: QueryType.Sort,
		toString(this: Sort<T>, sortSerializer: ((sort: Sort<T>) => string)) {
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
function sortValue(a: any, b: any, descending: boolean) {
	let comparison: number;
	a != null && (a = a.valueOf());
	b != null && (b = b.valueOf());
	if (a === b) {
		comparison = 0;
	}
	else {
		// undefined < null < defined
		const isALessThanB = typeof a === 'undefined' ||
			a === null && typeof b !== 'undefined' ||
			b != null && a < b;
		comparison = descending === isALessThanB ? 1 : -1;
	}
	return comparison;
}

export default createSort;
