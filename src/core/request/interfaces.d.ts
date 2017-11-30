import { IterableIterator } from '@dojo/shim/iterator';
import Task from '../async/Task';
import UrlSearchParams, { ParamList } from '../UrlSearchParams';
import Observable from '../Observable';

export interface Body {
	readonly bodyUsed: boolean;

	arrayBuffer(): Task<ArrayBuffer>;
	blob(): Task<Blob>;
	formData(): Task<FormData>;
	json<T>(): Task<T>;
	text(): Task<string>;
}

export interface Headers {
	append(name: string, value: string): void;
	delete(name: string): void;
	entries(): IterableIterator<[string, string]>;
	get(name: string): string | null;
	getAll(name: string): string[];
	has(name: string): boolean;
	keys(): IterableIterator<string>;
	set(name: string, value: string): void;
	values(): IterableIterator<string>;
	[Symbol.iterator](): IterableIterator<[string, string]>;
}

export interface UploadObservableTask<T> extends Task<T> {
	upload: Observable<number>;
}

export type Provider = (url: string, options?: RequestOptions) => UploadObservableTask<Response>;

export type ProviderTest = (url: string, options?: RequestOptions) => boolean | null;

export interface RequestOptions {
	/**
	 * Enable cache busting (default false). Cache busting will make a new URL by appending a parameter to the
	 * requested URL
	 */
	cacheBust?: boolean;
	credentials?: 'omit' | 'same-origin' | 'include';
	/**
	 * Body to send along with the http request
	 */
	body?: Blob | BufferSource | FormData | UrlSearchParams | string;
	/**
	 * Headers to send along with the http request
	 */
	headers?: Headers | { [key: string]: string; };
	/**
	 * HTTP method
	 */
	method?: string;
	/**
	 * Password for HTTP authentication
	 */
	password?: string;
	/**
	 * Number of milliseconds before the request times out and is canceled
	 */
	timeout?: number;
	/**
	 * User for HTTP authentication
	 */
	user?: string;
	/**
	 * Optional query parameter(s) for the URL. The requested url will have these query parameters appended.
	 */
	query?: string | ParamList;
}

export interface Response extends Body {
	readonly headers: Headers;
	readonly ok: boolean;
	readonly status: number;
	readonly statusText: string;
	readonly url: string;
	readonly requestOptions: RequestOptions;

	readonly download: Observable<number>;
	readonly data: Observable<any>;
}
