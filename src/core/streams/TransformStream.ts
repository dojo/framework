// This is a simple adaptation to TypeScript of the reference implementation (as of May 2015):
// https://github.com/whatwg/streams/blob/master/reference-implementation/lib/transform-stream.js

import Promise from 'dojo-shim/Promise';
import { Strategy } from './interfaces';
import ReadableStream, { Source } from './ReadableStream';
import ReadableStreamController from './ReadableStreamController';
import WritableStream, { Sink } from './WritableStream';

/**
 * The `Transform` interface defines the requirements for a transform object to be supplied to a
 * {@link TransformStream} instance.
 */
export interface Transform<R, W> {
	/**
	 * The `transform` method should accept a chunk, an `enqueueInReadable` function, and a `transformDone` function.
	 * The chunk is the data to be transformed. The transform function should perform any transform logic on the chunk
	 * and then call the supplied `enqueueInReadable` function, passing it the transformed data. After that it should
	 * call the supplied `transformDone` function to notify the `TransformStream` that transformation is complete.
	 */
	transform(chunk: W | undefined, enqueueInReadable: (chunk: R) => void, transformDone: () => void): void;

	/**
	 * The `flush` method will be called by the `TransformStream` when its {@link WritableStream} is closed. Any logic
	 * the transformer may wish to run when the stream is closed can be supplied in this function. Any pending data
	 * can still be enqueued using the supplied `enqueue` function. When the transformer has finished transforming all
	 * data and is ready to close the {@link ReadableStream} it should call the supplied `close` function.
	 */
	flush(enqueue: Function, close: Function): void;

	/**
	 * If supplied, this strategy will be used for the `Transformer`'s internal {@link ReadableStream}
	 */
	readableStrategy: Strategy<R>;

	/**
	 * If supplied, this strategy will be used for the `Transformer`'s internal {@link WritableStream}
	 */
	writableStrategy: Strategy<W>;
}

/**
 * A `TransformStream` is both readable and writable. Its purpose is to apply some transform logic to everything that
 * is written to it and provide the transformed data via its reader. As such, it requires no `ReadableStream`,
 * `WritableStream`, or `Source` or `Sink` to be supplied - it provides its own.
 *
 * It does require an object that implements the {@link Transform} interface to be supplied. The `transform` method
 * will be applied to all data written to the stream.
 *
 * The readable stream API is available via the `TransformStream`'s `readable` property, which is a
 * {@link ReadableStream}. The writable stream API is available via the `TransformStream`'s `writable` property, which
 * is a {@link WritableStream}.
 */
export default class TransformStream<R, W> {
	readonly readable: ReadableStream<R>;
	readonly writable: WritableStream<W>;

	constructor(transformer: Transform<R, W>) {
		let writeChunk: W | undefined;
		let writeDone: () => void;
		let errorWritable: (error?: any) => void;
		let transforming = false;
		let chunkWrittenButNotYetTransformed = false;
		let enqueueInReadable: () => void;
		let closeReadable: (error?: any) => void;
		let errorReadable: (error?: any) => void;

		function maybeDoTransform() {
			if (!transforming) {
				transforming = true;
				try {
					transformer.transform(writeChunk, enqueueInReadable, transformDone);
					writeChunk = undefined;
					chunkWrittenButNotYetTransformed = false;
				} catch (e) {
					transforming = false;
					errorWritable(e);
					errorReadable(e);
				}
			}
		}

		function transformDone() {
			transforming = false;
			writeDone();
		}

		this.writable = new WritableStream<W>(<Sink <W>> {
			abort(): Promise<void> {
				return Promise.resolve();
			},

			start(error: (error?: any) => void) {
				errorWritable = error;
				return Promise.resolve();
			},

			write(chunk: W) {
				writeChunk = chunk;
				chunkWrittenButNotYetTransformed = true;
				const promise = new Promise<void>(function (resolve) {
					writeDone = resolve;
				});
				maybeDoTransform();
				return promise;
			},

			close(): Promise<void> {
				try {
					transformer.flush(enqueueInReadable, closeReadable);
					return Promise.resolve();
				} catch (e) {
					errorWritable(e);
					errorReadable(e);
					return Promise.reject(e);
				}
			}
		}, transformer.writableStrategy);

		this.readable = new ReadableStream(<Source <R>> {
			start(controller: ReadableStreamController<R>): Promise<void> {
				enqueueInReadable = controller.enqueue.bind(controller);
				closeReadable = controller.close.bind(controller);
				errorReadable = controller.error.bind(controller);
				return Promise.resolve();
			},

			pull(controller: ReadableStreamController<R>): Promise<void> {
				if (chunkWrittenButNotYetTransformed) {
					maybeDoTransform();
				}
				return Promise.resolve();
			},

			cancel(): Promise<void> {
				return Promise.resolve();
			}
		}, transformer.readableStrategy);
	}
}
