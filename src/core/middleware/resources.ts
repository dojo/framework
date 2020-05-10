import { create, invalidator, destroy, diffProperty } from '../vdom';
import { Invalidator } from '../interfaces';
import { isThenable } from '../../shim/Promise';
import Set from '../../shim/Set';
import { auto } from '../diff';
import has from '../has';

// General Resource Types
type SubscriptionType = 'data' | 'meta' | 'loading' | 'failed' | 'find';
type InvalidatorMaps = { [key in SubscriptionType]: Map<string, Set<Invalidator>> };
type StatusType = 'LOADING' | 'FAILED';
type FindType = 'exact' | 'contains' | 'start';
type ResourceWrapperType = 'WRAPPER';
type ResourceTemplateType = 'TEMPLATE';
export type ResourceQuery<S> = { [P in keyof S]?: any };
export type TransformConfig<T, S = void> = { [P in keyof T]: S extends void ? string : keyof S };

// Resource Middleware Interfaces
export interface ResourceOptions<S> {
	page: number | number[];
	query: ResourceQuery<S>;
	size: number;
}
export interface ResourceFindOptions<S> {
	options: ResourceOptions<S>;
	query: ResourceQuery<S>;
	start: number;
	type?: FindType;
}
export interface ResourceFindResult<S> {
	item: S;
	page: number;
	index: number;
	pageIndex: number;
}
export interface ResourceMiddleware<T> {
	getOrRead(options: ResourceOptions<T>): (T[] | undefined)[];
	find(options: ResourceFindOptions<T>): ResourceFindResult<T> | undefined;
	meta(options: ResourceOptions<T>, read?: boolean): ResourceMeta<T> | undefined;
	options(newOptions?: Partial<ResourceOptions<T>>): ResourceOptions<T>;
	isLoading(options: ResourceOptions<T> | ResourceFindOptions<T>): boolean;
	isFailed(options: ResourceOptions<T>): boolean;
	resource: ResourceWrapper<T, T>;
	shared(): ResourceWrapper<T, T>;
}

export interface ResourceMiddlewareOptions<T> {
	reset?: boolean;
	resource?: {
		template: ResourceWithTemplate<T>;
		key: string;
	};
}

// Resource Template Interfaces
export interface ResourceReadRequest<S> {
	offset: number;
	size: number;
	query: ResourceQuery<S>;
}
export interface ResourceReadResponse<S> {
	data: S[];
	total: number;
}
export interface ResourceFindRequest<S> {
	options: ResourceOptions<S>;
	query: ResourceQuery<S>;
	start: number;
	type: FindType;
}
export interface ResourceFindResponse<S> {
	item: S;
	page: number;
	index: number;
	pageIndex: number;
}
export interface ResourceGet<S> {
	(request?: ResourceReadRequest<S>): ResourceReadResponse<S>;
}
export interface ResourcePut<S> {
	(readResponse: ResourceReadResponse<S>, readRequest: ResourceReadRequest<S>): void;
	(findResponse: ResourceFindResponse<S> | undefined, findRequest: ResourceFindRequest<S>): void;
}
export interface ResourceControls<S> {
	get: ResourceGet<S>;
	put: ResourcePut<S>;
}
export interface ResourceRead<S> {
	(request: ResourceReadRequest<S>, controls: ResourceControls<S>): void | Promise<void>;
}
export interface ResourceFind<S> {
	(options: ResourceFindRequest<S>, controls: ResourceControls<S>): void | Promise<void>;
}
export interface ResourceInit<S> {
	(data: S[], controls: ResourceControls<S>): void;
}
export interface ResourceTemplate<S = {}, T = {}> {
	read: ResourceRead<S>;
	init?: ResourceInit<S>;
	find?: ResourceFind<S>;
}

