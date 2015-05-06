import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import Promise from 'src/Promise';
import { Strategy } from 'src/streams/interfaces';
import { State as ReadableState } from 'src/streams/ReadableStream';
import { ReadResult } from 'src/streams/ReadableStreamReader';
import TransformStream, { Transform } from 'src/streams/TransformStream';
import { State as WritableState } from 'src/streams/WritableStream';

class CharToCodeTransform implements Transform<number, string> {
	readableStrategy: Strategy<number>;
	writableStrategy: Strategy<string>;

	constructor() {
		this.readableStrategy = {
			size(chunk: number) {
				return 1;
			},
			highwaterMark: Infinity
		};

		this.writableStrategy = {
			size(chunk: string) {
				return 1;
			},
			highwaterMark: Infinity
		};
	}

	transform(chunk: string, enqueue: (chunk: number) => void, transformDone: () => void): void {
		enqueue(chunk.charCodeAt(0));
		transformDone();
	}

	flush(enqueue: Function, close: Function): void {
		close();
		return;
	}
}

registerSuite({
	name: 'TransformStream',

	'simple transform'() {
		var testValue = 'a';
		var transform = new CharToCodeTransform();
		var stream = new TransformStream(transform);
		var reader = stream.readable.getReader();

		return stream.writable.write(testValue).then(() => {
			return reader.read().then((result: ReadResult<number>) => {
				assert.strictEqual(result.value, testValue.charCodeAt(0));
			});
		});
	},

	'async transform'() {
		var testValues = ['a', 'b', 'c'];
		var transform = new CharToCodeTransform();

		// This change must be made before instantiating the stream as the stream will immediately create a reference
		// to the 'transform' method
		transform.transform = (chunk: string, enqueue: (chunk: number) => void, transformDone: () => void): void => {
			setTimeout(() => {
				enqueue(chunk.charCodeAt(0));
				transformDone();
			}, 20);
		};
		var stream = new TransformStream(transform);
		var reader = stream.readable.getReader();
		var results: number[] = [];

		for (let i = 0; i < testValues.length; i++) {
			stream.writable.write(testValues[i]);
		}

		stream.writable.close();

		function readNext(): Promise<void> {
			return reader.read().then((result: ReadResult<number>) => {
				if (result.done) {
					return Promise.resolve();
				}
				else {
					results.push(result.value);
					return readNext();
				}
			});
		}

		return readNext().then(() => {
			for (let i = 0; i < results.length; i++) {
				assert.strictEqual(results[i], testValues[i].charCodeAt(0));
			}
		});
	},

	'transform.flush throws error'() {
		var testValue = 'a';
		var transform = new CharToCodeTransform();

		// This change must be made before instantiating the stream as the stream will immediately create a reference
		// to the 'flush' method
		transform.flush = () => {
			throw new Error('Transform#flush test error');
		};

		var stream = new TransformStream(transform);
		var reader = stream.readable.getReader();

		return stream.writable.close().then(() => {
			assert.fail(null, null, 'Errored stream should not resolve call to \'close\'');
		}, (error: Error) => {
			assert.strictEqual(stream.readable.state, ReadableState.Errored);
			assert.strictEqual(stream.writable.state, WritableState.Errored);
		});
	},

	'transform.transform throws error'() {
		var testValue = 'a';
		var transform = new CharToCodeTransform();

		// This change must be made before instantiating the stream as the stream will immediately create a reference
		// to the 'transform' method
		transform.transform = () => {
			throw new Error('Transform#transform test error');
		};

		var stream = new TransformStream(transform);
		var reader = stream.readable.getReader();

		return stream.writable.write('a').then(() => {
			assert.fail(null, null, 'Errored stream should not resolve call to \'write\'');
		}, (error: Error) => {
			assert.strictEqual(stream.readable.state, ReadableState.Errored);
			assert.strictEqual(stream.writable.state, WritableState.Errored);
		});
	}
});
