import { Sink } from 'src/streams/WritableStream';
import Promise from 'src/Promise';

// A sink whose write operations must be manually resolved by calling 'next'
export default class ManualSink<T> implements Sink<T> {
	values: Array<T> = [];
	protected _resolvers: Function[] = [];

	write(chunk: T): Promise<void> {
		this.values.push(chunk);

		return new Promise<void>((resolve, reject) => {
			this._resolvers.push(resolve);
		});
	}

	next() {
		if (!this._resolvers.length) {
			console.warn('ManualSink.next called with nothing in queue');
			return;
		}

		var resolve = this._resolvers.shift();

		resolve();
	}

	abort(reason: any): Promise<void> {
		return Promise.resolve();
	}

	close(): Promise<void> {
		return Promise.resolve();
	}

	start(): Promise<void> {
		return Promise.resolve();
	}
}
