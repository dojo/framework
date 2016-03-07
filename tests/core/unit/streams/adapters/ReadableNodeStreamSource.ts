import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { Readable } from 'stream';
import Promise from 'src/Promise';
import ReadableStream from 'src/streams/ReadableStream';
import { ReadResult } from 'src/streams/ReadableStreamReader';
import ReadableStreamController from 'src/streams/ReadableStreamController';
import ReadableNodeStreamSource from 'src/streams/adapters/ReadableNodeStreamSource';

class Controller extends ReadableStreamController<string> {
	enqueuedValue: string;
	closed: boolean;
	stream: any;

	constructor() {
		let stream = {
			readable: true,
			_requestClose() {
			},
			_controller: <any> undefined
		};
		super(<any> stream);
		this.stream = stream;
		this.closed = false;
	}

	enqueue(chunk: string): void {
		this.enqueuedValue = chunk;
	}

	close() {
		this.closed = true;
	}
}

class CountStream extends Readable {
	private _max: number;
	private _index: number;

	constructor(options?: {}) {
		super(options);
		// The `_read` method will be called (by Node's `Readable` class?) until it pushes `null`, which means it will
		// always be called `_max` times, so ensure this number is not too big
		this._max = 10;
		this._index = 0;
		this.setEncoding('utf8');
	}

	_read() {
		let i = this._index++;

		if (i > this._max) {
			// pushing null signals the end of data
			this.push(null);
		}
		else {
			let str = String(i);
			let buf = new Buffer(str, 'ascii');
			this.push(buf);
		}
	}
}

let nodeStream: CountStream;
let stream: ReadableStream<string>;
let source: ReadableNodeStreamSource;
let controller: Controller;

registerSuite({
	name: 'ReadableNodeStreamSource',

	beforeEach() {
		nodeStream = new CountStream();
		source = new ReadableNodeStreamSource(nodeStream);
		controller = new Controller();
	},

	'start()'() {
		let dfd = this.async(1000);
		source.start(controller).then(dfd.resolve.bind(dfd), dfd.reject.bind(dfd));
	},

	'pull()'() {
		source.pull(controller);
		assert.strictEqual(controller.enqueuedValue, '0');

		source.pull(controller);
		assert.strictEqual(controller.enqueuedValue, '1');
	},

	'cancel()'() {
		let dfd = this.async(1000);
		source.start(controller).then(function () {
			source.cancel().then(dfd.callback(function () {
				assert.isTrue(controller.closed);
			}));
		});
	},

	'retrieve new data'() {
		stream = new ReadableStream<string>(source, { highWaterMark: 1 });
		let reader = stream.getReader();
		let readIndex = 0;

		function readNext(): Promise<void> {
			return reader.read().then(function (result: ReadResult<string>) {
				if (result.done) {
					return Promise.resolve();
				}

				assert.strictEqual(result.value, String(readIndex));
				readIndex += 1;

				return readNext();
			});
		}

		return stream.started.then(function () {
			return readNext();
		});
	}
});
