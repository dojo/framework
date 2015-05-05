import { Sink } from './WritableStream';
import Promise from '../Promise';

/**
 * A WritableStream sink that collects the chunks it receives and
 * stores them into an array.  Use the chunks property to retrieve
 * the collection of chunks.
 */
export default class ArraySink<T> implements Sink<T> {

	chunks: T[];

	abort(reason: any): Promise<void> {
		return resolved;
	}

	close(): Promise<void> {
		return Promise.resolve();
	}

	start(error: () => void): Promise<void> {
		this.chunks = [];
		return resolved;
	}

	/**
	 *
	 * @param chunk
	 */
	write(chunk: T): Promise<void> {
		if (chunk) {
			this.chunks.push(chunk);
		}
		return resolved;
	}
}

// Since this Sink is doing no asynchronous operations,
// use a single resolved promise for all returned promises.
var resolved = Promise.resolve();