export interface ResourceTemplateFactory<S = {}, T = {}> {
	(options?: { data?: S[] }): {
		template: ResourceTemplate<S, T>;
		transform?: any;
		data?: S[];
		type: 'TEMPLATE';
	};
	<T>(options: { transform: TransformConfig<T, S>; data?: S[] }): {
		template: ResourceTemplate<any, any>;
		transform: TransformConfig<T, S>;
		data?: S[];
		type: ResourceTemplateType;
	};
}

// Resource Types
export interface OptionsWrapper<S> {
	options(invalidator: Invalidator, options?: ResourceOptions<S>): ResourceOptions<S>;
}

export interface ResourceWrapper<T, R = {}> {
	resource: Resource<R>;
	transform?: TransformConfig<T, any>;
	createOptionsWrapper(): OptionsWrapper<T>;
	type: ResourceWrapperType;
}

export type ResourceWithTemplate<T> = T extends infer R
	? {
			template: ResourceTemplate<R, T>;
			transform?: TransformConfig<T, any>;
			data?: any[];
			type: ResourceTemplateType;
	  }
	: any;

export interface ResourceMeta<S> {
	page: number | number[];
	size: number;
	total: number | undefined;
	query: ResourceQuery<S>;
}

export interface Resource<S = {}> {
	find(options: ResourceFindOptions<S>): ResourceFindResult<S> | undefined;
	getOrRead(options: ResourceOptions<S>): (undefined | S[])[];
	meta(options: ResourceOptions<S>, read: boolean): ResourceMeta<S> | undefined;
	isLoading(options: ResourceOptions<S> | ResourceFindOptions<S>): boolean;
	isFailed(options: ResourceOptions<S>): boolean;
	subscribe(type: 'find', options: ResourceFindOptions<S>, invalidator: Invalidator): void;
	subscribe(
		type: 'data' | 'meta' | 'loading' | 'failed',
		options: ResourceOptions<S>,
		invalidator: Invalidator
	): void;
	subscribe(
		type: 'loading' | 'failed',
		options: ResourceOptions<S> | ResourceFindOptions<S>,
		invalidator: Invalidator
	): void;
	unsubscribe(invalidator: Invalidator): void;
	set(data?: S[]): void;
}

export interface ResourceMiddlewareProperties<T> {
	resource: ResourceWithTemplate<T> | ResourceWrapper<T>;
}

function getMetaKey({ query, size }: ResourceOptions<any>) {
	return `size-${size}-query-${JSON.stringify(query)}`;
}

function getFindKey(findOptions: ResourceFindOptions<any>) {
	const { options, ...find } = getFindOptions(findOptions);
	return `size-${options.size}-query-${JSON.stringify(options.query)}-find-${JSON.stringify(find)}`;
}

function getKey({ page, size, query }: ResourceOptions<any>): string {
	return `page-${JSON.stringify(page)}-size-${size}-query-${JSON.stringify(query)}`;
}

function getDataKey({ query }: ResourceOptions<any> | ResourceReadRequest<any>): string {
	return `${JSON.stringify(query)}`;
}

function getFindOptions(findOptions: ResourceFindOptions<any>) {
	const { type = 'contains', start, query, options } = findOptions;
	return { type, start, query, options };
}

function isTemplate(resource: any): resource is ResourceWithTemplate<any> {
	return resource && resource.type === 'TEMPLATE';
}

