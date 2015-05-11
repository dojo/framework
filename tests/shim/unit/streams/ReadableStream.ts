import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';

import BaseStringSource from './helpers/BaseStringSource';
import ArraySink from 'src/streams/ArraySink';
import OriginalReadableStream, { State } from 'src/streams/ReadableStream';
import ReadableStreamController from 'src/streams/ReadableStreamController';
import { ReadResult } from 'src/streams/ReadableStreamReader';
import { Strategy } from 'src/streams/interfaces';
import Promise from 'src/Promise';
import TransformStream, { Transform } from 'src/streams/TransformStream';
import WritableStream, { State as WritableState } from 'src/streams/WritableStream';

function buildEnqueuingStartSource() {
	let source = new BaseStringSource();
	source.start = function (controller: ReadableStreamController<string>): Promise<void> {
		controller.enqueue('test 1');
		controller.enqueue('test 2');
		controller.enqueue('test 3');
		controller.close();
		return Promise.resolve();
	};
	return source;
}

class PrefixerTransform implements Transform<string, string> {
	private suffix: string;
	readableStrategy: Strategy<string>;
	writableStrategy: Strategy<string>;

	constructor(suffix: string) {
		this.suffix = suffix;
	}

	transform(chunk: string, enqueue: (chunk: string) => void, transformDone: () => void): void {
		enqueue(chunk + this.suffix);
		transformDone();
	}

	flush(enqueue: Function, close: Function): void {
		close();
	}
}

class ReadableStream<T> extends OriginalReadableStream<T> {
	get allowPull(): boolean {
		return this._allowPull;
	}

	get strategy() {
		return this._strategy;
	}

	get underlyingSource() {
		return this._underlyingSource;
	}

	set underlyingSource(source: any) {
		this._underlyingSource = source;
	}
}

const ASYNC_TIMEOUT = 1000;
let strategy: Strategy<string>;

