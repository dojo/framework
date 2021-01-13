import { create, invalidator, diffProperty, destroy } from '../vdom';
import { auto } from '../diff';
import { RawCache } from './resourceCache';

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

interface TemplateFactory<DATA, OPTIONS> {
	(options: TemplateOptions<OPTIONS>): Template<DATA>;
}

// Fix any for template
interface TemplateWithOptions<DATA> {
	template: {
		template: any;
		templateOptions: any;
	};
	options: undefined;
}

interface TemplateWithOptionsFactory<DATA, OPTIONS> {
	(options: TemplateOptions<OPTIONS>): TemplateWithOptions<DATA>;
}

type TemplateOptions<OPTIONS> = { id: string } & OPTIONS;

interface OptionSetter {
	(current: ReadOptionsData, next: Partial<ReadOptionsData>): ReadOptionsData;
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
	template: { template: () => Template<RESOURCE_DATA>; templateOptions: {} };
	transform?: TransformConfig<MIDDLEWARE_DATA, RESOURCE_DATA>;
}

interface ResourceWrapperWithOptions<MIDDLEWARE_DATA, RESOURCE_DATA> {
	template: ResourceWrapper<MIDDLEWARE_DATA, RESOURCE_DATA>;
	options?: ReadOptions;
}

type ResourceDetails<MIDDLEWARE_DATA> = MIDDLEWARE_DATA extends infer RESOURCE_DATA
	? ResourceWrapperWithOptions<MIDDLEWARE_DATA, RESOURCE_DATA>
	: void;

interface ResourceProperties<MIDDLEWARE_DATA> {
	resource:
		| TemplateWithOptions<MIDDLEWARE_DATA>
		| { template?: void; options?: void } & TemplateOptions<{ data: MIDDLEWARE_DATA[] }>
		| ResourceDetails<MIDDLEWARE_DATA>;
}

type ResourceTemplate<RESOURCE_DATA, MIDDLEWARE_DATA> =
	| TemplateWithOptions<RESOURCE_DATA>
	| { template: { template: () => Template<RESOURCE_DATA>; templateOptions: {} } }
	| ResourceWrapper<MIDDLEWARE_DATA, RESOURCE_DATA>
	| undefined
	| void;

interface Resource<MIDDLEWARE_DATA> {
	<RESOURCE_DATA, MIDDLEWARE_DATA>(
		options: { template: Template<RESOURCE_DATA>; options?: ReadOptions }
	): ResourceWrapperWithOptions<MIDDLEWARE_DATA, RESOURCE_DATA>;
	<RESOURCE_DATA>(
		options: {
			template: Template<RESOURCE_DATA>;
			options?: ReadOptions;
			transform: TransformConfig<MIDDLEWARE_DATA, RESOURCE_DATA>;
		}
	): ResourceWrapperWithOptions<MIDDLEWARE_DATA, MIDDLEWARE_DATA>;
	<RESOURCE_DATA, MIDDLEWARE_DATA>(
		options: { template: ResourceWrapper<MIDDLEWARE_DATA, RESOURCE_DATA>; options?: ReadOptions }
	): ResourceWrapperWithOptions<MIDDLEWARE_DATA, RESOURCE_DATA>;
	getOrRead<RESOURCE_DATA>(
		template: ResourceTemplate<RESOURCE_DATA, MIDDLEWARE_DATA>,
		options: ReadOptionsData
	): MIDDLEWARE_DATA[] | undefined;
	createOptions(setter: OptionSetter, id?: string): ReadOptions;
}

const factory = create({ invalidator, destroy, diffProperty }).properties<ResourceProperties<any>>();

// this should be on the template
const ttl = 1800000;

// The template cache, this holds the RawCache instance and request inprogress flags
// const templateCacheMap = new Map<Template<any>, { raw: RawCache; inprogress: Map<any, any> }>();

const templateCacheMap = new Map<
	(options: any) => Template<any>,
	Map<string, { instance: Template<any>; raw: RawCache; inprogress: Map<any, any> }>
>();

// The options cache, holds the actual options, subscribers, and the options setter function
interface OptionsCacheData {
	options: ReadOptionsData;
	subscribers: Set<() => void>;
	setter: ReadOptions;
}
const optionsCacheMap = new Map<string, OptionsCacheData>();

// The reverse look up for the owning id, this is so that widgets passed a resource options can add their invalidator to subscribers
const optionsSetterToOwnerIdMap = new Map<any, any>();

