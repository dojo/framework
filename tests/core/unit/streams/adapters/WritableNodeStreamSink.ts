import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { Writable } from 'stream';
import WritableNodeStreamSink from 'src/streams/adapters/WritableNodeStreamSink';

class WriteStream extends Writable {
	writtenChunk: any;
	writeCalled: boolean = false;
	endCalled: boolean = false;
	shouldThrowError: boolean = false;

	_write(chunk: any, enc: string, next: Function) {
		if (this.shouldThrowError) {
			throw new Error('test error');
		}
		else {
			this.writtenChunk = chunk;
			next();
		}
	}

	write(...args: any[]) {
		this.writeCalled = true;
		return super.write.apply(this, args);
	}

	end(...args: any[]): void {
		this.endCalled = true;
		super.end.apply(this, args);
	}
}

let nodeStream: WriteStream;
let sink: WritableNodeStreamSink;

registerSuite({
	name: 'WritableNodeStreamSink',

	beforeEach() {
		nodeStream = new WriteStream();
		sink = new WritableNodeStreamSink(nodeStream);
	},

	'start()'() {
		let dfd = this.async(1000);
		sink.start().then(dfd.callback(() => {}));
	},

	'start() after close'() {
		let dfd = this.async(1000);
		sink.close().then(() => {
			sink.start().then(dfd.reject.bind(dfd), dfd.callback(function () {}));
		});
	},

	'write()'() {
		let dfd = this.async(1000);
		let value = 'test';
		sink.write(value).then(dfd.callback(function () {
			assert.strictEqual(nodeStream.writtenChunk.toString('utf8'), value);
			assert.isTrue(nodeStream.writeCalled);
		}));
	},

	'write() that throws'() {
		nodeStream.shouldThrowError = true;
		let dfd = this.async(1000);
		let value = 'test';
		sink.write(value).then(dfd.reject.bind(dfd), dfd.callback(function () {}));
	},

	'write() after close'() {
		let dfd = this.async(1000);
		let value = 'test';
		sink.close().then(function () {
			sink.write(value).then(dfd.reject.bind(dfd), dfd.callback(function () {}));
		});
	},

	'close()'() {
		let dfd = this.async(1000);
		sink.close().then(dfd.callback(function () {
			assert.isTrue(nodeStream.endCalled);
		}));
	},

	'abort()'() {
		let dfd = this.async(1000);
		sink.abort('some reason').then(dfd.callback(function () {
			assert.isTrue(nodeStream.endCalled);
		}));
	}
});
