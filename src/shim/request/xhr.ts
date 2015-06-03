import RequestTimeoutError from './errors/RequestTimeoutError';
import global from '../global';
import has from '../has';
// TODO replace with async/Task when that's merged
import { default as Task } from '../Promise';
import { RequestOptions, RequestPromise, Response } from '../request';

export interface XHRRequestOptions extends RequestOptions {
	blockMainThread?: boolean;
}

export interface XHRResponse<T> extends Response<T> {
	statusText: string;
}

/**
 * A lookup table for valid `XMLHttpRequest#responseType` values.
 *
 * 'json' deliberately excluded since it is not supported in all environments, and as there is
 * already a filter for it in '../request'. Default '' and 'text' values also deliberately excluded.
 */
const responseTypeMap: { [key: string]: string; } = {
	arraybuffer: 'arraybuffer',
	// XHR2 environments that do not support `responseType=blob` still support `responseType=arraybuffer`,
	// which is a better way of handling blob data than as a string representation.
	blob: has('xhr2-blob') ? 'blob' : 'arraybuffer',
	document: 'document'
};

export default function xhr<T>(url: string, options: XHRRequestOptions = {}): RequestPromise<T> {
	let resolve: (value: XHRResponse<T> | Task<XHRResponse<T>>) => void;
	let reject: (error: Error) => void;
	// TODO: use proper Task signature when Task is available
	// let promise = <RequestPromise<T>> (new Task<XHRResponse<T>>((_resolve, _reject) => {
	// 	resolve = _resolve;
	// 	reject = _reject;
	// }, () => {
	// 	request && request.abort();
	// });
	let promise = <RequestPromise<T>> new Task<XHRResponse<T>>(function (_resolve, _reject): void {
		resolve = _resolve;
		reject = _reject;
	});

	if (!options.method) {
		options.method = 'GET';
	}

	const request = new XMLHttpRequest();
	const response = <XHRResponse<T>> {
		data: null,
		nativeResponse: request,
		requestOptions: options,
		statusCode: null,
		statusText: null,
		url: url,

		getHeader(name: string): string {
			return request.getResponseHeader(name);
		}
	};

	if ((!options.user || !options.password) && options.auth) {
		let auth = options.auth.split(':');
		options.user = decodeURIComponent(auth[0]);
		options.password = decodeURIComponent(auth[1]);
	}

	request.open(options.method, url, !options.blockMainThread, options.user, options.password);

	if (has('xhr2') && options.responseType in responseTypeMap) {
		request.responseType = responseTypeMap[options.responseType];
	}

	request.onreadystatechange = function (): void {
		if (request.readyState === 4) {
			request.onreadystatechange = function () {};

			if (options.responseType === 'xml') {
				response.data = request.responseXML;
			}
			else {
				response.data = ('response' in request) ? request.response : request.responseText;
			}

			response.statusCode = request.status;
			response.statusText = request.statusText;

			resolve(response);
		}
	};

	if (options.timeout > 0 && options.timeout !== Infinity) {
		request.timeout = options.timeout;
		request.ontimeout = function () {
			reject(new RequestTimeoutError('The XMLHttpRequest request timed out.'));
		};
	}

	const headers = options.headers;
	let hasContentTypeHeader: boolean = false;
	for (let header in headers) {
		if (header.toLowerCase() === 'content-type') {
			hasContentTypeHeader = true;
		}

		request.setRequestHeader(header, headers[header]);
	}

	if (!headers || !('X-Requested-With' in headers)) {
		request.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
	}

	if (!hasContentTypeHeader && has('formdata') && options.data instanceof global.FormData) {
		// Assume that most forms do not contain large binary files. If that is not the case,
		// then "multipart/form-data" should be manually specified as the "Content-Type" header.
		request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
	}

	try {
		request.send(options.data);
	}
	catch (error) {
		reject(error);
	}

	promise.data = promise.then(response => response.data);
	promise.headers = promise.then(response => response);

	return promise;
}
