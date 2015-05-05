import ReadableStreamController from 'src/streams/ReadableStreamController';
import { Source } from 'src/streams/ReadableStream';
import Promise from 'src/Promise';

export default class BaseStringSource implements Source<string> {

	start(controller: ReadableStreamController<string>): Promise<void> {
		return Promise.resolve();
	}

	pull(controller: ReadableStreamController<string>): Promise<void> {
		return Promise.resolve();
	}

	cancel(reason?: any): Promise<void> {
		return Promise.resolve();
	}
}
