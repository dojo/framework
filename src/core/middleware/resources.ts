import Map from '../../shim/Map';
import Set from '../../shim/Set';
import { create, diffProperty, invalidator, destroy } from '../vdom';
import { Invalidator } from '../interfaces';
import { isThenable } from '../../shim/Promise';
import { auto } from '../diff';

// Resource General

type SubscriptionType = 'read' | 'find' | 'meta' | 'loading' | 'failed';
type InvalidatorMaps = { [key in SubscriptionType]: Map<string, Set<Invalidator>> };
type StatusType = 'LOADING' | 'FAILED';
type ResourceQuery<S> = { [P in keyof S]?: any };
type TransformConfig<T, S = void> = { [P in keyof T]: S extends void ? string : keyof S };
interface ResourceOptions<S> {
	page: number | number[];
	size: number;
	query: ResourceQuery<S>;
}
interface Options<S> {
	(options?: Partial<ResourceOptions<S>>): ResourceOptions<S>;
	options: any;
}
export interface ResourceFindOptions<S> {
	options: ResourceOptions<S>;
	query: ResourceQuery<S>;
	start: number;
	type?: string;
}

export interface ResourceInitOptions {
	id: string;
}

// Resource Template

export interface ResourceReadRequest<RESOURCE> {
	offset: number;
	size: number;
	query: ResourceQuery<RESOURCE>;
}
export interface ResourceReadResponse<RESOURCE> {
	data: RESOURCE[];
	total: number;
}
export interface ResourceFindRequest<RESOURCE> {
	options: ResourceOptions<RESOURCE>;
	query: ResourceQuery<RESOURCE>;
	start: number;
	type: string;
}
export interface ResourceFindResponse<RESOURCE> {
	item: RESOURCE;
	index: number;
}

export interface ResourceFindResult<RESOURCE> {
	item: RESOURCE;
	page: number;
	index: number;
	pageIndex: number;
}

export interface ResourceMeta {
	total: number | undefined;
}

export interface ResourceGet<RESOURCE> {
	(request?: Partial<ResourceReadRequest<RESOURCE>>): ResourceReadResponse<RESOURCE>;
}
export interface ResourcePut<RESOURCE> {
	(readResponse: ResourceReadResponse<RESOURCE>, readRequest: ResourceReadRequest<RESOURCE>): void;
	(findResponse: ResourceFindResponse<RESOURCE> | undefined, findRequest: ResourceFindRequest<RESOURCE>): void;
}
export interface ResourceControls<RESOURCE> {
	get: ResourceGet<RESOURCE>;
	put: ResourcePut<RESOURCE>;
}
export interface ResourceRead<RESOURCE> {
	(request: ResourceReadRequest<RESOURCE>, controls: ResourceControls<RESOURCE>): void | Promise<void>;
}
export interface ResourceFind<RESOURCE> {
	(options: ResourceFindRequest<RESOURCE>, controls: ResourceControls<RESOURCE>): void | Promise<void>;
}

interface BaseResourceInitRequest {
	id: string;
}

export interface ResourceInit<RESOURCE, INIT> {
	(request: BaseResourceInitRequest & INIT, controls: ResourceControls<RESOURCE>): void;
}

interface ResourceTemplate<RESOURCE = {}, MIDDLEWARE = {}> {
	read: ResourceRead<RESOURCE>;
	find: ResourceFind<RESOURCE>;
}

interface ResourceTemplateWithInit<RESOURCE = {}, INIT = any, MIDDLEWARE = {}> {
	init: ResourceInit<RESOURCE, INIT>;
	read: ResourceRead<RESOURCE>;
	find: ResourceFind<RESOURCE>;
}

// Resource Interfaces

export interface Resource<S = {}> {
	find(options: ResourceFindOptions<S>): ResourceFindResult<S> | undefined;
	getOrRead(options: ResourceOptions<S>): (undefined | S[])[];
	meta(options: ResourceOptions<S>, read: boolean): ResourceMeta | undefined;
	isLoading(options: ResourceOptions<S> | ResourceFindOptions<S>): boolean;
	isFailed(options: ResourceOptions<S>): boolean;
	subscribeFind(invalidator: Invalidator, options: ResourceFindOptions<S>): void;
	subscribeRead(invalidator: Invalidator, options: ResourceOptions<S>): void;
	subscribeMeta(invalidator: Invalidator, options: ResourceOptions<S>): void;
	subscribeLoading(invalidator: Invalidator, options: ResourceOptions<S> | ResourceFindOptions<S>): void;
	subscribeFailed(invalidator: Invalidator, options: ResourceOptions<S> | ResourceFindOptions<S>): void;
	unsubscribe(invalidator: Invalidator): void;
	init(initOptions: ResourceInitOptions, requireDiff?: boolean): void;
	destroy(id: string): void;
}

