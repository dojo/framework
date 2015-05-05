import ReadableStreamController from './ReadableStreamController';
import ReadableStreamReader, { ReadResult } from './ReadableStreamReader';
import TransformStream from './TransformStream';
import WritableStream, { State as WriteableState } from './WritableStream';
import * as util from './util';
import { Strategy } from './interfaces';
import SizeQueue from './SizeQueue';
import Promise from '../Promise';

/**
 * Options used when piping a readable stream to a writable stream.
 */
export interface PipeOptions {
	/**
	 * Prevents the writable stream from closing when the pipe operation completes.
	 */
	preventClose?: boolean;

	/**
	 * Prevents the writable stream from erroring if the readable stream encounters an error.
	 */
	preventAbort?: boolean;

	/**
	 *  Prevents the readable stream from erroring if the writable stream encounters an error.
	 */
	preventCancel?: boolean;
}

/**
 * Implementation of a readable stream.
 */
export default class ReadableStream<T> {

	state: State;

	_closeRequested: boolean = false;
	_controller: ReadableStreamController<T>;
	_pullingPromise: Promise<void>;
	_pullScheduled: boolean;
	_reader: ReadableStreamReader<T>;
	_queue: SizeQueue<T>;
	_started: boolean;
	_startedPromise: Promise<void>;
	_storedError: Error;
	_strategy: Strategy<T>;
	_underlyingSource: Source<T>;

	/**
	 * @constructor
	 */
	constructor(underlyingSource: Source<T>, strategy: Strategy<T> = {}) {
		if (!underlyingSource) {
			throw new Error('An ReadableStream Source must be provided.');
		}
		this.state = State.Readable;
		this._underlyingSource = underlyingSource;
		this._controller = new ReadableStreamController(this);
		this._strategy = util.normalizeStrategy(strategy);
		this._queue = new SizeQueue<T>();

		this._startedPromise = new Promise<void>((resolveStarted) => {
			var startResult = util.invokeOrNoop(this._underlyingSource, 'start', [this._controller]);
			Promise.resolve(startResult).then(
				() => {
					this._started = true;
					resolveStarted();
					this._pull();
				},
				error => this.error(error)
			);
		});
	}

	/**
	 * 3.5.7. GetReadableStreamDesiredSize ( stream )
	 * @returns {number}
	 */
	get desiredSize(): number {
		return this._strategy.highWaterMark - this.queueSize;
	}

	get queueSize(): number {
		return this._queue.totalSize;
	}

	/**
	 *
	 * @param reason
	 * @returns {null}
	 */
	cancel(reason?: any): Promise<void> {
		if (!this.hasSource) {
			return Promise.reject(new TypeError('3.2.4.1-1: Must be a ReadableStream'));
		}

		if (this.locked) {
			return Promise.reject(new TypeError('3.2.4.1-2: The stream is locked'));
		}

		return this._cancel(reason);
	}

	_cancel(reason?: any): Promise<void> {
		// 3.2.4.1-3: return cancelReadableStream(this, reason);
		if (this.state === State.Closed) {
			return Promise.resolve();
		}

		if (this.state === State.Errored) {
			return Promise.reject(new TypeError('3.5.3-2: State is errored'));
		}

		this._queue.empty();
		this._close();
		return util.promiseInvokeOrNoop(this._underlyingSource, 'cancel', [reason]).then(() => undefined);
	}

	/**
	 * Requests the stream be closed.  This method allows the queue to be emptied before the stream closes.
	 *
	 * 3.5.3. CloseReadableStream ( stream )
	 * @alias CloseReadableStream
	 */
	_requestClose(): void {
		if (this._closeRequested || this.state !== State.Readable) {
			return;
		}

		this._closeRequested = true;

		if (this._queue.length === 0) {
			this._close();
		}
	}

	/**
	 * Closes the stream without regard to the status of the queue.  Use {@link _requestClose} to close the
	 * stream and allow the queue to flush.
	 *
	 * 3.5.4. FinishClosingReadableStream ( stream )
	 * @private
	 */
	_close(): void {
		if (this.state !== State.Readable) {
			return;
		}

		this.state = State.Closed;

		if (this.locked) {
			return this._reader._release();
		}
	}

	/**
	 * @alias EnqueueInReadableStream
	 */
	enqueue(chunk: T): void {
		var chunkSize: number;
		var size = this._strategy.size;

		if (!this.readable || this._closeRequested) {
			throw new Error('3.5.6-1,2: Stream._state should be Readable and stream._closeRequested should be true');
		}

		if (!this.locked || !this._reader.resolveReadRequest(chunk)) {

			try {
				chunkSize = 1;
				if (size) {
					chunkSize = size(chunk);
				}
				this._queue.enqueue(chunk, chunkSize);
			}
			catch (error) {
				this.error(error);
				throw error;
			}
		}

		this._pull();
	}

	error(error: Error) {
		if (this.state !== State.Readable) {
			throw new Error('3.5.7-1: State must be Readable');
		}

		this._queue.empty();
		this._storedError = error;
		this.state = State.Errored;

		if (this.locked) {
			return this._reader._release();
		}
	}

	/**
	 * create a new ReadableStreamReader and lock the stream to the new reader
	 * @alias AcquireREadableStreamReader
	 */
	getReader(): ReadableStreamReader<T> {
		if (!this.readable) {
			throw new TypeError('3.2.4.2-1: must be a ReadableStream instance');
		}

		return new ReadableStreamReader(this);
	}

	/**
	 * @alias IsReadableStreamLocked
	 */
	get locked(): boolean {
		return this.hasSource && !!this._reader;
	}

	get readable(): boolean {
		return this.hasSource && this.state === State.Readable;
	}

	get hasSource(): boolean {
		return this._underlyingSource != null;
	}

