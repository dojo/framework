import { Query, QueryType } from '../interfaces';

export interface StoreRange<T> extends Query<T> {
	readonly count: number;
	readonly start: number;
}

function serializeRange(range: StoreRange<any>): string {
	return `limit(${range.count}${range.start ? ',' + range.start : ''})`;
}

function createRange<T>(start: number, count: number, serializer?: (range: StoreRange<T>) => string): StoreRange<T> {
	return {
		count: count,
		incremental: false,
		queryType: QueryType.Range,
		start: start,
		apply(data: T[]) {
			return data.slice(start, start + count);
		},
		toString(this: StoreRange<T>, rangeSerializer?: ((query: Query<T>) => string) | ((range: StoreRange<T>) => string) ) {
			return (rangeSerializer || serializer || serializeRange)(this);
		}
	};
}

export default createRange;