export type ResourceProperty<MIDDLEWARE> = MIDDLEWARE extends infer RESOURCE
	? {
			template: {
				template: ResourceTemplate<RESOURCE, MIDDLEWARE>;
				transform?: TransformConfig<MIDDLEWARE, any>;
				initOptions?: ResourceInitOptions;
				id?: string;
			};
			options?: Options<MIDDLEWARE>;
	  }
	: any;

export interface ResourceMiddlewareProperties<MIDDLEWARE> {
	resource: ResourceProperty<MIDDLEWARE>;
}

interface ResourceTemplateWrapper<RESOURCE = {}, MIDDLEWARE = {}> {
	template: ResourceTemplate<RESOURCE, any>;
	transform?: TransformConfig<{ [P in keyof MIDDLEWARE]: {} }, RESOURCE>;
	initOptions?: ResourceInitOptions;
	id?: string;
}

// Resource Middleware Interfaces

interface ResourceMiddleware<MIDDLEWARE = {}> {
	<RESOURCE>(
		options: {
			template: ResourceTemplate<RESOURCE, MIDDLEWARE>;
			options?: Options<{}>;
		}
	): {
		template: {
			template: ResourceTemplate<RESOURCE, MIDDLEWARE>;
		};
		options: Options<{}>;
		transform?: any;
	};
	<RESOURCE, MIDDLEWARE>(
		options: {
			template: ResourceTemplate<RESOURCE, any>;
			transform: TransformConfig<MIDDLEWARE, RESOURCE>;
			options?: Options<{}>;
		}
	): {
		template: {
			template: ResourceTemplate<any, any>;
			transform: TransformConfig<MIDDLEWARE, RESOURCE>;
		};
		options: Options<{}>;
	};
	<RESOURCE, INIT, DATA extends RESOURCE>(
		options: {
			template: ResourceTemplateWithInit<RESOURCE, INIT, MIDDLEWARE>;
			initOptions: INIT & { id: string };
			options?: Options<{}>;
		}
	): {
		template: {
			template: ResourceTemplateWithInit<RESOURCE, INIT, MIDDLEWARE>;
		};
		options: Options<{}>;
		transform?: any;
	};
	<RESOURCE, INIT, MIDDLEWARE, DATA extends RESOURCE>(
		options: {
			template: ResourceTemplateWithInit<RESOURCE, INIT, any>;
			transform: TransformConfig<MIDDLEWARE, RESOURCE>;
			initOptions: INIT & { id: string };
			options?: Options<{}>;
		}
	): {
		template: {
			template: ResourceTemplateWithInit<any, INIT, any>;
			transform: TransformConfig<MIDDLEWARE, RESOURCE>;
		};
		options: Options<{}>;
	};
	<RESOURCE, MIDDLEWARE>(
		options: {
			template: ResourceTemplateWrapper<RESOURCE, MIDDLEWARE>;
			options: Options<{}>;
		}
	): {
		template: {
			template: ResourceTemplate<any, any>;
			transform: TransformConfig<MIDDLEWARE, RESOURCE>;
		};
		options: Options<{}>;
	};
	createOptions(id: string): Options<{}>;
	getOrRead<RESOURCE>(
		template: ResourceTemplate<RESOURCE> & { type: 'standard' },
		options: ResourceOptions<any>
	): RESOURCE[][];
	getOrRead<RESOURCE, INIT>(
		template: ResourceTemplateWithInit<RESOURCE, INIT> & { type: 'init' },
		options: ResourceOptions<any>,
		initOptions: INIT & { id: string }
	): RESOURCE[][];
	getOrRead<T extends ResourceTemplate<any, any>>(
		template: {
			template: T;
			transform?: any;
			data?: any;
		},
		options: ResourceOptions<any>
	): T extends ResourceTemplate<infer RESOURCE> ? RESOURCE[][] : void;
	find<RESOURCE>(
		template: ResourceTemplate<RESOURCE> & { type: 'standard' },
		options: ResourceFindOptions<any>
	): ResourceFindResult<RESOURCE> | undefined;
	find<RESOURCE, INIT>(
		template: ResourceTemplateWithInit<RESOURCE, INIT> & { type: 'init' },
		options: ResourceFindOptions<any>,
		initOptions: INIT & { id: string }
	): ResourceFindResult<RESOURCE> | undefined;
	find<T extends ResourceTemplate<any, any>>(
		template: {
			template: T;
			transform?: any;
			data?: any;
		},
		options: ResourceFindOptions<any>
	): T extends ResourceTemplate<infer RESOURCE> ? ResourceFindResult<RESOURCE> | undefined : void;
	meta<RESOURCE>(
		template: ResourceTemplate<RESOURCE> & { type: 'standard' },
		options: ResourceOptions<any>,
		request?: boolean
	): ResourceMeta | undefined;
	meta<RESOURCE, INIT>(
		template: ResourceTemplateWithInit<RESOURCE, INIT> & { type: 'init' },
		options: ResourceOptions<any>,
		initOptions: INIT & { id: string },
		request?: boolean
	): ResourceMeta | undefined;
	meta<T extends ResourceTemplate<any, any>>(
		template: {
			template: T;
			transform?: any;
			data?: any;
		},
		options: ResourceOptions<any>,
		request?: boolean
	): ResourceMeta | undefined;
	isLoading<RESOURCE>(
		template: ResourceTemplate<RESOURCE> & { type: 'standard' },
		options: ResourceOptions<any> | ResourceFindOptions<any>
	): boolean;
	isLoading<RESOURCE, INIT>(
		template: ResourceTemplateWithInit<RESOURCE, INIT> & { type: 'init' },
		options: ResourceOptions<any> | ResourceFindOptions<any>,
		initOptions: INIT & { id: string }
	): boolean;
	isLoading<T extends ResourceTemplate<any, any>>(
		template: {
			template: T;
			transform?: any;
			data?: any;
		},
		options: ResourceOptions<any> | ResourceFindOptions<any>
	): boolean;
	isFailed<RESOURCE>(
		template: ResourceTemplate<RESOURCE> & { type: 'standard' },
		options: ResourceOptions<any> | ResourceFindOptions<any>
	): boolean;
	isFailed<RESOURCE, INIT>(
		template: ResourceTemplateWithInit<RESOURCE, INIT> & { type: 'init' },
		options: ResourceOptions<any> | ResourceFindOptions<any>,
		initOptions: INIT & { id: string }
	): boolean;
	isFailed<T extends ResourceTemplate<any, any>>(
		template: {
			template: T;
			transform?: any;
			data?: any;
		},
		options: ResourceOptions<any> | ResourceFindOptions<any>
	): boolean;
}

