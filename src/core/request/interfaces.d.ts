import Task from '../async/Task';
import UrlSearchParams from '../UrlSearchParams';
import { ParamList } from '../UrlSearchParams';
import { Handle } from '@dojo/interfaces/core';
import { IterableIterator } from '@dojo/shim/iterator';

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

interface ResponseEvent {
	response: Response;
}

export interface DataEvent extends ResponseEvent {
	type: 'data';
	chunk: any;
}

export interface EndEvent extends ResponseEvent {
	type: 'end';
}

export interface ProgressEvent extends ResponseEvent {
	type: 'progress';
	totalBytesDownloaded: number;
}

export interface StartEvent extends ResponseEvent {
	type: 'start';
}

export type Provider = (url: string, options?: RequestOptions) => Task<Response>;

export type ProviderTest = (url: string, options?: RequestOptions) => boolean | null;

export interface RequestOptions {
	cacheBust?: boolean;
	credentials?: 'omit' | 'same-origin' | 'include';
	body?: Blob | BufferSource | FormData | UrlSearchParams | string;
	headers?: Headers | { [key: string]: string; };
	method?: string;
	password?: string;
	timeout?: number;
	user?: string;
	query?: string | ParamList;
}

export interface Response extends Body {
	readonly headers: Headers;
	readonly ok: boolean;
	readonly status: number;
	readonly statusText: string;
	readonly url: string;

	on(type: 'data', fn: (event?: DataEvent) => void): Handle;
	on(type: 'end', fn: (event?: EndEvent) => void): Handle;
	on(type: 'progress', fn: (event?: ProgressEvent) => void): Handle;
	on(type: 'start', fn: (event?: StartEvent) => void): Handle;
}
