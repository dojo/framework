import Set from '../../shim/Set';
import Map from '../../shim/Map';
import { create, invalidator, diffProperty, destroy } from '../vdom';
import icache from './icache';
import { auto } from '../diff';

export interface ReadQuery {
	[index: string]: any;
}

export interface ReadRequest {
	offset: number;
	size: number;
	query: ReadQuery;
}

export interface ReadResponse<DATA> {
	data: DATA[];
	total?: number;
}

export interface Put<DATA> {
	(response: ReadResponse<DATA>, request: ReadRequest): void;
}

export interface TemplateControls<DATA> {
	put: Put<DATA>;
}

export interface TemplateRead<DATA> {
	(request: ReadRequest, controls: TemplateControls<DATA>): Promise<void> | void;
}

export interface Template<DATA> {
	idKey: keyof DATA;
	read: TemplateRead<DATA>;
}

export interface TemplateFactory<RESOURCE_DATA, OPTIONS> {
	(options: TemplateOptions<OPTIONS>): Template<RESOURCE_DATA>;
}

export interface TemplateWrapper<RESOURCE_DATA> {
	template: (options?: any) => Template<RESOURCE_DATA>;
	templateOptions?: any;
	transform?: TransformConfig<any, any>;
}

export interface TemplateWithOptions<RESOURCE_DATA> {
	template: TemplateWrapper<RESOURCE_DATA>;
	options: undefined;
}

export interface TemplateWithOptionsFactory<DATA, OPTIONS> {
	(options: TemplateOptions<OPTIONS>): TemplateWithOptions<DATA>;
}

export type TemplateOptions<OPTIONS> = { id: string } & OPTIONS;

export interface OptionSetter {
	(current: Partial<ReadOptionsData>, next: Partial<ReadOptionsData>): Partial<ReadOptionsData>;
}

export interface ReadOptions {
	(options?: Partial<ReadOptionsData>): ReadOptionsData;
}

type CacheStatus = 'pending' | 'orphaned' | 'resolved';

type RawCacheItem = {
	status: CacheStatus;
	value: any;
	mtime: number;
};

type IdMapData = { id: string; status: 'resolved' } | { id: null; status: 'orphaned' | 'pending' };

class RawCache {
	_subscriberCounter = 1;
	_rawCache = new Map<string, RawCacheItem>();
	_syntheticIdToIdMap = new Map<string, IdMapData>();
	_idToSyntheticIdMap = new Map<string, string>();
	_syntheticIdToSubscriberMap = new Map<string, Set<any>>();
	_subscriberMap = new Map<string, any>();
	subscribe(syntheticIds: string[], invalidator: any) {
		const subscriberId = `${this._subscriberCounter++}`;
		syntheticIds.forEach((syntheticId) => {
			let subscribers = this._syntheticIdToSubscriberMap.get(syntheticId);
			if (!subscribers) {
				subscribers = new Set();
			}
			subscribers.add(subscriberId);
			this._syntheticIdToSubscriberMap.set(syntheticId, subscribers);
		});
		this._subscriberMap.set(subscriberId, {
			syntheticIds,
			invalidator,
			refs: new Set(syntheticIds)
		});
	}
	notify(syntheticId: string) {
		const subscriberIds = this._syntheticIdToSubscriberMap.get(syntheticId);
		if (subscriberIds) {
			[...subscriberIds].forEach((subscriberId) => {
				const subscriber = this._subscriberMap.get(subscriberId);
				if (subscriber) {
					subscriber.refs.delete(syntheticId);
					if (subscriber.refs.size === 0) {
						subscriber.invalidator();
						this._subscriberMap.delete(subscriberId);
					}
					const subscribers = this._syntheticIdToSubscriberMap.get(syntheticId)!;
					subscribers.delete(subscriber);
					this._syntheticIdToSubscriberMap.set(syntheticId, subscribers);
				}
			});
		}
	}
	get(syntheticId: string): undefined | RawCacheItem {
		const idDetails = this._syntheticIdToIdMap.get(syntheticId);
		if (idDetails) {
			if (idDetails.status === 'resolved') {
				return this._rawCache.get(idDetails.id);
			}
			return {
				status: idDetails.status,
				mtime: Date.now(),
				value: undefined
			};
		}
	}
	addSyntheticId(syntheticId: string) {
		this._syntheticIdToIdMap.set(syntheticId, { id: null, status: 'pending' });
	}
	orphan(syntheticId: string) {
		this.notify(syntheticId);
		this._syntheticIdToIdMap.set(syntheticId, { id: null, status: 'orphaned' });
	}
	set(syntheticId: string, item: RawCacheItem, idKey: string) {
		const id = item.value[idKey];
		this._syntheticIdToIdMap.set(syntheticId, { id, status: 'resolved' });
		this._idToSyntheticIdMap.set(id, syntheticId);
		this._rawCache.set(id, item);
		this.notify(syntheticId);
	}
}