export function createResourceTemplate<RESOURCE = void>(): ResourceTemplateWithInit<RESOURCE, { data: RESOURCE[] }> & {
	type: 'init';
};
export function createResourceTemplate<RESOURCE = void, INIT = void>(
	template: INIT extends void ? ResourceTemplate<RESOURCE> : ResourceTemplateWithInit<RESOURCE, INIT>
): INIT extends void
	? ResourceTemplate<RESOURCE> & { type: 'standard' }
	: ResourceTemplateWithInit<RESOURCE, INIT> & { type: 'init' };
export function createResourceTemplate(template?: any): any {
	if (template) {
		return template;
	}
	return { ...memoryTemplate };
}

/**
 * @deprecated Please use `createResourceTemplate` instead
 */
export function createResourceTemplateWithInit<RESOURCE = void, INIT = {}>(
	template: ResourceTemplateWithInit<RESOURCE, INIT>
) {
	return createResourceTemplate<RESOURCE, INIT>(template as any);
}

/**
 * @deprecated Please use `createResourceTemplate` instead
 */
export function createMemoryResourceTemplate<RESOURCE = void>() {
	return createResourceTemplate<RESOURCE>();
}

export function defaultFilter(query: ResourceQuery<any>, item: any, type: string = 'contains') {
	const queryKeys = Object.keys(query);
	for (let i = 0; i < queryKeys.length; i++) {
		const queryKey = queryKeys[i];
		const value = query[queryKeys[i]];
		if (value) {
			const itemValue = item[queryKey];
			let result = true;
			if (typeof itemValue === 'string' && typeof value === 'string' && type !== 'exact') {
				if (type === 'contains') {
					result = item[queryKey].toLowerCase().indexOf(value.toLowerCase()) !== -1;
				} else {
					result = item[queryKey].toLowerCase().indexOf(value.toLowerCase()) === 0;
				}
			} else {
				result = value === item[queryKey];
			}
			if (!result) {
				return false;
			}
		}
	}
	return true;
}

export function defaultFind(request: ResourceFindRequest<any>, { put, get }: ResourceControls<any>) {
	const { type, options } = request;
	const { query } = options;
	const { data } = get({ query });
	let found: ResourceFindResponse<any> | undefined;
	for (let i = 0; i < data.length; i++) {
		const item = data[i];
		if (item && defaultFilter(request.query, item, type)) {
			if (!found || i >= request.start) {
				found = {
					item,
					index: i
				};
				if (i >= request.start) {
					break;
				}
			}
		}
	}
	put(found, request);
}

export const memoryTemplate: ResourceTemplateWithInit<any, { data: any }> = Object.freeze({
	init: ({ data }, { put }) => {
		put({ data, total: data.length }, { offset: 0, size: 30, query: {} });
	},
	read: (request, { get, put }) => {
		const { data } = get();
		const { offset, size } = request;
		const filteredData = Object.keys(request.query).length
			? data.filter((item) => item && defaultFilter(request.query, item, 'contains'))
			: data;
		put({ data: filteredData.slice(offset, offset + size), total: filteredData.length }, request);
	},
	find: (request, { get, put }) => {
		const { type, options } = request;
		const { query } = options;
		let { data } = get({ query });
		if (!data.length) {
			data = get().data.filter((item) => defaultFilter(query, item));
		}
		let found: ResourceFindResponse<any> | undefined;
		for (let i = 0; i < data.length; i++) {
			const item = data[i];
			if (item && defaultFilter(request.query, item, type)) {
				if (!found || i >= request.start) {
					found = {
						item,
						index: i
					};
					if (i >= request.start) {
						break;
					}
				}
			}
		}
		put(found, request);
	}
});