	pipeThrough(transformStream: TransformStream<T, any>, options?: PipeOptions): ReadableStream<T> {
		this.pipeTo(transformStream.writable, options);
		return transformStream.readable;
	}

	pipeTo(dest: WritableStream<T>, options: PipeOptions = {}): Promise<void> {
		var source = this;
		var resolvePipeToPromise: () => void;
		var rejectPipeToPromise: (error: Error) => void;
		var closedPurposefully = false;
		var lastRead: any;
		var reader: ReadableStreamReader<T>;

		return new Promise<void>((resolve, reject) => {
			resolvePipeToPromise = resolve;
			rejectPipeToPromise = reject;

			reader = source.getReader();
			reader.closed.catch((reason: any) => {
				// abortDest
				if (!options.preventAbort) {
					dest.abort(reason);
				}
				rejectPipeToPromise(reason);
			});

			dest.closed.then(
				() => {
					if (!closedPurposefully) {
						cancelSource(new TypeError('destination is closing or closed and cannot be piped to anymore'));
					}
				},
				cancelSource
			);
			doPipe();
		});

		function doPipe(): void {
			lastRead = reader.read();
			Promise.all([lastRead, dest.ready]).then(([readResult, ready]) => {
				if (readResult.done) {
					closeDest();
				}
				else if (dest.state === WriteableState.Writable ) {
					dest.write(readResult.value);
					doPipe();
				}
			});
		}

		function cancelSource(reason: any): void {
			if (!options.preventCancel) {
				reader.cancel(reason);
				rejectPipeToPromise(reason);
			}
			else {
				lastRead.then(() => {
					reader.releaseLock();
					rejectPipeToPromise(reason);
				});
			}
		}

		function closeDest(): void {
			var destState = dest.state;
			if (!options.preventClose &&
				(destState === WriteableState.Waiting || destState === WriteableState.Writable)) {

				closedPurposefully = true;
				dest.close().then(resolvePipeToPromise, rejectPipeToPromise);
			}
			else {
				resolvePipeToPromise();
			}
		}
	}

	/**
	 * @alias RequestReadableStreamPull
	 */
	_pull(): void {
		if (!this._allowPull) {
			return;
		}

		if (this._pullingPromise) {
			this._pullScheduled = true;
			this._pullingPromise.then(() => {
				this._pullScheduled = false;
				this._pull();
			});
			return;
		}

		this._pullingPromise = util.promiseInvokeOrNoop(this._underlyingSource, 'pull', [this._controller]);
		this._pullingPromise.then(() => {
			this._pullingPromise = undefined;
		}, e => this.error(e));
	}

	get started(): Promise<void> {
		return this._startedPromise;
	}

	/**
	 * Tee a readable stream, returning a two-element array containing
	 * the two resulting ReadableStream instances
	 * @alias TeeReadableStream
	 */
	tee(): [ReadableStream<T>, ReadableStream<T>] {
		if (!this.readable) {
			throw new TypeError('3.2.4.5-1: must be a ReadableSream');
		}

		// var shouldBranch = false;
		var reader = this.getReader();
		var teeState: any = {
			closedOrErrored: false,
			canceled1: false,
			canceled2: false,
			reason1: undefined,
			reason2: undefined
		};
		teeState.promise = new Promise(resolve => teeState._resolve = resolve);

		var createCancelFunction = (branch: number) => {
			return (reason: any): void => {
				teeState['canceled' + branch] = true;
				teeState['reason' + branch] = reason;
				if (teeState['canceled' + (branch === 1 ? 2 : 1)]) {
					var cancelResult = this._cancel([teeState.reason1, teeState.reason2]);
					teeState._resolve(cancelResult);
				}
				return teeState.promise;
			};
		};

		var pull = (controller: ReadableStreamController<T>) => {
			return reader.read().then((result: any) => {
				var value = result.value;
				var done = result.done;

				if (done && !teeState.closedOrErrored) {
					branch1._requestClose();
					branch2._requestClose();

					teeState.closedOrErrored = true;
				}

				if (teeState.closedOrErrored) {
					return;
				}

				if (!teeState.canceled1) {
					branch1.enqueue(value);
				}

				if (!teeState.canceled2) {
					branch2.enqueue(value);
				}
			});
		};

		var cancel1 = createCancelFunction(1);
		var cancel2 = createCancelFunction(2);
		var underlyingSource1: Source<T> = <Source<T>> {
			pull: pull,
			cancel: cancel1
		};
		var branch1 = new ReadableStream(underlyingSource1);

		var underlyingSource2: Source<T> = <Source<T>> {
			pull: pull,
			cancel: cancel2
		};
		var branch2 = new ReadableStream(underlyingSource2);

		reader.closed.catch((r: any) => {
			if (teeState.closedOrErrored) {
				return;
			}

			branch1.error(r);
			branch2.error(r);
			teeState.closedOrErrored = true;
		});

		return [ branch1, branch2 ];
	}

	/**
	 * @alias ShouldReadableStreamPull
	 */
	get _allowPull(): boolean {
		return !this._pullScheduled &&
			!this._closeRequested &&
			this._started &&
			this.state !== State.Closed &&
			this.state !== State.Errored &&
			!this._shouldApplyBackPressure();
	}

	/**
	 * @alias shouldReadableStreamApplyBackPressure
	 */
	_shouldApplyBackPressure(): boolean {
		var queueSize = this._queue.totalSize;

		return queueSize > this._strategy.highWaterMark;
	}
}

export interface Source<T> {

	start(controller: ReadableStreamController<T>): Promise<void>;

	pull(controller: ReadableStreamController<T>): Promise<void>;

	cancel(reason?: any): Promise<void>;
}

/**
 * ReadableStream's possible states
 */
export enum State { Readable, Closed, Errored }

