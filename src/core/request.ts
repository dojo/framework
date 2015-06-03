import has from './has';
import { Handle } from './interfaces';
// TODO replace with async/Task when that's merged
import { default as Task } from './Promise';
import Registry, { Test } from './Registry';
import nodeRequest from './request/node';
import xhrRequest from './request/xhr';

class FilterRegistry extends Registry<RequestFilter> {
	register(test: string | RegExp | RequestFilterTest, value: RequestFilter, first?: boolean): Handle {
		let entryTest: Test;

		if (typeof test === 'string') {
			entryTest = (response, url, options) => {
				return test === url;
			};
		}
		else if (test instanceof RegExp) {
			entryTest = (response, url, options) => {
				return test.test(url);
			};
		}
		else {
			entryTest = <RequestFilterTest> test;
		}

		return super.register(entryTest, value, first);
	}
}

class ProviderRegistry extends Registry<RequestProvider> {
	register(test: string | RegExp | RequestProviderTest, value: RequestProvider, first?: boolean): Handle {
		let entryTest: Test;

		if (typeof test === 'string') {
			entryTest = (url, options) => {
				return test === url;
			};
		}
		else if (test instanceof RegExp) {
			entryTest = (url, options) => {
				return test.test(url);
			};
		}
		else {
			entryTest = <RequestProviderTest> test;
		}

		return super.register(entryTest, value, first);
	}
}

interface Request extends RequestProvider {
	filterRegistry: FilterRegistry;
	providerRegistry: ProviderRegistry;

	delete<T>(url: string, options?: RequestOptions): RequestPromise<T>;
	get<T>(url: string, options?: RequestOptions): RequestPromise<T>;
	post<T>(url: string, options?: RequestOptions): RequestPromise<T>;
	put<T>(url: string, options?: RequestOptions): RequestPromise<T>;
}

let defaultProvider: RequestProvider;

if (has('host-node')) {
	defaultProvider = nodeRequest;
}
else if (has('host-browser')) {
	defaultProvider = xhrRequest;
}

/**
 * Request filters, which filter or modify responses. The default filter simply passes a response through unchanged.
 */
export const filterRegistry = new FilterRegistry(function (response: Response<any>): Response<any> {
	return response;
});

/**
 * Request providers, which fulfill requests.
 */
export const providerRegistry = new ProviderRegistry(defaultProvider);

export interface RequestError<T> extends Error {
	response: Response<T>;
}

export interface RequestFilter {
	<T>(response: Response<T>, url: string, options?: RequestOptions): T;
}

export interface RequestFilterTest extends Test {
	<T>(response: Response<any>, url: string, options?: RequestOptions): boolean;
}

export interface RequestOptions {
	auth?: string;
	cacheBust?: any;
	data?: any;
	headers?: { [name: string]: string; };
	method?: string;
	password?: string;
	query?: string;
	responseType?: string;
	timeout?: number;
	user?: string;
}

/**
 * The promise returned by a request, which will resolve to a Response. It also contains data and headers properties
 * that resolve when the request completes.
 */
export interface RequestPromise<T> extends Task<Response<T>> {
	data: Task<T>;
	headers: Task<{
		requestOptions: RequestOptions;
		statusCode: number;
		url: string;

		getHeader(name: string): string;
	}>
}

export interface RequestProvider {
	<T>(url: string, options?: RequestOptions): RequestPromise<T>;
}

export interface RequestProviderTest extends Test {
	(url: string, options?: RequestOptions): boolean;
}

export interface Response<T> {
	data: T;
	nativeResponse?: any;
	requestOptions: RequestOptions;
	statusCode: number;
	url: string;

	getHeader(name: string): string;
}

/**
 * Make a request, returning a Promise that will resolve or reject when the request completes.
 */
const request = <Request> function <T>(url: string, options: RequestOptions = {}): RequestPromise<T> {
	const promise = <RequestPromise<T>> providerRegistry.match(url, options)(url, options)
		.then(function (response: Response<T>) {
			return Task.resolve(filterRegistry.match(response, url, options)(response, url, options))
				.then(function (filterResponse: any) {
					response.data = filterResponse.data;
					return response;
				});
		});

	// Add data and headers properties if the provider hasn't already
	promise.data = promise.data || promise.then(function (response) {
		return response.data;
	});
	promise.headers = promise.headers || promise.then(function (response) {
		return response;
	});

	return promise;
};

/**
 * Add a filter that automatically parses incoming JSON responses.
 */
filterRegistry.register(
	function (response: Response<any>, url: string, options: RequestOptions) {
		return typeof response.data === 'string' && options.responseType === 'json';
	},
	function (response: Response<any>, url: string, options: RequestOptions): Object {
		return {
			data: JSON.parse(response.data)
		};
	}
);

/**
 * Create the standard HTTP verb handlers.
 */
[ 'delete', 'get', 'post', 'put' ].forEach(function (method) {
	(<any> request)[method] = function <T>(url: string, options: RequestOptions = {}): RequestPromise<T> {
		options = Object.create(options);
		options.method = method.toUpperCase();
		return request(url, options);
	};
});

export default request;