function getMetaKey({ query, size }: ResourceOptions<any>) {
	return `size-${size}-query-${JSON.stringify(query)}`;
}

function getFindKey(findOptions: ResourceFindOptions<any>) {
	const { options, ...find } = getFindOptions(findOptions);
	return `size-${options.size}-query-${JSON.stringify(options.query)}-find-${JSON.stringify(find)}`;
}

function getReadKey({ page, size, query }: ResourceOptions<any>): string {
	return `page-${JSON.stringify(page)}-size-${size}-query-${JSON.stringify(query)}`;
}

function getDataKey({ query = {} }: Partial<ResourceOptions<any>> | Partial<ResourceReadRequest<any>> = {}): string {
	return `${JSON.stringify(query)}`;
}

function getFindOptions(findOptions: ResourceFindOptions<any>) {
	const { type = 'contains', start, query, options } = findOptions;
	return { type, start, query, options };
}

function isFindOptions(options: any): options is ResourceFindOptions<any> {
	return Boolean(options && !!options.options);
}

function isFindRequest(options: any): options is ResourceFindRequest<any> {
	return isFindOptions(options);
}

function isFindResponse(options: any): options is ResourceFindResponse<any> {
	return Boolean(options && !!options.item);
}

function transformData(item: any, transformConfig: TransformConfig<any>) {
	let transformedItem: any = {};
	let sourceKeys: string[] = [];
	Object.keys(transformConfig).forEach((key: string) => {
		const sourceKey = transformConfig[key as any];
		transformedItem = {
			...transformedItem,
			[key]: item[sourceKey]
		};
		sourceKeys.push(sourceKey);
	});
	Object.keys(item)
		.filter((key) => sourceKeys.indexOf(key) === -1)
		.forEach((key) => {
			transformedItem = {
				...transformedItem,
				[key]: item[key]
			};
		});
	return transformedItem;
}

function transformQuery(query: ResourceQuery<any>, transformConfig: TransformConfig<any>) {
	const queryKeys = Object.keys(query);
	let transformedQuery: ResourceQuery<any> = {};
	for (let i = 0; i < queryKeys.length; i++) {
		const queryKey = queryKeys[i];
		transformedQuery[transformConfig[queryKey] || queryKey] = query[queryKey];
	}
	return transformedQuery;
}

function transformOptions<R extends ResourceOptions<any> | ResourceFindOptions<any>>(
	options: R,
	transformConfig?: TransformConfig<any>
): R {
	if (transformConfig) {
		if (isFindOptions(options) && options.options.query) {
			const query = transformQuery(options.options.query, transformConfig);
			options.options = { ...options.options, query };
		}
		if (options.query && transformConfig) {
			const query = transformQuery(options.query, transformConfig);
			return { ...options, query };
		}
	}
	return { ...options };
}

function isTemplateWithInit(value: any): value is ResourceTemplateWithInit<any> {
	return Boolean(value && value.init);
}

function diffInitOptions(current: any, next: any) {
	const keys = new Set([...Object.keys(current), ...Object.keys(next)]);
	return [...keys].some((initKey) => auto(current[initKey], next[initKey], 1).changed);
}

