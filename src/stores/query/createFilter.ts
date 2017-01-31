import createJsonPointer, { JsonPointer, navigate } from '../patch/createJsonPointer';
import { isEqual } from '../utils';
import { Query, QueryType } from './interfaces';

export type FilterFunction<T> = (data: T[]) => T[];
export type ObjectPointer<T> = JsonPointer | keyof T | '';

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

function isBooleanOp(op: any): op is BooleanOp {
	return op === BooleanOp.And || op === BooleanOp.Or;
}
export type FilterChainMember<T> = SimpleFilter<T> | BooleanOp;

export interface FilterDescriptor<T> {
	readonly filterType: FilterType;
	readonly path: ObjectPointer<T>;
	readonly value: any;
}

export type FilterArrayEntry<T> = FilterDescriptor<T> | BooleanOp | FilterArray<T>;

export interface FilterArray<T> extends Array<FilterArrayEntry<T>> {}

export interface SimpleFilter<T> extends Query<T> {
	readonly filterType: FilterType;
	readonly test: (item: T) => boolean;
	readonly filterChain?: FilterChainMember<T>[];
	readonly path?: ObjectPointer<T>;
	readonly value?: any;
}

export interface BooleanFilter<T> extends SimpleFilter<T> {
	lessThan(path: ObjectPointer<T>, value: number): Filter<T>;
	lessThanOrEqualTo(path: ObjectPointer<T>, value: number): Filter<T>;
	greaterThan(path: ObjectPointer<T>, value: number): Filter<T>;
	greaterThanOrEqualTo(path: ObjectPointer<T>, value: number): Filter<T>;
	matches(path: ObjectPointer<T>, test: RegExp): Filter<T>;
	in<U>(path: ObjectPointer<T>, value: U[]): Filter<T>;
	contains<U>(path: ObjectPointer<T>, value: U): Filter<T>;
	equalTo<U>(path: ObjectPointer<T>, value: U): Filter<T>;
	deepEqualTo<U extends {}>(path: ObjectPointer<T>, value: U): Filter<T>;
	deepEqualTo<U>(path: ObjectPointer<T>, value: U[]): Filter<T>;
	notEqualTo<U>(path: ObjectPointer<T>, value: U): Filter<T>;
	notDeepEqualTo<U extends {}>(path: ObjectPointer<T>, value: U): Filter<T>;
	notDeepEqualTo<U>(path: ObjectPointer<T>, value: U[]): Filter<T>;
	custom(test: (item: T) => boolean): Filter<T>;
}

export interface Filter<T> extends BooleanFilter<T> {
	and(filter: Filter<T>): Filter<T>;
	and(): BooleanFilter<T>;
	or(filter: Filter<T>): Filter<T>;
	or(): BooleanFilter<T>;
}

function isFilter<T>(filterOrFunction: FilterChainMember<T>): filterOrFunction is Filter<T> {
	return typeof filterOrFunction !== 'function'  && (<any> filterOrFunction).apply;
}

function createFilterOrReturnOp<T>(descriptorOrOp: FilterDescriptor<T> | BooleanOp) {
	if (isBooleanOp(descriptorOrOp)) {
		return descriptorOrOp;
	}
	else {
		return createComparator<T>(
			descriptorOrOp.filterType,
			descriptorOrOp.value,
			descriptorOrOp.path
		);
	}
}

function createFilter<T>(filterDescriptors?: FilterDescriptor<T> | FilterArray<T>, serializer?: (filter: Filter<T>) => string): Filter<T> {
	let filters: FilterChainMember<T>[] = [];
	if (filterDescriptors) {
		if (Array.isArray(filterDescriptors)) {
			filters = filterDescriptors.map((descriptorChainMember) => {
				if (Array.isArray(descriptorChainMember)) {
					return createFilter<T>(descriptorChainMember);
				}
				else {
					return createFilterOrReturnOp<T>(descriptorChainMember);
				}
			});
		}
		else {
			filters.push(
				createComparator<T>(
					filterDescriptors.filterType,
					filterDescriptors.value,
					filterDescriptors.path
				)
			);
		}
	}

	return createFilterHelper(filters, serializer || serializeFilter);
}

export default createFilter;

