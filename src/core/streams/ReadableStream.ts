import { Strategy } from './interfaces';
import Promise from '../Promise';
import ReadableStreamController from './ReadableStreamController';
import ReadableStreamReader, { ReadResult } from './ReadableStreamReader';
import SizeQueue from './SizeQueue';
import TransformStream from './TransformStream';
import * as util from './util';
import WritableStream, { State as WriteableState } from './WritableStream';

/**
 * Options used when piping a readable stream to a writable stream.
 */
export interface PipeOptions {
	/**
	 * Prevents the writable stream from erroring if the readable stream encounters an error.
	 */
	preventAbort?: boolean;

	/**
	 *  Prevents the readable stream from erroring if the writable stream encounters an error.
	 */
	preventCancel?: boolean;

	/**
	 * Prevents the writable stream from closing when the pipe operation completes.
	 */
	preventClose?: boolean;
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

/**
 * Implementation of a readable stream.
 */
export default class ReadableStream<T> {

	/**
	 * @alias ShouldReadableStreamPull
	 */
	protected get _allowPull(): boolean {
		return !this.pullScheduled &&
			!this.closeRequested &&
			this._started &&
			this.state !== State.Closed &&
			this.state !== State.Errored &&
			!this._shouldApplyBackPressure();
	}

	/**
	 * 3.5.7. GetReadableStreamDesiredSize ( stream )
	 * @returns {number}
	 */
	get desiredSize(): number {
		return this._strategy.highWaterMark - this.queueSize;
	}

	get hasSource(): boolean {
		return this._underlyingSource != null;
	}

	/**
	 * @alias IsReadableStreamLocked
	 */
	get locked(): boolean {
		return this.hasSource && !!this.reader;
	}

	get readable(): boolean {
		return this.hasSource && this.state === State.Readable;
	}

	get started(): Promise<void> {
		return this._startedPromise;
	}

	get queueSize(): number {
		return this.queue.totalSize;
	}

	protected _pullingPromise: Promise<void>;
	protected _started: boolean;
	protected _startedPromise: Promise<void>;
	protected _strategy: Strategy<T>;
	protected _underlyingSource: Source<T>;

	closeRequested: boolean = false;
	controller: ReadableStreamController<T>;
	pullScheduled: boolean;
	queue: SizeQueue<T>;
	reader: ReadableStreamReader<T>;
	state: State;
	storedError: Error;

	/**
	 * @constructor
	 */
	constructor(underlyingSource: Source<T>, strategy: Strategy<T> = {}) {
		if (!underlyingSource) {
			throw new Error('An ReadableStream Source must be provided.');
		}
		this.state = State.Readable;
		this._underlyingSource = underlyingSource;
		this.controller = new ReadableStreamController(this);
		this._strategy = util.normalizeStrategy(strategy);
		this.queue = new SizeQueue<T>();

		this._startedPromise = new Promise<void>((resolveStarted) => {
			const startResult = util.invokeOrNoop(this._underlyingSource, 'start', [this.controller]);
			Promise.resolve(startResult).then(
				() => {
					this._started = true;
					resolveStarted();
					this.pull();
				},
				error => this.error(error)
			);
		});
	}

	protected _cancel(reason?: any): Promise<void> {
		// 3.2.4.1-3: return cancelReadableStream(this, reason);
		if (this.state === State.Closed) {
			return Promise.resolve();
		}

		if (this.state === State.Errored) {
			return Promise.reject(new TypeError('3.5.3-2: State is errored'));
		}

		this.queue.empty();
		this.close();
		return util.promiseInvokeOrNoop(this._underlyingSource, 'cancel', [reason]).then(() => undefined);
	}

	/**
	 * @alias shouldReadableStreamApplyBackPressure
	 */
	protected _shouldApplyBackPressure(): boolean {
		const queueSize = this.queue.totalSize;

		return queueSize > this._strategy.highWaterMark;
	}

	/**
	 *
	 * @param reason
	 * @returns {null}
	 */
	cancel(reason?: any): Promise<void> {
		// if (!this.hasSource) {
		// 	return Promise.reject(new TypeError('3.2.4.1-1: Must be a ReadableStream'));
		// }

		// if (this.locked) {
		// 	return Promise.reject(new TypeError('3.2.4.1-2: The stream is locked'));
		// }

		return this._cancel(reason);
	}

