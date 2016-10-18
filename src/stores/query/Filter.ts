import JsonPointer, { navigate, createPointer } from '../patch/JsonPointer';
import { isEqual } from '../utils';
import { Query, QueryType } from './createQuery';

export type FilterFunction<T> = (data: T[]) => T[];
export type ObjectPointer = JsonPointer | string;

export const enum FilterType {
	LessThan,
	GreaterThan,
	EqualTo,
	DeepEqualTo,
	In,
	Contains,
	NotEqualTo,
	NotDeepEqualTo,
	LessThanOrEqualTo,
	GreaterThanOrEqualTo,
	Matches,
	Custom,
	Compound
}

export const enum BooleanOp {
	And,
	Or
}

export type FilterChainMember<T> = (SimpleFilter<T> | BooleanOp);

export interface SimpleFilter<T> extends Query<T, T> {
	readonly filterType: FilterType;
	readonly test?: (item: T) => boolean;
	readonly filterChain?: FilterChainMember<T>[];
	readonly path?: ObjectPointer;
	readonly value?: any;
}
export interface BooleanFilter<T> extends SimpleFilter<T> {
	lessThan(path: ObjectPointer, value: number): Filter<T>;
	lessThanOrEqualTo(path: ObjectPointer, value: number): Filter<T>;
	greaterThan(path: ObjectPointer, value: number): Filter<T>;
	greaterThanOrEqualTo(path: ObjectPointer, value: number): Filter<T>;
	matches(path: ObjectPointer, test: RegExp): Filter<T>;
	in<U>(path: ObjectPointer, value: U[]): Filter<T>;
	contains<U>(path: ObjectPointer, value: U): Filter<T>;
	equalTo<U>(path: ObjectPointer, value: U): Filter<T>;
	deepEqualTo<U extends {}>(path: ObjectPointer, value: U): Filter<T>;
	deepEqualTo<U>(path: ObjectPointer, value: U[]): Filter<T>;
	notEqualTo<U>(path: ObjectPointer, value: U): Filter<T>;
	notDeepEqualTo<U extends {}>(path: ObjectPointer, value: U): Filter<T>;
	notDeepEqualTo<U>(path: ObjectPointer, value: U[]): Filter<T>;
	custom(test: (item: T) => boolean): Filter<T>;
}

export interface Filter<T> extends BooleanFilter<T> {
	and(filter: Filter<T>): Filter<T>;
	and(): BooleanFilter<T>;
	or(filter: Filter<T>): Filter<T>;
	or(): BooleanFilter<T>;
}

export default Filter;

function isFilter<T>(filterOrFunction: FilterChainMember<T>): filterOrFunction is Filter<T> {
	return typeof filterOrFunction !== 'function'  && (<any> filterOrFunction).apply;
}

export function createFilter<T>(serializer?: (filter: Filter<T>) => string): Filter<T> {
	// var subFilters: NestedFilter<T> = subFilters || [];
	let filters: FilterChainMember<T>[] = [];
	serializer = serializer || serializeFilter;

	return createFilterHelper(filters, serializer);
}

