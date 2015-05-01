import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { ReadResult, Transform } from 'src/streams/interfaces';
import TransformStream from 'src/streams/TransformStream';

registerSuite({
	name: 'TransformStream',

	'simple transform'() {
		var testValue = 'a';
		var transform: Transform<number, string> = {
			transform(chunk: string, enqueueInReadable: (chunk: number) => void, transformDone: () => void): void {
				enqueueInReadable(chunk.charCodeAt(0));
				transformDone();
			},

			flush(enqueue: Function, close: Function): void {
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
	}
});
