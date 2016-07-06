import * as assert from 'intern/chai!assert';
import * as registerSuite from 'intern!object';

import ArraySource from 'src/streams/ArraySource';
import CountQueuingStrategy from 'src/streams/CountQueuingStrategy';
import Promise from 'dojo-shim/Promise';
import { State } from 'src/streams/ReadableStream';
import { ReadResult } from 'src/streams/ReadableStreamReader';
import SeekableStream from 'src/streams/SeekableStream';
import SeekableStreamReader from 'src/streams/SeekableStreamReader';

let data: string[];
let source: ArraySource<string>;
let stream: SeekableStream<string>;
let reader: SeekableStreamReader<string>;

registerSuite({
	name: 'SeekableStream',

	beforeEach() {
		data = [
			'test0',
			'test1',
			'test2'
		];
		source = new ArraySource<string>(data);
		stream = new SeekableStream<string>(source, new CountQueuingStrategy({ highWaterMark: Infinity }));
		reader = stream.getReader();
	},

	read() {
		assert.strictEqual(reader.currentPosition, 0);

		return reader.read().then((result: ReadResult<string>) => {
			assert.strictEqual(result.value, data[0]);
			assert.strictEqual(reader.currentPosition, 1);

			return reader.read();
		}).then((result: ReadResult<string>) => {
			assert.strictEqual(result.value, data[1]);
		});
	},

	seek: {
		'with seekable source'() {
			assert.strictEqual(reader.currentPosition, 0);

			return reader.seek(1).then((seekPosition: number) => {
				assert.strictEqual(seekPosition, 1);
				assert.strictEqual(reader.currentPosition, 1);

				return reader.read();
			}).then((result: ReadResult<string>) => {
				assert.strictEqual(result.value, data[1]);

				return reader.seek(2);
			}).then((seekPosition: number) => {
				assert.strictEqual(seekPosition, 2);
				assert.strictEqual(reader.currentPosition, 2);

				return reader.read();
			}).then((result: ReadResult<string>) => {
				assert.strictEqual(result.value, data[2]);

				return reader.seek(0);
			}).then((seekPosition: number) => {
				assert.strictEqual(seekPosition, 0);
				assert.strictEqual(reader.currentPosition, 0);

				return reader.read();
			}).then((result: ReadResult<string>) => {
				assert.strictEqual(result.value, data[0]);
			});
		},

		'within queue'() {
			// Wait for the stream to start to allow the queue to fill up
			return stream.started.then(function () {
				let numCallsToPull = 0;

				source.pull = function () {
					numCallsToPull += 1;
					return Promise.resolve();
				};

				return reader.seek(2).then(function () {
					assert.strictEqual(reader.currentPosition, 2, 'Stream should seek ahead');
					assert.strictEqual(numCallsToPull, 0, 'Stream source\'s pull method should not be called');
				});
			});
		},

		'with non-seekable source: forward'() {
			source.seek = undefined;

			assert.strictEqual(reader.currentPosition, 0, 'Stream should start with seek position at 0');

			return reader.seek(2).then(function (position: number) {
				assert.strictEqual(position, 2, 'Stream should seek to forward position');
				assert.strictEqual(reader.currentPosition, 2, 'Stream\'s currentPosition should update');
			}, function (error: Error) {
				assert.fail(null, null, 'SeekableStreamReader#seek should handle forward seeking');
			});
		},

		'with non-seekable source: backwards'() {
			source.seek = undefined;

			return reader.read().then(function() {
				assert.strictEqual(reader.currentPosition, 1, 'Reader should advance seek position');

				return reader.seek(0).then(function () {
					assert.fail(null, null, 'Reverse seek in non-seekable source should not succeed');
				}, function (error: Error) {
					assert.notStrictEqual(stream.state, State.Errored,
						'Failed seek should not put stream  in errored state'
					);
				});
			});
		}
	},

	preventClose: {
		enabled() {
			return reader.read().then(function (result: ReadResult<string>) {
				assert.notStrictEqual(stream.state, State.Closed);
			});
		},

		disabled() {
			stream = new SeekableStream<string>(source, undefined, false);
			reader = stream.getReader();

			return reader.read().then(function (result: ReadResult<string>) {
				assert.strictEqual(stream.state, State.Closed);

				assert.throws(function () {
					stream.getReader();
				});
			});
		}
	}
});