function getOrCreateResourceStuff(template: ResourceTemplate<any, any>) {
	if (template === undefined) {
		throw new Error('Resource template cannot be undefined.');
	}

	const templateCache = templateCacheMap.get(template.template.template) || new Map();
	templateCacheMap.set(template.template.template, templateCache);
	const cacheKey = JSON.stringify(template.template.templateOptions);
	let caches = templateCache.get(cacheKey);
	if (!caches) {
		caches = {
			raw: new RawCache(),
			inprogress: new Map(),
			instance: template.template.template(template.template.templateOptions)
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
				nextResource.template = template(rest as any);
			}
			return nextResource;
		});
		destroy(() => {
			destroyFuncs.forEach((des) => des());
		});

		const resource: Resource<any> = (options: any) => {
			if (typeof options.template === 'function' || typeof options.template.read === 'function') {
				return { ...options };
			}
			return { ...options, options: options.options };
		};
		resource.getOrRead = (template, options) => {
			const caches = getOrCreateResourceStuff(template);
			const { raw: cache, inprogress, instance } = caches;
			const { size, page, query } = options;
			const offset = (page - 1) * size;
			const start = page * size - size;
			const end = page * size;
			const request = {
				offset,
				size,
				query
			};

			const stringifiedRequest = JSON.stringify(request);
			const requestInFlight = inprogress.get(stringifiedRequest);
			if (requestInFlight) {
				return undefined;
			}
			const syntheticIds: string[] = [];
			for (let i = 0; i < end - start; i++) {
				syntheticIds[i] = `${JSON.stringify(query)}/${start + i}`;
			}
			const incompletes: string[] = [];
			let shouldRead = false;
			const items: any[] = [];
			syntheticIds.forEach((syntheticId, idx) => {
				const item = cache.get(syntheticId);
				if (item) {
					if (item.pending) {
						incompletes.push(syntheticId);
					} else if (item.mtime - Date.now() + ttl < 0) {
						incompletes.push(syntheticId);
						shouldRead = true;
						items[idx] = item.value;
					} else {
						items[idx] = item.value;
					}
				} else {
					incompletes.push(syntheticId);
					shouldRead = true;
				}
			});
			if (incompletes.length) {
				cache.subscribe(incompletes, () => {
					invalidator();
				});
			} else {
				return items;
			}
			if (shouldRead) {
				syntheticIds.forEach((syntheticId, idx) => {
					cache.addSyntheticId(syntheticId);
				});

				const put = (response: ReadResponse<any>, _request: ReadRequest) => {
					const { data } = response;
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
					inprogress.set(stringifiedRequest, false);
				};
				// const get = (request: ReadRequest) => {};
				inprogress.set(stringifiedRequest, true);
				instance.read(request, { put });
				let items: any[] = [];
				for (let i = 0; i < syntheticIds.length; i++) {
					const syntheticId = syntheticIds[i];
					const item = cache.get(syntheticId);
					if (item && !item.pending) {
						items[i] = item.value;
					} else {
						return undefined;
					}
				}
				return items;
			}
		};
		resource.createOptions = (setter: OptionSetter, optionsId = id) => {
			const existingOptions = optionsCacheMap.get(optionsId);
			if (existingOptions) {
				return existingOptions.setter;
			}
			const optionsWrapper: OptionsCacheData = {
				options: {
					page: 1,
					size: 1,
					query: {}
				},
				subscribers: new Set(),
				setter: (options) => {
					return options as any;
				}
			};
			optionsWrapper.subscribers.add(invalidator);
			function setOptions(newOptions?: Partial<ReadOptionsData>): ReadOptionsData {
				if (!newOptions) {
					optionsWrapper.subscribers.add(invalidator);
					return { ...optionsWrapper.options };
				}
				const updatedOptions = setter(optionsWrapper.options, newOptions);
				if (auto(updatedOptions, optionsWrapper.options, 5)) {
					optionsWrapper.options = updatedOptions;
					optionsWrapper.subscribers.forEach((i) => {
						i();
					});
				}
				return optionsWrapper.options;
			}
			destroyFuncs.push(() => {
				optionsCacheMap.delete(id);
			});
			optionsWrapper.setter = setOptions;
			optionsCacheMap.set(optionsId, optionsWrapper);
			optionsSetterToOwnerIdMap.set(setOptions, optionsId);
			destroyFuncs.push(() => optionsSetterToOwnerIdMap.delete(setOptions));
			return setOptions;
		};
		return resource;
	}
);

export function createResourceMiddleware<MIDDLEWARE extends { data: any } = { data: void }>() {
	return middleware.withType<
		Resource<MIDDLEWARE['data']>,
		MIDDLEWARE['data'] extends void ? {} : ResourceProperties<MIDDLEWARE['data']>
	>();
}
