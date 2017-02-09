import { Query, QueryType } from '../../query/interfaces';
import createFilter, { Filter } from '../../query/createFilter';
import createRange, { StoreRange } from '../../query/createStoreRange';
import { StoreOptions, CrudOptions, UpdateResults } from '../createStore';
import createSort, { Sort } from '../../query/createSort';
import { ComposeMixinDescriptor, ComposeFactory } from '@dojo/compose/compose';
import { ObservableStore, createObservableStore, ObservableStoreOptions } from './createObservableStoreMixin';
import Patch from '../../patch/Patch';
import createMappedQueryTransformResult, { QueryTransformResult, MappedQueryTransformResult, createQueryTransformResult } from '../createQueryTransformResult';
import WeakMap from '@dojo/shim/WeakMap';

export interface QueryTransformMixin<T, S extends ObservableStore<T, any, any>> {
	/**
	 * Creates a query transform result with the provided query
	 * @param query
	 */
	query(query: Query<T>): MappedQueryTransformResult<T, S & QueryTransformMixin<T, S>>;
	/**
	 * Creates a query transform result with the provided filter
	 * @param filter
	 */
	filter(filter: Filter<T>): MappedQueryTransformResult<T, S & QueryTransformMixin<T, S>>;
	/**
	 * Creates a query transform result with a filter built from the provided test
	 * @param test
	 */
	filter(test: (item: T) => boolean): MappedQueryTransformResult<T, S & QueryTransformMixin<T, S>>;
	/**
	 * Creates a query transform result with the provided range
	 * @param range
	 */
	range(range: StoreRange<T>): MappedQueryTransformResult<T, S & QueryTransformMixin<T, S>>;
	/**
	 * Creates a query transform result with a range built based on the provided start and count
	 * @param start
	 * @param cound
	 */
	range(start: number, count: number): MappedQueryTransformResult<T, S & QueryTransformMixin<T, S>>;
	/**
	 * Creates a query transform result with the provided sort or a sort build from the provided comparator or a
	 * comparator for the specified property
	 * @param sort
	 * @param descending
	 */
	sort(sort: Sort<T> | ((a: T, b: T) => number) | string, descending?: boolean): MappedQueryTransformResult<T, S & QueryTransformMixin<T, S>>;
	/**
	 * Create a query transform result that cannot be tracked, and cannot send tracked updates. This is the case because
	 * the resulting query transform result will have no way to identify items, making it impossible to determine
	 * whether their position has shifted or differentiating between updates and adds
	 * @param transformation
	 */
	transform<V>(transformation: Patch<T, V> | ((item: T) => V)): QueryTransformResult<V, S & QueryTransformMixin<T, S>>;
	/**
	 * Create a trackable query transform result with the specified transformation
	 * @param transformation
	 * @param idTransform
	 */
	transform<V>(transformation: Patch<T, V> | ((item: T) => V), idTransform: string | ((item: V) => string)): MappedQueryTransformResult<V, S & QueryTransformMixin<T, S>>;
}

export interface QueryTransformState {
	/**
	 * We have to track whether we're fetching around updates because the query transform results need to know this in
	 * order to determine whether they can fully trust the data provided to them from the source store's observabel
	 */
	fetchAroundUpdates: boolean;
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
export function isSort<T>(sortOrComparator: Sort<T> | ((a: T, b: T) => number) | string): sortOrComparator is Sort<T> {
	const paramType = typeof sortOrComparator;
	return paramType !== 'function' && paramType !== 'string' && typeof (<Sort<T>> sortOrComparator).apply === 'function';
}

export type QueryStore<T, S extends ObservableStore<T, any, any>> = QueryTransformMixin<T, S> & S;

export interface QueryStoreFactory extends ComposeFactory<QueryStore<any, any>, StoreOptions<any, any>> {
	<T, S extends ObservableStore<T, any, any>>(options?: ObservableStoreOptions<T, CrudOptions>): QueryStore<T, S>;
}

export interface SimpleQueryStoreFactory extends ComposeFactory<QueryStore<any, any>, StoreOptions<any, any>> {
	<T>(options?: ObservableStoreOptions<T, CrudOptions>): QueryStore<T, ObservableStore<T, CrudOptions, UpdateResults<T>>>;
}

const instanceStateMap = new WeakMap<any, QueryTransformState>();

function createQueryTransformMixin<T, S extends ObservableStore<T, any, any>>(): ComposeMixinDescriptor<
	ObservableStore<T, any, any>,
	StoreOptions<T, any>,
	QueryTransformMixin<T, S>,
	StoreOptions<T, any>
> {
	const queryMixin: QueryTransformMixin<T, S> = {
		query(this: QueryStore<T, S>, query: Query<T>) {
			return createMappedQueryTransformResult<T, QueryStore<T, S>>({
				source: this,
				queriesAndTransformations: [ query ],
				fetchAroundUpdates: instanceStateMap.get(this).fetchAroundUpdates
			});
		},

		filter(this: QueryStore<T, S>, filterOrTest: Filter<T> | ((item: T) => boolean)) {
			let filter: Filter<T>;
			if (isFilter(filterOrTest)) {
				filter = filterOrTest;
			}
			else {
				filter = createFilter<T>().custom(<(item: T) => boolean> filterOrTest);
			}

			return this.query(filter);
		},

		range(this: QueryStore<T, S>, rangeOrStart: StoreRange<T> | number, count?: number) {
			let range: StoreRange<T>;
			if (typeof count !== 'undefined') {
				range = createRange<T>(<number> rangeOrStart, count);
			}
			else {
				range = <StoreRange<T>> rangeOrStart;
			}

			return this.query(range);
		},

		sort(this: QueryStore<T, S>, sortOrComparator: Sort<T> | ((a: T, b: T) => number), descending?: boolean) {
			let sort: Sort<T>;
			if (isSort(sortOrComparator)) {
				sort = sortOrComparator;
			}
			else {
				sort = createSort(sortOrComparator, descending);
			}

			return this.query(sort);
		},

		transform<V>(this: QueryStore<T, S>, transformation: Patch<T, V> | ((item: T) => V), idTransform?: string | ((item: V) => string)): any {
			const options = {
				source: this,
				queriesAndTransformations: [ { transformation: transformation, idTransform: idTransform} ],
				fetchAroundUpdates: instanceStateMap.get(this).fetchAroundUpdates
			};
			if (idTransform) {
				return createMappedQueryTransformResult<V, QueryStore<T, S>>(options);
			}
			else {
				return createQueryTransformResult<V, QueryStore<T, S>>(options);
			}
		}
	};
	return 	{
		mixin: queryMixin,
		initialize(instance: QueryStore<T, S>, options?: { fetchAroundUpdates?: boolean}) {
			instanceStateMap.set(instance, {
				fetchAroundUpdates: (options && options.fetchAroundUpdates) || false
			});
		}
	};
}

export default createQueryTransformMixin;

export const createQueryStore: SimpleQueryStoreFactory = createObservableStore
	.mixin(createQueryTransformMixin());
