export interface Strategy<T> {
	/**
	 * Computes the number of items in a chunk.
	 */
	readonly size?: (chunk: T | undefined | null) => number;

	/**
	 * The number of chunks allowed in the queue before backpressure is applied.
	 */
	highWaterMark?: number;
}