function createFilterHelper<T>(filters: FilterChainMember<T>[], serializer: (filter: Filter<T>) => string): Filter<T> {
	// Small helpers to abstract common operations for building comparator filters
	// The main helper delegates to the factory, adding and AND operation before the next filter,
	// because by default each filter in a chain will be ANDed with the previous.
	function comparatorFilterHelper(filterType: FilterType, value: any, path?: ObjectPointer<T>): Filter<T> {
		path = path || createJsonPointer();
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
		toString(this: Filter<T>, filterSerializer?: ((query: Query<T>) => string) | ((filter: Filter<T>) => string)) {
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
		lessThan(path: ObjectPointer<T>, value: number) {
			return comparatorFilterHelper(FilterType.LessThan, value, path);
		},
		lessThanOrEqualTo(path: ObjectPointer<T>, value: number) {
			return comparatorFilterHelper(FilterType.LessThanOrEqualTo, value, path);
		},
		greaterThan(path: ObjectPointer<T>, value: number) {
			return comparatorFilterHelper(FilterType.GreaterThan, value, path);
		},
		greaterThanOrEqualTo(path: ObjectPointer<T>, value: number) {
			return comparatorFilterHelper(FilterType.GreaterThanOrEqualTo, value, path);
		},
		matches(path: ObjectPointer<T>, value: RegExp) {
			return comparatorFilterHelper(FilterType.Matches, value, path);
		},
		'in': function(path: ObjectPointer<T>, value: any) {
			return comparatorFilterHelper(FilterType.In, value, path);
		},
		contains(path: ObjectPointer<T>, value: any) {
			return comparatorFilterHelper(FilterType.Contains, value, path);
		},
		equalTo(path: ObjectPointer<T>, value: any) {
			return comparatorFilterHelper(FilterType.EqualTo, value, path);
		},
		deepEqualTo(path: ObjectPointer<T>, value: any) {
			return comparatorFilterHelper(FilterType.DeepEqualTo, value, path);
		},
		notEqualTo(path: ObjectPointer<T>, value: any) {
			return comparatorFilterHelper(FilterType.NotEqualTo, value, path);
		},
		notDeepEqualTo(path: ObjectPointer<T>, value: any) {
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

function createComparator<T>(operator: FilterType, value: any, path: ObjectPointer<T>): SimpleFilter<T> {
	const jsonPointer = typeof path === 'string' ? createJsonPointer(path) : path as JsonPointer;
	let test: (property: any) => boolean;
	const filterType: FilterType = operator;
	let operatorString: string;
	switch (operator) {
		case FilterType.LessThan:
			test = function(property) {
				return property < value;
			};
			operatorString = 'lt';
			break;
		case FilterType.LessThanOrEqualTo:
			test = function(property) {
				return property <= value;
			};
			operatorString = 'lte';
			break;
		case FilterType.GreaterThan:
			test = function(property) {
				return property > value;
			};
			operatorString = 'gt';
			break;
		case FilterType.GreaterThanOrEqualTo:
			test = function(property) {
				return property >= value;
			};
			operatorString = 'gte';
			break;
		case FilterType.EqualTo:
			test = function(property) {
				return property === value;
			};
			operatorString = 'eq';
			break;
		case FilterType.NotEqualTo:
			test = function(property) {
				return property !== value;
			};
			operatorString = 'ne';
			break;
		case FilterType.DeepEqualTo:
			test = function(property) {
				return isEqual(property, value);
			};
			operatorString = 'eq';
			break;
		case FilterType.NotDeepEqualTo:
			test = function(property) {
				return !isEqual(property, value);
			};
			operatorString = 'ne';
			break;
		case FilterType.Contains:
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
			test = function(propertyOrItem) {
				return Array.isArray(value) && value.indexOf(propertyOrItem) > -1;
			};
			operatorString = 'in';
			break;
		case FilterType.Matches:
			test = function(property) {
				return value.test(property);
			};
			break;
		case FilterType.Custom:
			test = value;
			break;
		// unreachable lines
		// default:
		// return null;
	}
	return {
		test(item: T) {
			let propertyValue: any = navigate(jsonPointer, item);
			return test(propertyValue);
		},
		apply(this: Filter<T>, data: T[]) {
			return data.filter(this.test);
		},
		toString() {
			if (!operatorString) {
				throw Error('Cannot parse this filter type to an RQL query string');
			}
			return `${operatorString}(${jsonPointer.toString()}, ${JSON.stringify(value)})`;
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
