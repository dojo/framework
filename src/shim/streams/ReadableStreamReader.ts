import Promise from '../Promise';
import ReadableStream, { State } from './ReadableStream';

interface ReadRequest<T> {
	promise: Promise<ReadResult<T>>;
	resolve: (value: ReadResult<T>) => void;
	reject: (reason: any) => void;
}

export interface ReadResult<T> {
	value: T;
	done: boolean;
}

export default class ReadableStreamReader<T> {
	get closed(): Promise<void> {
		return this._closedPromise;
	}

	private _closedPromise: Promise<void>;
	private _ownerReadableStream: ReadableStream<T>;
	private _storedError: Error;
	private _readRequests: ReadRequest<T>[];
	private _resolveClosedPromise: () => void;
	private _rejectClosedPromise: (error: Error) => void;

	state: State;

	constructor(stream: ReadableStream<T>) {
		if (!stream.readable) {
			throw new TypeError('3.4.3-1: stream must be a ReadableStream');
		}

		if (stream.locked) {
			throw new TypeError('3.4.3-2: stream cannot be locked');
		}

		stream.reader = this;
		this._ownerReadableStream = stream;
		this.state = State.Readable;
		this._storedError = undefined;
		this._readRequests = [];
		this._closedPromise = new Promise<void>((resolve, reject) => {
			this._resolveClosedPromise = resolve;
			this._rejectClosedPromise = reject;
		});
	}

	cancel(reason: string): Promise<void> {
		if (!isReadableStreamReader(this)) {
			return Promise.reject(new TypeError('3.4.4.2-1: Must be a ReadableStreamReader instance'));
		}

		if (this.state === State.Closed) {
			return Promise.resolve();
		}

		if (this.state === State.Errored) {
			return Promise.reject(this._storedError);
		}

		if (this._ownerReadableStream && this._ownerReadableStream.state === State.Readable) {
			return this._ownerReadableStream.cancel(reason);
		}

		// 3.4.4.2-4,5 - the spec calls for this to throw an error. We have changed it to reject instead
		return Promise.reject(new TypeError('3.4.4.2-4,5: Cannot cancel ReadableStreamReader'));
	}

	/**
	 * This method also incorporates the readFromReadableStreamReader from 3.5.12.
	 * @alias ReadFromReadableStreamReader
	 * @returns {Promise<ReadResult<T>>}
	 */
	read(): Promise<ReadResult<T>> {
		if (!isReadableStreamReader(this)) {
			return Promise.reject<ReadResult<T>>(new TypeError('3.4.4.3-1: Must be a ReadableStreamReader instance'));
		}

		if (this.state === State.Closed) {
			return Promise.resolve({
				value: undefined,
				done: true
			});
		}

		if (this.state === State.Errored) {
			return Promise.reject<ReadResult<T>>(new TypeError('3.5.12-2: reader state is Errored'));
		}

		const stream = this._ownerReadableStream;
		if (!stream || stream.state !== State.Readable) {
			throw new TypeError('3.5.12-3,4: Stream must exist and be readable');
		}

		const queue = stream.queue;
		if (queue.length > 0) {
			const chunk = queue.dequeue();
			if (stream.closeRequested && !queue.length) {
				stream.close();
			}
			else {
				stream.pull();
			}
			return Promise.resolve({
				value: chunk,
				done: false
			});
		}
		else {
			const readPromise = new Promise<ReadResult<T>>((resolve, reject) => {
				this._readRequests.push({
					promise: readPromise,
					resolve: resolve,
					reject: reject
				});
				stream.pull();
			});

			return readPromise;
		}
	}

	/**
	 * release a reader's lock on the corresponding stream.
	 * 3.4.4.4. releaseLock()
	 */
	releaseLock(): void {
		if (!isReadableStreamReader(this)) {
			throw new TypeError('3.4.4.4-1: Must be a ReadableStreamrteader isntance');
		}

		if (!this._ownerReadableStream) {
			return;
		}

		if (this._readRequests.length) {
			throw new TypeError('3.4.4.4-3: Tried to release a reader lock when that reader has pending read calls un-settled');
		}

		this.release();
	}

	/**
	 * 3.5.13. ReleaseReadableStreamReader ( reader )
	 * alias ReleaseReadableStreamReader
	 */
	release(): void {
		let request: any;
		if (this._ownerReadableStream.state === State.Errored) {
			this.state = State.Errored;

			const e = this._ownerReadableStream.storedError;
			this._storedError = e;
			this._rejectClosedPromise(e);

			for (request of this._readRequests) {
				request.reject(e);
			}
		}
		else {
			this.state = State.Closed;
			this._resolveClosedPromise();
			for (request of this._readRequests) {
				request.resolve({
					value: undefined,
					done: true
				});
			}
		}

		this._readRequests = [];
		this._ownerReadableStream.reader = undefined;
		this._ownerReadableStream = undefined;
	}

	/**
	 * Resolves a pending read request, if any, with the provided chunk.
	 * @param chunk
	 * @return boolean True if a read request was resolved.
	 */
	resolveReadRequest(chunk: T): boolean {
		if (this._readRequests.length > 0) {
			this._readRequests.shift().resolve({
				value: chunk,
				done: false
			});
			return true;
		}
		return false;
	}
}

export function isReadableStreamReader<T>(readableStreamReader: ReadableStreamReader<T>): boolean {
	return Object.prototype.hasOwnProperty.call(readableStreamReader, '_ownerReadableStream');
}
