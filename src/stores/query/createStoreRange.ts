import { Query, QueryType } from './interfaces';
export interface StoreRange<T> extends Query<T, T> {
	readonly start: number;
	readonly count: number;
}

function serializeRange(range: StoreRange<any>): string {
	return `range(${range.start}, ${range.count})`;
}

function createRange<T>(start: number, count: number, serializer?: (range: StoreRange<T>) => string): StoreRange<T> {
	return {
		apply(data: T[]) {
			return data.slice(start, start + count);
		},
		queryType: QueryType.Range,
		toString(this: StoreRange<T>, rangeSerializer?: ((query: Query<any, any>) => string) | ((range: StoreRange<T>) => string) ) {
			return (rangeSerializer || serializer || serializeRange)(this);
		},
		start: start,
		count: count,
		incremental: false
	};
}

export default createRange;