export function defaultFilter(query: ReadQuery, item: any, type: string = 'contains') {
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

export function createResourceTemplate<RESOURCE_DATA = void>(
	template: RESOURCE_DATA extends void ? void : Template<RESOURCE_DATA>
): {
	template: {
		template: () => Template<RESOURCE_DATA>;
		templateOptions: any;
	};
};
export function createResourceTemplate<RESOURCE_DATA, OPTIONS>(
	template: TemplateFactory<RESOURCE_DATA, OPTIONS>
): TemplateWithOptionsFactory<RESOURCE_DATA, OPTIONS>;
export function createResourceTemplate<RESOURCE_DATA>(
	idKey: keyof RESOURCE_DATA
): TemplateWithOptionsFactory<RESOURCE_DATA, { data: RESOURCE_DATA[] }>;
export function createResourceTemplate<RESOURCE_DATA>(template?: any): any {
	if (typeof template === 'function') {
		return (templateOptions: any) => {
			return {
				template: {
					template,
					templateOptions
				}
			};
		};
	}
	if (typeof template === 'string') {
		return createResourceTemplate<RESOURCE_DATA, { data: RESOURCE_DATA[] }>(({ data }) => ({
			idKey: template as any,
			read: (request, { put }) => {
				const { query, offset } = request;
				const filteredData = Object.keys(query).length
					? data.filter((item) => item && defaultFilter(query, item, 'contains'))
					: data;
				put({ data: filteredData.slice(offset), total: filteredData.length }, request);
			}
		}));
	}
	return {
		template: {
			template: () => template,
			templateOptions: {}
		}
	};
}

export type TransformConfig<T, S = void> = { [P in keyof T]: S extends void ? string : keyof S };

export interface ReadOptionsData {
	page: number;
	size: number;
	query: ReadQuery;
}

export interface ResourceWrapper<MIDDLEWARE_DATA, RESOURCE_DATA> {
	template: TemplateWrapper<RESOURCE_DATA>;
	transform?: TransformConfig<MIDDLEWARE_DATA, any>;
	options?: ReadOptions;
}

export interface ResourceWrapperWithOptions<MIDDLEWARE_DATA, RESOURCE_DATA> {
	template: ResourceWrapper<MIDDLEWARE_DATA, RESOURCE_DATA>;
	options?: ReadOptions;
}

export type ResourceDetails<MIDDLEWARE_DATA> = MIDDLEWARE_DATA extends infer RESOURCE_DATA
	? ResourceWrapperWithOptions<MIDDLEWARE_DATA, RESOURCE_DATA>
	: void;

export type DefaultTemplateProperty<MIDDLEWARE_DATA> = TemplateOptions<{ data: MIDDLEWARE_DATA[] }> & {
	template?: void;
	options?: void;
	idKey: keyof MIDDLEWARE_DATA;
};

export interface ResourceProperties<MIDDLEWARE_DATA> {
	resource:
		| TemplateWithOptions<MIDDLEWARE_DATA>
		| ResourceDetails<MIDDLEWARE_DATA>
		| DefaultTemplateProperty<MIDDLEWARE_DATA>;
}

export type ResourceTemplate<RESOURCE_DATA, MIDDLEWARE_DATA> =
	| TemplateWrapper<RESOURCE_DATA>
	| TemplateWithOptions<RESOURCE_DATA>
	| ResourceWrapper<MIDDLEWARE_DATA, RESOURCE_DATA>
	| undefined
	| void;

export type ReadStatus = 'read' | 'unread' | 'reading';

export interface ResourceWithMeta<MIDDLEWARE_DATA> {
	data: {
		value: MIDDLEWARE_DATA | undefined;
		status: ReadStatus;
	}[];
	meta: {
		total?: number;
		status: ReadStatus;
	};
}

export interface Resource<MIDDLEWARE_DATA = {}> {
	<RESOURCE_DATA>(
		options: {
			template: void | TemplateWrapper<MIDDLEWARE_DATA> | ResourceWrapper<MIDDLEWARE_DATA, MIDDLEWARE_DATA>;
			options?: ReadOptions;
		}
	): {
		template: {
			template: { template: () => Template<RESOURCE_DATA>; templateOptions: {} };
			transform?: TransformConfig<MIDDLEWARE_DATA, RESOURCE_DATA>;
		};
		options?: ReadOptions;
	};
	<RESOURCE_DATA>(
		options: {
			template: {
				template: {
					template: () => Template<RESOURCE_DATA>;
					templateOptions?: any;
				};
			};
			options?: ReadOptions;
		}
	): {
		template: {
			template: {
				template: () => Template<RESOURCE_DATA>;
				templateOptions?: {};
			};
			transform?: TransformConfig<RESOURCE_DATA, RESOURCE_DATA>;
		};
		options?: ReadOptions;
	};
	<RESOURCE_DATA, MIDDLEWARE_DATA>(
		options: {
			template: {
				template: {
					template: () => Template<RESOURCE_DATA>;
					templateOptions?: any;
				};
			};
			options?: ReadOptions;
			transform: TransformConfig<MIDDLEWARE_DATA, RESOURCE_DATA>;
		}
	): {
		template: {
			template: {
				template: () => Template<any>;
				templateOptions?: {};
			};
			transform: TransformConfig<MIDDLEWARE_DATA, RESOURCE_DATA>;
		};
		options?: ReadOptions;
	};
	getOrRead<RESOURCE_DATA>(
		template: TemplateWrapper<RESOURCE_DATA> | ResourceTemplate<RESOURCE_DATA, MIDDLEWARE_DATA>,
		options: ReadOptionsData
	): MIDDLEWARE_DATA[] | undefined;
	getOrRead<RESOURCE_DATA>(
		template: TemplateWrapper<RESOURCE_DATA> | ResourceTemplate<RESOURCE_DATA, MIDDLEWARE_DATA>,
		options: ReadOptionsData,
		meta: true
	): ResourceWithMeta<MIDDLEWARE_DATA>;
	get<RESOURCE_DATA>(
		template: TemplateWrapper<RESOURCE_DATA> | ResourceTemplate<RESOURCE_DATA, MIDDLEWARE_DATA>,
		options: ReadOptionsData
	): (undefined | MIDDLEWARE_DATA)[];
	get<RESOURCE_DATA>(
		template: TemplateWrapper<RESOURCE_DATA> | ResourceTemplate<RESOURCE_DATA, MIDDLEWARE_DATA>,
		options: ReadOptionsData,
		meta: true
	): ResourceWithMeta<MIDDLEWARE_DATA>;
	createOptions(setter: OptionSetter, id?: string): ReadOptions;
}

const factory = create({ invalidator, destroy, diffProperty, icache }).properties<ResourceProperties<any>>();

interface RequestCacheData {
	inflightMap: Map<string, boolean>;
	total?: number;
}

interface TemplateCacheData {
	instance: Template<any>;
	raw: RawCache;
	requestCache: Map<string, RequestCacheData>;
}

// The template cache, this holds the RawCache instance and request inprogress flags
const templateCacheMap = new Map<(...args: any[]) => Template<any>, Map<string, TemplateCacheData>>();

// The options cache, holds the actual options, subscribers, and the options setter function
interface OptionsCacheData {
	options: Partial<ReadOptionsData>;
	subscribers: Set<() => void>;
	setter: ReadOptions;
}
const optionsCacheMap = new Map<string, OptionsCacheData>();

// The reverse look up for the owning id, this is so that widgets passed a resource options can add their invalidator to subscribers
const optionsSetterToOwnerIdMap = new Map<any, any>();

let optionsId = 0;

function isTemplateWrapper(value: any): value is TemplateWrapper<any> {
	return Boolean(value && value.template && typeof value.template === 'function');
}

function isResourceWrapper(value: any): value is ResourceWrapper<any, any> {
	return Boolean(value && value.template && typeof value.template.template === 'function');
}

function transformQuery(query: ReadQuery, transformConfig: TransformConfig<any>) {
	const queryKeys = Object.keys(query);
	let transformedQuery: ReadQuery = {};
	for (let i = 0; i < queryKeys.length; i++) {
		const queryKey = queryKeys[i];
		transformedQuery[transformConfig[queryKey] || queryKey] = query[queryKey];
	}
	return transformedQuery;
}

function transformData(item: any, transformConfig?: TransformConfig<any>) {
	if (!transformConfig || !item) {
		return item;
	}
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

function getOrCreateResourceCaches(template: ResourceTemplate<any, any>) {
	if (template === undefined) {
		throw new Error('Resource template cannot be undefined.');
	}

	if (!isTemplateWrapper(template)) {
		template = template.template;
	}

	const templateCache =
		templateCacheMap.get(template.template) ||
		new Map<string, { instance: Template<any>; raw: RawCache; requestCache: Map<string, RequestCacheData> }>();
	templateCacheMap.set(template.template, templateCache);
	const cacheKey = JSON.stringify(template.templateOptions);
	let caches = templateCache.get(cacheKey);
	if (!caches) {
		caches = {
			raw: new RawCache(),
			requestCache: new Map(),
			instance: template.template(template.templateOptions)
		};
		templateCache.set(cacheKey, caches);
	}
	return caches;
}

const middleware = factory(
	({ id, properties, middleware: { invalidator, destroy, diffProperty, icache } }): Resource<any> => {
		const uuid = icache.getOrSet('uuid', `${++optionsId}`);
		const destroyFuncs: Function[] = [];
		diffProperty('resource', properties, ({ resource: currResource }, { resource: nextResource }) => {
			if (!nextResource) {
				return undefined;
			}
			if (
				!currResource ||
				(currResource.options !== nextResource.options || currResource.template !== nextResource.template)
			) {
				invalidator();
			}
			if (nextResource.options) {
				const id = optionsSetterToOwnerIdMap.get(nextResource.options);
				if (id) {
					const optionsWrapper = optionsCacheMap.get(id);
					if (optionsWrapper && !optionsWrapper.subscribers.has(invalidator)) {
						optionsWrapper.subscribers.add(invalidator);
						destroyFuncs.push(() => {
							optionsWrapper.subscribers.delete(invalidator);
						});
					}
				}
			}
			if (!currResource && !nextResource.template) {
				const { template: _template, options, idKey, ...rest } = nextResource as any;
				const template = createResourceTemplate(idKey as string);
				nextResource.template = template(rest as any).template;
			} else if (currResource && !nextResource.template) {
				const { template: _template, options, idKey, ...rest } = nextResource as any;
				nextResource.template = {
					template: (currResource.template as any).template,
					templateOptions: rest
				};
			}
			return nextResource;
		});
		destroy(() => {
			destroyFuncs.forEach((des) => des());
		});

		const resource = (
			options:
				| { template: undefined }
				| TemplateWrapper<any>
				| ResourceWrapper<any, any>
				| ({
						template: {
							template: {
								template: () => Template<any>;
								templateOptions?: any;
							};
							transform: any;
						};
						options?: ReadOptions;
						transform?: TransformConfig<any, any>;
				  })
		): {
			template: {
				template: { template: () => Template<any>; templateOptions?: {} };
				transform?: TransformConfig<any, any>;
			};
			transform?: TransformConfig<any, any>;
			options?: ReadOptions;
		} => {
			if (!options.template) {
				throw new Error('Resource cannot be undefined');
			}
			if (isTemplateWrapper(options)) {
				return { template: { template: { ...options }, transform: options.transform } };
			}
			if (isResourceWrapper(options)) {
				return {
					template: { ...options, transform: options.transform || options.template.transform },
					options: options.options,
					transform: options.transform || options.template.transform
				};
			}
			return {
				template: { ...options.template, transform: options.transform || options.template.transform },
				options: options.options,
				transform: options.transform || options.template.transform
			};
		};
		function getOrRead<RESOURCE_DATA>(
			template: ResourceTemplate<RESOURCE_DATA, any>,
			options: ReadOptionsData,
			meta?: true
		): ResourceWithMeta<any> | any[] | undefined {
			const caches = getOrCreateResourceCaches(template);
			const { raw: cache, requestCache, instance } = caches;
			let { size, page, query } = options;
			let transform: TransformConfig<any> | undefined;
			if (isResourceWrapper(template) && template.transform) {
				transform = template.transform;
				query = transformQuery(query, transform);
			}
			const offset = (page - 1) * size;
			const start = page * size - size;
			const end = page * size;
			const request = {
				offset,
				size,
				query
			};
			const idKey = instance.idKey as string;

			const stringifiedRequest = JSON.stringify(request);
			const stringifiedQuery = JSON.stringify(query);
			let requestCacheData = requestCache.get(stringifiedQuery) || {
				inflightMap: new Map<string, boolean>(),
				total: undefined
			};
			const inflight = requestCacheData.inflightMap.get(stringifiedRequest) || false;
			if (!meta && inflight) {
				return undefined;
			}
			const syntheticIds: string[] = [];
			const orphanedIds: string[] = [];
			let incompleteIds: string[] = [];
			let items: RawCacheItem[] = [];
			let shouldRead = false;
			let resetOrphans = false;
			for (let i = 0; i < end - start; i++) {
				const syntheticId = `${stringifiedQuery}/${start + i}`;
				const item = cache.get(syntheticId);
				syntheticIds.push(syntheticId);
				if (item) {
					if (item.status === 'resolved') {
						if (orphanedIds.length) {
							resetOrphans = true;
							shouldRead = true;
						}
						items.push(item);
					} else if (item.status === 'pending') {
						incompleteIds.push(syntheticId);
						if (orphanedIds.length) {
							resetOrphans = true;
							shouldRead = true;
						}
						items.push(item);
					} else {
						items.push(item);
						orphanedIds.push(syntheticId);
					}
				} else {
					incompleteIds.push(syntheticId);
					cache.addSyntheticId(syntheticId);
					items.push({
						status: 'pending',
						mtime: Date.now(),
						value: undefined
					});
					shouldRead = true;
				}
			}
			if (resetOrphans) {
				incompleteIds = [...incompleteIds, ...orphanedIds];
				orphanedIds.forEach((id) => {
					cache.addSyntheticId(id);
				});
			}
			if (incompleteIds.length) {
				cache.subscribe(incompleteIds, () => {
					invalidator();
				});
			}
			if (shouldRead) {
				const put = (response: ReadResponse<any>, _request: ReadRequest) => {
					const { data, total } = response;
					const syntheticIdsCopy = [...syntheticIds];
					data.forEach((item, idx) => {
						const syntheticId = syntheticIdsCopy.shift() || `${stringifiedQuery}/${start + idx}`;
						cache.set(
							syntheticId,
							{
								value: item,
								status: 'resolved',
								mtime: Date.now()
							},
							idKey
						);
					});
					syntheticIdsCopy.forEach((id) => cache.orphan(id));
					requestCacheData.total = total;
					requestCache.set(stringifiedQuery, requestCacheData);
				};

				requestCacheData.inflightMap.set(stringifiedRequest, true);
				requestCache.set(stringifiedQuery, requestCacheData);
				instance.read(request, { put });
				requestCacheData.inflightMap.set(stringifiedRequest, false);
				requestCache.set(stringifiedQuery, requestCacheData);
				if (!requestCacheData.inflightMap.get(stringifiedRequest)) {
					items = [];
					for (let i = 0; i < syntheticIds.length; i++) {
						const syntheticId = syntheticIds[i];
						const item = cache.get(syntheticId);
						if (item) {
							if (item.status !== 'orphaned') {
								items.push(item);
							}
						}
					}
				}
			}
			if (!resetOrphans) {
				items = items.filter((item) => item.status !== 'orphaned');
			}
			if (meta) {
				let requestStatus: ReadStatus = 'read';
				const data = items.map((item) => {
					let status: ReadStatus = 'read' as const;
					if (item.status !== 'resolved') {
						status = 'reading' as const;
					}
					if (requestStatus === 'read' && status === 'reading') {
						requestStatus = 'reading';
					}
					return {
						value: transformData(item.value, transform),
						status
					};
				});
				return { data, meta: { status: requestStatus, total: requestCacheData.total } };
			}
			const filteredItems = items
				.filter((item) => item.status !== 'pending')
				.map((item) => transformData(item.value, transform));
			return items.length === filteredItems.length ? filteredItems : undefined;
		}
		resource.getOrRead = getOrRead;
		function get<RESOURCE_DATA>(
			template: ResourceTemplate<RESOURCE_DATA, any>,
			options: ReadOptionsData,
			meta?: true
		): ResourceWithMeta<any> | any[] | undefined {
			const caches = getOrCreateResourceCaches(template);
			const { raw: cache, requestCache } = caches;
			let { size, page, query } = options;
			let transform: TransformConfig<any> | undefined;
			if (isResourceWrapper(template) && template.transform) {
				transform = template.transform;
				query = transformQuery(query, transform);
			}
			const offset = (page - 1) * size;
			const start = page * size - size;
			const end = page * size;
			const request = {
				offset,
				size,
				query
			};
			const stringifiedRequest = JSON.stringify(request);
			const stringifiedQuery = JSON.stringify(query);
			let requestCacheData = requestCache.get(stringifiedQuery) || {
				inflightMap: new Map<string, boolean>(),
				total: undefined
			};
			const inflight = requestCacheData.inflightMap.get(stringifiedRequest) || false;
			if (!meta && inflight) {
				return undefined;
			}
			let items: any[] = [];
			let requestStatus: ReadStatus = 'read';
			for (let i = 0; i < end - start; i++) {
				const item = cache.get(`${stringifiedQuery}/${start + i}`);
				if (meta) {
					if (item) {
						const status = item.status === 'resolved' ? 'read' : 'reading';
						if (requestStatus === 'read' && status === 'reading') {
							requestStatus = 'reading';
						}
						items.push({ value: transformData(item.value, transform), status });
					} else {
						requestStatus = 'unread';
						items.push({ value: undefined, status: 'unread' });
					}
				} else {
					if (item && item.status === 'resolved') {
						items.push(transformData(item.value, transform));
					} else {
						items.push(undefined);
					}
				}
			}
			if (meta) {
				return { data: items, meta: { status: requestStatus, total: requestCacheData.total } };
			}
			return items;
		}
		resource.get = get;

		function createOptions(setter: OptionSetter, optionsId = uuid) {
			const existingOptions = optionsCacheMap.get(optionsId);
			if (existingOptions) {
				return existingOptions.setter;
			}
			const optionsWrapper: OptionsCacheData = {
				options: {},
				subscribers: new Set(),
				setter: (options) => {
					return options as any;
				}
			};
			optionsWrapper.subscribers.add(invalidator);
			function setOptions(newOptions?: Partial<ReadOptionsData>): ReadOptionsData {
				if (!newOptions) {
					optionsWrapper.subscribers.add(invalidator);
					return {
						page: optionsWrapper.options.page || 1,
						size: optionsWrapper.options.size || 30,
						query: optionsWrapper.options.query || {}
					};
				}
				const updatedOptions = setter(optionsWrapper.options, newOptions);
				if (auto(updatedOptions, optionsWrapper.options, 5).changed) {
					optionsWrapper.options = updatedOptions;
					optionsWrapper.subscribers.forEach((i) => {
						i();
					});
				}
				return {
					page: optionsWrapper.options.page || 1,
					size: optionsWrapper.options.size || 30,
					query: optionsWrapper.options.query || {}
				};
			}
			setOptions({});
			destroyFuncs.push(() => {
				optionsCacheMap.delete(id);
			});
			optionsWrapper.setter = setOptions;
			optionsCacheMap.set(optionsId, optionsWrapper);
			optionsSetterToOwnerIdMap.set(setOptions, optionsId);
			destroyFuncs.push(() => optionsSetterToOwnerIdMap.delete(setOptions));
			return setOptions;
		}
		resource.createOptions = createOptions;
		return resource as any;
	}
);

export function createResourceMiddleware<MIDDLEWARE extends { data: any } = { data: void }>() {
	return middleware.withType<
		Resource<MIDDLEWARE['data'] extends void ? {} : MIDDLEWARE['data']>,
		MIDDLEWARE['data'] extends void ? {} : ResourceProperties<MIDDLEWARE['data']>
	>();
}
