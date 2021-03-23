import Set from '../../shim/Set';
import Map from '../../shim/Map';
import { create, invalidator, diffProperty, destroy } from '../vdom';
import icache from './icache';
import { auto } from '../diff';
import { DefaultChildrenWNodeFactory, WNodeFactory, OptionalWNodeFactory, WNodeFactoryTypes } from '../interfaces';

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
	(items: DATA[]): void;
}

export interface Delete<DATA> {
	(items: DATA[]): void;
}

export interface Get<DATA> {
	(request: ReadRequest): DATA[] | undefined;
	(request: string[]): (undefined | DATA)[];
}

export interface TemplateControls<DATA> {
	put: Put<DATA>;
	del: Delete<DATA>;
	get: Get<DATA>;
}

export interface TemplateRead<DATA> {
	(request: ReadRequest, controls: TemplateControls<DATA>): Promise<void> | void;
}

export interface Template<DATA> {
	idKey: keyof DATA;
}

export interface DefaultTemplate<DATA> extends Template<DATA>, TemplateRead<DATA> {}

export interface TemplateFactory<RESOURCE_DATA, OPTIONS, CUSTOM_API> {
	(options: TemplateOptions<OPTIONS>): Template<RESOURCE_DATA> & CUSTOM_API;
}

export interface CustomTemplate {
	[index: string]: (request?: any) => Promise<void> | void;
}

export type DefaultApi = { read: (request: ReadRequest) => Promise<void> | void };

export type CustomTemplateApi<CUSTOM extends CustomTemplate, DATA> = {
	[K in keyof CUSTOM]: (args: Parameters<CUSTOM[K]>[0], controls: TemplateControls<DATA>) => Promise<void> | void
};

export interface TemplateWrapper<RESOURCE_DATA, CUSTOM_API = undefined> {
	template: (options?: any) => Template<RESOURCE_DATA>;
	templateOptions?: any;
	transform?: TransformConfig<any, any>;
	api: CUSTOM_API extends CustomTemplate ? CUSTOM_API : undefined;
}

export interface TemplateWithOptions<
	RESOURCE_DATA,
	CUSTOM_API = { read: (request: ReadRequest) => Promise<void> | void }
> {
	template: TemplateWrapper<RESOURCE_DATA, CUSTOM_API>;
	options: undefined;
}

export interface TemplateWithOptionsFactory<DATA, OPTIONS, CUSTOM_API> {
	(options: TemplateOptions<OPTIONS>): TemplateWithOptions<DATA, CUSTOM_API>;
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
	stale?: boolean;
};

type IdMapData =
	| { id: string; status: 'resolved'; stale?: boolean }
	| { id: string | null; status: 'orphaned' | 'pending'; stale?: boolean };

interface CacheSubscriberItem {
	refs: Set<string>;
	invalidator: () => void;
	syntheticIds: SyntheticId[];
}

type SyntheticId = { requestId: string; orderId: string };

function generateSynthIdString({ requestId, orderId }: SyntheticId) {
	return `${requestId}/${orderId}`;
}

