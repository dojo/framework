import { create, invalidator, diffProperty, destroy } from '../vdom';
import { auto } from '../diff';
import { RawCache } from './resourceCache';

// meta i.e. total DONE
// loading DONE
// transforms EASY
//--------------------------
// get API
// custom functions
// setting/getting single items

// what happens for items that are set to pending but are not returned because end of data? set the pending records to something? remove them?

interface ReadQuery {
	[index: string]: string;
}

interface ReadRequest {
	offset: number;
	size: number;
	query: ReadQuery;
}

interface ReadResponse<DATA> {
	data: DATA[];
	total: number;
}

interface Put<DATA> {
	(response: ReadResponse<DATA>, request: ReadRequest): void;
}

interface TemplateControls<DATA> {
	put: Put<DATA>;
}

interface TemplateRead<DATA> {
	(request: ReadRequest, controls: TemplateControls<DATA>): Promise<void> | void;
}

interface Template<DATA> {
	read: TemplateRead<DATA>;
}

interface TemplateFactory<RESOURCE_DATA, OPTIONS> {
	(options: TemplateOptions<OPTIONS>): Template<RESOURCE_DATA>;
}

interface TemplateWrapper<RESOURCE_DATA> {
	template: (options?: any) => Template<RESOURCE_DATA>;
	templateOptions?: any;
}

// Fix any for template
interface TemplateWithOptions<RESOURCE_DATA> {
	template: TemplateWrapper<RESOURCE_DATA>;
	options: undefined;
}

interface TemplateWithOptionsFactory<DATA, OPTIONS> {
	(options: TemplateOptions<OPTIONS>): TemplateWithOptions<DATA>;
}

type TemplateOptions<OPTIONS> = { id: string } & OPTIONS;

interface OptionSetter {
	(current: Partial<ReadOptionsData>, next: Partial<ReadOptionsData>): Partial<ReadOptionsData>;
}