function createResource<S = never, T extends ResourceInitOptions = ResourceInitOptions>(
	template: ResourceTemplate<S> | ResourceTemplateWithInit<S>,
	initOptions?: T
): Resource<S> {
	const dataMap = new Map<string, S[]>();
	const metaMap = new Map<string, ResourceMeta>();
	const statusMap = new Map<string, StatusType>();
	const findMap = new Map<string, undefined | ResourceFindResult<S>>();
	const requestPageMap = new Map<string, number[]>();
	const invalidatorMaps: InvalidatorMaps = {
		read: new Map<string, Set<Invalidator>>(),
		find: new Map<string, Set<Invalidator>>(),
		meta: new Map<string, Set<Invalidator>>(),
		failed: new Map<string, Set<Invalidator>>(),
		loading: new Map<string, Set<Invalidator>>()
	};
	const { read, find } = template;

	function get(request: Partial<ResourceReadRequest<S>> = {}) {
		const dataKey = getDataKey(request);
		const data = dataMap.get(dataKey) || [];
		return { data, total: data.length };
	}

	function put(response: ResourceReadResponse<S>, request: ResourceReadRequest<S>): void;
	function put(response: ResourceFindResponse<S> | undefined, request: ResourceFindRequest<S>): void;
	function put(
		response: ResourceReadResponse<S> | ResourceFindResponse<S> | undefined,
		request: ResourceReadRequest<S> | ResourceFindRequest<S>
	) {
		if (isFindRequest(request) && (isFindResponse(response) || !response)) {
			setFind(response, request);
		} else if (!isFindRequest(request) && !isFindResponse(response) && response) {
			setData(response, request);
		}
	}

	if (isTemplateWithInit(template)) {
		template.init(initOptions, { put, get });
	}

	function invalidate(type: SubscriptionType, key: string) {
		const keyedInvalidatorMap = invalidatorMaps[type];
		const invalidatorSet = keyedInvalidatorMap.get(key);
		if (invalidatorSet) {
			[...invalidatorSet].forEach((invalidator) => {
				invalidator();
			});
		}
	}

	function invalidateAll() {
		Object.keys(invalidatorMaps).forEach((key: string) => {
			const map = invalidatorMaps[key as keyof InvalidatorMaps];
			map.forEach((invalidatorSet) => {
				invalidatorSet.forEach((invalidator) => {
					invalidator();
				});
			});
		});
	}

	function subscribe(type: SubscriptionType, invalidator: Invalidator, key: string): void {
		const keyedInvalidatorMap = invalidatorMaps[type];
		const invalidatorSet = keyedInvalidatorMap.get(key) || new Set<Invalidator>();
		invalidatorSet.add(invalidator);
		keyedInvalidatorMap.set(key, invalidatorSet);
	}

	function subscribeRead(invalidator: Invalidator, options: ResourceOptions<S>) {
		subscribe('read', invalidator, getReadKey(options));
	}

	function subscribeMeta(invalidator: Invalidator, options: ResourceOptions<S>) {
		subscribe('meta', invalidator, getReadKey(options));
	}

	function subscribeFind(invalidator: Invalidator, options: ResourceFindOptions<S>) {
		subscribe('find', invalidator, getFindKey(options));
	}

	function subscribeLoading(invalidator: Invalidator, options: ResourceOptions<S> | ResourceFindOptions<S>) {
		if (isFindOptions(options)) {
			subscribe('loading', invalidator, getFindKey(options));
		} else {
			subscribe('loading', invalidator, getReadKey(options));
		}
	}

	function subscribeFailed(invalidator: Invalidator, options: ResourceOptions<S> | ResourceFindOptions<S>) {
		if (isFindOptions(options)) {
			subscribe('failed', invalidator, getFindKey(options));
		} else {
			subscribe('failed', invalidator, getReadKey(options));
		}
	}

	function unsubscribe(invalidator: Invalidator) {
		Object.keys(invalidatorMaps).forEach((type) => {
			const keyedInvalidatorMap = invalidatorMaps[type as SubscriptionType];
			const keys = keyedInvalidatorMap.keys();
			[...keys].forEach((key) => {
				const invalidatorSet = keyedInvalidatorMap.get(key);
				if (invalidatorSet && invalidatorSet.has(invalidator)) {
					invalidatorSet.delete(invalidator);
					if (invalidatorSet.size === 0) {
						keyedInvalidatorMap.delete(key);
					} else {
						keyedInvalidatorMap.set(key, invalidatorSet);
					}
				}
			});
		});
	}

	function releaseResource() {
		dataMap.clear();
		metaMap.clear();
		statusMap.clear();
		requestPageMap.clear();
	}

	function isStatus(statusType: StatusType, key: string) {
		const status = statusMap.get(key);
		if (status) {
			return status === statusType;
		}
		return false;
	}

	function setStatus(status: StatusType, key: string) {
		statusMap.set(key, status);
	}

	function clearStatus(key: string) {
		statusMap.delete(key);
	}

	function isLoading(options: ResourceOptions<S> | ResourceFindOptions<S>) {
		const key = isFindOptions(options) ? getFindKey(options) : getReadKey(options);
		return isStatus('LOADING', key);
	}

	function isFailed(options: ResourceOptions<S> | ResourceFindOptions<S>) {
		const key = isFindOptions(options) ? getFindKey(options) : getReadKey(options);
		return isStatus('FAILED', key);
	}

	function setMeta(options: ResourceOptions<S>, total: number) {
		const metaKey = getMetaKey(options);
		let meta = metaMap.get(metaKey);
		if (!meta) {
			meta = { ...options, total };
		} else {
			if (!meta.total || total > meta.total) {
				meta.total = total;
			}
		}
		invalidate('meta', getMetaKey(options));
		metaMap.set(metaKey, { ...meta });
	}

	function setData(response: ResourceReadResponse<S>, request: ResourceReadRequest<S>) {
		const { data, total } = response;
		const { size, offset, query } = request;
		const dataKey = getDataKey(request);
		const cachedData = dataMap.get(dataKey) || [];
		const maxItem = total ? total : offset + data.length;
		for (let i = offset; i < maxItem; i += 1) {
			if (data[i - offset] === undefined) {
				break;
			}
			cachedData[i] = data[i - offset];
		}
		clearStatus(dataKey);
		dataMap.set(dataKey, cachedData);
		const page = Math.floor(offset / size) + 1;
		setMeta({ size, query, page }, total);
		invalidate('read', getReadKey({ size, query, page }));
		return cachedData.slice(offset, offset + size).filter(() => true);
	}

	function setFind(response: ResourceFindResponse<S> | undefined, request: ResourceFindRequest<S>) {
		const { options } = request;
		const { size } = options;
		const key = getFindKey(request);
		if (!response) {
			findMap.set(key, response);
		} else {
			findMap.set(key, {
				...response,
				page: Math.floor(response.index / size) + 1,
				pageIndex: response.index % size
			});
		}
		clearStatus(key);
		invalidate('find', getFindKey(request));
	}

	function getCachedPageData(options: { page: number; size: number; query: ResourceQuery<S> }): S[] | undefined {
		const { size, page } = options;
		const metaKey = getMetaKey(options);
		const dataKey = getDataKey(options);
		const requestedPages = requestPageMap.get(metaKey) || [];
		const cachedData = dataMap.get(dataKey);
		if (cachedData) {
			const offset = (page - 1) * size;
			const requestedCachedData = cachedData.slice(offset, offset + size).filter(() => true);
			setMeta(options, cachedData.length);
			if (requestedCachedData.length === size || requestedPages.indexOf(page) !== -1) {
				return requestedCachedData;
			}
		}
	}

	function getOrRead(options: ResourceOptions<S>): (undefined | S[])[] {
		const pages = Array.isArray(options.page) ? options.page : [options.page];
		const { size, query } = options;
		const getOrReadResponse: (undefined | S[])[] = [];
		const requestKey = getReadKey(options);
		const promises: Promise<any>[] = [];

		for (let i = 0; i < pages.length; i++) {
			const page = pages[i];
			const offset = (page - 1) * size;
			const statusKey = getReadKey({ page, size, query });
			const metaKey = getMetaKey({ size, query, page });
			const requestedPages = requestPageMap.get(metaKey) || [];
			if (isLoading({ page, size, query }) || isFailed({ page, size, query })) {
				getOrReadResponse.push(undefined);
				continue;
			}

			const cachedData = getCachedPageData({ size, query, page });
			if (cachedData) {
				getOrReadResponse.push(cachedData);
				continue;
			}

			requestedPages.push(page);
			requestPageMap.set(metaKey, requestedPages);
			const response = read(
				{ offset, size, query },
				{
					get,
					put
				}
			);

			if (isThenable<void>(response)) {
				promises.push(response);
				getOrReadResponse.push(undefined);
				setStatus('LOADING', statusKey);
				invalidate('loading', getReadKey({ size, page, query }));
				response
					.then(() => {
						clearStatus(statusKey);
						invalidate('read', getReadKey({ size, page, query }));
						invalidate('loading', getReadKey({ size, page, query }));
					})
					.catch(() => {
						setStatus('FAILED', statusKey);
						invalidate('loading', getReadKey({ size, page, query }));
						invalidate('failed', getReadKey({ size, page, query }));
					});
			} else {
				getOrReadResponse.push(getCachedPageData({ size, query, page }));
			}
		}
		if (promises.length) {
			setStatus('LOADING', requestKey);
			Promise.all(promises)
				.then(() => {
					clearStatus(requestKey);
					invalidate('read', getReadKey(options));
					invalidate('loading', getReadKey(options));
				})
				.catch(() => {
					setStatus('FAILED', requestKey);
					invalidate('loading', getReadKey(options));
					invalidate('failed', getReadKey(options));
				});
		}
		return getOrReadResponse;
	}

	function resourceFind(options: ResourceFindOptions<S>): ResourceFindResult<S> | undefined {
		const key = getFindKey(getFindOptions(options));
		if (isStatus('LOADING', key) || isStatus('FAILED', key)) {
			return undefined;
		}

		if (findMap.has(key)) {
			return findMap.get(key);
		}

		const response = find(getFindOptions(options), { put, get });
		if (isThenable(response)) {
			setStatus('LOADING', key);
			invalidate('loading', getFindKey(options));
			response.then(() => {
				clearStatus(key);
				invalidate('find', getFindKey(options));
				invalidate('loading', getFindKey(options));
			});
			return undefined;
		} else {
			return findMap.get(key);
		}
	}

	function resourceInit(options: T, requireDiff = false) {
		if (isTemplateWithInit(template)) {
			let reset = true;
			if (requireDiff) {
				reset = diffInitOptions(initOptions, options);
			}
			if (reset) {
				releaseResource();
				template.init(options, { put, get });
				invalidateAll();
			}
		} else {
			releaseResource();
		}
		initOptions = options;
	}

	function meta(options: ResourceOptions<S>, request = false) {
		if (request) {
			getOrRead(options);
		}
		return metaMap.get(getMetaKey(options));
	}

	function destroy(id: string) {
		releaseResource();
		Object.keys(invalidatorMaps).forEach((key) => {
			invalidatorMaps[key as SubscriptionType].clear();
		});
		if (initOptions) {
			const resourceMap = templateToResourceMap.get(template);
			if (resourceMap) {
				resourceMap.delete(`${id}/${initOptions.id}`);
			}
		}
		templateToResourceMap.get(template);
	}

	return {
		find: resourceFind,
		getOrRead,
		init: resourceInit,
		meta,
		subscribeMeta,
		subscribeRead,
		subscribeFind,
		subscribeFailed,
		subscribeLoading,
		unsubscribe,
		isLoading,
		isFailed,
		destroy
	};
}

