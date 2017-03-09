import { Query, QueryType, CrudOptions, UpdateResults } from '../interfaces';
import createFilter, { Filter } from '../query/createFilter';
import createRange, { StoreRange } from '../query/createStoreRange';
import createSort, { Sort } from '../query/createSort';
import Patch from '../patch/Patch';
import {
	MappedQueryResult, QueryResultInterface, MappedQueryResultInterface, QueryResult
} from './QueryResult';
import ObservableStore, { ObservableStoreInterface } from './ObservableStore';

export interface QueryableStoreInterface<
	T, O extends CrudOptions, U extends UpdateResults<T>
> extends ObservableStoreInterface<T, O, U> {
	/**
	 * Creates a query transform result with the provided query
	 * @param query
	 */
	query(query: Query<T>): MappedQueryResultInterface<T, this>;
	/**
	 * Creates a query transform result with the provided filter
	 * @param filter
	 */
	filter(filter: Filter<T>): MappedQueryResultInterface<T, this>;
	/**
	 * Creates a query transform result with a filter built from the provided test
	 * @param test
	 */
	filter(test: (item: T) => boolean): MappedQueryResultInterface<T, this>;
	/**
	 * Creates a query transform result with the provided range
	 * @param range
	 */
	range(range: StoreRange<T>): MappedQueryResultInterface<T, this>;
	/**
	 * Creates a query transform result with a range built based on the provided start and count
	 * @param start
	 * @param cound
	 */
	range(start: number, count: number): MappedQueryResultInterface<T, this>;
	/**
	 * Creates a query transform result with the provided sort or a sort build from the provided comparator or a
	 * comparator for the specified property
	 * @param sort
	 * @param descending
	 */
	sort(sort: Sort<T> | ((a: T, b: T) => number) | keyof T, descending?: boolean): MappedQueryResultInterface<T, this>;
	/**
	 * Create a query transform result that cannot be tracked, and cannot send tracked updates. This is the case because
	 * the resulting query transform result will have no way to identify items, making it impossible to determine
	 * whether their position has shifted or differentiating between updates and adds
	 * @param transformation
	 */
	transform<V>(transformation: Patch<T, V> | ((item: T) => V)): QueryResultInterface<V, this>;
	/**
	 * Create a trackable query transform result with the specified transformation
	 * @param transformation
	 * @param idTransform
	 */
	transform<V>(
		transformation: Patch<T, V> | ((item: T) => V), idTransform: string | ((item: V) => string)
	): MappedQueryResultInterface<V, this>;
}

/**
 * Check if this is a filter query or just a test function
 * @param filterOrTest
 * @returns {boolean}
 */
export function isFilter<T>(filterOrTest: Query<any> | ((item: T) => boolean)): filterOrTest is Filter<T> {
	return typeof filterOrTest !== 'function' && (<Query<any>> filterOrTest).queryType === QueryType.Filter;
}

/**
 * Check if this is a sort query or just a comparator
 * @param sortOrComparator
 * @returns {boolean}
 */
export function isSort<T>(sortOrComparator: Sort<T> | ((a: T, b: T) => number) | keyof T): sortOrComparator is Sort<T> {
	const paramType = typeof sortOrComparator;
	return paramType !== 'function' && paramType !== 'string' && typeof (<Sort<T>> sortOrComparator).apply === 'function';
}

class QueryableStore<T> extends ObservableStore<T> implements QueryableStoreInterface<T, CrudOptions, UpdateResults<T>> {
	query(query: Query<T>): MappedQueryResultInterface<T, this> {
		return new MappedQueryResult<T, this>({
			source: this,
			queriesAndTransformations: [ query ],
			fetchAroundUpdates: this.fetchAroundUpdates
		});
	}

	filter(filterOrTest: Filter<T> | ((item: T) => boolean)) {
		let filter: Filter<T>;
		if (isFilter(filterOrTest)) {
			filter = filterOrTest;
		}
		else {
			filter = createFilter<T>().custom(<(item: T) => boolean> filterOrTest);
		}

		return this.query(filter);
	}

	range(rangeOrStart: StoreRange<T> | number, count?: number) {
		let range: StoreRange<T>;
		if (typeof count !== 'undefined') {
			range = createRange<T>(<number> rangeOrStart, count);
		}
		else {
			range = <StoreRange<T>> rangeOrStart;
		}

		return this.query(range);
	}

	sort(sortOrComparator: Sort<T> | ((a: T, b: T) => number) | keyof T, descending?: boolean) {
		let sort: Sort<T>;
		if (isSort(sortOrComparator)) {
			sort = sortOrComparator;
		}
		else {
			sort = createSort(sortOrComparator, descending);
		}

		return this.query(sort);
	}

	transform<V>(transformation: Patch<T, V> | ((item: T) => V)): QueryResultInterface<V, this>;
	transform<V>(
		transformation: Patch<T, V> | ((item: T) => V), idTransform: string | ((item: V) => string)
	): MappedQueryResultInterface<V, this>;
	transform<V>(
		transformation: Patch<T, V> | ((item: T) => V), idTransform?: string | ((item: V) => string)
	): QueryResultInterface<V, this> | MappedQueryResultInterface<V, this> {
		const options = {
			source: this,
			queriesAndTransformations: [ { transformation: transformation, idTransform: idTransform} ],
			fetchAroundUpdates: this.fetchAroundUpdates
		};
		if (idTransform) {
			return new MappedQueryResult<V, this>(options);
		}
		else {
			return new QueryResult<V, this>(options);
		}
	}
}

export default QueryableStore;
