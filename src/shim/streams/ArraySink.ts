import { Sink } from './interfaces';
import Promise from '../Promise';

/**
 * A WritableStream sink that collects the chunks it receives and
 * stores them into an array.  Use the chunks property to retrieve
 * the collection of chunks.
 */
export default class ArraySink<T> implements Sink<T> {

	chunks: T[];

	abort(reason: any): Promise<void> {
		return Promise.resolve();
	}

	close(): Promise<void> {
		return Promise.resolve();
	}

	start(error: () => void): Promise<void> {
		this.chunks = [];
		return Promise.resolve();
	}

	/**
	 *
	 * @param chunk
	 */
	write(chunk: T): Promise<void> {
		if (chunk) {
			this.chunks.push(chunk);
		}
		return Promise.resolve();
	}
}