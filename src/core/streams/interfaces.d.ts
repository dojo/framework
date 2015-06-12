import ReadableStreamController from './ReadableStreamController';
import Promise from '../Promise';

export interface Strategy<T> {
	/**
	 * Computes the number of items in a chunk.
	 */
	size?: (chunk: T) => number;

	/**
	 * The number of chunks allowed in the queue before backpressure is applied.
	 */
	highWaterMark?: number;
}