interface ReadOptions {
	(options?: Partial<ReadOptionsData>): ReadOptionsData;
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
export function createResourceTemplate<RESOURCE_DATA>(): TemplateWithOptionsFactory<
	RESOURCE_DATA,
	{ data: RESOURCE_DATA[] }
>;
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
	if (!template) {
		return createResourceTemplate<RESOURCE_DATA, { data: RESOURCE_DATA[] }>(({ data }) => ({
			read: (request, { put }) => {
				const { offset, size } = request;
				const filteredData = Object.keys(request.query).length
					? data.filter((item) => item && defaultFilter(request.query, item, 'contains'))
					: data;
				put({ data: filteredData.slice(offset, offset + size), total: filteredData.length }, request);
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

type TransformConfig<T, S = void> = { [P in keyof T]: S extends void ? string : keyof S };

// resource stuff

interface ReadOptionsData {
	page: number;
	size: number;
	query: ReadQuery;
}

interface ResourceWrapper<MIDDLEWARE_DATA, RESOURCE_DATA> {
	template: TemplateWrapper<RESOURCE_DATA>;
	transform?: TransformConfig<MIDDLEWARE_DATA, any>;
}

interface ResourceWrapperWithOptions<MIDDLEWARE_DATA, RESOURCE_DATA> {
	template: ResourceWrapper<MIDDLEWARE_DATA, RESOURCE_DATA>;
	options?: ReadOptions;
}

type ResourceDetails<MIDDLEWARE_DATA> = MIDDLEWARE_DATA extends infer RESOURCE_DATA
	? ResourceWrapperWithOptions<MIDDLEWARE_DATA, RESOURCE_DATA>
	: void;

type DefaultTemplateProperty<MIDDLEWARE_DATA> = TemplateOptions<{ data: MIDDLEWARE_DATA[] }> & {
	template?: void;
	options?: void;
};

interface ResourceProperties<MIDDLEWARE_DATA> {
	resource:
		| TemplateWithOptions<MIDDLEWARE_DATA>
		| ResourceDetails<MIDDLEWARE_DATA>
		| DefaultTemplateProperty<MIDDLEWARE_DATA>;
}

type ResourceTemplate<RESOURCE_DATA, MIDDLEWARE_DATA> =
	| TemplateWrapper<RESOURCE_DATA>
	| TemplateWithOptions<RESOURCE_DATA>
	| ResourceWrapper<MIDDLEWARE_DATA, RESOURCE_DATA>
	| undefined
	| void;

interface ResourceWithMeta<MIDDLEWARE_DATA> {
	data: {
		value: MIDDLEWARE_DATA;
		loading: boolean;
	}[];
	meta: {
		loading: boolean;
	};
}

interface Resource<MIDDLEWARE_DATA = {}> {
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
		meta: boolean
	): ResourceWithMeta<MIDDLEWARE_DATA>;
	createOptions(setter: OptionSetter, id?: string): ReadOptions;
}

const factory = create({ invalidator, destroy, diffProperty }).properties<ResourceProperties<any>>();

// this should be on the template
const ttl = 1800000;

// The template cache, this holds the RawCache instance and request inprogress flags
// const templateCacheMap = new Map<Template<any>, { raw: RawCache; inprogress: Map<any, any> }>();

interface RequestCacheData {
	inflight: boolean;
	total?: number;
}

interface TemplateCacheData {
	instance: Template<any>;
	raw: RawCache;
	requestCache: Map<string, RequestCacheData>;
}

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

function getOrCreateResourceStuff(template: ResourceTemplate<any, any>) {
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

const template = createResourceTemplate();

const middleware = factory(
	({ id, properties, middleware: { invalidator, destroy, diffProperty } }): Resource<any> => {
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
			if (!nextResource.template) {
				const { template: _template, options, ...rest } = nextResource;
				nextResource.template = template(rest as any).template;
			}
			return nextResource;
		});
		destroy(() => {
			destroyFuncs.forEach((des) => des());
		});

		const resource = (
			options:
				| void
				| TemplateWrapper<any>
				| ResourceWrapper<any, any>
				| ({
						template: {
							template: {
								template: () => Template<any>;
								templateOptions?: any;
							};
						};
						options?: ReadOptions;
						transform?: TransformConfig<any, any>;
				  })
		): {
			template: {
				template: { template: () => Template<any>; templateOptions?: {} };
				transform?: TransformConfig<any, any>;
			};
			options?: ReadOptions;
		} => {
			if (!options) {
				throw new Error('Resource cannot be undefined');
			}
			if (isTemplateWrapper(options)) {
				return { template: { template: { ...options } } };
			}
			if (isResourceWrapper(options)) {
				return { template: { ...options } };
			}
			return { template: { ...options.template, transform: options.transform }, options: options.options };
		};
		function getOrRead<RESOURCE_DATA>(
			template: ResourceTemplate<RESOURCE_DATA, any>,
			options: ReadOptionsData,
			meta?: true
		): ResourceWithMeta<any> | any[] | undefined {
			const caches = getOrCreateResourceStuff(template);
			const { raw: cache, requestCache, instance } = caches;
			let { size, page, query } = options;
			if (isResourceWrapper(template) && template.transform) {
				query = transformQuery(query, template.transform);
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
			let requestCacheData = requestCache.get(stringifiedRequest) || { inflight: false, total: undefined };
			if (!meta && requestCacheData.inflight) {
				return undefined;
			}
			const syntheticIds: string[] = [];
			const incompleteIds: string[] = [];
			let items: any[] = [];
			let shouldRead = false;
			for (let i = 0; i < end - start; i++) {
				const syntheticId = `${JSON.stringify(query)}/${start + i}`;
				const item = cache.get(syntheticId);
				syntheticIds.push(syntheticId);
				if (!item) {
					incompleteIds.push(syntheticId);
					cache.addSyntheticId(syntheticId);
					items.push(undefined);
					shouldRead = true;
				} else if (item.pending) {
					incompleteIds.push(syntheticId);
					items.push(undefined);
				} else if (item.mtime - Date.now() + ttl < 0) {
					incompleteIds.push(syntheticId);
					items.push(item);
					shouldRead = true;
				} else {
					items.push(item);
				}
			}
			if (incompleteIds.length) {
				cache.subscribe(incompleteIds, () => {
					invalidator();
				});
			}
			if (shouldRead) {
				const put = (response: ReadResponse<any>, _request: ReadRequest) => {
					const { data, total } = response;
					data.forEach((item, idx) => {
						const syntheticId = syntheticIds[idx]
							? syntheticIds[idx]
							: `${JSON.stringify(query)}/${start + idx}`;
						cache.set(syntheticId, {
							idKey: 'id',
							value: item,
							pending: false,
							mtime: Date.now()
						});
					});
					requestCache.set(stringifiedRequest, { total, inflight: false });
				};
				requestCache.set(stringifiedRequest, { ...requestCacheData, inflight: true });
				instance.read(request, { put });
				requestCacheData = requestCache.get(stringifiedRequest) || { inflight: false };
				if (!requestCacheData.inflight) {
					items = [];
					for (let i = 0; i < syntheticIds.length; i++) {
						const syntheticId = syntheticIds[i];
						const item = cache.get(syntheticId);
						if (!item) {
							items.push(undefined);
						} else if (item.pending) {
							items.push(undefined);
						} else if (item.mtime - Date.now() + ttl < 0) {
							items.push(item);
						} else {
							items.push(item);
						}
					}
				}
			}
			if (meta) {
				let loading = false;
				const data = items.map((item) => {
					if (item) {
						return {
							value: item.value,
							loading: false
						};
					}
					loading = true;
					return {
						value: undefined,
						loading: true
					};
				});
				return { data, meta: { loading, total: requestCacheData.total } };
			}
			const filteredItems = items.filter((item) => !!item).map((item) => item.value);
			return items.length === filteredItems.length ? filteredItems : undefined;
		}
		resource.getOrRead = getOrRead;
		resource.createOptions = (setter: OptionSetter, optionsId = id) => {
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
				if (auto(updatedOptions, optionsWrapper.options, 5)) {
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
		};
		return resource as any;
	}
);

export function createResourceMiddleware<MIDDLEWARE extends { data: any } = { data: void }>() {
	return middleware.withType<
		Resource<MIDDLEWARE['data'] extends void ? {} : MIDDLEWARE['data']>,
		MIDDLEWARE['data'] extends void ? {} : ResourceProperties<MIDDLEWARE['data']>
	>();
}
