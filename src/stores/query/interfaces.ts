export interface Query<T> {
	apply(data: T[]): T[];
	toString(querySerializer?: (query: Query<T>) => string): string;
	incremental?: boolean;
	queryType: QueryType;
}

export const enum QueryType {
	Filter,
	Sort,
	Range,
	Compound
}
