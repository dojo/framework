import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';

import ReadableStreamController from 'src/streams/ReadableStreamController';
import ReadableStream, { Source, State } from 'src/streams/ReadableStream';
import BaseStringSource from './helpers/BaseStringSource';
import { Strategy } from 'src/streams/interfaces';

let stream: ReadableStream<string>;
let source: Source<string>;
let controller: ReadableStreamController<string>;
let strategy: Strategy<string> = {
	size(chunk: string) {
		return 1;
	},
	highWaterMark: Infinity
};

registerSuite({
	name: 'ReadableStreamController',

	beforeEach() {
		source = new BaseStringSource();
		stream = new ReadableStream<string>(source, strategy);
		controller = stream.controller;
	},

	'constructor': {
		'create no stream'() {
			assert.throws(function () {
				new ReadableStreamController<string>(null);
			});
		},

		'create ReadableStreamController with unreadable stream'() {
			let source = new BaseStringSource();
			let stream = new ReadableStream<string>(source, strategy);
			stream.readable = false;
			assert.throws(function () {
				new ReadableStreamController<string>(stream);
			});
		},

		'throws an error if the stream is not readable'() {
			assert.throws(function () {
				new ReadableStreamController(<ReadableStream<string>> {});
			});
		}
	},

	'desiredSize'() {
		let strategy: Strategy<string> = {
			size(chunk: string) {
				return 1;
			},
			highWaterMark: 10
		};
		let source = new BaseStringSource();
		let stream = new ReadableStream<string>(source, strategy);
		assert.strictEqual(stream.controller.desiredSize, 10);
	},

	'close()': {
		'calls close() on the ReadableStream'() {
			let closeCalled = false;
			stream.requestClose = function () {
				closeCalled = true;
			};
			controller.close();
			assert.isTrue(closeCalled);
		},

		'multiple close() calls throws error'() {
			assert.throws(function () {
				controller.close();
				controller.close();
			});
		},

		'on an errored stream throws an error'() {
			stream.state = State.Errored;
			assert.throws(function () {
				controller.close();
			});
		},

		'throw if not readable stream controller'() {
			assert.throws(function () {
				controller.close.call({});
			});
		}
	},

	'enqueue()': {
		'calls enqueue on the ReadableStream'() {
			let enqueueCalled = false;
			stream.enqueue = function () {
				enqueueCalled = true; return true;
			};
			controller.enqueue('foo');
			assert.isTrue(enqueueCalled);
		},

		'enqueue() throws an error if state is not Readable'() {
			stream.state = State.Closed;
			assert.throws(function () {
				controller.enqueue('foo');
			});
		},

		'throws an error if a close has been requested'() {
			stream.requestClose();
			assert.throws(function () {
				controller.enqueue('foo');
			});
		},

		'throw if not readable stream controller'() {
			assert.throws(function () {
				controller.enqueue.call({});
			});
		},

		'throw if stream error'() {
			stream.error(new Error('test'));
			assert.throws(function () {
				controller.enqueue('foo');
			});
		}
	},

	'error': {
		'throws an error if stream is not Readable'() {
			stream.state = State.Closed;
			assert.throws(function () {
				controller.error(new Error('test error'));
			});
		},

		'calls error() on the ReadableStream'() {
			let errorCalled = false;
			stream.error = function () {
				errorCalled = true;
			};
			controller.error(new Error('test'));
			assert.isTrue(errorCalled);
		},

		'throw if not readable stream controller'() {
			assert.throws(function () {
				controller.error.call({});
			});
		}
	}
});
