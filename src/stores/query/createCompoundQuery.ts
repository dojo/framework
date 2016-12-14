import WeakMap from 'dojo-shim/WeakMap';
import compose, { ComposeFactory } from 'dojo-compose/compose';
import { Query, QueryType } from './interfaces';

export interface CompoundQuery<T> extends Query<T> {
	withQuery(query: Query<T>): CompoundQuery<T>;
	queries: Query<T>[];
}

export interface QueryOptions<T> {
	query?: Query<T>;
	queryStringBuilder?: (query: CompoundQuery<T>) => string;
}

interface QueryState<T> {
	queries: Query<T>[];
	finalQuery: Query<T>;
	queryStringBuilder: (query: CompoundQuery<T>) => string;
}

export function isCompoundQuery(query?: Query<any>): query is CompoundQuery<any> {
	return Boolean(query && query.queryType === QueryType.Compound);
}

const instanceStateMap = new WeakMap<Query<{}>, QueryState<{}>>();

export interface QueryFactory extends ComposeFactory<CompoundQuery<{}>, QueryOptions<{}>> {
	<T extends {}>(options?: QueryOptions<T>): CompoundQuery<T>;
}

const UnitQuery = {
	queryType: QueryType.Filter,
	apply(data: any[]) {
		return data;
	},
	incremental: true,
	toString() {
		return '';
	}
};

const createCompoundQuery: QueryFactory = compose<CompoundQuery<{}>, QueryOptions<{}>>({
	queryType: QueryType.Compound,

	apply(this: Query<{}>, data: {}[]): {}[] {
		const state = instanceStateMap.get(this);
		return state.finalQuery.apply(state.queries.reduce(function(prev, next) {
			return next.apply(prev);
		}, data));
	},

	withQuery(this: CompoundQuery<{}>, query: Query<{}>): CompoundQuery<{}> {
		const state = instanceStateMap.get(this);
		if (state.finalQuery === UnitQuery) {
			return createCompoundQuery({
				query: query,
				queryStringBuilder: state.queryStringBuilder
			});
		}
		else {
			const newQuery = createCompoundQuery({
				query: query,
				queryStringBuilder: state.queryStringBuilder
			});

			const newQueryState = instanceStateMap.get(newQuery);
			newQueryState.queries = [ ...this.queries, ...newQueryState.queries ];

			return newQuery;
		}
	},

	toString(this: Query<{}>, querySerializer?: ((query: Query<{}>) => string) | ((query: CompoundQuery<{}>) => string)): string {
		const state = instanceStateMap.get(this);
		if (state.finalQuery === UnitQuery) {
			return state.finalQuery.toString();
		}
		return (querySerializer || state.queryStringBuilder)(this);
	},

	get incremental(this: Query<{}>) {
		const state = instanceStateMap.get(this);
		return [ ...state.queries, state.finalQuery ].every(function(query: Query<any>) {
			return Boolean(query.incremental);
		});
	},

	get queries(this: Query<{}>) {
		const state = instanceStateMap.get(this);
		return [ ...state.queries, state.finalQuery ];
	}
}, function<T>(instance: Query<T>, options?: QueryOptions<T>) {
	options = options || {};
	let query = options.query || UnitQuery;
	const queries = isCompoundQuery(query) ? query.queries : [];
	if (queries.length) {
		query = queries.pop()!;
	}
	instanceStateMap.set(instance, {
		finalQuery: query,
		queries: queries,
		queryStringBuilder: options.queryStringBuilder || function(query) {
			const state = instanceStateMap.get(query);
			return [ ...state.queries, state.finalQuery ].join('&');
		}
	});
});

export default createCompoundQuery;