const optionInvalidatorMap = new Map<any, Set<Invalidator>>();
const templateToResourceMap = new Map<ResourceTemplate<any>, Map<string, Resource<any>>>();
const idToResourceMap = new Map<string, Set<{ resource: Resource<any>; type: 'owner' | 'subscribed' }>>();

function createOptionsWrapper(): Options<any> {
	let options: ResourceOptions<any> = {
		page: 1,
		size: 30,
		query: {}
	};

	function invalidate() {
		const invalidatorSet = optionInvalidatorMap.get(setOptions) || [];
		[...invalidatorSet].forEach((invalidator) => {
			invalidator();
		});
	}

	function setOptions(newOptions?: Partial<ResourceOptions<any>>): ResourceOptions<any> {
		if (newOptions) {
			const calculatedOptions = { ...options, ...newOptions };
			const { changed } = auto(options, calculatedOptions, 2);
			if (changed) {
				options = calculatedOptions;
				invalidate();
			}
		}
		return options;
	}
	setOptions.options = setOptions;
	return setOptions;
}

function isTemplate(value: any): value is ResourceTemplate<any> {
	return Boolean(value && typeof value.read === 'function');
}

function isResource(value: any): value is ResourceTemplateWrapper {
	return Boolean(value && !!value.id);
}

