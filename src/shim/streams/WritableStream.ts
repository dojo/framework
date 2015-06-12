import { Strategy } from './interfaces';
import Promise from '../Promise';
import SizeQueue from './SizeQueue';
import * as util from './util';

// A Record is used internally by the stream to process queued writes. It represents the chunk to be written plus
// additional metadata used internally.
interface Record<T> {
	// This flag indicates that this record is the end of the stream and the stream should close when processing it
	close?: boolean;
	chunk?: T;
	reject?: (error: Error) => void;
	resolve?: () => void;
}

/**
 * WritableStream's possible states
 */
export enum State { Closed, Closing, Errored, Waiting, Writable }

// This function is basically a context check to protect against calling WritableStream methods with incorrect context
// (as one might accidentally do when passing a method as callback)
function isWritableStream(x: any): boolean {
	return Object.prototype.hasOwnProperty.call(x, '_underlyingSink');
}

/**
 * The Sink interface defines the methods a module can implement to create a target sink for a `WritableStream`.
 *
 * The Stream API provides a consistent stream API while `ReadableStream.Source` and `WritableStream.Sink` implementors
 * provide the logic to connect a stream to specific data sources & sinks.
 */
export interface Sink<T> {

	/**
	 * Indicates the stream is prematurely closing due to an error.  The sink should do any necessary cleanup
	 * and release resources. When a stream calls `abort` it will discard any queued chunks. If the sink does not
	 * provide an `abort` method then the stream will call `close` instead.
	 *
	 * @param reason The reason the stream is closing.
	 */
	abort?(reason?: any): Promise<void>;

	/**
	 * Indicates the stream is closing.  The sink should do any necessary cleanup and release resources. The stream
	 * will not call this method until is has successfully written all queued chunks.
	 */
	close?(): Promise<void>;

	/**
	 * Requests the sink to prepare for receiving chunks.
	 *
	 * @param error An error callback that can be used at any time by the sink to indicate an error has occurred.
	 * @returns A promise that resolves when the sink's start operation has finished.  If the promise rejects,
	 * 		the stream will be errored.
	 */
	start?(error: (error: Error) => void): Promise<void>;

	/**
	 * Requests the sink write a chunk.
	 *
	 * @param chunk The chunk to be written.
	 * @returns A promise that resolves when the sink's write operation has finished.  If the promise rejects,
	 * 		the stream will be errored.
	 */
	write?(chunk: T): Promise<void>;
}

/**
 * This class provides a writable stream implementation. Data written to a stream will be passed on to the underlying
 * sink (`WritableStream.Sink`), an instance of which must be supplied to the stream upon instantation. This class
 * provides the standard stream API, while implementations of the `Sink` API allow the data to be written to
 * various persistence layers.
 */
export default class WritableStream<T> {
	/**
	 * @returns A promise that is resolved when the stream is closed, or is rejected if the stream errors.
	 */
	get closed(): Promise<void> {
		return this._closedPromise;
	}

	/**
	 * @returns A promise that is resolved when the stream transitions away from the 'waiting' state. The stream will
	 * use this to indicate backpressure - an unresolved `ready` promise indicates that writes should not yet be
	 * performed.
	 */
	get ready(): Promise<void> {
		return this._readyPromise;
	}

	/**
	 * @returns The stream's current @State
	 */
	get state(): State {
		return this._state;
	}

	protected _advancing: boolean;
	protected _closedPromise: Promise<void>;
	protected _readyPromise: Promise<void>;
	protected _rejectClosedPromise: (error: Error) => void;
	protected _rejectReadyPromise: (error: Error) => void;
	protected _resolveClosedPromise: () => void;
	protected _resolveReadyPromise: () => void;
	protected _started: boolean;
	protected _startedPromise: Promise<any>;
	protected _state: State;
	protected _storedError: Error;
	protected _strategy: Strategy<T>;
	protected _underlyingSink: Sink<T>;
	protected _queue: SizeQueue<Record<T>>;
	protected _writing: boolean;

	constructor(underlyingSink: Sink<T> = {}, strategy: Strategy<T> = {}) {
		this._underlyingSink = underlyingSink;

		this._closedPromise = new Promise<void>((resolve, reject) => {
			this._resolveClosedPromise = resolve;
			this._rejectClosedPromise = reject;
		});

		this._advancing = false;
		this._readyPromise = Promise.resolve();
		this._queue = new SizeQueue<Record<T>>();
		this._state = State.Writable;
		this._started = false;
		this._writing = false;
		this._strategy = util.normalizeStrategy(strategy);
		this._syncStateWithQueue();

		this._startedPromise = Promise.resolve(
			util.invokeOrNoop(this._underlyingSink, 'start', [ this._error.bind(this) ])
		).then(() => {
			this._started = true;
			this._startedPromise = undefined;
		}, (error: Error) => {
			this._error(error);
		});
	}

	// This method combines the logic of two methods:
	// 4.3.1 CallOrScheduleWritableStreamAdvanceQueue
	// 4.3.6 WritableStreamAdvanceQueue
	protected _advanceQueue() {
		if (!this._started) {
			if (!this._advancing) {
				this._advancing = true;
				this._startedPromise.then(() => {
					this._advanceQueue();
				});
			}

			return;
		}

		if (!this._queue || this._writing) {
			return;
		}

		const writeRecord: Record<T> = this._queue.peek();

		if (writeRecord.close) {
			// TODO: SKIP? Assert 4.3.6-3.a
			if (this.state !== State.Closing) {
				throw new Error('Invalid record');
			}

			this._queue.dequeue();
			// TODO: SKIP? Assert 4.3.6-3.c
			this._close();

			return;
		}

		this._writing = true;

		util.promiseInvokeOrNoop(this._underlyingSink, 'write', [ writeRecord.chunk ]).then(() => {
			if (this.state !== State.Errored) {
				this._writing = false;
				writeRecord.resolve();
				this._queue.dequeue();

				try {
					this._syncStateWithQueue();
				}
				catch (error) {
					return this._error(error);
				}

				this._advanceQueue();
			}
		}, (error: Error) => {
			this._error(error);
		});
	}

