import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import Promise from 'src/Promise';
import { ReadResult, Transform } from 'src/streams/interfaces';
import TransformStream from 'src/streams/TransformStream';

registerSuite({
	name: 'TransformStream',

	'simple transform'() {
		var testValue = 'a';
		var transform: Transform<number, string> = {
			transform(chunk: string, enqueue: (chunk: number) => void, transformDone: () => void): void {
				enqueue(chunk.charCodeAt(0));
				transformDone();
			},

			flush(enqueue: Function, close: Function): void {
				close();
				return;
			},

			readableStrategy: {
				size(chunk: number) {
					return 1;
				},
				highwaterMark: Infinity
			},

			writableStrategy: {
				size(chunk: string) {
					return 1;
				},
				highwaterMark: Infinity
			}
		};

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
		var transform: Transform<number, string> = {
			transform(chunk: string, enqueue: (chunk: number) => void, transformDone: () => void): void {
				setTimeout(() => {
					enqueue(chunk.charCodeAt(0));
					transformDone();
				}, 20);
			},

			flush(enqueue: Function, close: Function): void {
				close();
				return;
			},

			readableStrategy: {
				size(chunk: number) {
					return 1;
				},
				highwaterMark: Infinity
			},

			writableStrategy: {
				size(chunk: string) {
					return 1;
				},
				highwaterMark: Infinity
			}
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
	}
});