function getResource(templateWrapper: ResourceTemplateWrapper, id: string): Resource<any>;
function getResource(template: ResourceTemplate<any>, id: string, init?: any): Resource<any>;
function getResource(
	templateOrWrapper: ResourceTemplateWrapper | ResourceTemplate<any>,
	id: string,
	init?: any
): Resource<any> {
	const templateId = (isResource(templateOrWrapper) ? templateOrWrapper.id : init && `${id}/${init.id}`) || 'global';
	const template = isResource(templateOrWrapper) ? templateOrWrapper.template : templateOrWrapper;
	const initOptions = isResource(templateOrWrapper) ? templateOrWrapper.initOptions : init;
	const resourceMap = templateToResourceMap.get(template) || new Map<string, Resource<any>>();
	let resource = resourceMap.get(templateId);
	const registeredResources =
		idToResourceMap.get(id) || new Set<{ resource: Resource<any>; type: 'owner' | 'subscribed' }>();
	if (!resource) {
		resource = createResource(template, initOptions);
		resourceMap.set(templateId, resource);
		templateToResourceMap.set(template, resourceMap);
		const ownerId = templateId.substring(0, templateId.indexOf('/'));
		const isOwner = ownerId === id;
		if (!isOwner) {
			const ownerResources =
				idToResourceMap.get(ownerId) || new Set<{ resource: Resource<any>; type: 'owner' | 'subscribed' }>();
			ownerResources.add({ resource, type: 'owner' });
			idToResourceMap.set(ownerId, ownerResources);
		}
		registeredResources.add({ resource, type: isOwner ? 'owner' : 'subscribed' });
	} else {
		if (init) {
			resource.init(init, true);
		}
		registeredResources.add({ resource, type: 'subscribed' });
	}
	idToResourceMap.set(id, registeredResources);
	return resource;
}

const factory = create({ diffProperty, invalidator, destroy });