function createFilterHelper<T>(filters: FilterChainMember<T>[], serializer?: (filter: Filter<T>) => string): Filter<T> {
	// Small helpers to abstract common operations for building comparator filters
	// The main helper delegates to the factory, adding and AND operation before the next filter,
	// because by default each filter in a chain will be ANDed with the previous.
	function comparatorFilterHelper(filterType: FilterType, value: any, path?: ObjectPointer): Filter<T> {
		const needsOperator = filters.length > 0 &&
			(filters[filters.length - 1] !== BooleanOp.And && filters[filters.length - 1] !== BooleanOp.Or);
		const newFilters = needsOperator ? [ ...filters, BooleanOp.And, createComparator<T>(filterType, value, path) ] :
			[ ...filters, createComparator<T>(filterType, value, path) ];
		return createFilterHelper(newFilters, serializer);
	}

	const filter: Filter<T> = {
		test(item) {
			return applyFilterChain(item, filters);
		},
		filterType: FilterType.Compound,
		apply(this: Filter<T>, data: T[]) {
			return data.filter(this.test);
		},
		filterChain: filters,
		toString(this: Filter<T>, filterSerializer?: ((query: Query<any, any>) => string) | ((filter: Filter<T>) => string)) {
			return (filterSerializer || serializer)(this);
		},
		and(this: Filter<T>, newFilter?: Filter<T>) {
			let newFilters: FilterChainMember<T>[] = [];
			if (newFilter) {
				newFilters.push(this, BooleanOp.And, newFilter);
			}
			else if (filters.length) {
				newFilters.push(...filters, BooleanOp.And);
			}
			return createFilterHelper(newFilters, serializer);
		},
		or(this: Filter<T>, newFilter?: Filter<T>) {
			let newFilters: FilterChainMember<T>[] = [];
			if (newFilter) {
				newFilters.push(this, BooleanOp.Or, newFilter);
			}
			else if (filters.length) {
				newFilters.push(...filters, BooleanOp.Or);
			}
			return createFilterHelper(newFilters, serializer);
		},
		lessThan(path: ObjectPointer, value: number) {
			return comparatorFilterHelper(FilterType.LessThan, value, path);
		},
		lessThanOrEqualTo(path: ObjectPointer, value: number) {
			return comparatorFilterHelper(FilterType.LessThanOrEqualTo, value, path);
		},
		greaterThan(path: ObjectPointer, value: number) {
			return comparatorFilterHelper(FilterType.GreaterThan, value, path);
		},
		greaterThanOrEqualTo(path: ObjectPointer, value: number) {
			return comparatorFilterHelper(FilterType.GreaterThanOrEqualTo, value, path);
		},
		matches(path: ObjectPointer, value: RegExp) {
			return comparatorFilterHelper(FilterType.Matches, value, path);
		},
		'in': function(path: ObjectPointer, value: any) {
			return comparatorFilterHelper(FilterType.In, value, path);
		},
		contains(path: ObjectPointer, value: any) {
			return comparatorFilterHelper(FilterType.Contains, value, path);
		},
		equalTo(path: ObjectPointer, value: any) {
			return comparatorFilterHelper(FilterType.EqualTo, value, path);
		},
		deepEqualTo(path: ObjectPointer, value: any) {
			return comparatorFilterHelper(FilterType.DeepEqualTo, value, path);
		},
		notEqualTo(path: ObjectPointer, value: any) {
			return comparatorFilterHelper(FilterType.NotEqualTo, value, path);
		},
		notDeepEqualTo(path: ObjectPointer, value: any) {
			return comparatorFilterHelper(FilterType.NotDeepEqualTo, value, path);
		},
		custom(test: (item: T) => boolean) {
			return comparatorFilterHelper(FilterType.Custom, test);
		},
		queryType: QueryType.Filter,
		incremental: true
	};

	return filter;
}

function applyFilterChain<T>(item: T, filterChain: FilterChainMember<T>[]): boolean {
	let ordFilterSections: FilterChainMember<T>[][] = [];
	let startOfSlice = 0;
	// Ands have higher precedence, so split into chains of
	// ands between ors.
	filterChain.forEach(function(chainMember, i) {
		if (chainMember === BooleanOp.Or) {
			ordFilterSections.push(filterChain.slice(startOfSlice, i));
			startOfSlice = i + 1;
		}
	});

	if (startOfSlice < filterChain.length) {
		ordFilterSections.push(filterChain.slice(startOfSlice, filterChain.length));
	}

	// These sections are or'd together so only
	// one has to pass
	return ordFilterSections.some(function(filterChain: FilterChainMember<T>[]) {
		// The individual filters are and'd together, so if any
		// fails the whole section fails
		return filterChain.every(function(filterOrAnd: FilterChainMember<T>) {
			if (isFilter(filterOrAnd)) {
				return filterOrAnd.test(item);
			}
			else {
				return true;
			}
		});
	});
}

