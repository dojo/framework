import { Sink } from 'src/streams/WritableStream';
import Promise from 'dojo-shim/Promise';

export default class BaseStringSink implements Sink<string> {

	abort(reason: any): Promise<void> {
		return Promise.resolve();
	}

	close(): Promise<void> {
		return Promise.resolve();
	}

	start(): Promise<void> {
		return Promise.resolve();
	}

	write(chunk: string): Promise<void> {
		return Promise.resolve();
	}
}
