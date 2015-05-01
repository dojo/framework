import ReadableStream, { State } from './ReadableStream';

export default class ReadableStreamController<T> {
	private _controlledReadableStream: ReadableStream<T>;

	/**
	 * 3.3.4.1. get desiredSize
	 * @returns {number}
	 */
	get desiredSize(): number {
		return this._controlledReadableStream.desiredSize;
	}

	constructor(stream: ReadableStream<T>) {
		if (!stream.readable) {
			throw new TypeError('3.3.3-1: ReadableStreamController can only be constructed with a ReadableStream instance');
		}

		if (stream._controller !== undefined) {
			throw new TypeError('ReadableStreamController instances can only be created by the ReadableStream constructor');
		}

		this._controlledReadableStream = stream;
	}

	/**
	 *
	 */
	close(): void {
		if (!isReadableStreamController(this)) {
			throw new TypeError('3.3.4.2-1: ReadableStreamController#close can only be used on a ReadableStreamController');
		}

		var stream = this._controlledReadableStream;
		if (stream._closeRequested) {
			throw new TypeError('3.3.4.2-3: The stream has already been closed; do not close it again!');
		}

		if (stream.state === State.Errored) {
			throw new TypeError('3.3.4.2-4: The stream is in an errored state and cannot be closed');
		}

		return stream._requestClose();
	}

	/**
	 *
	 */
	enqueue(chunk: T): void {
		if (!isReadableStreamController(this)) {
			throw new TypeError('3.3.4.3-1: ReadableStreamController#enqueue can only be used on a ReadableStreamController');
		}

		var stream = this._controlledReadableStream;

		if (stream.state === State.Errored) {
			throw stream._storedError;
		}

		if (stream._closeRequested) {
			throw new TypeError('3.3.4.3-4: stream is draining');
		}

		stream.enqueue(chunk);
	}

	/**
	 *
	 */
	error(e: Error): void {
		if (!isReadableStreamController(this)) {
			throw new TypeError('3.3.4.3-1: ReadableStreamController#enqueue can only be used on a ReadableStreamController');
		}

		if (this._controlledReadableStream.state !== State.Readable) {
			throw new TypeError(`3.3.4.3-2: the stream is ${this._controlledReadableStream.state} and so cannot be errored`);
		}
		// return errorReadableStream(this._controlledReadableStream, e);
		this._controlledReadableStream.error(e);
	}
}

/**
 * 3.5.9-1 has been ignored
 */
export function isReadableStreamController(x: any): boolean {
	return Object.prototype.hasOwnProperty.call(x, '_controlledReadableStream');
}
