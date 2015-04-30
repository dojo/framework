import { Sink } from '../interfaces';
import Promise from '../../Promise';

type NodeSourceType = Buffer | string;
export default class WritableNodeStreamSink implements Sink<NodeSourceType> {
	protected _encoding: string;
	protected _isClosed: boolean;
	protected _nodeStream: NodeJS.WritableStream;
	protected _onError: (error: Error) => void;
	protected _rejectWritePromise: Function;

	constructor(nodeStream: NodeJS.WritableStream, encoding: string = '') {
		this._isClosed = false;

		this._encoding = encoding;
		this._nodeStream = nodeStream;
		this._onError = this._handleError.bind(this);
		this._nodeStream.on('error', this._onError);
	}

	abort(reason: any): Promise<void> {
		// TODO: is there anything else to do here?
		return this.close();
	}

	close(): Promise<void> {
		this._isClosed = true;
		this._removeListeners();

		return new Promise<void>((resolve, reject) => {
			// TODO: if the node stream returns an error from 'end', should we:
			// 1. reject this.close with the error? (implemented)
			// 2. put 'this' into an error state? (this._handleError)
			this._nodeStream.end(null, null, (error: Error) => {
				if (error) {
					reject(error);
				}
				else {
					resolve();
				}
			});
		});
	}

	start(): Promise<void> {
		if (this._isClosed) {
			return Promise.reject(new Error('Stream is closed'));
		}

		return Promise.resolve();
	}

	write(chunk: string): Promise<void> {
		if (this._isClosed) {
			return Promise.reject(new Error('Stream is closed'));
		}

		return new Promise<void>((resolve, reject) => {
			this._rejectWritePromise = reject;

			this._nodeStream.write(chunk, this._encoding, (error?: Error) => {
				if (error) {
					this._handleError(error);
				}
				else {
					this._rejectWritePromise = undefined;
					resolve();
				}
			});
		});
	}

	protected _handleError(error: Error): void {
		this._isClosed = true;
		this._removeListeners();

		if (this._rejectWritePromise) {
			this._rejectWritePromise(error);
			this._rejectWritePromise = undefined;
		}

		throw error;
	}

	protected _removeListeners(): void {
		this._nodeStream.removeListener('error', this._onError);
	}
}
