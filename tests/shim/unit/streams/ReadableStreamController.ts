import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';

import ReadableStreamController from 'src/streams/ReadableStreamController';
import ReadableStream, { Source, State } from 'src/streams/ReadableStream';
import BaseStringSource from './helpers/BaseStringSource';
import { Strategy } from 'src/streams/interfaces';
import Promise from 'src/Promise';

var stream: ReadableStream<string>;
var source: Source<string>;
var controller: ReadableStreamController<string>;
var strategy: Strategy<string> = {
	size(chunk: string) {
		return 1;
	},
	highwaterMark: Infinity
};

registerSuite({
	name: 'ReadablsStreamController',

	beforeEach() {
		source = new BaseStringSource();
		stream = new ReadableStream<string>(source, strategy);
		controller = stream._controller;
	},

	'constructor': {
		'create no stream'() {
			assert.throws(() => {
				new ReadableStreamController<string>(null);
			});
		},

		'create ReadableStreamController with unreadable stream'() {
			var source = new BaseStringSource();
			var stream = new ReadableStream<string>(source, strategy);
			stream.readable = false;
			assert.throws(() => {
				new ReadableStreamController<string>(stream);
			});
		},

		'throws an error if the stream is not readable'() {
			assert.throws(() => {
				new ReadableStreamController(<ReadableStream<string>>{});
			});
		}
	},

	'desiredSize'() {
		var strategy: Strategy<string> = {
			size(chunk: string) {
				return 1;
			},
			highwaterMark: 10
		};
		var source = new BaseStringSource();
		var stream = new ReadableStream<string>(source, strategy);
		assert.equal(10, stream._controller.desiredSize);
	},

	'close()': {
		'calls close() on the ReadableStream'() {
			var closeCalled = false;
			stream._requestClose = () => { closeCalled = true; };
			controller.close();
			assert.isTrue(closeCalled);
		},

		'multiple close() calls throws error'() {
			assert.throws(() => {
				controller.close();
				controller.close();
			});
		},

		'on an errored stream throws an error'() {
			stream.state = State.Errored;
			assert.throws(() => {
				controller.close();
			});
		},

		'throw if not readable stream controller'() {
			assert.throws(() => { controller.close.call({}); });
		}
	},

	'enqueue()': {
		'calls enqueue on the ReadableStream'() {
			var enqueueCalled = false;
			stream.enqueue = () => { enqueueCalled = true; return true; };
			controller.enqueue('foo');
			assert.isTrue(enqueueCalled);
		},

		'enqueue() throws an error if state is not Readable'() {
			stream.state = State.Closed;
			assert.throws(() => {
				controller.enqueue('foo');
			});
		},

		'throws an error if a close has been requested'() {
			stream._requestClose();
			assert.throws(() => {
				controller.enqueue('foo');
			});
		},

		'throw if not readable stream controller'() {
			assert.throws(() => { controller.enqueue.call({}); });
		},

		'throw if stream error'() {
			stream.error(new Error('test'));
			assert.throws(() => { controller.enqueue('foo'); });
		}
	},

	'error': {
		'throws an error if stream is not Readable'() {
			stream.state = State.Closed;
			assert.throws(() => {
				controller.error(new Error('test error'));
			});
		},

		'calls error() on the ReadableStream'() {
			var errorCalled = false;
			stream.error = () => { errorCalled = true; };
			controller.error(new Error('test'));
			assert.isTrue(errorCalled);
		},

		'throw if not readable stream controller'() {
			assert.throws(() => { controller.error.call({}); });
		},
	}
});
