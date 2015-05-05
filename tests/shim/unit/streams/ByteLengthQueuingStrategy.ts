import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import ByteLengthQueuingStrategy from 'src/streams/ByteLengthQueuingStrategy';
import WritableStream, { State } from 'src/streams/WritableStream';
import ManualSink from './helpers/ManualSink';
import { getApproximateByteSize } from 'src/streams/util';

var asyncTimeout = 1000;

registerSuite({
	name: 'ByteLengthQueuingStrategy',

	size() {
		var dfd = this.async(asyncTimeout);
		var sink = new ManualSink<ArrayBuffer>();

		var stream = new WritableStream<ArrayBuffer>(sink, new ByteLengthQueuingStrategy<ArrayBuffer>({
			highwaterMark: 2 * 1024
		}));

		var promise = stream.write(new ArrayBuffer(1024));
		assert.strictEqual(stream.state, State.Writable);

		stream.write(new ArrayBuffer(1024));
		assert.strictEqual(stream.state, State.Writable);

		stream.write(new ArrayBuffer(1));
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

	'size with object'() {
		var dfd = this.async(asyncTimeout);
		var sink = new ManualSink<any>();

		var stream = new WritableStream<any>(sink, new ByteLengthQueuingStrategy<any>({
			highwaterMark: 50
		}));

		// approximateByteSize = 44
		var testObject1 = {
			0: true,
			abc: 'def',
			xyz: [
				true,
				8,
				'abcdef'
			]
		};

		// approximateByteSize = 74
		var testObject2 = {
			100: false,
			abc: 'def',
			xyz: [
				true,
				8,
				'abcdefghijklmnopq'
			]
		};

		stream.write(testObject1).then(() => {
			sink.next();
		});
		assert.strictEqual(stream.state, State.Writable);

		var promise = stream.write(testObject2);
		assert.strictEqual(stream.state, State.Waiting);

		setTimeout(() => {
			sink.next();
		}, 20);

		promise.then(dfd.callback(() => {
			assert.strictEqual(stream.state, State.Writable);
		}), (error: Error) => {
			dfd.reject(error);
		});
	}
});
