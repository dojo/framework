import WeakMap from 'dojo-shim/WeakMap';
import compose, { ComposeFactory } from 'dojo-compose/compose';
import { Query, QueryType } from './interfaces';

export interface CompoundQuery<T, U> extends Query<T, U> {
	withQuery: <V>(query: Query<U, V>) => CompoundQuery<T, V>;
}

export interface QueryOptions<T, U> {
	query: Query<any, U>;
	queryStringBuilder?: (query: CompoundQuery<any, any>) => string;
}

interface QueryState<T, U> {
	queries: Query<any, any>[];
	finalQuery: Query<any, U>;
	queryStringBuilder: (query: CompoundQuery<any, any>) => string;
}

const instanceStateMap = new WeakMap<Query<{}, {}>, QueryState<{}, {}>>();

export interface QueryFactory extends ComposeFactory<CompoundQuery<{}, {}>, QueryOptions<{}, {}>> {
	<T extends {}, U extends {}>(options?: QueryOptions<T, U>): CompoundQuery<T, U>;
}

const createCompoundQuery: QueryFactory = compose<CompoundQuery<{}, {}>, QueryOptions<{}, {}>>({
	queryType: QueryType.Compound,

	apply(this: Query<{}, {}>, data: {}[]): {}[] {
		const state = instanceStateMap.get(this);
		return state.finalQuery.apply(state.queries.reduce(function(prev, next) {
			return next.apply(prev);
		}, data));
	},

	withQuery<V>(this: Query<{}, {}>, query: Query<{}, V>): CompoundQuery<{}, {}> {
		const state = instanceStateMap.get(this);
		const isCompound = query.queryType === QueryType.Compound;

		const compundQuery = query as CompoundQuery<{}, V>;
		let queries = [ ...state.queries, state.finalQuery, ...(isCompound ? instanceStateMap.get(compundQuery).queries : []) ];
		let finalQuery = isCompound ? instanceStateMap.get(compundQuery).finalQuery : query;
		const newQuery = createCompoundQuery({ query: finalQuery });

		const newQueryState = instanceStateMap.get(newQuery);
		newQueryState.queries = queries;

		return newQuery;
	},

	toString(this: Query<{}, {}>, querySerializer?: ((query: Query<any, any>) => string) | ((query: CompoundQuery<any, any>) => string)): string {
		const state = instanceStateMap.get(this);
		return ( querySerializer || state.queryStringBuilder)(this);
	},

	get incremental(this: Query<{}, {}>) {
		const state = instanceStateMap.get(this);
		return [ ...state.queries, state.finalQuery ].every(function(query: Query<any, any>) {
			return query.incremental;
		});
	}
}, function<T, U>(instance: Query<T, U>, options: QueryOptions<T, U>) {

	instanceStateMap.set(instance, {
		finalQuery: options.query,
		queries: [],
		queryStringBuilder: options.queryStringBuilder || function(query) {
			const state = instanceStateMap.get(query);
			return [ ...state.queries, state.finalQuery ].join('&');
		}
	});
});

export default createCompoundQuery;
