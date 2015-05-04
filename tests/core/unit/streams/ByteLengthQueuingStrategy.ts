import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import ByteLengthQueuingStrategy from 'src/streams/ByteLengthQueuingStrategy';
import WritableStream, { State } from 'src/streams/WritableStream';
import { Sink } from 'src/streams/interfaces';
import Promise from 'src/Promise';
import ManualSink from './helpers/ManualSink';

var asyncTimeout = 1000;

registerSuite({
	name: 'ByteLengthQueuingStrategy',

	size() {
			var dfd = this.async(asyncTimeout);
			var sink = new ManualSink<ArrayBuffer>();

			var stream = new WritableStream<ArrayBuffer>(sink, new ByteLengthQueuingStrategy<ArrayBuffer>({
				highWaterMark: 2 * 1024
			}));

			var promise = stream.write(new ArrayBuffer(1024));
			assert.strictEqual(stream.state, State.Writable);

			stream.write(new ArrayBuffer(1024));
			assert.strictEqual(stream.state, State.Waiting);

			setTimeout(() => {
				sink.next();
			}, 20);

			return promise.then(dfd.callback(() => {
				assert.strictEqual(stream.state, State.Writable);
			}), (error: Error) => {
				dfd.reject(error);
			});
	}
});
