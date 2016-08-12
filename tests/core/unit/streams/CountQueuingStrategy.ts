import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';
import CountQueuingStrategy from 'src/streams/CountQueuingStrategy';
import WritableStream, { State } from 'src/streams/WritableStream';
import ManualSink from './helpers/ManualSink';

const ASYNC_TIMEOUT = 1000;

registerSuite({
	name: 'CountQueuingStrategy',

	size(this: any) {
		let dfd = this.async(ASYNC_TIMEOUT);
		let sink = new ManualSink<string>();

		let stream = new WritableStream<string>(sink, new CountQueuingStrategy<string>({
			highWaterMark: 2
		}));

		let promise = stream.write('test value 1');
		assert.strictEqual(stream.state, State.Writable);

		stream.write('test value 2');
		assert.strictEqual(stream.state, State.Writable);

		stream.write('test value 3');
		assert.strictEqual(stream.state, State.Waiting);

		setTimeout(function () {
			sink.next();
		}, 20);

		promise.then(dfd.callback(function () {
			assert.strictEqual(stream.state, State.Writable);
		}), function (error: Error) {
			dfd.reject(error);
		});
	}
});
