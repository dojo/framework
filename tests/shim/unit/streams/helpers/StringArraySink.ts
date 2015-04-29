import { Sink } from 'src/streams/interfaces';
import Promise from 'src/Promise';

export default class StringArraySink implements Sink<string> {
	stringArray: string[];


	abort(reason: any): Promise<void> {
		return Promise.resolve();
	}

	close(): Promise<void> {
		return Promise.resolve();
	}

	start(error: () => void): Promise<void> {
		this.stringArray = [];
		return Promise.resolve();
	}

	/**
	 *
	 * @param chunk
	 */
	write(chunk: string): Promise<void> {
		if (chunk) {
			this.stringArray.push(chunk);
		}
		return Promise.resolve();
	}
}