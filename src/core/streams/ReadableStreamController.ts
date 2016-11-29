import ReadableStream, { State } from './ReadableStream';

// 3.5.9-1 has been ignored
export function isReadableStreamController(x: any): boolean {
	return Object.prototype.hasOwnProperty.call(x, '_controlledReadableStream');
}

export default class ReadableStreamController<T> {
	private readonly _controlledReadableStream: ReadableStream<T>;

	/**
	 * Returns a number indicating how much additional data can be pushed by the source to the stream's queue before it
	 * exceeds its `highWaterMark`. An underlying source should use this information to determine when and how to apply
	 * backpressure.
	 *
	 * @returns The stream's strategy's `highWaterMark` value minus the queue size
	 */
	// 3.3.4.1. get desiredSize
	get desiredSize(): number {
		return this._controlledReadableStream.desiredSize;
	}

	constructor(stream: ReadableStream<T>) {
		if (!stream.readable) {
			throw new TypeError('3.3.3-1: ReadableStreamController can only be constructed with a ReadableStream instance');
		}

		if (stream.controller !== undefined) {
			throw new TypeError('ReadableStreamController instances can only be created by the ReadableStream constructor');
		}

		this._controlledReadableStream = stream;
	}

	/**
	 * A source should call this method when it has no more data to provide. After this method is called, the stream
	 * will provided any queued data to the reader, but once the stream's queue is exhausted the stream will be closed
	 * and no more data can be read from it.
	 */
	close(): void {
		if (!isReadableStreamController(this)) {
			throw new TypeError('3.3.4.2-1: ReadableStreamController#close can only be used on a ReadableStreamController');
		}

		const stream = this._controlledReadableStream;
		if (stream.closeRequested) {
			throw new TypeError('3.3.4.2-3: The stream has already been closed; do not close it again!');
		}

		if (stream.state === State.Errored) {
			throw new TypeError('3.3.4.2-4: The stream is in an errored state and cannot be closed');
		}

		return stream.requestClose();
	}

	/**
	 * A source should call this method to provide data to the stream.
	 *
	 * @param chunk The data to provide to the stream
	 */
	enqueue(chunk: T): void {
		if (!isReadableStreamController(this)) {
			throw new TypeError('3.3.4.3-1: ReadableStreamController#enqueue can only be used on a ReadableStreamController');
		}

		const stream = this._controlledReadableStream;

		if (stream.state === State.Errored) {
			throw stream.storedError;
		}

		if (stream.closeRequested) {
			throw new TypeError('3.3.4.3-4: stream is draining');
		}

		stream.enqueue(chunk);
	}

	/**
	 * A source should call this method to indicate an error condition to the stream that irreparably disrupts the
	 * source's (and thus the stream's) ability to provide all the intended data.
	 *
	 * @param error An error object representing the error condition in the source
	 */
	error(error: Error): void {
		if (!isReadableStreamController(this)) {
			throw new TypeError('3.3.4.3-1: ReadableStreamController#enqueue can only be used on a ReadableStreamController');
		}

		if (this._controlledReadableStream.state !== State.Readable) {
			throw new TypeError(`3.3.4.3-2: the stream is ${this._controlledReadableStream.state} and so cannot be errored`);
		}
		// return errorReadableStream(this._controlledReadableStream, e);
		this._controlledReadableStream.error(error);
	}
}