function isWrapper(resource: any): resource is ResourceWrapper<any> {
	return resource && resource.type === 'WRAPPER';
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

function createOptionsWrapper(): OptionsWrapper<any> {
	let options: ResourceOptions<any> = {
		page: 1,
		size: 30,
		query: {}
	};

	const invalidatorSet = new Set<Invalidator>();

	function invalidate() {
		[...invalidatorSet].forEach((invalidator) => {
			invalidator();
		});
	}

	return {
		options(invalidator: Invalidator, newOptions?: Partial<ResourceOptions<any>>): ResourceOptions<any> {
			invalidatorSet.add(invalidator);
			if (newOptions) {
				const calculatedOptions = { ...options, ...newOptions };
				const changed =
					auto(options.query, newOptions.query).changed ||
					auto(options.page, calculatedOptions.page).changed ||
					options.size !== calculatedOptions.size;
				if (changed) {
					options = { ...options, ...newOptions };
					invalidate();
				}
			}
			return options;
		}
	};
}

function createResourceWrapper(
	resource: Resource<any>,
	transform?: any,
	options?: OptionsWrapper<any>
): ResourceWrapper<any, any> {
	return {
		resource,
		transform,
		createOptionsWrapper: options ? () => options : createOptionsWrapper,
		type: 'WRAPPER'
	};
}

function transformData<T>(item: any, transformConfig: TransformConfig<T>) {
	let transformedItem: Partial<T> = {};
	let sourceKeys: string[] = [];
	Object.keys(transformConfig).forEach((key: string) => {
		const sourceKey = transformConfig[key as keyof T];
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

function defaultInit(data: any[], { put }: ResourceControls<any>) {
	put({ data, total: data.length }, { size: 30, query: {}, offset: 0 });
}

function createResource<S = never>(template: ResourceTemplate<S>, data?: S[]): Resource<S> {
	const dataMap = new Map<string, S[]>();
	const metaMap = new Map<string, ResourceMeta<S>>();
	const statusMap = new Map<string, StatusType>();
	const findMap = new Map<string, any>();
	const requestPageMap = new Map<string, number[]>();
	const invalidatorMaps: InvalidatorMaps = {
		data: new Map<string, Set<Invalidator>>(),
		meta: new Map<string, Set<Invalidator>>(),
		loading: new Map<string, Set<Invalidator>>(),
		failed: new Map<string, Set<Invalidator>>(),
		find: new Map<string, Set<Invalidator>>()
	};
	const { read, init = defaultInit, find } = template;

	function get(options: ResourceReadRequest<S> = { offset: 0, size: 30, query: {} }) {
		const { size, query, offset } = options;
		const page = Math.floor(offset / size) + 1;
		const dataKey = getDataKey({ page, size, query });
		const data = dataMap.get(dataKey) || [];
		return { data, total: data.length };
	}

	function put(response: ResourceReadResponse<S>, request: ResourceReadRequest<S>): void;
	function put(response: ResourceFindResponse<S> | undefined, request: ResourceFindRequest<S>): void;
	function put(
		response: ResourceReadResponse<S> | ResourceFindResponse<S> | undefined,
		request: ResourceReadRequest<S> | ResourceFindRequest<S>
	) {
		if (isFindRequest(request) && isFindResponse(response)) {
			const key = getFindKey(request);
			findMap.set(key, response);
			clearStatus(key);
			invalidate(['find'], request);
		} else if (!isFindRequest(request) && !isFindResponse(response) && response) {
			setData(response, request);
		}
	}

	if (data) {
		init(data, {
			put,
			get
		});
	}

	function invalidate(types: SubscriptionType[], options: ResourceOptions<S> | ResourceFindOptions<S>) {
		types.forEach((type) => {
			const key = isFindOptions(options) ? getFindKey(options) : getKey(options);
			const keyedInvalidatorMap = invalidatorMaps[type];
			const invalidatorSet = keyedInvalidatorMap.get(key);
			if (invalidatorSet) {
				[...invalidatorSet].forEach((invalidator) => {
					invalidator();
				});
			}
		});
	}

	function subscribe(type: 'find', options: ResourceFindOptions<S>, invalidator: Invalidator): void;
	function subscribe(
		type: 'data' | 'meta' | 'loading' | 'failed',
		options: ResourceOptions<S>,
		invalidator: Invalidator
	): void;
	function subscribe(
		type: SubscriptionType,
		options: ResourceOptions<S> | ResourceFindOptions<S>,
		invalidator: Invalidator
	) {
		const key = isFindOptions(options) ? getFindKey(options) : getKey(options);
		const keyedInvalidatorMap = invalidatorMaps[type];
		const invalidatorSet = keyedInvalidatorMap.get(key) || new Set<Invalidator>();
		invalidatorSet.add(invalidator);
		keyedInvalidatorMap.set(key, invalidatorSet);
	}

	function unsubscribe(invalidator: Invalidator) {
		Object.keys(invalidatorMaps).forEach((type) => {
			const keyedInvalidatorMap = invalidatorMaps[type as SubscriptionType];

			const keys = keyedInvalidatorMap.keys();
			[...keys].forEach((key) => {
				const invalidatorSet = keyedInvalidatorMap.get(key);
				if (invalidatorSet && invalidatorSet.has(invalidator)) {
					invalidatorSet.delete(invalidator);
					keyedInvalidatorMap.set(key, invalidatorSet);
				}
			});
		});
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
		const key = isFindOptions(options) ? getFindKey(options) : getKey(options);
		return isStatus('LOADING', key);
	}

	function isFailed(options: ResourceOptions<S> | ResourceFindOptions<S>) {
		const key = isFindOptions(options) ? getFindKey(options) : getKey(options);
		return isStatus('FAILED', key);
	}

	function setMeta(options: ResourceOptions<S>, total: number) {
		const metaKey = getMetaKey(options);
		let meta = metaMap.get(metaKey);
		if (!meta) {
			meta = { ...options, total };
		} else {
			meta.page = options.page;
			if (!meta.total || total > meta.total) {
				meta.total = total;
			}
		}
		invalidate(['meta'], options);
		metaMap.set(metaKey, { ...meta });
	}

	function setData(response: ResourceReadResponse<S>, options: ResourceReadRequest<S>) {
		const { data, total } = response;
		const { size, offset, query } = options;
		const dataKey = getDataKey(options);
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
		setMeta({ size, query, page: Math.floor(offset / size) + 1 }, total);
		invalidate(['data'], { size, query, page: Math.floor(offset / size) });
		return cachedData.slice(offset, offset + size).filter(() => true);
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
		const requestKey = getKey(options);
		const promises: Promise<any>[] = [];

		for (let i = 0; i < pages.length; i++) {
			const page = pages[i];
			const offset = (page - 1) * size;
			const statusKey = getKey({ page, size, query });
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
				invalidate(['loading'], { size, page, query });
				response
					.then(() => {
						clearStatus(statusKey);
						invalidate(['data', 'loading', 'meta'], options);
					})
					.catch(() => {
						setStatus('FAILED', statusKey);
						invalidate(['failed', 'loading'], { size, page, query });
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
					invalidate(['data', 'loading', 'meta'], options);
				})
				.catch(() => {
					setStatus('FAILED', requestKey);
					invalidate(['failed', 'loading'], options);
				});
		}
		return getOrReadResponse;
	}

	function resourceFind(options: ResourceFindOptions<S>): ResourceFindResponse<S> | undefined {
		const key = getFindKey(getFindOptions(options));
		if (find) {
			if (isStatus('LOADING', key) || isStatus('FAILED', key)) {
				return undefined;
			}

			if (findMap.has(key)) {
				return findMap.get(key);
			}

			const response = find(getFindOptions(options), { put, get });
			if (isThenable(response)) {
				setStatus('LOADING', key);
				response.then(() => {
					clearStatus(key);
					invalidate(['find'], options);
				});
				return undefined;
			} else {
				return findMap.get(key);
			}
		}
		has('dojo-debug') && console.warn('Template does not implement `find` but is being used.');
		return undefined;
	}

	function set(data: S[] = []) {
		dataMap.clear();
		metaMap.clear();
		statusMap.clear();
		requestPageMap.clear();
		init(data, { get, put });
	}

	function meta(options: ResourceOptions<S>, read = false) {
		if (read) {
			getOrRead(options);
		}
		return metaMap.get(getMetaKey(options));
	}

	return {
		find: resourceFind,
		getOrRead,
		set,
		meta,
		subscribe,
		unsubscribe,
		isLoading,
		isFailed
	};
}

export function defaultFilter(query: ResourceQuery<any>, item: any, type: FindType = 'contains') {
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

const memoryTemplate: ResourceTemplate<any> = {
	read: (request, { get, put }) => {
		const { data } = get();
		const filteredData = request.query ? data.filter((i) => defaultFilter(request.query, i, 'contains')) : data;
		put({ data: filteredData, total: filteredData.length }, request);
	},
	find: (request, { get, put }) => {
		const { type, options } = request;
		const { query, size } = options;
		const { data } = get();
		const filteredData = data.filter((item) => defaultFilter(query, item));
		let found: ResourceFindResponse<any> | undefined;
		for (let i = 0; i < filteredData.length; i++) {
			const item = filteredData[i];
			if (defaultFilter(request.query, item, type)) {
				found = {
					item,
					index: i,
					page: Math.floor(i / size) + 1,
					pageIndex: i % size
				};
				if (i >= request.start) {
					break;
				}
			}
		}
		put(found, request);
	}
};

export function createMemoryResourceTemplate<S = void>(): ResourceTemplateFactory<S> {
	return createResourceTemplate();
}

export function createResourceTemplate<S = void>(
	resourceTemplate: ResourceTemplate<S> = memoryTemplate
): ResourceTemplateFactory<S> {
	const resourceTemplateFactory: any = (options: { transform?: TransformConfig<any, S>; data?: S[] } = {}) => {
		const { data, transform } = options;
		return {
			template: resourceTemplate,
			data,
			transform,
			type: 'TEMPLATE'
		};
	};
	return resourceTemplateFactory;
}

export function createResourceMiddleware<T = never>() {
	const factory = create({ invalidator, destroy, diffProperty }).properties<ResourceMiddlewareProperties<T>>();

	return factory(({ middleware: { invalidator, destroy, diffProperty }, properties }) => {
		const resourceWrapperMap = new Map<ResourceTemplate<any, any>, ResourceWrapper<any, any>>();
		const optionsWrapperMap = new Map<Resource, Map<string, OptionsWrapper<any>>>();
		const customResourceWrapperMap = new Map<string, { wrapper: ResourceWrapper<T, T>; data?: T[] }>();
		destroy(() => {
			[...resourceWrapperMap.values()].forEach((resource) => {
				resource.resource.unsubscribe(invalidator);
			});
			[...customResourceWrapperMap.values()].forEach(({ wrapper }) => {
				wrapper.resource.unsubscribe(invalidator);
			});
			[...optionsWrapperMap.keys()].forEach((resource) => {
				resource.unsubscribe(invalidator);
			});
			resourceWrapperMap.clear();
			customResourceWrapperMap.clear();
			optionsWrapperMap.clear();
		});

		diffProperty('resource', properties, ({ resource: currentResource }, { resource: nextResource }) => {
			if (isTemplate(nextResource)) {
				const current = isTemplate(currentResource) ? currentResource : ({} as ResourceWithTemplate<T>);
				const isWrapperCached = resourceWrapperMap.has(nextResource.template);
				let wrapper =
					resourceWrapperMap.get(nextResource.template) ||
					createResourceWrapper(
						createResource(nextResource.template, nextResource.data),
						nextResource.transform
					);
				const { changed } = auto(current.data, nextResource.data);
				if (current.template !== nextResource.template || changed) {
					resourceWrapperMap.delete(current.template);
					invalidator();
				}
				changed && isWrapperCached && wrapper.resource.set(nextResource.data);
				resourceWrapperMap.set(nextResource.template, wrapper);
				return wrapper as any;
			} else if (isWrapper(nextResource)) {
				if (
					(isWrapper(currentResource) && currentResource.resource !== nextResource.resource) ||
					!isWrapper(currentResource)
				) {
					invalidator();
				}
			}
		});
		return (resourceMiddlewareOptions: ResourceMiddlewareOptions<T> = {}): ResourceMiddleware<T> => {
			const { reset = false } = resourceMiddlewareOptions;
			function getResource() {
				const { resource } = resourceMiddlewareOptions;
				if (resource) {
					const resourceWrapper = customResourceWrapperMap.get(resource.key);
					if (!resourceWrapper) {
						const wrapper = createResourceWrapper(
							createResource(resource.template.template, resource.template.data),
							resource.template.transform
						);
						customResourceWrapperMap.set(resource.key, {
							wrapper,
							data: resource.template.data
						});
						return wrapper;
					}
					if (auto(resource.template.data, resourceWrapper.data).changed) {
						resourceWrapper.data = resource.template.data;
						resourceWrapper.wrapper.resource.set(resource.template.data);
					}
					return resourceWrapper.wrapper;
				}
				return properties().resource as ResourceWrapper<T, T>;
			}
			let resourceWrapper = getResource();
			if (reset) {
				resourceWrapper = createResourceWrapper(resourceWrapper.resource, resourceWrapper.transform);
			}

			let keyedCachedOptions = optionsWrapperMap.get(resourceWrapper.resource);
			if (!keyedCachedOptions) {
				keyedCachedOptions = new Map<string, OptionsWrapper<any>>();
			}

			let cachedOptions = keyedCachedOptions.get('default');
			let optionsWrapper: OptionsWrapper<any>;

			if (cachedOptions) {
				optionsWrapper = cachedOptions;
			} else {
				const newOptionsWrapper = resourceWrapper.createOptionsWrapper();
				keyedCachedOptions.set('default', newOptionsWrapper);
				optionsWrapperMap.set(resourceWrapper.resource, keyedCachedOptions);
				optionsWrapper = newOptionsWrapper;
			}

			function getOrRead(options: ResourceOptions<T>): (undefined | T[])[] {
				const { resource, transform } = getResource();
				const resourceOptions = transformOptions(options, transform);
				resource.subscribe('data', resourceOptions, invalidator);

				const data = resource.getOrRead(resourceOptions);

				if (data && transform) {
					return data.map((items: any) => items.map((item: any) => transformData(item, transform)));
				}
				return data;
			}

			return {
				find(options: ResourceFindOptions<T>) {
					const { resource, transform } = getResource();
					const findOptions = transformOptions(options, transform);
					resource.subscribe('find', findOptions, invalidator);
					const result = resource.find(findOptions);
					if (result && result.item && transform) {
						result.item = transformData(result.item, transform);
					}
					return result;
				},
				meta(options: ResourceOptions<T>, read = false) {
					const { resource, transform } = getResource();
					const resourceOptions = transformOptions(options, transform);
					if (read) {
						resource.subscribe('meta', resourceOptions, invalidator);
					}
					return resource.meta(resourceOptions, read);
				},
				getOrRead,
				isLoading(options: ResourceOptions<T> | ResourceFindOptions<T>) {
					const { resource, transform } = getResource();
					const resourceOptions = transformOptions(options, transform);
					resource.subscribe('loading', resourceOptions, invalidator);
					return resource.isLoading(resourceOptions);
				},
				isFailed<R extends ResourceOptions<T>>(options: R) {
					const { resource, transform } = getResource();
					const resourceOptions = transformOptions(options, transform);
					resource.subscribe('failed', resourceOptions, invalidator);
					return resource.isFailed(resourceOptions);
				},
				options(newOptions?: ResourceOptions<T>) {
					return optionsWrapper.options(invalidator, newOptions);
				},
				get resource() {
					return resourceWrapper;
				},
				shared(): ResourceWrapper<T, T> {
					const { resource, transform } = getResource();
					return createResourceWrapper(resource, transform, optionsWrapper);
				}
			};
		};
	});
}
