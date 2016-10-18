import createCompoundQuery, { Query, QueryType, CompoundQuery } from '../../query/createQuery';
import Filter, { createFilter } from '../../query/Filter';
import StoreRange, { createRange } from '../../query/StoreRange';
import { CrudOptions, Store } from '../createStore';
import { SubcollectionStore, SubcollectionOptions } from '../createSubcollectionStore';
import WeakMap from 'dojo-shim/WeakMap';
import { UpdateResults } from '../../storage/createInMemoryStorage';
import { Sort, createSort } from '../../query/Sort';
import { ComposeMixinDescriptor } from 'dojo-compose/compose';

// export interface QueryMixin<T, O extends CrudOptions, U extends UpdateResults<T>, C extends SubcollectionStore<T, O, U, C>> extends SubcollectionStore<T, O, U, C> {
export interface QueryMixin<T, O extends CrudOptions, U extends UpdateResults<T>, C extends Store<T, O, U>> {
	query(query: Query<T, T>): C & this;
	filter(filter: Filter<T>): C & this;
	filter(test: (item: T) => boolean): C & this;
	range(range: StoreRange<T>): C & this;
	range(start: number, count: number): C & this;
	sort(sort: Sort<T> | ((a: T, b: T) => number) | string, descending?: boolean): C & this;
}

export type QueryStore<T, O extends CrudOptions, U extends UpdateResults<T>, C extends Store<T, O, U>> = QueryMixin<T, O, U, C> & C;

export interface QueryOptions<T> {
	sourceQuery?: Query<T, T>;
}

interface QueryState<T> {
	sourceQuery?: Query<T, T>;
}
const instanceStateMap = new WeakMap<QueryMixin<any, any, UpdateResults<any>, any>, QueryState<any>>();

function isFilter<T>(filterOrTest: Query<any, any> | ((item: T) => boolean)): filterOrTest is Filter<T> {
	return typeof filterOrTest !== 'function' && (<Query<any, any>> filterOrTest).queryType === QueryType.Filter;
}

function isSort<T>(sortOrComparator: Sort<T> | ((a: T, b: T) => number) | string): sortOrComparator is Sort<T> {
	const paramType = typeof sortOrComparator;
	return paramType !== 'function' && paramType !== 'string' && typeof (<Sort<T>> sortOrComparator).apply === 'function';
}

type QueryStoreSubCollection<T, O extends CrudOptions, U extends UpdateResults<T>, C extends Store<T, O, U>> =
	QueryMixin<T, O, U, C> & SubcollectionStore<T, O, U, C & QueryMixin<T, O, U, C>>;

function createQueryMixin<T, O extends CrudOptions, U extends UpdateResults<T>, C extends Store<T, O, U>>(): ComposeMixinDescriptor<
	SubcollectionStore<T, O, U, any>,
	SubcollectionOptions<T, O, U>,
	QueryMixin<T, O, U, C>,
	QueryOptions<T>
> {
	const queryMixin: QueryMixin<T, O, U, C> = {

		query(this: QueryStoreSubCollection<T, O, U, C>, query: Query<T, T>) {
			const state = instanceStateMap.get(this);
			if (state.sourceQuery) {
				const compoundQuery = state.sourceQuery.queryType === QueryType.Compound ?
					<CompoundQuery<T, T>> state.sourceQuery : createCompoundQuery({ query: state.sourceQuery });

				query = compoundQuery.withQuery(query);
			}
			return this.createSubcollection({
				sourceQuery: query
			});
		},

		filter(this: QueryStore<T, O, U, C>, filterOrTest: Filter<T> | ((item: T) => boolean)) {
			let filter: Filter<T>;
			if (isFilter(filterOrTest)) {
				filter = filterOrTest;
			}
			else {
				filter = createFilter<T>().custom(<(item: T) => boolean> filterOrTest);
			}

			return this.query(filter);
		},

		range(this: QueryStore<T, O, U, C>, rangeOrStart: StoreRange<T> | number, count?: number) {
			let range: StoreRange<T>;
			if (typeof count !== 'undefined') {
				range = createRange<T>(<number> rangeOrStart, count);
			}
			else {
				range = <StoreRange<T>> rangeOrStart;
			}

			return this.query(range);
		},

		sort(this: QueryStore<T, O, U, C>, sortOrComparator: Sort<T> | ((a: T, b: T) => number), descending?: boolean) {
			let sort: Sort<T>;
			if (isSort(sortOrComparator)) {
				sort = sortOrComparator;
			}
			else {
				sort = createSort(sortOrComparator, descending);
			}

			return this.query(sort);
		}

	};
	return 	{
		mixin: queryMixin,
		aspectAdvice: {
			before: {
				fetch(this: QueryStore<T, O, U, C>, ...args: any[]) {
					const state = instanceStateMap.get(this);
					let query = <Query<T, T>> args[0];
					if (state && state.sourceQuery) {
						if (query) {
							const compoundQuery = state.sourceQuery.queryType === QueryType.Compound ?
								<CompoundQuery<T, T>> state.sourceQuery : createCompoundQuery({ query: state.sourceQuery });

							query = compoundQuery.withQuery(query);
						}
						else {
							query = state.sourceQuery;
						}
						args[0] = query;
					}
					return args;
				},

				createSubcollection(this: QueryStore<T, O, U, C>, options?: QueryOptions<T>) {
					options = options || {};
					const state = instanceStateMap.get(this);
					if (!options.sourceQuery && state.sourceQuery) {
						options.sourceQuery = state.sourceQuery;
					}
					return [ options ];
				}
			}
		},
		initialize: function(instance: QueryStoreSubCollection<T, O, U, C>, options?: QueryOptions<T>) {
			options = options || {};
			instanceStateMap.set(instance, {
				sourceQuery: options.sourceQuery
			});
		}
	};
}

export default createQueryMixin;
