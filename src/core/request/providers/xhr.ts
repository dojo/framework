import { Handle } from '@dojo/interfaces/core';
import global from '@dojo/shim/global';
import WeakMap from '@dojo/shim/WeakMap';
import Task, { State } from '../../async/Task';
import has from '../../has';
import { createTimer } from '../../util';
import Headers from '../Headers';
import { RequestOptions, UploadObservableTask } from '../interfaces';
import Response, { getArrayBufferFromBlob, getTextFromBlob } from '../Response';
import TimeoutError from '../TimeoutError';
import { generateRequestUrl } from '../util';
import Observable from '../../Observable';
import SubscriptionPool from '../SubscriptionPool';

/**
 * Request options specific to an XHR request
 */
export interface XhrRequestOptions extends RequestOptions {
	/**
	 * Controls whether or not the request is synchronous (blocks the main thread) or asynchronous (default).
	 */
	blockMainThread?: boolean;
	/**
	 * Controls whether or not the X-Requested-With header is added to the request (default true). Set to false to not
	 * include the header.
	 */
	includeRequestedWithHeader?: boolean;
}

interface RequestData {
	task: Task<XMLHttpRequest>;
	used: boolean;
	requestOptions: XhrRequestOptions;
	nativeResponse: XMLHttpRequest;
	url: string;
	downloadObservable: Observable<number>;
	dataObservable: Observable<any>;
}

const dataMap = new WeakMap<XhrResponse, RequestData>();

function getDataTask(response: XhrResponse): Task<XMLHttpRequest> {
	const data = dataMap.get(response)!;

	if (data.used) {
		return Task.reject<any>(new TypeError('Body already read'));
	}

	data.used = true;

	return data.task;
}

/**
 * Wraps an XHR request in a response that mimics the fetch API
 */
export class XhrResponse extends Response {
	readonly headers: Headers;
	readonly ok: boolean;
	readonly status: number;
	readonly statusText: string;

	get bodyUsed(): boolean {
		return dataMap.get(this)!.used;
	}

	get nativeResponse(): XMLHttpRequest {
		return dataMap.get(this)!.nativeResponse;
	}

	get requestOptions(): XhrRequestOptions {
		return dataMap.get(this)!.requestOptions;
	}

	get url(): string {
		return dataMap.get(this)!.url;
	}

	get download(): Observable<number> {
		return dataMap.get(this)!.downloadObservable;
	}

	get data(): Observable<any> {
		return dataMap.get(this)!.dataObservable;
	}

	constructor(request: XMLHttpRequest) {
		super();

		const headers = this.headers = new Headers();

		const responseHeaders = request.getAllResponseHeaders();
		if (responseHeaders) {
			for (let line of responseHeaders.split(/\r\n/g)) {
				const match = line.match(/^(.*?): (.*)$/);
				if (match) {
					headers.append(match[1], match[2]);
				}
			}
		}

		this.status = request.status;
		this.ok = this.status >= 200 && this.status < 300;
		this.statusText = request.statusText || 'OK';
	}

	arrayBuffer(): Task<ArrayBuffer> {
		return Task.reject<ArrayBuffer>(new Error('ArrayBuffer not supported'));
	}

	blob(): Task<Blob> {
		return Task.reject<Blob>(new Error('Blob not supported'));
	}

	formData(): Task<FormData> {
		return Task.reject<FormData>(new Error('FormData not supported'));
	}

	text(): Task<string> {
		return <any> getDataTask(this).then((request: XMLHttpRequest) => {
			return String(request.responseText);
		});
	}

	xml(): Task<Document> {
		return <any> this.text().then((text: string) => {
			const parser = new DOMParser();
			return parser.parseFromString(text, this.headers.get('content-type') || 'text/html');
		});
	}
}

if (has('blob')) {
	XhrResponse.prototype.blob = function (this: XhrResponse): Task<Blob> {
		return <any> getDataTask(this).then((request: XMLHttpRequest) => request.response);
	};

	XhrResponse.prototype.text = function (this: XhrResponse): Task<string> {
		return <any> this.blob().then(getTextFromBlob);
	};

	if (has('arraybuffer')) {
		XhrResponse.prototype.arrayBuffer = function (this: XhrResponse): Task<ArrayBuffer> {
			return <any> this.blob().then(getArrayBufferFromBlob);
		};
	}
}

