import { Query, QueryType } from './interfaces';
import { JsonPointer, navigate } from '../patch/createJsonPointer';

export type SortParameter<T> = ((a: T, b: T) => number) | keyof T | JsonPointer;
export interface Sort<T> extends Query<T> {
	readonly sortParameters: SortParameter<T>[];
	readonly descending?: boolean[];
}

function isDescending(descending: boolean[] | undefined, index: number) {
	if (!descending) {
		return false;
	}
	else if (typeof descending[index] !== 'undefined') {
		return descending[index];
	}
	else {
		return descending[0];
	}
}

function createSort<T>(
	comparatorOrProperty: SortParameter<T> | SortParameter<T>[],
	descending?: boolean | boolean[],
	serializer?: (sort: Sort<T>) => string): Sort<T> {

	let anyAreFunction = false;
	const sortParameterArray: SortParameter<T>[] = Array.isArray(comparatorOrProperty) ? comparatorOrProperty : [ comparatorOrProperty ];
	const descendingArray: boolean[] | undefined = descending ?
		(Array.isArray(descending) ? descending : [ descending ]) : undefined;
	const comparators: ((a: T, b: T) => number)[] = sortParameterArray.map((comparatorOrProperty, index) => {
		const isFunction = typeof comparatorOrProperty === 'function';
		const descending = isDescending(descendingArray, index);
		let comparator: (a: T, b: T) => number;
		if (isFunction) {
			anyAreFunction = true;
			comparator = <any> comparatorOrProperty;
		}
		else {
			let pointer: JsonPointer;
			if (typeof comparatorOrProperty === 'string') {
				comparator = (a: T, b: T) => {
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

		return comparator;
	});
	const comparator =
		comparators.length > 1 ? (a: T, b: T) => comparators.reduce((prev, next) => prev || next(a, b), 0) : comparators[0];
	return {
		apply(data: T[]) {
			return data.sort(comparator);
		},
		sortParameters: sortParameterArray,
		descending: descendingArray,
		queryType: QueryType.Sort,
		toString(this: Sort<T>, sortSerializer: ((sort: Sort<T>) => string)) {
			if (anyAreFunction) {
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
	return 'sort(' + sort.sortParameters.map((param, index) => {
		const descending = isDescending(sort.descending, index);
		return (descending ? '-' : '+') + param;
	}).join(',')  + ')';
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