class RawCache {
	_subscriberCounter = 1;
	_rawCache = new Map<string, RawCacheItem>();
	_syntheticIdToIdMap = new Map<string, IdMapData>();
	_idToSyntheticIdMap = new Map<string, Map<string, SyntheticId>>();
	_syntheticIdToSubscriberMap = new Map<string, Set<any>>();
	_subscriberMap = new Map<string, CacheSubscriberItem>();
	subscribe(syntheticIds: SyntheticId[], invalidator: any) {
		const subscriberId = `${this._subscriberCounter++}`;
		syntheticIds.forEach((syntheticId) => {
			const synthId = generateSynthIdString(syntheticId);
			let subscribers = this._syntheticIdToSubscriberMap.get(synthId);
			if (!subscribers) {
				subscribers = new Set();
			}
			subscribers.add(subscriberId);
			this._syntheticIdToSubscriberMap.set(synthId, subscribers);
		});
		this._subscriberMap.set(subscriberId, {
			syntheticIds,
			invalidator,
			refs: new Set(syntheticIds.map(generateSynthIdString))
		});
	}
	notify(syntheticId: SyntheticId) {
		const synthId = generateSynthIdString(syntheticId);
		const subscriberIds = this._syntheticIdToSubscriberMap.get(synthId);
		if (subscriberIds) {
			[...subscriberIds].forEach((subscriberId) => {
				const subscriber = this._subscriberMap.get(subscriberId);
				if (subscriber) {
					subscriber.refs.delete(synthId);
					if (subscriber.refs.size === 0) {
						subscriber.invalidator();
						this._subscriberMap.delete(subscriberId);
					}
					const subscribers = this._syntheticIdToSubscriberMap.get(synthId)!;
					subscribers.delete(subscriber);
					this._syntheticIdToSubscriberMap.set(synthId, subscribers);
				}
			});
		}
	}
	get(syntheticId: SyntheticId): undefined | RawCacheItem {
		const synthId = generateSynthIdString(syntheticId);
		const idDetails = this._syntheticIdToIdMap.get(synthId);
		if (idDetails) {
			if (idDetails.status === 'resolved') {
				return this._rawCache.get(idDetails.id);
			}
			return {
				status: idDetails.status,
				mtime: Date.now(),
				value: undefined,
				stale: idDetails.stale
			};
		}
	}
	delete(id: string) {
		this._idToSyntheticIdMap.delete(id);
		this._rawCache.delete(id);
	}
	invalidate() {
		this._rawCache.forEach((value, key) => {
			this._rawCache.set(key, { ...value, stale: true });
		});
		this._syntheticIdToIdMap.forEach((value, key) => {
			this._syntheticIdToIdMap.set(key, { ...value, stale: true });
		});
	}
	addSyntheticId(syntheticId: SyntheticId, status: 'orphaned' | 'pending' = 'pending') {
		this._syntheticIdToIdMap.set(generateSynthIdString(syntheticId), { id: null, status });
	}
	getSyntheticIds(id: string) {
		const ids = this._idToSyntheticIdMap.get(id);
		if (ids) {
			return [...ids.values()];
		}
		return [];
	}
	orphan(syntheticId: SyntheticId) {
		const synthId = generateSynthIdString(syntheticId);
		this.notify(syntheticId);
		this._syntheticIdToIdMap.set(synthId, { id: null, status: 'orphaned' });
	}
	set(syntheticId: SyntheticId, item: RawCacheItem, idKey: string) {
		const synthId = generateSynthIdString(syntheticId);
		const id = item.value[idKey];
		this._syntheticIdToIdMap.set(synthId, { id, status: 'resolved' });
		const syntheticIds = this._idToSyntheticIdMap.get(id) || new Map<string, SyntheticId>();
		syntheticIds.set(syntheticId.requestId, syntheticId);
		this._idToSyntheticIdMap.set(id, syntheticIds);
		this._rawCache.set(id, { ...item, stale: false });
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

type WidgetFactory<T extends WNodeFactoryTypes> =
	| DefaultChildrenWNodeFactory<T>
	| WNodeFactory<T>
	| OptionalWNodeFactory<T>;

type WidgetResourceData<W extends WidgetFactory<any>> = W extends WidgetFactory<WNodeFactoryTypes<infer P>>
	? P extends ResourceProperties<infer D, any> ? D : void
	: void;
type WidgetResourceApi<W extends WidgetFactory<any>> = W extends WidgetFactory<WNodeFactoryTypes<infer P>>
	? P extends ResourceProperties<any, infer R> ? (R extends CustomTemplate ? R : DefaultApi) : DefaultApi
	: DefaultApi;
type WidgetResourceTemplateApi<W extends WidgetFactory<any>> = W extends WidgetFactory<WNodeFactoryTypes<infer P>>
	? P extends ResourceProperties<infer D, infer R>
		? R extends CustomTemplate ? CustomTemplateApi<R, D> : CustomTemplateApi<DefaultApi, D>
		: CustomTemplateApi<DefaultApi, WidgetResourceData<W>>
	: CustomTemplateApi<DefaultApi, WidgetResourceData<W>>;

export function createResourceTemplate<
	W extends WidgetFactory<any>,
	T extends TemplateFactory<
		WidgetResourceData<W>,
		any,
		CustomTemplateApi<WidgetResourceApi<W>, WidgetResourceData<W>>
	>
>(
	widget: W,
	template: T
): T extends TemplateFactory<any, infer O, any>
	? TemplateWithOptionsFactory<WidgetResourceData<W>, O, WidgetResourceApi<W>>
	: void;
export function createResourceTemplate<W extends WidgetFactory<any>>(
	widget: W,
	template: Template<WidgetResourceData<W>> & WidgetResourceTemplateApi<W>
): {
	template: {
		template: () => Template<WidgetResourceData<W>>;
		templateOptions: any;
		api: WidgetResourceApi<W>;
	};
};
export function createResourceTemplate<W extends WidgetFactory<any>>(
	widget: W,
	idKey: keyof WidgetResourceData<W>
): TemplateWithOptionsFactory<WidgetResourceData<W>, { data: WidgetResourceData<W>[] }, DefaultApi>;
export function createResourceTemplate<RESOURCE_DATA, TEMPLATE extends CustomTemplate = DefaultApi>(
	template: Template<RESOURCE_DATA> & CustomTemplateApi<TEMPLATE, RESOURCE_DATA>
): {
	template: {
		template: () => Template<RESOURCE_DATA>;
		templateOptions: any;
		api: TEMPLATE;
	};
};
export function createResourceTemplate<RESOURCE_DATA, OPTIONS, TEMPLATE extends CustomTemplate = DefaultApi>(
	template: TemplateFactory<RESOURCE_DATA, OPTIONS, CustomTemplateApi<TEMPLATE, RESOURCE_DATA>>
): TemplateWithOptionsFactory<RESOURCE_DATA, OPTIONS, TEMPLATE>;
export function createResourceTemplate<RESOURCE_DATA>(
	idKey: keyof RESOURCE_DATA
): TemplateWithOptionsFactory<RESOURCE_DATA, { data: RESOURCE_DATA[] }, DefaultApi>;
export function createResourceTemplate<RESOURCE_DATA>(templateOrWidget: any, template?: any): any {
	template = template || templateOrWidget;
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
	offset: number;
	size: number;
	query: ReadQuery;
}

export interface ResourceWrapper<MIDDLEWARE_DATA, RESOURCE_DATA, CUSTOM_API = undefined> {
	template: TemplateWrapper<RESOURCE_DATA, CUSTOM_API>;
	transform?: TransformConfig<MIDDLEWARE_DATA, any>;
	options?: ReadOptions;
}

export interface ResourceWrapperWithOptions<MIDDLEWARE_DATA, RESOURCE_DATA, API> {
	template: ResourceWrapper<MIDDLEWARE_DATA, RESOURCE_DATA, API>;
	options?: ReadOptions;
}

export type ResourceDetails<MIDDLEWARE_DATA, API = undefined> = MIDDLEWARE_DATA extends infer RESOURCE_DATA
	? ResourceWrapperWithOptions<MIDDLEWARE_DATA, RESOURCE_DATA, API>
	: void;

export type DefaultTemplateProperty<MIDDLEWARE_DATA> = TemplateOptions<{
	data: MIDDLEWARE_DATA[];
}> & {
	template?: void;
	options?: void;
	idKey: keyof MIDDLEWARE_DATA;
};

export interface ResourceProperties<MIDDLEWARE_DATA, API = void> {
	resource: API extends void
		?
				| TemplateWithOptions<MIDDLEWARE_DATA, DefaultApi>
				| ResourceDetails<MIDDLEWARE_DATA, DefaultApi>
				| DefaultTemplateProperty<MIDDLEWARE_DATA>
		: ResourceDetails<MIDDLEWARE_DATA, API>;
}

export type ResourceTemplate<RESOURCE_DATA, MIDDLEWARE_DATA, API> =
	| TemplateWrapper<RESOURCE_DATA, API>
	| ResourceWrapper<MIDDLEWARE_DATA, RESOURCE_DATA, API>
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

export type ResourceApi<API extends CustomTemplate> = { [K in keyof API]: (...args: Parameters<API[K]>) => void };

export interface Resource<MIDDLEWARE_DATA = {}> {
	<RESOURCE_DATA, CUSTOM_API>(
		options: {
			template:
				| void
				| TemplateWrapper<MIDDLEWARE_DATA, CUSTOM_API>
				| ResourceWrapper<MIDDLEWARE_DATA, MIDDLEWARE_DATA, CUSTOM_API>;
			options?: ReadOptions;
		}
	): {
		template: {
			template: {
				template: () => Template<RESOURCE_DATA>;
				templateOptions: {};
				api: CUSTOM_API;
			};
			transform?: TransformConfig<MIDDLEWARE_DATA, RESOURCE_DATA>;
		};
		options?: ReadOptions;
	};
	<RESOURCE_DATA, CUSTOM_API>(
		options: {
			template: {
				template: {
					template: () => Template<RESOURCE_DATA>;
					templateOptions?: any;
					api: CUSTOM_API;
				};
			};
			options?: ReadOptions;
		}
	): {
		template: {
			template: {
				template: () => Template<RESOURCE_DATA>;
				templateOptions?: {};
				api: CUSTOM_API;
			};
			transform?: TransformConfig<RESOURCE_DATA, RESOURCE_DATA>;
		};
		options?: ReadOptions;
	};
	<RESOURCE_DATA, MIDDLEWARE_DATA, CUSTOM_API>(
		options: {
			template:
				| {
						template: {
							template: () => Template<RESOURCE_DATA>;
							templateOptions?: any;
							api: CUSTOM_API;
						};
				  }
				| void
				| undefined
				| TemplateWrapper<RESOURCE_DATA, CUSTOM_API>;
			options?: ReadOptions;
			transform: TransformConfig<MIDDLEWARE_DATA, RESOURCE_DATA>;
		}
	): {
		template: {
			template: {
				template: () => Template<any>;
				templateOptions?: {};
				api: CUSTOM_API;
			};
			transform: TransformConfig<MIDDLEWARE_DATA, RESOURCE_DATA>;
		};
		options?: ReadOptions;
	};
	template<TEMPLATE extends ResourceWrapper<any, any, any> | TemplateWrapper<any, any>>(
		template: TEMPLATE | undefined | void
	): TEMPLATE extends ResourceWrapper<any, infer RESOURCE_DATA, infer API>
		? {
				template: API extends CustomTemplate ? ResourceApi<API> : undefined;
				createOptions(setter: OptionSetter, id?: string): ReadOptions;
				get(options: ReadOptionsData, settings: { meta: true }): ResourceWithMeta<RESOURCE_DATA>;
				get(options: ReadOptionsData): (RESOURCE_DATA | undefined)[];
				get<READ extends (options: ReadOptionsData) => void>(
					options: Parameters<READ>[0],
					settings: { read: READ }
				): RESOURCE_DATA[] | undefined;

				get<READ extends (options: ReadOptionsData) => void>(
					options: Parameters<READ>[0],
					settings: { read: READ; meta: true }
				): ResourceWithMeta<RESOURCE_DATA>;
				get(ids: string[]): (RESOURCE_DATA | undefined)[];
		  }
		: TEMPLATE extends TemplateWrapper<infer RESOURCE_DATA, infer API>
			? {
					template: API extends CustomTemplate ? ResourceApi<API> : undefined;
					createOptions(setter: OptionSetter, id?: string): ReadOptions;
					get(options: ReadOptionsData, settings: { meta: true }): ResourceWithMeta<RESOURCE_DATA>;
					get(options: ReadOptionsData): (RESOURCE_DATA | undefined)[];
					get<READ extends (options: ReadOptionsData) => void>(
						options: Parameters<READ>[0],
						settings: { read: READ }
					): RESOURCE_DATA[] | undefined;
					get<READ extends (options: ReadOptionsData) => void>(
						options: Parameters<READ>[0],
						settings: { read: READ; meta: true }
					): ResourceWithMeta<RESOURCE_DATA>;
					get(ids: string[]): (RESOURCE_DATA | undefined)[];
			  }
			: void;
	createOptions(setter: OptionSetter, id?: string): ReadOptions;
}

const factory = create({
	invalidator,
	destroy,
	diffProperty,
	icache
}).properties<ResourceProperties<any>>();

interface RequestCacheData {
	inflightMap: Map<string, boolean>;
	total?: number;
}

interface TemplateCacheData {
	instance: Template<any>;
	raw: RawCache;
	requestCache: Map<string, RequestCacheData>;
	invalidators: Set<() => void>;
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

function isTemplateWrapper(value: any): value is TemplateWrapper<any, any> {
	return Boolean(value && value.template && typeof value.template === 'function');
}

function isResourceWrapper(value: any): value is ResourceWrapper<any, any> {
	return Boolean(value && value.template && typeof value.template.template === 'function');
}

function transformQuery(query: ReadQuery, transformConfig: TransformConfig<any> | TransformConfig<any>[]): ReadQuery {
	if (Array.isArray(transformConfig)) {
		return [...transformConfig].reverse().reduce(
			(query, config) => {
				return transformQuery(query, config);
			},
			{ ...query }
		);
	}
	const queryKeys = Object.keys(query);
	let transformedQuery: ReadQuery = {};
	for (let i = 0; i < queryKeys.length; i++) {
		const queryKey = queryKeys[i];
		transformedQuery[transformConfig[queryKey] || queryKey] = query[queryKey];
	}
	return transformedQuery;
}

function transformData(item: any, transformConfig?: TransformConfig<any> | TransformConfig<any>[]): any {
	if (!transformConfig || !item) {
		return item;
	}
	if (Array.isArray(transformConfig)) {
		return transformConfig.reduce(
			(transformedItem, config) => {
				return transformData(transformedItem, config);
			},
			{ ...item }
		);
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

function getOrCreateResourceCaches(template: ResourceTemplate<any, any, any>) {
	if (template === undefined) {
		throw new Error('Resource template cannot be undefined.');
	}

	if (!isTemplateWrapper(template)) {
		template = template.template;
	}

	const templateCache = templateCacheMap.get(template.template) || new Map<string, TemplateCacheData>();
	templateCacheMap.set(template.template, templateCache);
	const cacheKey = JSON.stringify(template.templateOptions);
	let caches = templateCache.get(cacheKey);
	if (!caches) {
		caches = {
			raw: new RawCache(),
			requestCache: new Map(),
			instance: template.template(template.templateOptions),
			invalidators: new Set()
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
				currResource.options !== nextResource.options ||
				currResource.template !== nextResource.template
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
				| undefined
				| void
				| { template: undefined }
				| TemplateWrapper<any>
				| ResourceWrapper<any, any>
				| {
						template: {
							template: {
								template: () => Template<any>;
								templateOptions?: any;
							};
							transform: any;
						};
						options?: ReadOptions;
						transform?: TransformConfig<any, any>;
				  }
		): {
			template: {
				template: { template: () => Template<any>; templateOptions?: {} };
				transform?: TransformConfig<any, any>;
			};
			transform?: TransformConfig<any, any>;
			options?: ReadOptions;
		} => {
			if (!options || !options.template) {
				throw new Error('Resource cannot be undefined');
			}
			if (isTemplateWrapper(options)) {
				return {
					template: { template: { ...options }, transform: options.transform }
				};
			}
			let transform: any = options.transform;
			let existingTransform = options.template.transform;
			if (existingTransform) {
				if (transform) {
					existingTransform = Array.isArray(existingTransform) ? existingTransform : [existingTransform];
					transform = [...existingTransform, transform];
				} else {
					transform = existingTransform;
				}
			}

			if (isResourceWrapper(options)) {
				return {
					template: {
						...options,
						transform
					},
					options: options.options,
					transform
				};
			}

			return {
				template: {
					...options.template,
					transform
				},
				options: options.options,
				transform
			};
		};

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
						offset: optionsWrapper.options.offset || 0,
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
					offset: optionsWrapper.options.offset || 0,
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
		resource.template = function(template: any) {
			const { instance, raw: cache, invalidators, requestCache } = getOrCreateResourceCaches(template);
			const apiKeys = Object.keys(instance).filter((key) => typeof (instance as any)[key] === 'function');
			let transform: TransformConfig<any> | undefined;
			if (isResourceWrapper(template) && template.transform) {
				transform = template.transform;
			}
			const templateApi = apiKeys.reduce(
				(api, key) => {
					api[key] = (args: any) => {
						const put = (response: ReadResponse<any> | any[], request: ReadRequest) => {
							if (Array.isArray(response)) {
								response.forEach((item) => {
									const id = item[instance.idKey as string];
									const synthIds = cache.getSyntheticIds(id);
									cache.invalidate();
									synthIds.forEach((id) => {
										cache.set(
											id,
											{
												value: item,
												status: 'resolved',
												mtime: Date.now()
											},
											instance.idKey as string
										);
									});
									invalidators.forEach((invalidator) => invalidator());
								});
							} else {
								const { offset, query: requestQuery, size } = request;
								const query = transform ? transformQuery(requestQuery, transform) : requestQuery;
								const syntheticIds: SyntheticId[] = [];
								for (let i = 0; i < offset + size - offset; i++) {
									syntheticIds.push({ requestId: JSON.stringify(query), orderId: `${offset + i}` });
								}
								response.data.forEach((item, idx) => {
									const syntheticId = syntheticIds.shift() || {
										requestId: JSON.stringify(query),
										orderId: `${offset + idx}`
									};
									cache.set(
										syntheticId,
										{
											value: item,
											status: 'resolved',
											mtime: Date.now()
										},
										instance.idKey as string
									);
								});
								syntheticIds.forEach((id) => cache.orphan(id));
								const requestCacheData = requestCache.get(JSON.stringify(query));
								if (requestCacheData) {
									requestCacheData.total = response.total;
									requestCache.set(JSON.stringify(query), requestCacheData);
								}
							}
						};

						const del = (items: any[]) => {
							cache.invalidate();
							invalidators.forEach((invalidator) => invalidator());
							items.forEach((item) => {
								cache.delete(item[instance.idKey]);
							});
						};

						const get = (request: ReadOptionsData | string[]) => {
							if (Array.isArray(request)) {
								return request.map((id) => {
									const [synthId] = cache.getSyntheticIds(id);
									if (synthId) {
										const item = cache.get(synthId);
										if (item) {
											return item.value;
										}
									}
								});
							}
							let items: (undefined | any)[] = [];
							const { offset, size, query } = request;
							const end = offset + size;
							for (let i = 0; i < end - offset; i++) {
								const item = cache.get({ requestId: JSON.stringify(query), orderId: `${offset + i}` });
								if (!item || item.status === 'pending') {
									return;
								}
								if (item && item.status === 'resolved') {
									items.push(transformData(item.value, transform));
								}
							}
							return items;
						};

						(instance as any)[key](args, { put, del, get });
					};
					return api;
				},
				{} as any
			);

			function get(
				request: ReadOptionsData | string[],
				settings: { meta?: true; read?: any } = {}
			): ResourceWithMeta<any> | any[] | undefined {
				const caches = getOrCreateResourceCaches(template);
				const { raw: cache, requestCache, invalidators } = caches;
				if (Array.isArray(request)) {
					return request.map((id) => {
						const [synthId] = cache.getSyntheticIds(id);
						if (synthId) {
							const item = cache.get(synthId);
							if (item) {
								return item.value;
							}
						}
					});
				}
				const { meta = false, read } = settings;
				if (read && !invalidators.has(invalidator)) {
					invalidators.add(invalidator);
					destroyFuncs.push(() => {
						invalidators.delete(invalidator);
					});
				}
				let { size, offset, query } = request;
				let transform: TransformConfig<any> | undefined;
				if (isResourceWrapper(template) && template.transform) {
					transform = template.transform;
					query = transformQuery(query, transform);
				}
				const end = offset + size;

				const stringifiedRequest = JSON.stringify(request);
				const stringifiedQuery = JSON.stringify(query);
				let requestCacheData = requestCache.get(stringifiedQuery) || {
					inflightMap: new Map<string, boolean>(),
					total: undefined
				};
				const inflight = requestCacheData.inflightMap.get(stringifiedRequest) || false;
				if (!settings.meta && inflight) {
					return undefined;
				}
				const syntheticIds: SyntheticId[] = [];
				const orphanedIds: SyntheticId[] = [];
				let incompleteIds: SyntheticId[] = [];
				let shouldRead = false;
				let resetOrphans = false;
				if (!read) {
					let items: (undefined | any)[] = [];
					let requestStatus: ReadStatus = 'read';
					for (let i = 0; i < end - offset; i++) {
						const item = cache.get({ requestId: stringifiedQuery, orderId: `${offset + i}` });
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
				let items: RawCacheItem[] = [];

				for (let i = 0; i < end - offset; i++) {
					const syntheticId = { requestId: stringifiedQuery, orderId: `${offset + i}` };
					const item = cache.get(syntheticId);
					syntheticIds.push(syntheticId);
					if (item) {
						if (item.stale) {
							incompleteIds.push(syntheticId);
							if (item.value && item.status === 'resolved') {
								cache.set(syntheticId, { ...item, stale: false }, instance.idKey as string);
							} else if (item.status === 'orphaned') {
								cache.addSyntheticId(syntheticId, item.status);
							}
							shouldRead = true;
							if (orphanedIds.length) {
								resetOrphans = true;
							}
							items.push(item);
						} else if (item.status === 'resolved') {
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
					requestCacheData.inflightMap.set(stringifiedRequest, true);
					requestCache.set(stringifiedQuery, requestCacheData);
					settings.read && settings.read({ size, offset, query });
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
				if (settings.meta) {
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
					return {
						data,
						meta: { status: requestStatus, total: requestCacheData.total }
					};
				}
				const filteredItems = items
					.filter((item) => item.status !== 'pending')
					.map((item) => transformData(item.value, transform));
				return items.length === filteredItems.length ? filteredItems : undefined;
			}

			return {
				template: templateApi,
				createOptions,
				get
			};
		};
		return resource as any;
	}
);

export function createResourceMiddleware<DATA = void, API = undefined>() {
	return middleware.withType<
		Resource<DATA extends void ? {} : DATA>,
		DATA extends void ? {} : ResourceProperties<DATA, API>
	>();
}
