export interface Query<T, U> {
	apply(data: T[]): U[];
	toString(querySerializer?: (query: Query<any, any>) => string): string;
	incremental?: boolean;
	queryType: QueryType;
}

export const enum QueryType {
	Filter,
	Sort,
	Range,
	Compound
}