if (has('formdata')) {
	XhrResponse.prototype.formData = function (this: XhrResponse): Task<FormData> {
		return <any> this.text().then((text: string) => {
			const data = new FormData();

			text.trim().split('&').forEach(keyValues => {
				if (keyValues) {
					const pairs = keyValues.split('=');
					const name = (pairs.shift() || '').replace(/\+/, ' ');
					const value = pairs.join('=').replace(/\+/, ' ');

					data.append(decodeURIComponent(name), decodeURIComponent(value));
				}
			});

			return data;
		});
	};
}

function noop () {}

function setOnError(request: XMLHttpRequest, reject: Function) {
	request.addEventListener('error', function (event) {
		reject(new TypeError(event.error || 'Network request failed'));
	});
}

export default function xhr(url: string, options: XhrRequestOptions = {}): UploadObservableTask<Response> {
	const request = new XMLHttpRequest();
	const requestUrl = generateRequestUrl(url, options);

	options = Object.create(options);

	if (!options.method) {
		options.method = 'GET';
	}

	let isAborted = false;

	function abort() {
		isAborted = true;
		if (request) {
			request.abort();
			request.onreadystatechange = noop;
		}
	}

	let timeoutHandle: Handle;
	let timeoutReject: Function;

	const task = <UploadObservableTask<Response>> new Task<Response>((resolve, reject) => {
		timeoutReject = reject;

		request.onreadystatechange = function () {
			if (isAborted) {
				return;
			}

			if (request.readyState === 2) {
				const response = new XhrResponse(request);

				const downloadSubscriptionPool = new SubscriptionPool<number>();
				const dataSubscriptionPool = new SubscriptionPool<any>();

				const task = new Task<XMLHttpRequest>((resolve, reject) => {
					timeoutReject = reject;

					request.onprogress = function (event: any) {
						if (isAborted) {
							return;
						}

						downloadSubscriptionPool.next(event.loaded);
					};

					request.onreadystatechange = function () {
						if (isAborted) {
							return;
						}

						if (request.readyState === 4) {
							request.onreadystatechange = noop;
							timeoutHandle && timeoutHandle.destroy();

							dataSubscriptionPool.next(request.response);
							dataSubscriptionPool.complete();

							resolve(request);
						}
					};

					setOnError(request, reject);
				}, abort);

				dataMap.set(response, {
					task,
					used: false,
					nativeResponse: request,
					requestOptions: options,
					url: requestUrl,
					downloadObservable: new Observable<number>(observer => downloadSubscriptionPool.add(observer)),
					dataObservable: new Observable<any>(observer => dataSubscriptionPool.add(observer))
				});

				resolve(response);
			}
		};

		setOnError(request, reject);

	}, abort);

	request.open(options.method, requestUrl, !options.blockMainThread, options.user, options.password);

	if (has('filereader') && has('blob')) {
		request.responseType = 'blob';
	}

	if (options.timeout && options.timeout > 0 && options.timeout !== Infinity) {
		timeoutHandle = createTimer(() => {
			// Reject first, since aborting will also fire onreadystatechange which would reject with a
			// less specific error.  (This is also why we set up our own timeout rather than using
			// native timeout and ontimeout, because that aborts and fires onreadystatechange before ontimeout.)
			timeoutReject && timeoutReject(new TimeoutError('The XMLHttpRequest request timed out'));
			abort();
		}, options.timeout);
	}

	let hasContentTypeHeader = false;
	let hasRequestedWithHeader = false;
	const { includeRequestedWithHeader = true } = options;

	if (options.headers) {
		const requestHeaders = new Headers(options.headers);

		hasRequestedWithHeader = requestHeaders.has('x-requested-with');
		hasContentTypeHeader = requestHeaders.has('content-type');

		for (const [key, value] of requestHeaders) {
			request.setRequestHeader(key, value);
		}
	}

	if (!hasRequestedWithHeader && includeRequestedWithHeader) {
		request.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
	}

	if (!hasContentTypeHeader && has('formdata') && options.body instanceof global.FormData) {
		// Assume that most forms do not contain large binary files. If that is not the case,
		// then "multipart/form-data" should be manually specified as the "Content-Type" header.
		request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
	}

	task.finally(() => {
		if (task.state !== State.Fulfilled) {
			request.onreadystatechange = noop;
			timeoutHandle && timeoutHandle.destroy();
		}
	});

	const uploadObserverPool = new SubscriptionPool<number>();
	task.upload = new Observable<number>(observer => uploadObserverPool.add(observer));

	if (has('host-browser') || has('web-worker-xhr-upload')) {
		request.upload.addEventListener('progress', event => {
			uploadObserverPool.next(event.loaded);
		});
	}

	request.send(options.body || null);

	return task;
}
