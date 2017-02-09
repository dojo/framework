import { Query, QueryType } from './interfaces';

export interface QueryOptions<T> {
	query?: Query<T>;
	queryStringBuilder?: (query: CompoundQuery<T>) => string;
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

export default class CompoundQuery<T> implements Query<T> {
	/**
	 * Private collection of queries that comprise this compound query
	 */
	private _queries: Array<Query<T>> = [];

	/**
	 * Private function that serializes a compound query
	 */
	private queryStringBuilder: (query: CompoundQuery<T>) => string;

	/**
	 * Identifies this as a compound query
	 */
	readonly queryType = QueryType.Compound;

	constructor(options: QueryOptions<T> = {}) {
		let query = options.query || UnitQuery;
		this._queries = (query instanceof CompoundQuery ? query.queries : [ query ]);
		this.queryStringBuilder = options.queryStringBuilder || ((query) => query._queries.join('&'));
	}

	apply(data: T[]): T[] {
		return this._queries.reduce((prev, next) => {
			return next.apply(prev);
		}, data);
	}

	withQuery(query: Query<T>): CompoundQuery<T> {
		const finalQuery = this._queries[this._queries.length - 1];
		if (finalQuery === UnitQuery) {
			return new CompoundQuery({
				query: query,
				queryStringBuilder: this.queryStringBuilder
			});
		}
		else {
			const newQuery = new CompoundQuery({
				query: query,
				queryStringBuilder: this.queryStringBuilder
			});

			newQuery._queries = this._queries.concat(newQuery._queries);

			return newQuery;
		}
	}

	toString(querySerializer?: (query: Query<T>) => string): string {
		const finalQuery = this._queries[this._queries.length - 1];
		if (finalQuery === UnitQuery) {
			return finalQuery.toString();
		}
		return (querySerializer || this.queryStringBuilder)(this);
	}

	get incremental() {
		return this.queries.every(function(query: Query<any>) {
			return Boolean(query.incremental);
		});
	}

	get queries() {
		return this._queries.slice();
	}

}