	/**
	 * Closes the stream without regard to the status of the queue.  Use {@link requestClose} to close the
	 * stream and allow the queue to flush.
	 *
	 * 3.5.4. FinishClosingReadableStream ( stream )
	 */
	close(): void {
		if (this.state !== State.Readable) {
			return;
		}

		this.state = State.Closed;

		if (this.locked) {
			return this.reader.release();
		}
	}

	/**
	 * @alias EnqueueInReadableStream
	 */
	enqueue(chunk: T): void {
		const size = this._strategy.size;

		if (!this.readable || this.closeRequested) {
			throw new Error('3.5.6-1,2: Stream._state should be Readable and stream.closeRequested should be true');
		}

		if (!this.locked || !this.reader.resolveReadRequest(chunk)) {

			try {
				let chunkSize = 1;
				if (size) {
					chunkSize = size(chunk);
				}
				this.queue.enqueue(chunk, chunkSize);
			}
			catch (error) {
				this.error(error);
				throw error;
			}
		}

		this.pull();
	}

	error(error: Error): void {
		if (this.state !== State.Readable) {
			throw new Error('3.5.7-1: State must be Readable');
		}

		this.queue.empty();
		this.storedError = error;
		this.state = State.Errored;

		if (this.locked) {
			this.reader.release();
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

	pipeThrough(transformStream: TransformStream<T, any>, options?: PipeOptions): ReadableStream<T> {
		this.pipeTo(transformStream.writable, options);
		return transformStream.readable;
	}

	pipeTo(dest: WritableStream<T>, options: PipeOptions = {}): Promise<void> {
		const source = this;
		let resolvePipeToPromise: () => void;
		let rejectPipeToPromise: (error: Error) => void;
		let closedPurposefully = false;
		let lastRead: any;
		let reader: ReadableStreamReader<T>;

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
			const destState = dest.state;
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
	pull(): void {
		if (!this._allowPull) {
			return;
		}

		if (this._pullingPromise) {
			this.pullScheduled = true;
			this._pullingPromise.then(() => {
				this.pullScheduled = false;
				this.pull();
			});
			return;
		}

		this._pullingPromise = util.promiseInvokeOrNoop(this._underlyingSource, 'pull', [this.controller]);
		this._pullingPromise.then(() => {
			this._pullingPromise = undefined;
		}, e => this.error(e));
	}

	/**
	 * Requests the stream be closed.  This method allows the queue to be emptied before the stream closes.
	 *
	 * 3.5.3. CloseReadableStream ( stream )
	 * @alias CloseReadableStream
	 */
	requestClose(): void {
		if (this.closeRequested || this.state !== State.Readable) {
			return;
		}

		this.closeRequested = true;

		if (this.queue.length === 0) {
			this.close();
		}
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

		let branch1: ReadableStream<T>;
		let branch2: ReadableStream<T>;

		const reader = this.getReader();
		const teeState: any = {
			closedOrErrored: false,
			canceled1: false,
			canceled2: false,
			reason1: undefined,
			reason2: undefined
		};
		teeState.promise = new Promise(resolve => teeState._resolve = resolve);

		const createCancelFunction = (branch: number) => {
			return (reason: any): void => {
				teeState['canceled' + branch] = true;
				teeState['reason' + branch] = reason;
				if (teeState['canceled' + (branch === 1 ? 2 : 1)]) {
					const cancelResult = this._cancel([teeState.reason1, teeState.reason2]);
					teeState._resolve(cancelResult);
				}
				return teeState.promise;
			};
		};

		const pull = (controller: ReadableStreamController<T>) => {
			return reader.read().then((result: any) => {
				const value = result.value;
				const done = result.done;

				if (done && !teeState.closedOrErrored) {
					branch1.requestClose();
					branch2.requestClose();

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

		const cancel1 = createCancelFunction(1);
		const cancel2 = createCancelFunction(2);
		const underlyingSource1: Source<T> = <Source<T>> {
			pull: pull,
			cancel: cancel1
		};
		branch1 = new ReadableStream(underlyingSource1);

		const underlyingSource2: Source<T> = <Source<T>> {
			pull: pull,
			cancel: cancel2
		};
		branch2 = new ReadableStream(underlyingSource2);

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
}
