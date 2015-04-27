import ReadableStreamController from './ReadableStreamController';
import Promise from '../Promise';

/**
 * Options used when piping a readable stream to a writable stream.
 */
export interface PipeOptions {
	/**
	 *
	 */
	preventClose?: boolean;

	/**
	 *
	 */
	preventAbort?: boolean;

	/**
	 *
	 */
	preventCancel?: boolean;
}

export interface ReadResult<T> {
	value: T;
	done: boolean;
}

export interface Sink<T> {
	/**
	 *
	 * @param reason
	 */
	abort(reason?: any): Promise<void>;

	close(): Promise<void>;

	start(error: () => void): Promise<void>;

	strategy?: Strategy<T>;

	/**
	 *
	 * @param chunk
	 */
	write(chunk: T): Promise<void>;
}

export interface Source<T> {
	/**
	 *
	 * @param controller
	 */
	start(controller: ReadableStreamController<T>): Promise<void>;

	/**
	 *
	 * @param controller
	 */
	pull(controller: ReadableStreamController<T>): Promise<void>;

	/**
	 *
	 * @param reason
	 */
	cancel(reason?: any): Promise<void>;
}

export interface Strategy<T> {
	/**
	 * Computes the number of items in a chunk.
	 */
	size?: (chunk: T) => number;
	/**
	 * The number of chunks allowed in the queue before backpressure is applied.
	 */
	highwaterMark?: number;
}

export interface Transform<R, W> {
	transform(chunk: W, enqueueInReadable: (chunk: R) => void, transformDone: () => void): void;
	flush(enqueue: Function, close: Function): void;
	writableStrategy: Strategy<W>;
	readableStrategy: Strategy<R>;
}
