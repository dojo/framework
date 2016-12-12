import WeakMap from 'dojo-shim/WeakMap';
import compose, { ComposeFactory } from 'dojo-compose/compose';
import { Query, QueryType } from './interfaces';

export interface CompoundQuery<T> extends Query<T> {
	withQuery(query: Query<T>): CompoundQuery<T>;
}

export interface QueryOptions<T> {
	query: Query<T>;
	queryStringBuilder?: (query: CompoundQuery<T>) => string;
}

interface QueryState<T> {
	queries: Query<T>[];
	finalQuery: Query<T>;
	queryStringBuilder: (query: CompoundQuery<T>) => string;
}

const instanceStateMap = new WeakMap<Query<{}>, QueryState<{}>>();

export interface QueryFactory extends ComposeFactory<CompoundQuery<{}>, QueryOptions<{}>> {
	<T extends {}>(options?: QueryOptions<T>): CompoundQuery<T>;
}

const createCompoundQuery: QueryFactory = compose<CompoundQuery<{}>, QueryOptions<{}>>({
	queryType: QueryType.Compound,

	apply(this: Query<{}>, data: {}[]): {}[] {
		const state = instanceStateMap.get(this);
		return state.finalQuery.apply(state.queries.reduce(function(prev, next) {
			return next.apply(prev);
		}, data));
	},

	withQuery(this: Query<{}>, query: Query<{}>): CompoundQuery<{}> {
		const state = instanceStateMap.get(this);
		const isCompound = query.queryType === QueryType.Compound;

		const compundQuery = query as CompoundQuery<{}>;
		let queries = [ ...state.queries, state.finalQuery, ...(isCompound ? instanceStateMap.get(compundQuery).queries : []) ];
		let finalQuery = isCompound ? instanceStateMap.get(compundQuery).finalQuery : query;
		const newQuery = createCompoundQuery({ query: finalQuery });

		const newQueryState = instanceStateMap.get(newQuery);
		newQueryState.queries = queries;

		return newQuery;
	},

	toString(this: Query<{}>, querySerializer?: ((query: Query<{}>) => string) | ((query: CompoundQuery<{}>) => string)): string {
		const state = instanceStateMap.get(this);
		return ( querySerializer || state.queryStringBuilder)(this);
	},

	get incremental(this: Query<{}>) {
		const state = instanceStateMap.get(this);
		return [ ...state.queries, state.finalQuery ].every(function(query: Query<any>) {
			return Boolean(query.incremental);
		});
	}
}, function<T>(instance: Query<T>, options: QueryOptions<T>) {
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