registerSuite({
	name: 'ReadableStream',

	'constructor' : {

		'noSource'() {
			assert.throws(function () {
				new ReadableStream<string>(null);
			});
		},

		'simple source'() {
			let source = new BaseStringSource();
			assert.doesNotThrow(function () {
				new ReadableStream<string>(source);
			});
		},

		'verify start called'() {

			let dfd = this.async(ASYNC_TIMEOUT);
			let stream: ReadableStream<string>;

			// Make sure start is called.
			let source = new BaseStringSource();
			source.start = dfd.callback(function () {
				return Promise.resolve();
			});

			assert.doesNotThrow(function () {
				stream = new ReadableStream<string>(source);
			});
			setTimeout(dfd.rejectOnError(function () {
				assert.strictEqual(stream.state, State.Readable);
			}));
		},

		'verify pull called'() {

			let dfd = this.async(ASYNC_TIMEOUT);
			let stream: ReadableStream<string>;

			// Make sure start is called.
			let source = new BaseStringSource();
			source.pull = dfd.callback(function () {
				return Promise.resolve();
			});
			assert.doesNotThrow(function () {
				stream = new ReadableStream<string>(source);
			});
			setTimeout(dfd.rejectOnError(function () {
				assert.strictEqual(stream.state, State.Readable);
			}));
		},

		'source start rejects'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			let source = new BaseStringSource();
			source.start = function () {
				return Promise.reject(new Error('test'));
			};

			let stream = new ReadableStream(source);
			setTimeout(dfd.callback(function () {
				assert.strictEqual(stream.state, State.Errored);
			}));
		},

		'source pull rejects'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			let source = new BaseStringSource();
			source.pull = function () {
				return Promise.reject(new Error('test'));
			};

			let stream = new ReadableStream(source);
			setTimeout(dfd.callback(function () {
				assert.strictEqual(stream.state, State.Errored);
			}), 50);
		}
	},

	'strategy': {
		beforeEach() {
			strategy = {
				size: function (chunk: string) {
					return 1;
				},
				highWaterMark: 2
			};
		},

		'default strategy'() {
			let source = new BaseStringSource();
			let stream = new ReadableStream<string>(source);
			assert.isNotNull(stream.strategy);
			assert.isUndefined(stream.strategy.size);
			assert.strictEqual(stream.strategy.highWaterMark, 1);
		},

		'strategy'() {
			let stream: ReadableStream<string>;
			let source = new BaseStringSource();
			stream = new ReadableStream<string>(source, strategy);
			assert.isNotNull(stream.strategy);
			assert.isNotNull(stream.strategy.size);
			assert.strictEqual(stream.strategy.highWaterMark, 2);
			assert.strictEqual(stream.strategy.size('test'), 1);

			// changing the source's strategy does not affect the stream that has already been created.
			strategy = {
				size: function (chunk: string) {
					return 10;
				},
				highWaterMark: 25
			};
			assert.strictEqual(stream.strategy.highWaterMark, 2);
			assert.strictEqual(stream.strategy.size('test'), 1);
		},

		'strategy size() throw error'() {
			let source = new BaseStringSource();
			let strategy = {
				size: function (chunk: string): number {
					throw new Error('Size failure');
				},
				highWaterMark: 2
			};

			let stream = new ReadableStream(source, strategy);
			assert.throws(function () {
				stream.enqueue('This is a test');
			});
		}
	},

	'enqueue': {
		'enqueue stream not locked'() {
			let source = new BaseStringSource();
			let stream = new ReadableStream<string>(source, strategy);

			stream.enqueue('This is a test');
			assert.strictEqual(stream.queueSize, 1);
		},

		'enqueue'() {
			let source = new BaseStringSource();
			let strategy: Strategy<string> = {
				size: function (chunk: string) {
					return 1;
				},
				highWaterMark: 2
			};
			let stream = new ReadableStream<string>(source, strategy);
			stream.getReader();

			assert.strictEqual(stream.desiredSize, 2);
			stream.enqueue('This is a test');
			assert.strictEqual(stream.desiredSize, 1);
			stream.enqueue('This is a test');
			assert.strictEqual(stream.desiredSize, 0);
			stream.enqueue('This is a test');
			assert.strictEqual(stream.desiredSize, -1);

			assert.strictEqual(stream.queueSize, 3);
		},

		'enqueue size'() {
			let source = new BaseStringSource();
			let strategy: Strategy<string> = {
				size: function (chunk: string) {
					return 5;
				},
				highWaterMark: 15
			};
			let stream = new ReadableStream<string>(source, strategy);
			stream.getReader();

			stream.enqueue('This is a test');
			assert.strictEqual(stream.queueSize, 5);
		},

		'enqueue no size'() {
			let source = new BaseStringSource();
			let strategy: Strategy<string> = {
				size: undefined,
				highWaterMark: 15
			};
			let stream = new ReadableStream<string>(source, strategy);
			stream.getReader();

			stream.enqueue('This is a test');
			assert.strictEqual(stream.queueSize, 1);
		},

		'enqueue with read requests'() {
			let source = new BaseStringSource();
			let strategy: Strategy<string> = {
				size: function (chunk: string) {
					return 1;
				},
				highWaterMark: 2
			};
			let stream = new ReadableStream<string>(source, strategy);
			let reader = stream.getReader();
			// Mock reader's resolveReadRequest method.
			reader.resolveReadRequest = function (chunk: string) {
				return true;
			};
			assert.strictEqual(stream.desiredSize, 2);
			stream.enqueue('This is a test');
			assert.strictEqual(stream.desiredSize, 2);
		}
	},

	'error'() {
		let stream = new ReadableStream(new BaseStringSource(), strategy);
		stream.enqueue('test');
		assert.strictEqual(stream.queueSize, 1);

		let error = new Error('test error');
		assert.doesNotThrow(function () {
			stream.error(error);
		});
		assert.strictEqual(stream.storedError, error);
		assert.strictEqual(stream.queueSize, 0);
		assert.strictEqual(stream.state, State.Errored);

		assert.throws(function () {
			stream.error(error);
		});

		stream = new ReadableStream(new BaseStringSource(), strategy);
		let reader = stream.getReader();
		stream.error(error);
		assert.strictEqual(reader.state, State.Errored);
	},

	'getReader': {
		'get reader after error'() {
			let stream = new ReadableStream(new BaseStringSource(), strategy);
			assert.doesNotThrow(function () {
				stream.error(new Error());
			});
			assert.throws(function () {
				stream.getReader();
			});
		},

		'get reader when locked'() {
			let stream = new ReadableStream(new BaseStringSource(), strategy);
			assert.doesNotThrow(function () {
				stream.getReader();
			});
			assert.throws(function () {
				stream.getReader();
			});
		}
	},

	'isLocked'() {
		let stream = new ReadableStream(new BaseStringSource(), strategy);
		assert.isTrue(stream.hasSource);
		assert.isFalse(stream.locked);

	},

	'requestClose'() {
		let stream = new ReadableStream(new BaseStringSource(), strategy);
		stream.requestClose();
		assert.strictEqual(stream.state, State.Closed);
		stream.requestClose();
		assert.strictEqual(stream.state, State.Closed);

		stream = new ReadableStream(new BaseStringSource(), strategy);
		stream.enqueue('test');
		stream.requestClose();
		assert.strictEqual(stream.state, State.Readable);
	},

	'close'() {
		let stream = new ReadableStream(new BaseStringSource(), strategy);
		stream.close();
		assert.strictEqual(stream.state, State.Closed);
		stream.close();

		stream = new ReadableStream(new BaseStringSource(), strategy);
		stream.error(new Error('test'));
		stream.close();

		stream = new ReadableStream(new BaseStringSource(), strategy);
		stream.getReader();
		assert.isObject(stream.reader);
		stream.close();
		assert.isTrue(stream.reader == null);
	},

	'cancel': {
		'not readable'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			let stream = new ReadableStream(new BaseStringSource(), strategy);
			stream.underlyingSource = null;
			stream.cancel().then(
				dfd.rejectOnError(function () {
					assert.fail();
				}),
				dfd.callback(function (error: Error) {
					assert.isObject(error);
				})
			);
		},

		// 'locked'() {
		// 	var dfd = this.async(asyncTimeout);
		// 	var stream = new ReadableStream(new BaseStringSource(), strategy);
		// 	stream.getReader();
		// 	assert.isTrue(stream.locked);
		// 	stream.cancel().then(
		// 		dfd.rejectOnError(() => { assert.fail(); }),
		// 		dfd.callback((error: Error) => { assert.isObject(error); })
		// 	);
		// },

		'closed'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			let stream = new ReadableStream(new BaseStringSource(), strategy);
			stream.requestClose();
			assert.strictEqual(stream.state, State.Closed);
			stream.cancel().then(
				dfd.callback(function (value: any) {
					assert.isUndefined(value);
				}),
				dfd.rejectOnError(function () {
					assert.fail();
				})
			);
		},

		'errored'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			let stream = new ReadableStream(new BaseStringSource(), strategy);
			stream.error(new Error('test'));
			assert.strictEqual(stream.state, State.Errored);
			stream.cancel().then(
				dfd.rejectOnError(function () {
					assert.fail();
				}),
				dfd.callback(function (error: Error) {
					assert.isObject(error);
				})
			);
		},

		'populated queue'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			let stream = new ReadableStream(new BaseStringSource(), strategy);
			stream.enqueue('test');
			assert.strictEqual(stream.queueSize, 1);
			assert.strictEqual(stream.state, State.Readable);
			stream.cancel().then(
				dfd.callback(function () {
					assert.strictEqual(stream.queueSize, 0);
					assert.strictEqual(stream.state, State.Closed);
				}),
				dfd.rejectOnError(function () {
					assert.fail();
				})
			);
		},

		'verify cancel called on source'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			let source = new BaseStringSource();
			source.cancel = dfd.callback(source.cancel);
			let stream = new ReadableStream(source, strategy);
			stream.cancel();
		}
	},

	'allowPull': {
		'started'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			let stream = new ReadableStream(new BaseStringSource());
			stream.started.then(dfd.callback(function () {
				assert.isTrue(stream.allowPull);
			}));
		},

		'closed'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			let stream = new ReadableStream(new BaseStringSource());
			stream.started.then(dfd.callback(function () {
				stream.close();
				assert.isFalse(stream.allowPull);
			}));
		},

		'closedRequested'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			let stream = new ReadableStream(new BaseStringSource(), {
				highWaterMark: 10
			});
			stream.started.then(dfd.callback(function () {
				stream.enqueue('test');
				stream.requestClose();
				assert.isFalse(stream.allowPull);
			}));
		},

		'errored'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			let stream = new ReadableStream(new BaseStringSource());
			stream.started.then(dfd.callback(function () {
				stream.error(new Error('test'));
				assert.isFalse(stream.allowPull);
			}));
		},

		'queue full'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			let stream = new ReadableStream(new BaseStringSource());
			stream.started.then(dfd.callback(function () {
				stream.enqueue('test 1');
				assert.strictEqual(stream.desiredSize, 0);
				assert.isFalse(stream.allowPull);
			}));
		},

		'pull requested'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			let source = new BaseStringSource();
			source.pull = function (controller: ReadableStreamController<string>): Promise<void> {
				return new Promise<void>(function () {});
			};
			let stream = new ReadableStream(source);
			stream.started.then(dfd.callback(function () {
				stream.pull();
				assert.isTrue(stream.pullScheduled);
				assert.isFalse(stream.allowPull);
			}));
		}
	},

	'tee': {
		'not readable'() {
			let stream = new ReadableStream(new BaseStringSource());
			// stream.underlyingSource = undefined;
			// assert.throws(function () { stream.tee() });

			// stream = new ReadableStream(new BaseStringSource());
			stream.close();
			assert.throws(function () {
				stream.tee();
			});
		},

		'two streams'() {
			let stream = new ReadableStream(new BaseStringSource());
			let tees = stream.tee();
			assert.lengthOf(tees, 2);
			assert.isObject(tees[0]);
			assert.isObject(tees[1]);
		},

		'cancel'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			let stream = new ReadableStream(new BaseStringSource());
			let [ stream1, stream2 ] = stream.tee();
			stream1.cancel('because').then(dfd.callback(function () {
				assert.strictEqual(stream1.state, State.Closed);
				assert.strictEqual(stream2.state, State.Closed);
				assert.strictEqual(stream.state, State.Closed);
			}), dfd.rejectOnError(function (error: any) {
				assert.fail(error);
			}));
			stream2.cancel('testing').then(dfd.rejectOnError(function () {}),
				dfd.rejectOnError(function (error: any) {
					assert.fail(error);
				}));
		},

		'pull'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			let source = new BaseStringSource();
			source.start = function (controller: ReadableStreamController<string>): Promise<void> {
				controller.enqueue('test 1');
				controller.enqueue('test 2');
				controller.close();
				return Promise.resolve();
			};
			let stream = new ReadableStream(source);
			let [ stream1, stream2 ] = stream.tee();

			Promise.all([stream1.getReader().read(), stream2.getReader().read()]).then(
				dfd.callback(function (value: ReadResult<string>[]) {
					assert.strictEqual(value[0].value, 'test 1');
					assert.strictEqual(value[1].value, 'test 1');
				}), dfd.rejectOnError(function () {
					assert.fail();
				})
			);
		},

		'one cancelled'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			let source = new BaseStringSource();
			source.start = function (controller: ReadableStreamController<string>): Promise<void> {
				controller.enqueue('test 1');
				controller.close();
				return Promise.resolve();
			};
			let stream = new ReadableStream(source);
			let [ stream1, stream2 ] = stream.tee();
			stream1.cancel();

			assert.throws(function () {
				stream1.getReader().read();
			});
			let reader = stream2.getReader();
			reader.read().then(function (value: ReadResult<string>) {
				assert.isFalse(value.done);
				assert.strictEqual(value.value, 'test 1');
				return reader.read();
			}).then(dfd.callback(function (value: ReadResult<string>) {
				assert.isTrue(value.done);
			}), dfd.rejectOnError(function () {
				assert.fail();
			}));
		},

		'two cancelled'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			let source = new BaseStringSource();
			source.start = function (controller: ReadableStreamController<string>): Promise<void> {
				controller.enqueue('test 1');
				controller.close();
				return Promise.resolve();
			};
			let stream = new ReadableStream(source);
			let [ stream1, stream2 ] = stream.tee();
			stream2.cancel();

			assert.throws(function () {
				stream2.getReader().read();
			});
			let reader = stream1.getReader();
			reader.read().then(function (value: ReadResult<string>) {
				assert.isFalse(value.done);
				assert.strictEqual(value.value, 'test 1');
				return reader.read();
			}).then(dfd.callback(function (value: ReadResult<string>) {
				assert.isTrue(value.done);
			}), dfd.rejectOnError(function () {
				assert.fail();
			}));
		},

		'error'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			let source = new BaseStringSource();
			let stream = new ReadableStream(source);
			let [ stream1, stream2 ] = stream.tee();

			let reader1 = stream1.getReader();
			let reader2 = stream2.getReader();

			Promise.all([reader1.closed, reader2.closed]).then(dfd.rejectOnError(function () {
				assert.fail();
			}), dfd.callback(function () {
				assert.strictEqual(reader1.state, State.Errored);
				assert.strictEqual(reader2.state, State.Errored);
			}));

			stream.error(new Error('testing'));
		}
	},

	'pipeTo': {
		'basic'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			let sink = new ArraySink<string>();
			let outStream = new WritableStream(sink);

			let inStream = new ReadableStream(buildEnqueuingStartSource());
			inStream.pipeTo(outStream).then(dfd.callback(function () {
				assert.lengthOf(sink.chunks, 3);
				assert.strictEqual(inStream.state, State.Closed);
				assert.strictEqual(outStream.state, WritableState.Closed);
			}), dfd.rejectOnError(function () {
				assert.fail();
			}));
		},

		'source start rejects'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			let sink = new ArraySink<string>();
			let outStream = new WritableStream(sink);

			let source = new BaseStringSource();
			source.start = function () {
				return Promise.reject(new Error('test'));
			};

			let inStream = new ReadableStream(source);
			inStream.pipeTo(outStream).then(
				dfd.rejectOnError(function () {
					assert.fail();
				}),
				dfd.callback(function () {})
			);
		},

		'source pull rejects'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			let sink = new ArraySink<string>();
			let outStream = new WritableStream(sink);

			let source = new BaseStringSource();
			source.start = function (controller: ReadableStreamController<string>): Promise<void> {
				controller.enqueue('test 1');
				return Promise.resolve();
			};
			source.pull = function () {
				return Promise.reject(new Error('test'));
			};

			let inStream = new ReadableStream(source);
			inStream.pipeTo(outStream).then(
				dfd.rejectOnError(function () {
					assert.fail();
				}),
				dfd.callback(function () {
					assert.strictEqual(inStream.state, State.Errored);
					assert.strictEqual(outStream.state, WritableState.Errored);
				})
			);
		},

		'sink rejects'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			let sink = new ArraySink<string>();
			sink.write = function () {
				return Promise.reject(new Error('because'));
			};
			let outStream = new WritableStream(sink);

			let inStream = new ReadableStream(buildEnqueuingStartSource());
			inStream.pipeTo(outStream).then(
				dfd.rejectOnError(function () {
					assert.fail();
				}),
				dfd.callback(function () {
					assert.strictEqual(inStream.state, State.Closed);
					assert.strictEqual(outStream.state, WritableState.Errored);
				})
			);
		},

		'prevent close'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			let sink = new ArraySink<string>();
			let outStream = new WritableStream(sink);

			let inStream = new ReadableStream(buildEnqueuingStartSource());
			inStream.pipeTo(outStream, { preventClose: true }).then(dfd.callback(function () {
				assert.lengthOf(sink.chunks, 3);
				assert.strictEqual(outStream.state, WritableState.Writable);
			}), dfd.rejectOnError(function () {
				assert.fail();
			}));
		},

		'prevent cancel'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			let sink = new ArraySink<string>();
			sink.write = function () {
				return Promise.reject(new Error('because'));
			};
			let outStream = new WritableStream(sink);

			let inStream = new ReadableStream(buildEnqueuingStartSource());
			inStream.pipeTo(outStream, { preventCancel: true }).then(
				dfd.rejectOnError(function () {
					assert.fail();
				}),
				dfd.callback(function () {
					assert.strictEqual(inStream.state, State.Readable);
					assert.strictEqual(outStream.state, WritableState.Errored);
				})
			);
		},

		'prevent abort'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			let sink = new ArraySink<string>();
			let outStream = new WritableStream(sink);

			let source = new BaseStringSource();
			source.start = function (controller: ReadableStreamController<string>): Promise<void> {
				controller.enqueue('test 1');
				return Promise.resolve();
			};
			source.pull = function () {
				return Promise.reject(new Error('test'));
			};

			let inStream = new ReadableStream(source);
			inStream.pipeTo(outStream, { preventAbort: true }).then(
				dfd.rejectOnError(function () {
					assert.fail();
				}),
				dfd.callback(function () {
					assert.strictEqual(inStream.state, State.Errored);
					assert.strictEqual(outStream.state, WritableState.Writable);
				})
			);
		},

		'writable closed'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			let sink = new ArraySink<string>();
			let outStream = new WritableStream(sink);
			outStream.close();

			let inStream = new ReadableStream(buildEnqueuingStartSource());
			inStream.pipeTo(outStream).then(
				dfd.rejectOnError(function () {
					assert.fail();
				}),
				dfd.callback(function () {
					assert.strictEqual(inStream.state, State.Closed);
					assert.strictEqual(outStream.state, WritableState.Closed);
				})
			);
		},

		'writable closed with prevent cancel'() {
			let dfd = this.async(ASYNC_TIMEOUT);
			let sink = new ArraySink<string>();
			let outStream = new WritableStream(sink);
			outStream.close();

			let inStream = new ReadableStream(buildEnqueuingStartSource());
			inStream.pipeTo(outStream, { preventCancel: true }).then(
				dfd.rejectOnError(function () {
					assert.fail();
				}),
				dfd.callback(function () {
					assert.strictEqual(inStream.state, State.Readable);
					assert.strictEqual(outStream.state, WritableState.Closed);
				})
			);
		}
	},

	'pipeThrough'() {
		let dfd = this.async(ASYNC_TIMEOUT);
		let sink = new ArraySink<string>();
		let outStream = new WritableStream(sink);

		let inStream = new ReadableStream(buildEnqueuingStartSource());
		inStream.pipeThrough(new TransformStream(new PrefixerTransform('-transformed')))
			.pipeTo(outStream).then(dfd.callback(function () {
				assert.lengthOf(sink.chunks, 3);
				assert.strictEqual(sink.chunks[0], 'test 1-transformed');
				assert.strictEqual(sink.chunks[1], 'test 2-transformed');
				assert.strictEqual(sink.chunks[2], 'test 3-transformed');
			}), dfd.rejectOnError(function () {
				assert.fail();
			}));
	}
});
