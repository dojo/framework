import Promise from 'src/Promise';
import { Source } from 'src/streams/ReadableStream';
import ReadableStreamController from 'src/streams/ReadableStreamController';

const resolved = Promise.resolve();

/**
 * A seekable array source
 */
export default class ArraySource<T> implements Source<T> {
	// current seek position in the data array
	currentPosition: number;

	// shallow copy of data array passed to constructor
	data: Array<T>;

	constructor(data: Array<T>) {
		this.currentPosition = 0;
		this.data = [];

		if (data && data.length) {
			this.data = this.data.concat(data);
		}
	}

	seek(controller: ReadableStreamController<T>, position: number): Promise<number> {
		if (position >= this.data.length || position < 0) {
			let error = new Error('Invalid seek position: ' + position);
			controller.error(error);

			return Promise.reject(error);
		}

		this.currentPosition = position;

		return Promise.resolve(this.currentPosition);
	}

	start(controller: ReadableStreamController<T>): Promise<void> {
		return resolved;
	}

	pull(controller: ReadableStreamController<T>): Promise<void> {
		if (this.currentPosition >= this.data.length) {
			controller.close();
		}
		else {
			this.currentPosition += 1;
			controller.enqueue(this.data[this.currentPosition - 1]);
		}

		return resolved;
	}

	cancel(reason?: any): Promise<void> {
		return resolved;
	}
}