function createComparator<T>(operator: FilterType, value: any, path?: ObjectPointer): SimpleFilter<T> {
	path = typeof path === 'string' ? createPointer(path) : path;
	let test: (property: any) => boolean;
	let filterType: FilterType;
	let operatorString: string;
	switch (operator) {
		case FilterType.LessThan:
			filterType = FilterType.LessThan;
			test = function(property) {
				return property < value;
			};
			operatorString = 'lt';
			break;
		case FilterType.LessThanOrEqualTo:
			filterType = FilterType.LessThanOrEqualTo;
			test = function(property) {
				return property <= value;
			};
			operatorString = 'lte';
			break;
		case FilterType.GreaterThan:
			filterType = FilterType.GreaterThan;
			test = function(property) {
				return property > value;
			};
			operatorString = 'gt';
			break;
		case FilterType.GreaterThanOrEqualTo:
			filterType = FilterType.GreaterThanOrEqualTo;
			test = function(property) {
				return property >= value;
			};
			operatorString = 'gte';
			break;
		case FilterType.EqualTo:
			filterType = FilterType.EqualTo;
			test = function(property) {
				return property === value;
			};
			operatorString = 'eq';
			break;
		case FilterType.NotEqualTo:
			filterType = FilterType.NotEqualTo;
			test = function(property) {
				return property !== value;
			};
			operatorString = 'ne';
			break;
		case FilterType.DeepEqualTo:
			filterType = FilterType.DeepEqualTo;
			test = function(property) {
				return isEqual(property, value);
			};
			operatorString = 'eq';
			break;
		case FilterType.NotDeepEqualTo:
			filterType = FilterType.NotDeepEqualTo;
			test = function(property) {
				return !isEqual(property, value);
			};
			operatorString = 'ne';
			break;
		case FilterType.Contains:
			filterType = FilterType.Contains;
			test = function(propertyOrItem) {
				if (Array.isArray(propertyOrItem)) {
					return propertyOrItem.indexOf(value) > -1;
				}
				else {
					return propertyOrItem && Boolean(propertyOrItem[value]);
				}
			};
			operatorString = 'contains';
			break;
		case FilterType.In:
			filterType = FilterType.In;
			test = function(propertyOrItem) {
				return Array.isArray(value) && value.indexOf(propertyOrItem) > -1;
			};
			operatorString = 'in';
			break;
		case FilterType.Matches:
			filterType = FilterType.Matches;
			test = function(property) {
				return value.test(property);
			};
			break;
		case FilterType.Custom:
			filterType = FilterType.Custom;
			test = value;
			break;
		// unreachable lines
		// default:
		// return null;
	}
	return {
		test(item: T) {
			let propertyValue: any = path ? navigate(<JsonPointer> path, item) : item;
			return test(propertyValue);
		},
		apply(this: Filter<T>, data: T[]) {
			return data.filter(this.test);
		},
		toString() {
			if (!operatorString) {
				throw Error('Cannot parse this filter type to an RQL query string');
			}
			return `${operatorString}(${path.toString()}, ${JSON.stringify(value)})`;
		},
		path: path,
		value: value,
		filterType: filterType,
		queryType: QueryType.Filter
	};
}

//// Default serialization function
function serializeFilter(filter: Filter<any>): string {
	let operator = '&';
	if (filter.filterChain && filter.filterChain.length > 0) {
		return filter.filterChain.reduce(function(prev: string, next: FilterChainMember<any>) {
			if (isFilter(next)) {
				const start = next.filterChain ? '(' : '';
				const end = next.filterChain ? ')' : '';
				return prev + (prev ? operator : '') + (prev ? start : '') + next.toString() + (prev ? end : '');
			}
			else if (next === BooleanOp.And) {
				operator = '&';
				return prev;
			}
			else {
				operator = '|';
				return prev;
			}
		}, '');
	}
	else {
		return '';
	}
}
