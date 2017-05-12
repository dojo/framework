import Promise from '@dojo/shim/Promise';
import Task from '../async/Task';
import Headers from './Headers';
import { Response as ResponseInterface, RequestOptions } from './interfaces';
import Observable from '../Observable';

export interface ResponseData {
	task: Task<any>;
	used: boolean;
}

abstract class Response implements ResponseInterface {
	abstract readonly headers: Headers;
	abstract readonly ok: boolean;
	abstract readonly status: number;
	abstract readonly statusText: string;
	abstract readonly url: string;
	abstract readonly bodyUsed: boolean;
	readonly requestOptions: RequestOptions;

	abstract readonly download: Observable<number>;
	abstract readonly data: Observable<any>;

	json<T>(): Task<T> {
		return <any> this.text().then(JSON.parse);
	}

	abstract arrayBuffer(): Task<ArrayBuffer>;
	abstract blob(): Task<Blob>;
	abstract formData(): Task<FormData>;
	abstract text(): Task<string>;
}

export default Response;

export function getFileReaderPromise<T>(reader: FileReader): Promise<T> {
	return new Promise((resolve, reject) => {
		reader.onload = function () {
			resolve(reader.result);
		};
		reader.onerror = function () {
			reject(reader.error);
		};
	});
}

export function getTextFromBlob(blob: Blob) {
	const reader = new FileReader();
	const promise = getFileReaderPromise<string>(reader);
	reader.readAsText(blob);
	return promise;
}

export function getArrayBufferFromBlob(blob: Blob) {
	const reader = new FileReader();
	const promise = getFileReaderPromise<ArrayBuffer>(reader);
	reader.readAsArrayBuffer(blob);
	return promise;
}

export function getTextFromArrayBuffer(buffer: ArrayBuffer) {
	const view = new Uint8Array(buffer);
	const chars: string[] = [];

	view.forEach((charCode, index) => {
		chars[index] = String.fromCharCode(charCode);
	});

	return chars.join('');
}
