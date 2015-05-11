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

var strategy: Strategy<string>;
var asyncTimeout = 1000;

registerSuite({
	name: 'ReadableStream',

	'constructor' : {

		'noSource'() {
			assert.throws(() => { new ReadableStream<string>(null); });
		},

		'simple source'() {
			var source = new BaseStringSource();
			assert.doesNotThrow(() => { new ReadableStream<string>(source); });
		},

		'verify start called'() {

			var dfd = this.async(asyncTimeout);
			var stream: ReadableStream<string>;

			// Make sure start is called.
			var source = new BaseStringSource();
			source.start = dfd.callback(() => {
				return Promise.resolve();
			});

			assert.doesNotThrow(() => stream = new ReadableStream<string>(source));
			setTimeout(dfd.rejectOnError(() => {
				assert.strictEqual(stream.state, State.Readable);
			}));
		},

		'verify pull called'() {

			var dfd = this.async(asyncTimeout);
			var stream: ReadableStream<string>;

			// Make sure start is called.
			var source = new BaseStringSource();
			source.pull = dfd.callback(() => {
				return Promise.resolve();
			});
			assert.doesNotThrow(() => { stream = new ReadableStream<string>(source); });
			setTimeout(dfd.rejectOnError(() => {
				assert.strictEqual(stream.state, State.Readable);
			}));
		},

		'source start rejects'() {
			var dfd = this.async(asyncTimeout);
			var source = new BaseStringSource();
			source.start = () => {
				return Promise.reject(new Error('test'));
			};

			var stream = new ReadableStream(source);
			setTimeout(dfd.callback(() => {
				assert.strictEqual(stream.state, State.Errored);
			}));
		},

		'source pull rejects'() {
			var dfd = this.async(asyncTimeout);
			var source = new BaseStringSource();
			source.pull = () => {
				return Promise.reject(new Error('test'));
			};

			var stream = new ReadableStream(source);
			setTimeout(dfd.callback(() => {
				assert.strictEqual(stream.state, State.Errored);
			}), 50);
		}
	},

	'strategy': {
		beforeEach() {
			strategy = {
				size: (chunk: string) => { return 1; },
				highWaterMark: 2
			};
		},

		'default strategy'() {
			var source = new BaseStringSource();
			var stream = new ReadableStream<string>(source);
			assert.isNotNull(stream.strategy);
			assert.isUndefined(stream.strategy.size);
			assert.strictEqual(stream.strategy.highWaterMark, 1);
		},

		'strategy'() {
			var stream: ReadableStream<string>;
			var source = new BaseStringSource();
			stream = new ReadableStream<string>(source, strategy);
			assert.isNotNull(stream.strategy);
			assert.isNotNull(stream.strategy.size);
			assert.strictEqual(stream.strategy.highWaterMark, 2);
			assert.strictEqual(stream.strategy.size('test'), 1);

			// changing the source's strategy does not affect the stream that has already been created.
			strategy = {
				size: (chunk: string) => { return 10; },
				highWaterMark: 25
			};
			assert.strictEqual(stream.strategy.highWaterMark, 2);
			assert.strictEqual(stream.strategy.size('test'), 1);
		},

		'strategy size() throw error'() {
			var source = new BaseStringSource();
			var strategy = {
				size: (chunk: string): number => { throw new Error('Size failure'); },
				highWaterMark: 2
			};

			var stream = new ReadableStream(source, strategy);
			assert.throws(() => { stream.enqueue('This is a test'); });
		}
	},

	'enqueue': {
		'enqueue stream not locked'() {
			var source = new BaseStringSource();
			var stream = new ReadableStream<string>(source, strategy);

			stream.enqueue('This is a test');
			assert.strictEqual(stream.queueSize, 1);
		},

		'enqueue'() {
			var source = new BaseStringSource();
			var strategy: Strategy<string> = {
				size: (chunk: string) => { return 1; },
				highWaterMark: 2
			};
			var stream = new ReadableStream<string>(source, strategy);
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
			var source = new BaseStringSource();
			var strategy: Strategy<string> = {
				size: (chunk: string) => { return 5; },
				highWaterMark: 15
			};
			var stream = new ReadableStream<string>(source, strategy);
			stream.getReader();

			stream.enqueue('This is a test');
			assert.strictEqual(stream.queueSize, 5);
		},

		'enqueue no size'() {
			var source = new BaseStringSource();
			var strategy: Strategy<string> = {
				size: undefined,
				highWaterMark: 15
			};
			var stream = new ReadableStream<string>(source, strategy);
			stream.getReader();

			stream.enqueue('This is a test');
			assert.strictEqual(stream.queueSize, 1);
		},

		'enqueue with read requests'() {
			var source = new BaseStringSource();
			var strategy: Strategy<string> = {
				size: (chunk: string) => { return 1; },
				highWaterMark: 2
			};
			var stream = new ReadableStream<string>(source, strategy);
			var reader = stream.getReader();
			// Mock reader's resolveReadRequest method.
			reader.resolveReadRequest = (chunk: string) => { return true; };
			assert.strictEqual(stream.desiredSize, 2);
			stream.enqueue('This is a test');
			assert.strictEqual(stream.desiredSize, 2);
		}
	},

	'error'() {
		var stream = new ReadableStream(new BaseStringSource(), strategy);
		stream.enqueue('test');
		assert.strictEqual(stream.queueSize, 1);

		var error = new Error('test error');
		assert.doesNotThrow(() => { stream.error(error); });
		assert.strictEqual(stream.storedError, error);
		assert.strictEqual(stream.queueSize, 0);
		assert.strictEqual(stream.state, State.Errored);

		assert.throws(() => { stream.error(error); });

		stream = new ReadableStream(new BaseStringSource(), strategy);
		var reader = stream.getReader();
		stream.error(error);
		assert.strictEqual(reader.state, State.Errored);
	},

	'getReader': {
		'get reader after error'() {
			var stream = new ReadableStream(new BaseStringSource(), strategy);
			assert.doesNotThrow(() => {
				stream.error(new Error());
			});
			assert.throws(() => {
				stream.getReader();
			});
		},

		'get reader when locked'() {
			var stream = new ReadableStream(new BaseStringSource(), strategy);
			assert.doesNotThrow(() => { stream.getReader(); });
			assert.throws(() => { stream.getReader(); });
		}
	},

	'isLocked'() {
		var stream = new ReadableStream(new BaseStringSource(), strategy);
		assert.isTrue(stream.hasSource);
		assert.isFalse(stream.locked);

	},

	'requestClose'() {
		var stream = new ReadableStream(new BaseStringSource(), strategy);
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
		var stream = new ReadableStream(new BaseStringSource(), strategy);
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
			var dfd = this.async(asyncTimeout);
			var stream = new ReadableStream(new BaseStringSource(), strategy);
			stream.underlyingSource = null;
			stream.cancel().then(
				dfd.rejectOnError(() => { assert.fail(); }),
				dfd.callback((error: Error) => { assert.isObject(error); })
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
			var dfd = this.async(asyncTimeout);
			var stream = new ReadableStream(new BaseStringSource(), strategy);
			stream.requestClose();
			assert.strictEqual(stream.state, State.Closed);
			stream.cancel().then(
				dfd.callback((value: any) => { assert.isUndefined(value); }),
				dfd.rejectOnError(() => { assert.fail(); })
			);
		},

		'errored'() {
			var dfd = this.async(asyncTimeout);
			var stream = new ReadableStream(new BaseStringSource(), strategy);
			stream.error(new Error('test'));
			assert.strictEqual(stream.state, State.Errored);
			stream.cancel().then(
				dfd.rejectOnError(() => { assert.fail(); }),
				dfd.callback((error: Error) => { assert.isObject(error); })
			);
		},

		'populated queue'() {
			var dfd = this.async(asyncTimeout);
			var stream = new ReadableStream(new BaseStringSource(), strategy);
			stream.enqueue('test');
			assert.strictEqual(stream.queueSize, 1);
			assert.strictEqual(stream.state, State.Readable);
			stream.cancel().then(
				dfd.callback(() => {
					assert.strictEqual(stream.queueSize, 0);
					assert.strictEqual(stream.state, State.Closed);
				}),
				dfd.rejectOnError(() => { assert.fail(); })
			);
		},

		'verify cancel called on source'() {
			var dfd = this.async(asyncTimeout);
			var source = new BaseStringSource();
			source.cancel = dfd.callback(source.cancel);
			var stream = new ReadableStream(source, strategy);
			stream.cancel();
		}
	},

	'allowPull': {

		'started'() {
			var dfd = this.async(asyncTimeout);
			var stream = new ReadableStream(new BaseStringSource());
			stream.started.then(dfd.callback(() => {
				assert.isTrue(stream.allowPull);
			}));
		},

		'closed'() {
			var dfd = this.async(asyncTimeout);
			var stream = new ReadableStream(new BaseStringSource());
			stream.started.then(dfd.callback(() => {
				stream.close();
				assert.isFalse(stream.allowPull);
			}));
		},

		'closedRequested'() {
			var dfd = this.async(asyncTimeout);
			var stream = new ReadableStream(new BaseStringSource(), {
				highWaterMark: 10
			});
			stream.started.then(dfd.callback(() => {
				stream.enqueue('test');
				stream.requestClose();
				assert.isFalse(stream.allowPull);
			}));
		},

		'errored'() {
			var dfd = this.async(asyncTimeout);
			var stream = new ReadableStream(new BaseStringSource());
			stream.started.then(dfd.callback(() => {
				stream.error(new Error('test'));
				assert.isFalse(stream.allowPull);
			}));
		},

		'queue full'() {
			var dfd = this.async(asyncTimeout);
			var stream = new ReadableStream(new BaseStringSource());
			stream.started.then(dfd.callback(() => {
				stream.enqueue('test 1');
				assert.strictEqual(stream.desiredSize, 0);
				assert.isFalse(stream.allowPull);
			}));
		},

		'pull requested'() {
			var dfd = this.async(asyncTimeout);
			var source = new BaseStringSource();
			source.pull = (controller: ReadableStreamController<string>): Promise<void> => {
				return new Promise<void>(() => { /* never resolves */});
			};
			var stream = new ReadableStream(source);
			stream.started.then(dfd.callback(() => {
				stream.pull();
				assert.isTrue(stream.pullScheduled);
				assert.isFalse(stream.allowPull);
			}));
		}
	},

	'tee': {
		'not readable'() {
			var stream = new ReadableStream(new BaseStringSource());
			// stream.underlyingSource = undefined;
			// assert.throws(() => { stream.tee() });

			// stream = new ReadableStream(new BaseStringSource());
			stream.close();
			assert.throws(() => { stream.tee() });
		},

		'two streams'() {
			var stream = new ReadableStream(new BaseStringSource());
			var tees = stream.tee();
			assert.lengthOf(tees, 2);
			assert.isObject(tees[0]);
			assert.isObject(tees[1]);
		},

		'cancel'() {
			var dfd = this.async(asyncTimeout);
			var stream = new ReadableStream(new BaseStringSource());
			var [stream1, stream2] = stream.tee();
			stream1.cancel('because').then(dfd.callback(() => {
				assert.strictEqual(stream1.state, State.Closed);
				assert.strictEqual(stream2.state, State.Closed);
				assert.strictEqual(stream.state, State.Closed);
			}), dfd.rejectOnError((error: any) => { assert.fail(error); }));
			stream2.cancel('testing').then(dfd.rejectOnError(() => { }),
				dfd.rejectOnError((error: any) => { assert.fail(error); }));
		},

		'pull'() {
			var dfd = this.async(asyncTimeout);
			var source = new BaseStringSource();
			source.start = (controller: ReadableStreamController<string>): Promise<void> => {
				controller.enqueue('test 1');
				controller.enqueue('test 2');
				controller.close();
				return Promise.resolve();
			};
			var stream = new ReadableStream(source);
			var [stream1, stream2] = stream.tee();

			Promise.all([stream1.getReader().read(), stream2.getReader().read()]).then(
				dfd.callback((value: ReadResult<string>[]) => {
					assert.strictEqual(value[0].value, 'test 1');
					assert.strictEqual(value[1].value, 'test 1');
				}), dfd.rejectOnError(() => { assert.fail(); })
			);
		},

		'one cancelled'() {
			var dfd = this.async(asyncTimeout);
			var source = new BaseStringSource();
			source.start = (controller: ReadableStreamController<string>): Promise<void> => {
				controller.enqueue('test 1');
				controller.close();
				return Promise.resolve();
			};
			var stream = new ReadableStream(source);
			var [stream1, stream2] = stream.tee();
			stream1.cancel();

			assert.throws(() => { stream1.getReader().read(); });
			var reader = stream2.getReader();
			reader.read().then(function (value: ReadResult<string>) {
				assert.isFalse(value.done);
				assert.strictEqual(value.value, 'test 1');
				return reader.read();
			}).then(dfd.callback(function (value: ReadResult<string>) {
				assert.isTrue(value.done);
			}), dfd.rejectOnError(() => { assert.fail(); }));
		},

		'two cancelled'() {
			var dfd = this.async(asyncTimeout);
			var source = new BaseStringSource();
			source.start = (controller: ReadableStreamController<string>): Promise<void> => {
				controller.enqueue('test 1');
				controller.close();
				return Promise.resolve();
			};
			var stream = new ReadableStream(source);
			var [stream1, stream2] = stream.tee();
			stream2.cancel();

			assert.throws(() => { stream2.getReader().read(); });
			var reader = stream1.getReader();
			reader.read().then(function (value: ReadResult<string>) {
				assert.isFalse(value.done);
				assert.strictEqual(value.value, 'test 1');
				return reader.read();
			}).then(dfd.callback(function (value: ReadResult<string>) {
				assert.isTrue(value.done);
			}), dfd.rejectOnError(() => { assert.fail(); }));
		},

		'error'() {
			var dfd = this.async(asyncTimeout);
			var source = new BaseStringSource();
			var stream = new ReadableStream(source);
			var [stream1, stream2] = stream.tee();

			var reader1 = stream1.getReader();
			var reader2 = stream2.getReader();

			Promise.all([reader1.closed, reader2.closed]).then(dfd.rejectOnError(() => { assert.fail(); }),
				dfd.callback(() => {
					assert.strictEqual(reader1.state, State.Errored);
					assert.strictEqual(reader2.state, State.Errored);
				}));

			stream.error(new Error('testing'));
		}
	},

	'pipeTo': {
		'basic'() {
			var dfd = this.async(asyncTimeout);
			var sink = new ArraySink<string>();
			var outStream = new WritableStream(sink);

			var inStream = new ReadableStream(buildEnqueuingStartSource());
			inStream.pipeTo(outStream).then(dfd.callback(() => {
				assert.lengthOf(sink.chunks, 3);
				assert.strictEqual(inStream.state, State.Closed);
				assert.strictEqual(outStream.state, WritableState.Closed);
			}), dfd.rejectOnError(() => { assert.fail(); }));
		},

		'source start rejects'() {
			var dfd = this.async(asyncTimeout);
			var sink = new ArraySink<string>();
			var outStream = new WritableStream(sink);

			var source = new BaseStringSource();
			source.start = () => {
				return Promise.reject(new Error('test'));
			};

			var inStream = new ReadableStream(source);
			inStream.pipeTo(outStream).then(
				dfd.rejectOnError(() => { assert.fail(); }),
				dfd.callback(() => {})
			);
		},

		'source pull rejects'() {
			var dfd = this.async(asyncTimeout);
			var sink = new ArraySink<string>();
			var outStream = new WritableStream(sink);

			var source = new BaseStringSource();
			source.start = (controller: ReadableStreamController<string>): Promise<void> => {
				controller.enqueue('test 1');
				return Promise.resolve();
			};
			source.pull = () => {
				return Promise.reject(new Error('test'));
			};

			var inStream = new ReadableStream(source);
			inStream.pipeTo(outStream).then(
				dfd.rejectOnError(() => { assert.fail(); }),
				dfd.callback(() => {
					assert.strictEqual(inStream.state, State.Errored);
					assert.strictEqual(outStream.state, WritableState.Errored);
				})
			);
		},

		'sink rejects'() {
			var dfd = this.async(asyncTimeout);
			var sink = new ArraySink<string>();
			sink.write = () => { return Promise.reject(new Error('because')); };
			var outStream = new WritableStream(sink);

			var inStream = new ReadableStream(buildEnqueuingStartSource());
			inStream.pipeTo(outStream).then(
				dfd.rejectOnError(() => { assert.fail(); }),
				dfd.callback(() => {
					assert.strictEqual(inStream.state, State.Closed);
					assert.strictEqual(outStream.state, WritableState.Errored);
				})
			);
		},

		'prevent close'() {
			var dfd = this.async(asyncTimeout);
			var sink = new ArraySink<string>();
			var outStream = new WritableStream(sink);

			var inStream = new ReadableStream(buildEnqueuingStartSource());
			inStream.pipeTo(outStream, { preventClose: true }).then(dfd.callback(() => {
				assert.lengthOf(sink.chunks, 3);
				assert.strictEqual(outStream.state, WritableState.Writable);
			}), dfd.rejectOnError(() => { assert.fail(); }));
		},

		'prevent cancel'() {
			var dfd = this.async(asyncTimeout);
			var sink = new ArraySink<string>();
			sink.write = () => { return Promise.reject(new Error('because')); };
			var outStream = new WritableStream(sink);

			var inStream = new ReadableStream(buildEnqueuingStartSource());
			inStream.pipeTo(outStream, { preventCancel: true }).then(
				dfd.rejectOnError(() => { assert.fail(); }),
				dfd.callback(() => {
					assert.strictEqual(inStream.state, State.Readable);
					assert.strictEqual(outStream.state, WritableState.Errored);
				})
			);
		},

		'prevent abort'() {
			var dfd = this.async(asyncTimeout);
			var sink = new ArraySink<string>();
			var outStream = new WritableStream(sink);

			var source = new BaseStringSource();
			source.start = (controller: ReadableStreamController<string>): Promise<void> => {
				controller.enqueue('test 1');
				return Promise.resolve();
			};
			source.pull = () => {
				return Promise.reject(new Error('test'));
			};

			var inStream = new ReadableStream(source);
			inStream.pipeTo(outStream, { preventAbort: true }).then(
				dfd.rejectOnError(() => { assert.fail(); }),
				dfd.callback(() => {
					assert.strictEqual(inStream.state, State.Errored);
					assert.strictEqual(outStream.state, WritableState.Writable);
				})
			);
		},

		'writable closed'() {
			var dfd = this.async(asyncTimeout);
			var sink = new ArraySink<string>();
			var outStream = new WritableStream(sink);
			outStream.close();

			var inStream = new ReadableStream(buildEnqueuingStartSource());
			inStream.pipeTo(outStream).then(
				dfd.rejectOnError(() => { assert.fail(); }),
				dfd.callback(() => {
					assert.strictEqual(inStream.state, State.Closed);
					assert.strictEqual(outStream.state, WritableState.Closed);
				})
			);
		},

		'writable closed with prevent cancel'() {
			var dfd = this.async(asyncTimeout);
			var sink = new ArraySink<string>();
			var outStream = new WritableStream(sink);
			outStream.close();

			var inStream = new ReadableStream(buildEnqueuingStartSource());
			inStream.pipeTo(outStream, { preventCancel: true }).then(
				dfd.rejectOnError(() => { assert.fail(); }),
				dfd.callback(() => {
					assert.strictEqual(inStream.state, State.Readable);
					assert.strictEqual(outStream.state, WritableState.Closed);
				})
			);
		}
	},

	'pipeThrough'() {
		var dfd = this.async(asyncTimeout);
		var sink = new ArraySink<string>();
		var outStream = new WritableStream(sink);

		var inStream = new ReadableStream(buildEnqueuingStartSource());
		inStream.pipeThrough(new TransformStream(new PrefixerTransform('-transformed')))
			.pipeTo(outStream).then(dfd.callback(() => {
				assert.lengthOf(sink.chunks, 3);
				assert.strictEqual(sink.chunks[0], 'test 1-transformed');
				assert.strictEqual(sink.chunks[1], 'test 2-transformed');
				assert.strictEqual(sink.chunks[2], 'test 3-transformed');
			}), dfd.rejectOnError(() => {
				assert.fail();
			}));
	}
});

function buildEnqueuingStartSource() {
	var source = new BaseStringSource();
	source.start = (controller: ReadableStreamController<string>): Promise<void> => {
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

