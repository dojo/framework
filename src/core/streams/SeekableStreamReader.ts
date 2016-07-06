import Promise from 'dojo-shim/Promise';
import ReadableStreamReader, { ReadResult } from './ReadableStreamReader';
import SeekableStream from './SeekableStream';

export default class SeekableStreamReader<T> extends ReadableStreamReader<T> {
	protected _currentPosition: number = 0;
	protected _ownerReadableStream: SeekableStream<T>;

	get currentPosition(): number {
		return this._currentPosition;
	}

	read(): Promise<ReadResult<T>> {
		return super.read().then((result: ReadResult<T>) => {
			if (!result.done) {
				let chunkSize = 1;

				try {
					if (this._ownerReadableStream.strategy && this._ownerReadableStream.strategy.size) {
						chunkSize = this._ownerReadableStream.strategy.size(result.value);
					}
				}
				catch (error) {
					this._ownerReadableStream.error(error);

					return Promise.reject(error);
				}

				this._currentPosition += chunkSize;
			}

			return Promise.resolve(result);
		}, function (error: Error) {
			return Promise.reject(error);
		});
	}

	seek(position: number): Promise<number> {
		if (position === this._currentPosition) {
			return Promise.resolve(this._currentPosition);
		}

		if (position < this._currentPosition) {
			this._ownerReadableStream.queue.empty();
		}

		// Drain the queue of any items prior to the desired seek position
		while (position > this._currentPosition && this._ownerReadableStream.queue.length) {
			let chunkSize = 1;
			let chunk = this._ownerReadableStream.queue.dequeue();

			if (this._ownerReadableStream.strategy && this._ownerReadableStream.strategy.size) {
				try {
					chunkSize = this._ownerReadableStream.strategy.size(chunk);
				}
				catch (error) {
					return Promise.reject(error);
				}
			}

			this._currentPosition += chunkSize;
		}

		// If there's anything left in the queue, we don't need to seek in the source, we can read from the queue
		if (this._ownerReadableStream.queue.length) {
			return Promise.resolve(this._currentPosition);
		}

		return this._ownerReadableStream.seek(position).then((position: number) => {
			this._currentPosition = position;

			return Promise.resolve(position);
		}, (error: Error) => {
			return Promise.reject(error);
		});
	}
}
