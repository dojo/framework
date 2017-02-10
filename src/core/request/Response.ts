import {
	Response as ResponseInterface,
	RequestOptions,
	DataEvent,
	EndEvent,
	StartEvent,
	ProgressEvent
} from './interfaces';
import Headers from './Headers';
import Task from '../async/Task';
import QueuingEvented from '../QueuingEvented';
import { EventObject, Handle } from '@dojo/interfaces/core';
import Promise from '@dojo/shim/Promise';

export interface ResponseData {
	task: Task<any>;
	used: boolean;
}

abstract class Response extends QueuingEvented implements ResponseInterface {
	abstract readonly headers: Headers;
	abstract readonly ok: boolean;
	abstract readonly status: number;
	abstract readonly statusText: string;
	abstract readonly url: string;
	abstract readonly bodyUsed: boolean;
	readonly requestOptions: RequestOptions;

	emit(event: ProgressEvent | DataEvent | EndEvent | StartEvent) {
		super.emit(event);
	}

	json<T>(): Task<T> {
		return <any> this.text().then(JSON.parse);
	}

	on(type: 'progress', fn: (event: ProgressEvent) => void): Handle;
	on(type: 'data', fn: (event: DataEvent) => void): Handle;
	on(type: 'end', fn: (event: EndEvent) => void): Handle;
	on(type: 'start', fn: (event: StartEvent) => void): Handle;
	on(type: string, fn: (event: EventObject) => void): Handle {
		return super.on(type, fn);
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
