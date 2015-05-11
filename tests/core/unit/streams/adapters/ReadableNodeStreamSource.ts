import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { Readable } from 'stream';
import ReadableStream from 'src/streams/ReadableStream';
import ReadableStreamController from 'src/streams/ReadableStreamController';
import ReadableNodeStreamSource from 'src/streams/adapters/ReadableNodeStreamSource';

class Controller extends ReadableStreamController<string> {
	enqueuedValue: string;
	closed: boolean;
	stream: any;

	constructor() {
		this.stream = {
			readable: true,
			_requestClose() {
			},
			_controller: undefined
		};
		super(<any> this.stream);
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
		this._max = 10000;
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
			let str = '' + i;
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
	name: 'Node Readable Stream adapter',

	beforeEach() {
		nodeStream = new CountStream();
		// source = new ReadableNodeStreamSource(nodeStream);
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
		let dfd = this.async(1000);
		stream = new ReadableStream<string>(source);
		let reader = stream.getReader();
		reader.read().then(function (value: any) {
			let num = Number(value.value);
			assert.isNumber(num);
			return num + 1;
		}).then(function (newValue) {
			reader.read().then(dfd.callback(function (value: any) {
				assert.strictEqual(Number(value.value), newValue);
			}));
		});
	}
});
