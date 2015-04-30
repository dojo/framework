import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import WritableStream, { State } from 'src/streams/WritableStream';
import BaseStringSink from './helpers/BaseStringSink';
import { Sink, Strategy } from 'src/streams/interfaces';
import Promise from 'src/Promise';

var stream: WritableStream<string>;
var sink: Sink<string>;
var strategy: Strategy<string> = {
	size(chunk: string) {
		return 1;
	},
	highwaterMark: Infinity
};

// A sink whose write operations must be manually resolved by calling 'next'
class ManualSink extends BaseStringSink {
	values: string[] = [];
	protected _resolvers: Function[] = [];

	write(chunk: string): Promise<void> {
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
			var dfd = this.async(100);

			stream.closed.then(() => {
				dfd.reject(new Error('New stream should not be closed'));
			});

			setTimeout(() => {
				dfd.resolve();
			}, 50);
		},

		ready() {
			var dfd = this.async(100);

			return stream.ready.then(() => {
				dfd.resolve();
			}, (error: Error) => {
				dfd.reject(new Error('New stream\'s ready promise should not reject'));
			});
		},

		'calls sink.start'() {
			var dfd = this.async(1000);

			sink.start = function() {
				dfd.resolve();
				return Promise.resolve();
			};

			assert.doesNotThrow(() => {
				stream = new WritableStream(sink, strategy);
			});
		},

		'handles sink.start error'() {
			var dfd = this.async(1000);

			sink.start = function() {
				return Promise.reject(new Error('test error'));
			};

			stream = new WritableStream(sink, strategy);

			setTimeout(dfd.callback(() => {
				assert.strictEqual(stream.state, State.Errored);
			}));
		},

		'handles sink.start error with error function'() {
			var dfd = this.async(1000);

			sink.start = function(error: (error: Error) => void) {
				error(new Error('test error'));
				return Promise.resolve();
			};

			stream = new WritableStream(sink, strategy);

			setTimeout(dfd.callback(() => {
				assert.strictEqual(stream.state, State.Errored);
			}));
		}
	},

	close: {
		'new stream'() {
			var promise = stream.close();

			assert.strictEqual(stream.state, State.Closing);

			return promise.then(() => {
				assert.strictEqual(stream.state, State.Closed);
			});
		},

		'errored stream'() {
			var dfd = this.async(1000);

			sink.start = function() {
				return Promise.reject(new Error('test error'));
			};

			stream = new WritableStream(sink, strategy);

			stream.close().then(() => {
				dfd.reject(new Error('stream.close should reject with error'));
			}, dfd.callback((error: Error) => {
				assert.strictEqual(stream.state, State.Errored);
			}));
		},

		'blocks write'() {
			stream.close();

			return stream.write('abc').then(() => {
				throw new Error('Closed stream should not be writable');
			}, (error: Error) => {
				return;
			});
		},

		'calls sink.close'() {
			var dfd = this.async(1000);

			sink.close = dfd.callback(() => { });
			stream = new WritableStream(sink, strategy);
			stream.close();
		},

		'handles sink.close error'() {
			var testError = new Error('sink.close test error');

			sink.close = () => {
				return Promise.reject(testError);
			};

			return stream.close().then(() => {
				throw new Error('Stream should be in errored state');
			}, (error: Error) => {
				assert.strictEqual(stream.state, State.Errored, 'Stream should be in errored state');
				assert.strictEqual(error, testError, 'sink.close error should propagate to stream.close');
			});
		}
	},

	write: {
		'writes to sink'() {
			var testValue = 'test value 1';
			var writtenValue: string;

			sink.write = (chunk: string) => {
				writtenValue = chunk;
				return Promise.resolve();
			};

			return stream.write(testValue).then(() => {
				assert.strictEqual(writtenValue, testValue, 'Value passed to stream.write should be passed to sink.write');
			});
		},

		'handles backpressure from strategy'() {
			var dfd = this.async(1000);
			var sink = new ManualSink();

			stream = new WritableStream(sink, {
				size: (chunk: string) => { return 1; },
				highwaterMark: 1
			});

			var promise = stream.write('test1');
			assert.strictEqual(stream.state, State.Writable);

			stream.write('test2');
			assert.strictEqual(stream.state, State.Waiting);

			setTimeout(() => {
				sink.next();
			}, 20);

			promise.then(dfd.callback(() => {
				assert.strictEqual(stream.state, State.Writable);
			}), (error: Error) => {
				dfd.reject(error);
			});
		},

		'paused queue resumes'() {
			var sink = new ManualSink();
			var testValues = [
				'test1',
				'test2',
				'test3'
			];

			stream = new WritableStream(sink, {
				size: (chunk: string) => { return 1; },
				highwaterMark: 1
			});

			// Peform two writes, putting the stream into 'waiting' state
			stream.write(testValues[0]).then(() => {
				sink.next();
			});
			stream.write(testValues[1]).then(() => {
				sink.next();
			});
			assert.strictEqual(stream.state, State.Waiting);

			// After a small delay to let stream call sink.write, start resolving calls to 'sink.write'
			setTimeout(() => {
				sink.next();
			}, 20);

			// If the stream correctly resumes writing, the sink will have all the values from the 'testValues' array
			return stream.write(testValues[2]).then(() => {
				for (var i = 0; i < testValues.length; i++) {
					assert.strictEqual(sink.values[i], testValues[i]);
				}
			});
		},

		'handles strategy.size error'() {
			stream = new WritableStream(sink, {
				size(chunk: string): number {
					throw new Error('Strategy.size test error');
				},
				highwaterMark: Infinity
			});

			stream.write('abc').then(() => {
				throw new Error('Stream should be in errored state');
			}, (error: Error) => {
				assert.strictEqual(stream.state, State.Errored);
			});
		}
	},

	abort: {
		'sets errored state and propagates error'() {
			var testError = new Error('Stream.abort test error');

			stream.abort(testError);
			assert.strictEqual(stream.state, State.Errored, 'Stream state should immediately be set to errored');

			return stream.closed.then(() => {
				throw new Error('Closed promise for aborted stream should not resolve');
			}, (error: Error) => {
				assert.strictEqual(error, testError, 'Closed promise error should be same as error passed to \'abort\'');
			});
		},

		'returns existing error from errored stream'() {
			var testError = new Error('Stream.abort test error');

			stream.abort(testError);
			assert.strictEqual(stream.state, State.Errored);

			return stream.abort('some new error').then(() => {
				throw new Error('Closed promise for aborted stream should not resolve');
			}, (error: Error) => {
				assert.strictEqual(error, testError, 'Closed promise error should be same as error passed to \'abort\'');
			});
		},

		'does not affect closed stream'() {
			return stream.close().then(() => {
				return stream.abort('abc').then(() => {
					assert.strictEqual(stream.state, State.Closed);
				}, (error: Error) => {
						throw error;
				});
			});
		},

		'calls sink.abort'() {
			var dfd = this.async(1000);

			sink.abort = dfd.callback(() => { });
			stream.abort('abc');
		},

		'calls sink.close if sink.abort is undefined'() {
			var dfd = this.async(1000);

			sink.abort = undefined;
			sink.close = dfd.callback(() => { });
			stream.abort('abc');
		}
	}
});
