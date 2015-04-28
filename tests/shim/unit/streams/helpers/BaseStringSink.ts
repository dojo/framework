import { Sink } from 'src/streams/interfaces';
import Promise from 'src/Promise';

export default class BaseStringSource implements Sink<string> {

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
