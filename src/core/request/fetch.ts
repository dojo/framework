import Promise from '@dojo/shim/Promise';
import RequestTimeoutError from './errors/RequestTimeoutError';
import Task from '../async/Task';
import { Handle } from '../interfaces';
import { createHandle } from '../lang';
import { RequestOptions, Response as RequestResponse, ResponsePromise } from '../request';
import { generateRequestUrl } from './util';

declare class Headers {
	append(name: string, value: string): void;
}

declare class Request {
	constructor(url: string, options?: any);
}

declare function fetch(_: any): any;

export interface FetchRequestOptions extends RequestOptions {
}

export default function fetchRequest<T>(url: string, options: FetchRequestOptions = {}): ResponsePromise<T> {
	const fetchRequestOptions: any = {};
	const fetchRequestHeaders: Headers = new Headers();
	const requestUrl = generateRequestUrl(url, options);

	if ((!options.user || !options.password) && options.auth) {
		const auth = options.auth.split(':');
		options.user = decodeURIComponent(auth[ 0 ]);
		options.password = decodeURIComponent(auth[ 1 ]);
	}

	if (options.user || options.password) {
		fetchRequestHeaders.append('authorization', `Basic ${btoa(`${options.user}:${options.password}`)}`);
	}

	if (options.cacheBust) {
		fetchRequestOptions.cache = 'reload';
	}

	if (!options.method) {
		options.method = 'GET';
	}

	fetchRequestOptions.method = options.method;

	if (options.headers) {
		const headers = options.headers;
		let hasContentTypeHeader = false;
		let hasRequestedWithHeader = false;

		for (const header in headers) {
			if (header.toLowerCase() === 'content-type') {
				hasContentTypeHeader = true;
			} else if (header.toLowerCase() === 'x-requested-with') {
				hasRequestedWithHeader = true;
			}
			fetchRequestHeaders.append(header.toLowerCase(), headers[ header ]);
		}
	}

	if (options.data) {
		fetchRequestOptions.body = options.data;
	}

	fetchRequestOptions.headers = fetchRequestHeaders;

	let request = new Request(requestUrl, fetchRequestOptions);

	return new Task<RequestResponse<T>>((resolve, reject) => {
		let timeout: Handle;

		fetch(request).then((fetchResponse: any) => {
			timeout && timeout.destroy();

			const { responseType = '' } = options;
			let body: Promise<any>;

			switch (responseType) {
				case 'arraybuffer':
					body = fetchResponse.arrayBuffer();
					break;

				case 'blob':
					body = fetchResponse.blob();
					break;

				case 'xml':
					body = fetchResponse.text()
						.then((asText: string) => {
							const parser = new DOMParser();
							return parser.parseFromString(asText, 'text/xml');
						});
					break;

				default:
					body = fetchResponse.text();
					break;
			}

			body.then((body: any) => {
				resolve({
					statusCode: fetchResponse.status,
					statusText: fetchResponse.statusText,
					data: body,
					url: requestUrl,
					nativeResponse: fetchResponse,
					requestOptions: options,
					getHeader(name: string) {
						return fetchResponse.headers.get(name.toLowerCase());
					}
				});
			}, reject);
		}, reject);

		if (options.timeout > 0 && options.timeout !== Infinity) {
			timeout = ((): Handle => {
				const timer = setTimeout(function (): void {
					const error = new RequestTimeoutError(`Request timed out after ${options.timeout}ms`);
					reject(error);
				}, options.timeout);

				return createHandle((): void => {
					clearTimeout(timer);
				});
			})();
		}
	});
}
