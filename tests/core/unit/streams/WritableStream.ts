import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import WritableStream, { State, Sink } from 'src/streams/WritableStream';
import BaseStringSink from './helpers/BaseStringSink';
import ManualSink from './helpers/ManualSink';
import { Strategy } from 'src/streams/interfaces';
import Promise from 'src/Promise';

const ASYNC_TIMEOUT = 1000;
let stream: WritableStream<string>;
let sink: Sink<string>;
let strategy: Strategy<string> = {
	size(chunk: string) {
		return 1;
	},
	highWaterMark: Infinity
};

class ErrorableStream<T> extends WritableStream<T> {
	error(error: Error): void {
		super._error(error);
	}
}

registerSuite({
	name: 'WritableStream',

	beforeEach() {
		sink = new BaseStringSink();
		stream = new WritableStream<string>(sink, strategy);
	},

	constructor: {
		state() {
			assert.strictEqual(stream.state, State.Writable, 'New stream state should be writable');
		},

		closed() {
			let dfd = this.async(ASYNC_TIMEOUT);

			stream.closed.then(function () {
				dfd.reject(new Error('New stream should not be closed'));
			});

			setTimeout(function () {
				dfd.resolve();
			}, 50);
		},

		ready() {
			let dfd = this.async(ASYNC_TIMEOUT);

			return stream.ready.then(function () {
				dfd.resolve();
			}, function (error: Error) {
				dfd.reject(new Error('New stream\'s ready promise should not reject'));
			});
		},

		'calls sink.start'() {
			let dfd = this.async(ASYNC_TIMEOUT);

			sink.start = function() {
				dfd.resolve();
				return Promise.resolve();
			};

			assert.doesNotThrow(function () {
				stream = new WritableStream(sink, strategy);
			});
		},

		'handles sink.start error'() {
			let dfd = this.async(ASYNC_TIMEOUT);

			sink.start = function() {
				return Promise.reject(new Error('test error'));
			};

			stream = new WritableStream(sink, strategy);

			setTimeout(dfd.callback(function () {
				assert.strictEqual(stream.state, State.Errored);
			}));
		},

		'handles sink.start error with error function'() {
			let dfd = this.async(ASYNC_TIMEOUT);

			sink.start = function(error: (error: Error) => void) {
				error(new Error('test error'));
				return Promise.resolve();
			};

			stream = new WritableStream(sink, strategy);

			setTimeout(dfd.callback(function () {
				assert.strictEqual(stream.state, State.Errored);
			}));
		}
	},

	close: {
		'new stream'() {
			let promise = stream.close();

			assert.strictEqual(stream.state, State.Closing);

			return promise.then(function () {
				assert.strictEqual(stream.state, State.Closed);
			});
		},

		'errored stream'() {
			let dfd = this.async(ASYNC_TIMEOUT);

			sink.start = function() {
				return Promise.reject(new Error('test error'));
			};

			stream = new WritableStream(sink, strategy);

			stream.close().then(function () {
				dfd.reject(new Error('stream.close should reject with error'));
			}, dfd.callback(function (error: Error) {
				assert.strictEqual(stream.state, State.Errored);
			}));
		},

		'blocks write'() {
			stream.close();

			return stream.write('abc').then(function () {
				throw new Error('Closed stream should not be writable');
			}, function (error: Error) {
				return;
			});
		},

		'calls sink.close'() {
			let dfd = this.async(ASYNC_TIMEOUT);

			sink.close = dfd.callback(function () {});
			stream = new WritableStream(sink, strategy);
			stream.close();
		},

		'handles sink.close error'() {
			let testError = new Error('sink.close test error');

			sink.close = function () {
				return Promise.reject(testError);
			};

			return stream.close().then(function () {
				throw new Error('Stream should be in errored state');
			}, function (error: Error) {
				assert.strictEqual(stream.state, State.Errored, 'Stream should be in errored state');
				assert.strictEqual(error, testError, 'sink.close error should propagate to stream.close');
			});
		},

		'already closing stream'() {
			stream.close();
			assert.strictEqual(stream.state, State.Closing, 'Stream should be in closing state');

			return stream.close().then(function () {
				assert.fail(null, null, 'Method should not resolve on stream that is already closing');
			}, function (error: Error) {
				assert.strictEqual(stream.state, State.Closing, 'Stream should be in closing state');
			});
		},

		'already closed stream'() {
			return stream.close().then( function () {
				assert.strictEqual(stream.state, State.Closed, 'Stream should be in closed state');

				return stream.close().then(function () {
					assert.fail(null, null, 'Method should not resolve on stream that is already closed');
				}, function (error: Error) {
					assert.strictEqual(stream.state, State.Closed, 'Stream should be in closed state');
				});
			});
		},

		'returns existing error from errored stream'() {
			let testError = new Error('Stream.close test error');

			stream.abort(testError);
			assert.strictEqual(stream.state, State.Errored);

			return stream.close().then(function () {
				throw new Error('Method should not resolve on stream that is errored');
			}, function (error: Error) {
				assert.strictEqual(error, testError,
					'Method should reject with same error as error passed to \'abort\'');
			});
		},

		'reject if context is wrong'() {
			return stream.close.call({}).then(function () {
				assert.fail(null, null, 'Method should not resolve when called in wrong context');
			}, function (error: Error) {
				assert.instanceOf(error, Error, 'Promise should reject with an Error');
			});
		}
	},

	write: {
		'writes to sink'() {
			let testValue = 'test value 1';
			let writtenValue: string;

			sink.write = function (chunk: string) {
				writtenValue = chunk;
				return Promise.resolve();
			};

			return stream.write(testValue).then(function () {
				assert.strictEqual(writtenValue, testValue, 'Value passed to stream.write should be passed to sink.write');
			});
		},

		'handles backpressure from strategy'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			let sink = new ManualSink<string>();

			stream = new WritableStream(sink, {
				size: function (chunk: string) {
					return 1;
				},
				highWaterMark: 1
			});

			let promise = stream.write('test1');
			assert.strictEqual(stream.state, State.Writable);

			stream.write('test2');
			assert.strictEqual(stream.state, State.Waiting);

			setTimeout(function () {
				sink.next();
			}, 20);

			promise.then(dfd.callback(function () {
				assert.strictEqual(stream.state, State.Writable);
			}), function (error: Error) {
				dfd.reject(error);
			});
		},

		'paused queue resumes'() {
			let sink = new ManualSink<string>();
			let testValues = [
				'test1',
				'test2',
				'test3'
			];

			stream = new WritableStream(sink, {
				size: function (chunk: string) {
					return 1;
				},
				highWaterMark: 1
			});

			// Peform two writes, putting the stream into 'waiting' state
			stream.write(testValues[0]).then(function () {
				sink.next();
			});
			stream.write(testValues[1]).then(function () {
				sink.next();
			});
			assert.strictEqual(stream.state, State.Waiting);

			// After a small delay to let stream call sink.write, start resolving calls to 'sink.write'
			setTimeout(function () {
				sink.next();
			}, 20);

			// If the stream correctly resumes writing, the sink will have all the values from the 'testValues' array
			return stream.write(testValues[2]).then(function () {
				for (let i = 0; i < testValues.length; i++) {
					assert.strictEqual(sink.values[i], testValues[i]);
				}
			});
		},

		'handles strategy.size error'() {
			stream = new WritableStream(sink, {
				size(chunk: string): number {
					throw new Error('Strategy.size test error');
				},
				highWaterMark: Infinity
			});

			stream.write('abc').then(function () {
				throw new Error('Stream should be in errored state');
			}, function (error: Error) {
				assert.strictEqual(stream.state, State.Errored);
			});
		},

		'reject if errored'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			sink = new BaseStringSink();
			let stream = new ErrorableStream<string>(sink, strategy);
			stream.error(new Error('test'));
			stream.write('test').then(
				dfd.rejectOnError(function () {
					assert.fail();
				}),
				dfd.callback(function () {})
			);
		},

		'closed stream'() {
			return stream.close().then(function () {
				assert.strictEqual(stream.state, State.Closed, 'Stream should be in closed state');

				return stream.write('abc').then(function () {
					assert.fail(null, null, 'Write operation on closed stream should not succeed');
				}, function (error: Error) {
					assert.strictEqual(stream.state, State.Closed, 'Stream should be in closed state');
				});
			});
		},

		'errored stream'() {
			stream.abort(new Error('Abort for test'));
			assert.strictEqual(stream.state, State.Errored, 'Stream should be in errored state');

			return stream.write('abc').then(function () {
				assert.fail(null, null, 'Write operation on errored stream should not succeed');
			}, function (error: Error) {
				assert.strictEqual(stream.state, State.Errored, 'Stream should be in errored state');
			});
		},

		'reject if context is wrong'() {
			return stream.write.call({}).then(function () {
				assert.fail(null, null, 'Method should not resolve when called in wrong context');
			}, function (error: Error) {
				assert.instanceOf(error, Error, 'Promise should reject with an Error');
			});
		}
	},

	abort: {
		'sets errored state and propagates error'() {
			let testError = new Error('Stream.abort test error');

			stream.abort(testError);
			assert.strictEqual(stream.state, State.Errored, 'Stream state should immediately be set to errored');

			return stream.closed.then(function () {
				throw new Error('Closed promise for aborted stream should not resolve');
			}, function (error: Error) {
				assert.strictEqual(error, testError, 'Closed promise error should be same as error passed to \'abort\'');
			});
		},

		'returns existing error from errored stream'() {
			let testError = new Error('Stream.abort test error');

			stream.abort(testError);
			assert.strictEqual(stream.state, State.Errored);

			return stream.abort('some new error').then(function () {
				throw new Error('Closed promise for aborted stream should not resolve');
			}, function (error: Error) {
				assert.strictEqual(error, testError, 'Closed promise error should be same as error passed to \'abort\'');
			});
		},

		'does not affect closed stream'() {
			return stream.close().then(function () {
				return stream.abort('abc').then(function () {
					assert.strictEqual(stream.state, State.Closed);
				}, function (error: Error) {
						throw error;
				});
			});
		},

		'calls sink.abort'() {
			let dfd = this.async(ASYNC_TIMEOUT);

			sink.abort = dfd.callback(function () {});
			stream.abort('abc');
		},

		'calls sink.close if sink.abort is undefined'() {
			let dfd = this.async(ASYNC_TIMEOUT);

			sink.abort = undefined;
			sink.close = dfd.callback(function () {});
			stream.abort('abc');
		},

		'reject if context is wrong'() {
			return stream.abort.call({}).then(function () {
				assert.fail(null, null, 'Method should not resolve when called in wrong context');
			}, function (error: Error) {
				assert.instanceOf(error, Error, 'Promise should reject with an Error');
			});
		}
	}
});