const resourceMiddlewareFactory = factory(
	({ id: middlewareId, middleware: { diffProperty, invalidator, destroy } }): ResourceMiddleware => {
		const middleware = function(resource: any) {
			if (isTemplate(resource.template)) {
				let { template, transform, initOptions, ...rest } = resource;
				return {
					template: {
						template,
						transform,
						id: initOptions ? `${middlewareId}/${initOptions.id}` : 'global',
						initOptions
					},
					...rest
				};
			}
			return resource;
		};
		const optionsMap = new Map<string, Options<any>>();
		destroy(() => {
			const resources = idToResourceMap.get(middlewareId);
			if (resources) {
				resources.forEach((resource) => {
					if (resource.type === 'subscribed') {
						resource.resource.unsubscribe(invalidator);
					} else {
						resource.resource.destroy(middlewareId);
					}
				});
			}
			idToResourceMap.delete(middlewareId);
		});
		diffProperty(
			'resource',
			(): ResourceMiddlewareProperties<any> => {
				return {} as any;
			},
			(
				{ resource: currentProp }: { resource: ResourceProperty<any> | ResourceTemplateWrapper },
				{ resource: nextProp }: { resource: ResourceProperty<any> | ResourceTemplateWrapper }
			) => {
				if (!nextProp || !nextProp.template) {
					return middleware({
						template: createResourceTemplate(),
						initOptions: { data: [], id: '' },
						...nextProp
					});
				}

				const next = nextProp && middleware(nextProp);
				const current = currentProp && middleware(currentProp);
				if (current && next) {
					const id = next.template.id || 'global';
					const {
						template: { initOptions: currentInitOptions }
					} = current;
					const {
						template: { initOptions: nextInitOptions }
					} = next;
					if (nextInitOptions) {
						const changed = diffInitOptions(currentInitOptions || {}, nextInitOptions);
						if (changed) {
							const resourceMap = templateToResourceMap.get(next.template.template);
							if (resourceMap) {
								const resource = resourceMap.get(id);
								if (resource) {
									resource.init(nextInitOptions);
									invalidator();
								}
							}
						}
					}
					const nextOptions = next.options;
					const currOptions = current.options;
					if (currOptions && currOptions !== nextOptions) {
						const invalidatorSet = optionInvalidatorMap.get(currOptions.options);
						if (invalidatorSet) {
							invalidatorSet.delete(invalidator);
							invalidator();
						}
					}
				} else if (next) {
					const id = next.template.id || 'global';
					const resourceMap = templateToResourceMap.get(next.template.template);
					const {
						template: { initOptions }
					} = next;
					if (resourceMap && initOptions) {
						const resource = resourceMap.get(id);
						if (resource) {
							resource.init(initOptions);
						}
					}
				}
				if (next) {
					const nextOptions = next.options;
					const currOptions = current && current.options;
					if (nextOptions) {
						const options: any = (options?: Partial<ResourceOptions<any>>) => {
							const invalidatorSet = optionInvalidatorMap.get(nextOptions.options) || new Set();
							invalidatorSet.add(invalidator);
							optionInvalidatorMap.set(nextOptions.options, invalidatorSet);
							return nextOptions.options(options);
						};
						options.options = nextOptions.options;
						if (!currOptions || currOptions.options !== nextOptions.options) {
							invalidator();
						}
						return {
							options,
							template: next.template
						} as any;
					}
				}

				return next;
			}
		);

		middleware.createOptions = (key: string): Options<any> => {
			const options = optionsMap.get(key);
			if (options) {
				return options;
			}
			const optionsWrapper = createOptionsWrapper();
			function setOptions(options?: Partial<ResourceOptions<any>>) {
				const invalidatorSet = optionInvalidatorMap.get(optionsWrapper.options) || new Set();
				invalidatorSet.add(invalidator);
				optionInvalidatorMap.set(optionsWrapper.options, invalidatorSet);
				return optionsWrapper(options);
			}
			setOptions.options = optionsWrapper.options;
			optionsMap.set(key, setOptions);
			return setOptions;
		};
		middleware.getOrRead = (template: any, options: any, init?: any) => {
			const resource = getResource(template, middlewareId, init);
			const transform = !isTemplate(template) && template.transform;
			const resourceOptions = transformOptions(options, transform);
			resource.subscribeRead(invalidator, options);
			const data = resource.getOrRead(resourceOptions);
			if (data && transform) {
				return data.map((items: any) => {
					if (items) {
						return items.map((item: any) => transformData(item, transform));
					}
					return items;
				});
			}
			return data;
		};
		middleware.find = (template: any, options: any, init?: any) => {
			const resource = getResource(template, middlewareId, init);
			const transform = !isTemplate(template) && template.transform;
			const findOptions = transformOptions(options, transform);
			resource.subscribeFind(invalidator, findOptions);
			const result = resource.find(findOptions);
			if (result && result.item && transform) {
				result.item = transformData(result.item, transform);
			}
			return result;
		};

		middleware.meta = (template: any, options: any, request = false, init?: any) => {
			const resource = getResource(template, middlewareId, init);
			const transform = !isTemplate(template) && template.transform;
			const resourceOptions = transformOptions(options, transform);
			resource.subscribeMeta(invalidator, resourceOptions);
			if (request) {
				resource.subscribeRead(invalidator, resourceOptions);
			}
			return resource.meta(resourceOptions, request);
		};
		middleware.isLoading = (template: any, options: any, init?: any) => {
			const resource = getResource(template, middlewareId, init);
			const transform = !isTemplate(template) && template.transform;
			const resourceOptions = transformOptions(options, transform);
			resource.subscribeLoading(invalidator, resourceOptions);
			return resource.isLoading(resourceOptions);
		};
		middleware.isFailed = (template: any, options: any, init?: any) => {
			const resource = getResource(template, middlewareId, init);
			const transform = !isTemplate(template) && template.transform;
			const resourceOptions = transformOptions(options, transform);
			resource.subscribeFailed(invalidator, resourceOptions);
			return resource.isFailed(resourceOptions);
		};
		return middleware;
	}
);

export function createResourceMiddleware<MIDDLEWARE = void>() {
	return resourceMiddlewareFactory.withType<
		ResourceMiddleware<MIDDLEWARE>,
		MIDDLEWARE extends void ? {} : ResourceMiddlewareProperties<MIDDLEWARE>
	>();
}
