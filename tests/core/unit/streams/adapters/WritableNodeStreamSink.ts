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

var nodeStream: WriteStream;
var sink: WritableNodeStreamSink;

registerSuite({
	name: 'WritableNodeStreamSink',

	beforeEach() {
		nodeStream = new WriteStream();
		sink = new WritableNodeStreamSink(nodeStream);
	},

	'start()'() {
		var dfd = this.async(1000);
		sink.start().then(dfd.callback(() => {}));
	},

	'start() after close'() {
		var dfd = this.async(1000);
		sink.close().then(() => {
			sink.start().then(dfd.reject.bind(dfd), dfd.callback(() => {}));
		});
	},

	'write()'() {
		var dfd = this.async(1000);
		var value = 'test';
		sink.write(value).then(dfd.callback(() => {
			assert.strictEqual(nodeStream.writtenChunk.toString('utf8'), value);
			assert.isTrue(nodeStream.writeCalled);
		}));
	},

	'write() that throws'() {
		nodeStream.shouldThrowError = true;
		var dfd = this.async(1000);
		var value = 'test';
		sink.write(value).then(dfd.reject.bind(dfd), dfd.callback(() => {
		}));
	},

	'write() after close'() {
		var dfd = this.async(1000);
		var value = 'test';
		sink.close().then(() => {
			sink.write(value).then(dfd.reject.bind(dfd), dfd.callback(() => {}));
		});
	},

	'close()'() {
		var dfd = this.async(1000);
		sink.close().then(dfd.callback(() => {
			assert.isTrue(nodeStream.endCalled);
		}));
	},

	'abort()'() {
		var dfd = this.async(1000);
		sink.abort('some reason').then(dfd.callback(() => {
			assert.isTrue(nodeStream.endCalled);
		}));
	}
});
