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
		var i = this._index++;

		if (i > this._max) {
			// pushing null signals the end of data
			this.push(null);
		}
		else {
			var str = '' + i;
			var buf = new Buffer(str, 'ascii');
			this.push(buf);
		}
	}
}

var nodeStream: CountStream;
var stream: ReadableStream<string>;
var source: ReadableNodeStreamSource;
var controller: Controller;

registerSuite({
	name: 'Node Readable Stream adapter',

	beforeEach() {
		nodeStream = new CountStream();
		// source = new ReadableNodeStreamSource(nodeStream);
		source = new ReadableNodeStreamSource(nodeStream);
		controller = new Controller();
	},

	'start()'() {
		var dfd = this.async(1000);
		source.start(controller).then(dfd.resolve.bind(dfd), dfd.reject.bind(dfd));
	},

	'pull()'() {
		source.pull(controller);
		assert.strictEqual(controller.enqueuedValue, '0');

		source.pull(controller);
		assert.strictEqual(controller.enqueuedValue, '1');
	},

	'cancel()'() {
		var dfd = this.async(1000);
		source.start(controller).then(() => {
			source.cancel().then(dfd.callback(() => {
				assert.isTrue(controller.closed);
			}));
		});
	},

	'retrieve new data'() {
		var dfd = this.async(1000);
		stream = new ReadableStream<string>(source);
		var reader = stream.getReader();
		reader.read().then((value: any) => {
			var num = +value.value;
			assert.isNumber(num);
			return num + 1;
		}).then((newValue) => {
			reader.read().then(dfd.callback((value: any) => {
				assert.strictEqual(+value.value, newValue);
			}));
		});
	}
});
