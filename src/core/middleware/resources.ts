import { create, invalidator, destroy, diffProperty } from '../vdom';
import { Invalidator } from '../interfaces';
import { isThenable } from '../../shim/Promise';
import Set from '../../shim/Set';
import { auto } from '../diff';
import has from '../has';

type SubscriptionType = 'data' | 'meta' | 'loading' | 'failed' | 'find';
type InvalidatorMaps = { [key in SubscriptionType]: Map<string, Set<Invalidator>> };
type StatusType = 'LOADING' | 'FAILED';
type FindType = 'exact' | 'contains' | 'start';
type ResourceWrapperType = 'WRAPPER';
type ResourceTemplateType = 'TEMPLATE';

export type ResourceQuery<S> = { [P in keyof S]?: any };

export interface ResourceFilter<S> {
	(query: ResourceQuery<S>, v: S, type?: FindType): boolean;
}

export interface ResourceGetOrReadOptions<S> {
	page: number | number[];
	query: ResourceQuery<S>;
	size: number;
}

export interface ResourceFindOptions<S> {
	query: ResourceQuery<S>;
	start: number;
	type?: FindType;
}

export interface ResourceFindResponse<S> {
	item: S;
	page: number;
	index: number;
	pageIndex: number;
}

export interface OptionsWrapper<S> {
	options(invalidator: Invalidator, options?: ResourceGetOrReadOptions<S>): ResourceGetOrReadOptions<S>;
}

export interface Resource<S = {}> {
	find(
		options: ResourceGetOrReadOptions<S>,
		findOptions: ResourceFindOptions<S>
	): ResourceFindResponse<S> | undefined;
	getOrRead(options: ResourceGetOrReadOptions<S>): (undefined | S[])[];
	meta(options: ResourceGetOrReadOptions<S>, read: boolean): ResourceMeta<S> | undefined;
	isLoading(options: ResourceGetOrReadOptions<S>, findOptions?: ResourceFindOptions<S>): boolean;
	isFailed(options: ResourceGetOrReadOptions<S>): boolean;
	subscribe(
		type: 'find',
		options: ResourceGetOrReadOptions<S>,
		findOptions: ResourceFindOptions<S>,
		invalidator: Invalidator
	): void;
	subscribe(
		type: 'data' | 'meta' | 'loading' | 'failed',
		options: ResourceGetOrReadOptions<S>,
		invalidator: Invalidator
	): void;
	unsubscribe(invalidator: Invalidator): void;
	set(data?: S[]): void;
}

export interface ResourceReadOptions<S> {
	offset: number;
	page: number;
	size: number;
	query: ResourceQuery<S>;
}

export interface ResourceControls<S> {
	get: Getter<S>;
	put: Putter<S>;
}

export type Putter<S> = (resourceResponse: ResourceResponse<S>, options: ResourceResponseOptions<S>) => void;

export type Getter<S> = () => ResourceResponse<S>;

export type ResourceResponse<S> = { data: S[]; total: number };

export type ResourceResponseOptions<S> = { size: number; query: ResourceQuery<S>; offset: number };

export type ResourceRead<S> = (options: ResourceReadOptions<S>, controls: ResourceControls<S>) => void | Promise<void>;

export interface ResourceFind<S> {
	(options: ResourceGetOrReadOptions<S>, findOptions: ResourceFindOptions<S>, controls: ResourceControls<S>):
		| ResourceFindResponse<S>
		| Promise<ResourceFindResponse<S>>
		| undefined;
}

export type ResourceInit<S> = (data: S[], controls: ResourceControls<S>) => void;

export interface ResourceTemplate<S = {}, T = {}> {
	read: ResourceRead<S>;
	init?: ResourceInit<S>;
	find?: ResourceFind<S>;
}

export type TransformConfig<T, S = void> = { [P in keyof T]: S extends void ? string : keyof S };

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
	read: ResourceRead<S>;
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

export interface ResourceMiddlewareProperties<T> {
	resource: ResourceWithTemplate<T> | ResourceWrapper<T>;
}

export interface ResourceMeta<S> {
	page: number | number[];
	size: number;
	total: number | undefined;
	query: ResourceQuery<S>;
}