	// 4.3.2 CloseWritableStream
	protected _close(): void {
		if (this.state !== State.Closing) {
			// 4.3.2-1
			throw new Error('WritableStream#_close called while state is not "Closing"');
		}

		util.promiseInvokeOrNoop(this._underlyingSink, 'close').then(() => {
			if (this.state !== State.Errored) {
				// TODO: Assert 4.3.2.2-a.ii
				this._resolveClosedPromise();
				this._state = State.Closed;
				this._underlyingSink = undefined;
			}
		}, (error: Error) => {
			this._error(error);
		});
	}

	// 4.3.3 ErrorWritableStream
	protected _error(error: Error) {
		if (this.state === State.Closed || this.state === State.Errored) {
			return;
		}

		let writeRecord: Record<T>;

		while (this._queue.length) {
			writeRecord = this._queue.dequeue();

			if (!writeRecord.close) {
				writeRecord.reject(error);
			}
		}

		this._storedError = error;

		if (this.state === State.Waiting) {
			this._resolveReadyPromise();
		}

		this._rejectClosedPromise(error);
		this._state = State.Errored;
	}

	// 4.3.5 SyncWritableStreamStateWithQueue
	protected _syncStateWithQueue(): void {
		if (this.state === State.Closing) {
			return;
		}

		const queueSize = this._queue.totalSize;
		const shouldApplyBackPressure = queueSize > this._strategy.highWaterMark;

		if (shouldApplyBackPressure && this.state === State.Writable) {
			this._state = State.Waiting;
			this._readyPromise = new Promise<void>((resolve, reject) => {
				this._resolveReadyPromise = resolve;
				this._rejectReadyPromise = reject;
			});
		}

		if (shouldApplyBackPressure === false && this.state === State.Waiting) {
			this._state = State.Writable;
			this._resolveReadyPromise();
		}
	}

	/**
	 * Signals that the producer can no longer write to the stream and it should be immediately moved to an "errored"
	 * state. Any un-written data that is queued will be discarded.
	 */
	abort(reason: any): Promise<void> {
		// 4.2.4.4-1
		if (!isWritableStream(this)) {
			return Promise.reject(
				new Error('WritableStream method called in context of object that is not a WritableStream instance')
			);
		}

		if (this.state === State.Closed) {
			// 4.2.4.4-2
			return Promise.resolve();
		}

		if (this.state === State.Errored) {
			// 4.2.4.4-3
			return Promise.reject(this._storedError);
		}

		const error: Error = reason instanceof Error ? reason : new Error(reason);

		this._error(error);

		return util.promiseInvokeOrFallbackOrNoop(this._underlyingSink, 'abort', [ reason ], 'close')
			.then(function () {
				return;
			});
	}

	/**
	 * Signals that the producer is done writing to the stream and wishes to move it to a "closed" state. The stream
	 * may have un-writted data queued; until the data has been written the stream will remain in the "closing" state.
	 */
	close(): Promise<void> {
		// 4.2.4.5-1
		if (!isWritableStream(this)) {
			return Promise.reject(
				new Error('WritableStream method called in context of object that is not a WritableStream instance')
			);
		}

		// 4.2.4.5-2
		if (this.state === State.Closed) {
			return Promise.reject(new TypeError('Stream is already closed'));
		}

		if (this.state === State.Closing) {
			return Promise.reject(new TypeError('Stream is already closing'));
		}

		if (this.state === State.Errored) {
			// 4.2.4.5-3
			return Promise.reject(this._storedError);
		}

		if (this.state === State.Waiting) {
			// 4.2.4.5-4
			this._resolveReadyPromise();
		}

		this._state = State.Closing;
		this._queue.enqueue({ close: true }, 0);
		this._advanceQueue();

		return this._closedPromise;
	}

	/**
	 * Enqueue a chunk of data to be written to the underlying sink. `write` can be called successively without waiting
	 * for the previous write's promise to resolve. To respect the stream's backpressure indicator, check if the stream
	 * has entered the "waiting" state between writes.
	 *
	 * @returns A promise that will be fulfilled when the chunk has been written to the underlying sink.
	 */
	write(chunk: T): Promise<void> {
		// 4.2.4.6-1
		if (!isWritableStream(this)) {
			return Promise.reject(
				new Error('WritableStream method called in context of object that is not a WritableStream instance')
			);
		}

		// 4.2.4.6-2
		if (this.state === State.Closed) {
			return Promise.reject(new TypeError('Stream is closed'));
		}

		if (this.state === State.Closing) {
			return Promise.reject(new TypeError('Stream is closing'));
		}

		if (this.state === State.Errored) {
			// 4.2.4.6-3
			return Promise.reject(this._storedError);
		}

		let chunkSize = 1;
		let writeRecord: Record<T>;
		let promise = new Promise<void>(function (resolve, reject) {
			writeRecord = {
				chunk: chunk,
				reject: reject,
				resolve: resolve
			};
		});

		// 4.2.4.6-6.b
		try {
			if (this._strategy && this._strategy.size) {
				chunkSize = this._strategy.size(chunk);
			}

			this._queue.enqueue(writeRecord, chunkSize);
			this._syncStateWithQueue();
		}
		catch (error) {
			// 4.2.4.6-6.b, 4.2.4.6-10, 4.2.4.6-12
			this._error(error);
			return Promise.reject(error);
		}

		this._advanceQueue();

		return promise;
	}
}
