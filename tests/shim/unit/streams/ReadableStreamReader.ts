import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';

import ReadableStreamReader from 'src/streams/ReadableStreamReader';
import ReadableStream, { State } from 'src/streams/ReadableStream';
import BaseStringSource from './helpers/BaseStringSource';
import { ReadResult, Source } from 'src/streams/interfaces';
import Promise from 'src/Promise';

var stream: ReadableStream<string>;
var source: Source<string>;
var reader: ReadableStreamReader<string>;

registerSuite({
	name: 'ReadableStreamReader',

	beforeEach() {
		source = new BaseStringSource();
		stream = new ReadableStream<string>(source, { size(chunk: string) { return 1; }, highWaterMark: Infinity });
		reader = stream.getReader();
	},

	'constructor': {
		'throws an error if no stream is present'() {
			assert.throws(() => {
				new ReadableStreamReader(null);
			});
		},

		'throws an error if the stream is locked'() {
			stream.readable = false;
			assert.throws(() => {
				new ReadableStreamReader(stream);
			});
		}
	},

	'cancel()': {
		'resolves if the reader is closed'() {
			var dfd = this.async(1000);
			reader.state = State.Closed;
			reader.cancel('reason').then(dfd.callback(() => {}));
		},

		'rejects if the reader is errored'() {
			var dfd = this.async(1000);
			reader.state = State.Errored;
			reader.cancel('reason').then(dfd.rejectOnError(() => {}), dfd.callback(() => {}));
		},

		'rejects with an error if state is readable and the owner stream state is not'() {
			var dfd = this.async(1000);
			reader.state = State.Readable;
			stream.state = State.Errored;
			reader.cancel('reason').then(dfd.rejectOnError(() => {}), dfd.callback(() => {}));
		},

		'calls the stream cancel method'() {
			var cancelCalled = false;
			stream._cancel = () => { cancelCalled = true; return Promise.resolve(); };
			reader.cancel('reason');
			assert.isTrue(cancelCalled);
		}
	},

	'read()': {
		'resolves with an undefined value if the state is closed'() {
			var dfd = this.async(1000);
			reader.state = State.Closed;
			reader.read().then(dfd.callback((result: ReadResult<string>) => {
				assert.isUndefined(result.value);
				assert.isTrue(result.done);
			}));
		},

		'rejects wth an error if the state is errored'() {
			var dfd = this.async(1000);
			reader.state = State.Errored;
			reader.read().then(dfd.rejectOnError(() => {}), dfd.callback(() => {}));
		},

		'throws an error if the stream is not readable'() {
			stream.state = State.Closed;
			assert.throws(() => {
				reader.read();
			});
		},

		'resolves with the chunk value'() {
			var chunkValue = 'test';
			stream._controller.enqueue(chunkValue);
			return reader.read().then((result: ReadResult<string>) => {
				assert.strictEqual(result.value, chunkValue);
			});
		}
	},

	'releaseLock()': {
		'throws an error if there are pending read requests'() {
			reader.read();
			assert.throws(() => {
				reader.releaseLock();
			});
		},

		'releases the lock and closes the reader'() {
			var dfd = this.async(1000);
			reader.closed.then(dfd.callback(() => {
				assert.strictEqual(reader.state, State.Closed);
			}));
			reader.releaseLock();
		}
	},

	'resolveReadRequest()': {
		'returns false if there are no requests to resolve'() {
			assert.isFalse(reader.resolveReadRequest('hello'));
		},

		'returns true if there are requests to resolve'() {
			reader.read();
			assert.isTrue(reader.resolveReadRequest('hello'));
		},

		'resolves the read with the resolved data'() {
			var dfd = this.async(1000);
			var resultChunk = 'test';
			reader.read().then(dfd.callback((result: ReadResult<string>) => {
				assert.strictEqual(result.value, resultChunk);
			}));
			reader.resolveReadRequest(resultChunk);
		}
	}
});
