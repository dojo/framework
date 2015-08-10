import Task from '../async/Task';
import RequestTimeoutError from './errors/RequestTimeoutError';
import global from '../global';
import has from '../has';
import { RequestOptions, Response, ResponsePromise } from '../request';
import { generateRequestUrl } from './util';

export interface XhrRequestOptions extends RequestOptions {
	blockMainThread?: boolean;
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

export default function xhr<T>(url: string, options: XhrRequestOptions = {}): ResponsePromise<T> {
	const request = new XMLHttpRequest();
	const requestUrl = generateRequestUrl(url, options);
	const response: Response<T> = {
		data: null,
		nativeResponse: request,
		requestOptions: options,
		statusCode: null,
		statusText: null,
		url: requestUrl,

		getHeader(name: string): string {
			return request.getResponseHeader(name);
		}
	};

	const promise = new Task<Response<T>>(function (resolve, reject): void {
		if (!options.method) {
			options.method = 'GET';
		}

		if ((!options.user || !options.password) && options.auth) {
			let auth = options.auth.split(':');
			options.user = decodeURIComponent(auth[0]);
			options.password = decodeURIComponent(auth[1]);
		}

		request.open(options.method, requestUrl, !options.blockMainThread, options.user, options.password);

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

		if (options.responseType === 'xml' && request.overrideMimeType) {
			// This forces the XHR to parse the response as XML regardless of the MIME-type returned by the server
			request.overrideMimeType('text/xml');
		}

		request.send(options.data);
	}, function () {
		request && request.abort();
	});

	return promise;
}
