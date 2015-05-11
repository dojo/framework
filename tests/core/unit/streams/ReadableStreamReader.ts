import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';

import ReadableStreamReader, { ReadResult } from 'src/streams/ReadableStreamReader';
import ReadableStream, { State, Source } from 'src/streams/ReadableStream';
import BaseStringSource from './helpers/BaseStringSource';
import Promise from 'src/Promise';

const ASYNC_TIMEOUT = 1000;
let stream: ReadableStream<string>;
let source: Source<string>;
let reader: ReadableStreamReader<string>;

registerSuite({
	name: 'ReadableStreamReader',

	beforeEach() {
		source = new BaseStringSource();
		stream = new ReadableStream<string>(source, {
			size(chunk: string) {
				return 1;
			},
			highWaterMark: Infinity
		});
		reader = stream.getReader();
	},

	'constructor': {
		'throws an error if no stream is present'() {
			assert.throws(function () {
				new ReadableStreamReader(null);
			});
		},

		'throws an error if the stream is not readable'() {
			stream.readable = false;
			assert.throws(function () {
				new ReadableStreamReader(stream);
			});
		},

		'throws an error if the stream is locked'() {
			assert.throws(function () {
				new ReadableStreamReader(<ReadableStream<string>>{});
			});
		},

		'closed stream'() {
			stream.state = State.Closed;
			assert.throws(function () {
				new ReadableStreamReader(stream);
			});
		},

		'error stream'() {
			stream.state = State.Errored;
			assert.throws(function () {
				new ReadableStreamReader(stream);
			});
		}
	},

	'closed promise': {
		'resolve on cancel'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			reader.closed.then(dfd.callback(function () {}));
			reader.cancel('reason');
		},

		'resolve on stream close'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			reader.closed.then(
				dfd.callback(function () {}),
				dfd.rejectOnError(function () {
					assert.fail();
				})
			);
			stream.close();
		}

	},

	'cancel()': {
		'resolves if the reader is closed'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			reader.state = State.Closed;
			reader.cancel('reason').then(dfd.callback(function () {}));
		},

		'rejects if the reader is errored'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			reader.state = State.Errored;
			reader.cancel('reason').then(dfd.rejectOnError(function () {}), dfd.callback(function () {}));
		},

		'rejects with an error if state is readable and the owner stream state is not'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			reader.state = State.Readable;
			stream.state = State.Errored;
			reader.cancel('reason').then(dfd.rejectOnError(function () {}), dfd.callback(function () {}));
		},

		'calls the stream cancel method'() {
			let cancelCalled = false;
			(<any> stream)._cancel = function () {
				cancelCalled = true;
				return Promise.resolve();
			};
			reader.cancel('reason');
			assert.isTrue(cancelCalled);
		},

		'reject if not readable stream reader'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			reader.cancel.call({}).then(
				dfd.rejectOnError(function () {
					assert.fail();
				}),
				dfd.callback(function () {})
			);
		}
	},

	'read()': {
		'resolves with an undefined value if the state is closed'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			reader.state = State.Closed;
			reader.read().then(dfd.callback(function (result: ReadResult<string>) {
				assert.isUndefined(result.value);
				assert.isTrue(result.done);
			}));
		},

		'rejects wth an error if the state is errored'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			reader.state = State.Errored;
			reader.read().then(
				dfd.rejectOnError(function () {}),
				dfd.callback(function () {})
			);
		},

		'throws an error if the stream is not readable'() {
			stream.state = State.Closed;
			assert.throws(function () {
				reader.read();
			});
		},

		'resolves with the chunk value'() {
			let chunkValue = 'test';
			stream.controller.enqueue(chunkValue);
			return reader.read().then(function (result: ReadResult<string>) {
				assert.strictEqual(result.value, chunkValue);
			});
		},

		'reject if not readable stream reader'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			reader.read.call({}).then(
				dfd.rejectOnError(function () {
					assert.fail();
				}),
				dfd.callback(function () {})
			);
		}
	},

	'releaseLock()': {
		'throws an error if there are pending read requests'() {
			reader.read();
			assert.throws(function () {
				reader.releaseLock();
			});
		},

		'releases the lock and closes the reader'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			reader.closed.then(dfd.callback(function () {
				assert.strictEqual(reader.state, State.Closed);
			}));
			reader.releaseLock();
		},

		'reject if not readable stream reader'() {
			assert.throws(function () {
				reader.releaseLock.call({});
			});
		},

		'unlocked'() {
			let result: any;
			reader.releaseLock();
			assert.doesNotThrow(function () {
				result = reader.releaseLock();
			});
			assert.isUndefined(result);
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
			let dfd = this.async(ASYNC_TIMEOUT);
			let resultChunk = 'test';
			reader.read().then(dfd.callback(function (result: ReadResult<string>) {
				assert.strictEqual(result.value, resultChunk);
			}));
			reader.resolveReadRequest(resultChunk);
		}
	}
});