export interface ResourceMiddleware<T> {
	getOrRead(options: ResourceGetOrReadOptions<T>): (T[] | undefined)[];
	find(
		options: ResourceGetOrReadOptions<T>,
		findOptions: ResourceFindOptions<T>
	): ResourceFindResponse<T> | undefined;
	meta(options: ResourceGetOrReadOptions<T>, read?: boolean): ResourceMeta<T> | undefined;
	options(newOptions?: Partial<ResourceGetOrReadOptions<T>>): ResourceGetOrReadOptions<T>;
	isLoading(options: ResourceGetOrReadOptions<T>, findOptions?: ResourceFindOptions<T>): boolean;
	isFailed(options: ResourceGetOrReadOptions<T>): boolean;
	resource: ResourceWrapper<T, T>;
	shared(): ResourceWrapper<T, T>;
}

export interface ResourceMiddlewareOptions<T> {
	reset?: boolean;
	override?: {
		resource: ResourceWithTemplate<T>;
		key: string;
	};
}

function getMetaKey({ query, size }: ResourceGetOrReadOptions<any>) {
	return `size-${size}-query-${JSON.stringify(query)}`;
}

function getFindKey(options: Required<ResourceGetOrReadOptions<any>>, findOptions: ResourceFindOptions<any>) {
	return `size-${options.size}-query-${JSON.stringify(options.query)}-find-options-${JSON.stringify(findOptions)}`;
}

function getKey({ page, size, query }: Required<ResourceGetOrReadOptions<any>>): string {
	return `page-${JSON.stringify(page)}-size-${size}-query-${JSON.stringify(query)}`;
}

function getDataKey({ query }: ResourceResponseOptions<any> | ResourceGetOrReadOptions<any>): string {
	return `${JSON.stringify(query)}`;
}

function getFindOptions(options: ResourceFindOptions<any>) {
	const { type = 'contains', start, query } = options;
	return { type, start, query };
}

function isTemplate(resource: any): resource is ResourceWithTemplate<any> {
	return resource && resource.type === 'TEMPLATE';
}

function isWrapper(resource: any): resource is ResourceWrapper<any> {
	return resource && resource.type === 'WRAPPER';
}

