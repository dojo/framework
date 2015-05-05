import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import CountQueuingStrategy from 'src/streams/CountQueuingStrategy';
import WritableStream, { State } from 'src/streams/WritableStream';
import { Sink } from 'src/streams/interfaces';
import Promise from 'src/Promise';
import ManualSink from './helpers/ManualSink';

var asyncTimeout = 1000;

registerSuite({
	name: 'CountQueuingStrategy',

	size() {
		var dfd = this.async(asyncTimeout);
		var sink = new ManualSink<string>();

		var stream = new WritableStream<string>(sink, new CountQueuingStrategy<string>({
			highWaterMark: 2
		}));

		var promise = stream.write('test value 1');
		assert.strictEqual(stream.state, State.Writable);

		stream.write('test value 2');
		assert.strictEqual(stream.state, State.Writable);

		stream.write('test value 3');
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
