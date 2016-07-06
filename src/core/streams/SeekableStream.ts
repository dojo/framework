import Promise from 'dojo-shim/Promise';
import { Strategy } from './interfaces';
import ReadableStream, { Source } from './ReadableStream';
import { ReadResult } from './ReadableStreamReader';
import SeekableStreamReader from './SeekableStreamReader';

export default class SeekableStream<T> extends ReadableStream<T> {
	preventClose: boolean;
	reader: SeekableStreamReader<T>;

	/**
	 * @param preventClose (default=true) Prevent the stream from closing when it reaches the end.
	 * If true, the stream will not close when requestClose is called on the controller (which is typically done by the
	 * source when it reaches its end). This allows for re-seeking in a stream that has already been read to the end.
	 * The stream can be closed by calling ReadableStream#close.
	 */
	constructor(underlyingSource: Source<T>, strategy: Strategy<T> = {}, preventClose: boolean = true) {
		super(underlyingSource, strategy);

		this.preventClose = preventClose;
	}

	getReader(): SeekableStreamReader<T> {
		if (!this.readable || !this.seek) {
			throw new TypeError('Must be a SeekableStream instance');
		}

		return new SeekableStreamReader(this);
	}

	requestClose(): void {
		if (!this.preventClose) {
			super.requestClose();
		}
	}

	seek(position: number): Promise<number> {
		if (this._underlyingSource.seek) {
			return this._underlyingSource.seek(this.controller, position);
		}
		else {
			if (this.reader && position < this.reader.currentPosition) {
				return Promise.reject(new Error('Stream source is not seekable; cannot seek backwards'));
			}
			else {
				let discardNext = (): Promise<number> => {
					return this.reader.read().then((result: ReadResult<T>) => {
						if (result.done || this.reader.currentPosition === position) {
							return Promise.resolve(this.reader.currentPosition);
						}
						else {
							return discardNext();
						}
					});
				};

				return discardNext();
			}
		}
	}

	get strategy() {
		return this._strategy;
	}
}