function createOptionsWrapper(): OptionsWrapper<any> {
	let options: ResourceGetOrReadOptions<any> = {
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
		options(
			invalidator: Invalidator,
			newOptions?: Partial<ResourceGetOrReadOptions<any>>
		): ResourceGetOrReadOptions<any> {
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

function transformOptions<T extends ResourceGetOrReadOptions<any>>(
	options: T,
	transformConfig?: TransformConfig<any>
): T {
	if (options.query && transformConfig) {
		const query = transformQuery(options.query, transformConfig);
		return { ...options, query };
	}
	return options;
}

function defaultInit(data: any[], { put }: ResourceControls<any>) {
	put({ data, total: data.length }, { size: 30, query: {}, offset: 0 });
}

function createResource<S = never>(template: ResourceTemplate<S>, data: S[] = []): Resource<S> {
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

	function get() {
		const dataKey = getDataKey({ page: 1, size: 30, query: {} });
		const data = dataMap.get(dataKey) || [];
		return { data, total: data.length };
	}

	function put(response: ResourceResponse<S>, options: ResourceResponseOptions<S>) {
		setData(response, options);
	}

	init(data, {
		put,
		get
	});

	function invalidate(
		types: ['find'],
		options: ResourceGetOrReadOptions<S>,
		findOptions: ResourceFindOptions<S>
	): void;
	function invalidate(types: ('data' | 'meta' | 'loading' | 'failed')[], options: ResourceGetOrReadOptions<S>): void;
	function invalidate(
		types: SubscriptionType[],
		options: ResourceGetOrReadOptions<S>,
		findOptions?: ResourceFindOptions<S>
	) {
		types.forEach((type) => {
			let key = getKey(options);
			if (findOptions) {
				key = getFindKey(options, findOptions);
			}
			const keyedInvalidatorMap = invalidatorMaps[type];
			const invalidatorSet = keyedInvalidatorMap.get(key);
			if (invalidatorSet) {
				[...invalidatorSet].forEach((invalidator) => {
					invalidator();
				});
			}
		});
	}

	function subscribe(
		type: 'find',
		options: ResourceGetOrReadOptions<S>,
		findOptions: ResourceFindOptions<S>,
		invalidator: Invalidator
	): void;
	function subscribe(
		type: 'data' | 'meta' | 'loading' | 'failed',
		options: ResourceGetOrReadOptions<S>,
		invalidator: Invalidator
	): void;
	function subscribe(
		type: SubscriptionType,
		options: ResourceGetOrReadOptions<S>,
		findOptionsOrInvalidator: ResourceFindOptions<S> | Invalidator,
		invalidator?: Invalidator
	) {
		let invalidate: Invalidator;
		let key = getKey(options);
		if (typeof findOptionsOrInvalidator === 'function') {
			invalidate = findOptionsOrInvalidator;
		} else {
			key = getFindKey(options, findOptionsOrInvalidator);
			invalidate = invalidator!;
		}
		const keyedInvalidatorMap = invalidatorMaps[type];
		const invalidatorSet = keyedInvalidatorMap.get(key) || new Set<Invalidator>();

		invalidatorSet.add(invalidate);
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

	function isLoading(options: ResourceGetOrReadOptions<S>, findOptions?: ResourceFindOptions<S>) {
		const key = findOptions ? getFindKey(options, getFindOptions(findOptions)) : getKey(options);
		return isStatus('LOADING', key);
	}

	function isFailed(options: ResourceGetOrReadOptions<S>) {
		const key = getKey(options);
		return isStatus('FAILED', key);
	}

	function setMeta(options: ResourceGetOrReadOptions<S>, total: number) {
		const metaKey = getMetaKey(options);

		let pages: number[] = [];
		const noOfPages = Math.ceil(total / options.size);
		for (let i = 0; i < noOfPages; i++) {
			pages.push(i + 1);
		}

		let meta = metaMap.get(metaKey);
		if (!meta) {
			meta = { ...options, total };
		} else {
			meta.total = total;
			meta.page = options.page;
		}
		metaMap.set(metaKey, meta);
	}

	function setData(response: ResourceResponse<S>, options: ResourceResponseOptions<S>) {
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
		setMeta({ size, query, page: Math.floor(offset / size) }, total);
		invalidate(['data', 'meta', 'loading'], { size, query, page: Math.floor(offset / size) });
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

	function getOrRead(options: ResourceGetOrReadOptions<S>): (undefined | S[])[] {
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
				{ offset, size, query, page },
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

	function resourceFind(
		options: ResourceGetOrReadOptions<S>,
		findOptions: ResourceFindOptions<S>
	): ResourceFindResponse<S> | undefined {
		const key = getFindKey(options, getFindOptions(findOptions));
		if (find) {
			if (isStatus('LOADING', key) || isStatus('FAILED', key)) {
				return undefined;
			}

			if (findMap.has(key)) {
				return findMap.get(key);
			}

			const response = find(options, getFindOptions(findOptions), { put, get });
			if (isThenable(response)) {
				setStatus('LOADING', key);
				response.then((result) => {
					clearStatus(key);
					invalidate(['find'], options, findOptions);
					findMap.set(key, result);
				});
				return undefined;
			} else {
				findMap.set(key, response);
				return response;
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

	function meta(options: ResourceGetOrReadOptions<S>, read = false) {
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

export function createMemoryResourceTemplate<S = void>(
	{ filter = defaultFilter, init }: { filter?: ResourceFilter<S>; init?: ResourceInit<S> } = {
		filter: defaultFilter
	}
): ResourceTemplateFactory<S> {
	return createResourceTemplate({
		init,
		read: (options, { get, put }) => {
			const { data } = get();
			const filteredData =
				filter && options.query ? data.filter((i) => filter(options.query, i, 'contains')) : data;
			put({ data: filteredData, total: filteredData.length }, options);
		},
		find: (options, findOptions, { get }) => {
			const { query, size } = options;
			const { type } = findOptions;
			const { data } = get();
			const filteredData = data.filter((item) => defaultFilter(query, item));
			let found: ResourceFindResponse<any> | undefined;
			for (let i = 0; i < filteredData.length; i++) {
				const item = filteredData[i];
				if (defaultFilter(findOptions.query, item, type)) {
					found = {
						item,
						index: i,
						page: Math.floor(i / size) + 1,
						pageIndex: i % size
					};
					if (i >= findOptions.start) {
						break;
					}
				}
			}
			return found;
		}
	});
}

export function createResourceTemplate<S = void>(
	resourceTemplate: ResourceTemplate<S> = createMemoryResourceTemplate<S>()
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
	resourceTemplateFactory.read = resourceTemplate.read;
	return resourceTemplateFactory;
}

export function createResourceMiddleware<T = never>() {
	const factory = create({ invalidator, destroy, diffProperty }).properties<ResourceMiddlewareProperties<T>>();

	return factory(({ middleware: { invalidator, destroy, diffProperty }, properties }) => {
		const resourceWrapperMap = new Map<ResourceTemplate<any, any>, ResourceWrapper<any, any>>();
		const optionsWrapperMap = new Map<Resource, Map<string, OptionsWrapper<any>>>();
		const overrideResourceWrapperMap = new Map<string, { wrapper: ResourceWrapper<T, T>; data?: T[] }>();
		destroy(() => {
			[...resourceWrapperMap.values()].forEach((resource) => {
				resource.resource.unsubscribe(invalidator);
			});
			[...overrideResourceWrapperMap.values()].forEach(({ wrapper }) => {
				wrapper.resource.unsubscribe(invalidator);
			});
			[...optionsWrapperMap.keys()].forEach((resource) => {
				resource.unsubscribe(invalidator);
			});
			resourceWrapperMap.clear();
			overrideResourceWrapperMap.clear();
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
				const { override } = resourceMiddlewareOptions;
				if (override) {
					const overrideWrapper = overrideResourceWrapperMap.get(override.key);
					if (!overrideWrapper) {
						const wrapper = createResourceWrapper(
							createResource(override.resource.template, override.resource.data),
							override.resource.transform
						);
						overrideResourceWrapperMap.set(override.key, {
							wrapper,
							data: override.resource.data
						});
						return wrapper;
					}
					if (auto(override.resource.data, overrideWrapper.data).changed) {
						overrideWrapper.data = override.resource.data;
						overrideWrapper.wrapper.resource.set(override.resource.data);
					}
					return overrideWrapper.wrapper;
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

			function getOrRead(options: ResourceGetOrReadOptions<T>): (undefined | T[])[] {
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
				find(options: ResourceGetOrReadOptions<T>, findOptions: ResourceFindOptions<T>) {
					const { resource, transform } = getResource();
					const resourceOptions = transformOptions(options, transform);
					if (transform) {
						findOptions.query = transformQuery(findOptions.query, transform);
					}
					resource.subscribe('find', resourceOptions, findOptions, invalidator);
					const result = resource.find(resourceOptions, findOptions);
					if (result && result.item && transform) {
						result.item = transformData(result.item, transform);
					}
					return result;
				},
				meta(options: ResourceGetOrReadOptions<T>, read = false) {
					const { resource, transform } = getResource();
					const resourceOptions = transformOptions(options, transform);
					if (read) {
						resource.subscribe('meta', resourceOptions, invalidator);
					}
					return resource.meta(resourceOptions, read);
				},
				getOrRead,
				isLoading(options: ResourceGetOrReadOptions<T>, findOptions?: ResourceFindOptions<T>) {
					const { resource, transform } = getResource();
					const resourceOptions = transformOptions(options, transform);
					if (transform && findOptions) {
						findOptions.query = transformQuery(findOptions.query, transform);
					}
					resource.subscribe('loading', resourceOptions, invalidator);
					return resource.isLoading(resourceOptions, findOptions);
				},
				isFailed(options: ResourceGetOrReadOptions<T>) {
					const { resource, transform } = getResource();
					const resourceOptions = transformOptions(options, transform);
					resource.subscribe('failed', resourceOptions, invalidator);
					return resource.isFailed(resourceOptions);
				},
				options(newOptions?: ResourceGetOrReadOptions<T>) {
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
