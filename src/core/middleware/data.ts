import { create, invalidator, destroy, diffProperty } from '../vdom';
import { Resource, ResourceOptions, ResourceQuery, TransformConfig } from '../resource';
import { Invalidator } from '../interfaces';
import { auto } from '../diff';

type Query = { [key: string]: string | undefined };

export interface Options {
	pageNumber?: number;
	query?: Query;
	pageSize?: number;
}

export interface OptionsWrapper {
	getOptions(invalidator: Invalidator): Options;
	setOptions(newOptions: Options, invalidator: Invalidator): void;
}

export interface ResourceWrapper<R = {}, T = {}> {
	resource: Resource<R, T>;
	createOptionsWrapper(): OptionsWrapper;
	transform?: TransformConfig<T, any>;
	type: 'WRAPPER';
}

export type ResourceWithData<T = {}> = T extends infer R
	? {
			resource: Resource<R, T>;
			transform?: TransformConfig<T, any>;
			data?: any[];
			type: 'RESOURCE';
	  }
	: any;

export interface DataProperties<T = void> {
	resource: ResourceWithData<T> | ResourceWrapper<T, T>;
}

export interface DataInitializerOptions {
	reset?: boolean;
	resource?: ResourceWithData | ResourceWrapper;
	key?: string;
}

function createOptionsWrapper(): OptionsWrapper {
	let options: Options = {};

	const invalidatorSet = new Set<Invalidator>();

	function invalidate() {
		[...invalidatorSet].forEach((invalidator) => {
			invalidator();
		});
	}

	return {
		setOptions(newOptions: Options, invalidator: Invalidator) {
			invalidatorSet.add(invalidator);
			if (newOptions !== options) {
				options = newOptions;
				invalidate();
			}
		},
		getOptions(invalidator: Invalidator) {
			invalidatorSet.add(invalidator);
			return options;
		}
	};
}

function createResourceWrapper(
	resource: Resource<any, any>,
	transform?: any,
	options?: OptionsWrapper
): ResourceWrapper<any, any> {
	return {
		resource,
		transform,
		createOptionsWrapper: options ? () => options : createOptionsWrapper,
		type: 'WRAPPER'
	};
}

function isResourceWithData<R, T>(
	resource: ResourceWithData<T> | ResourceWrapper<R, T>
): resource is ResourceWithData<T> {
	return resource && resource.type === 'RESOURCE';
}

function isResourceWrapper<R, T>(resource: any): resource is ResourceWrapper<R, T> {
	return Boolean(resource && resource.type === 'WRAPPER');
}

function createResourceOptions(options: Options, resource: ResourceWithData | ResourceWrapper): ResourceOptions {
	if (options.query) {
		let query: ResourceQuery[] = [];
		if (resource.transform) {
			query = transformQuery(options.query, resource.transform);
		} else {
			query = transformQuery(options.query);
		}

		return {
			...options,
			query
		};
	} else {
		return options as ResourceOptions;
	}
}

function transformQuery<T>(query: Query, transformConfig?: TransformConfig<T>): ResourceQuery[] {
	return Object.keys(query).map((key: string) => {
		if (!transformConfig) {
			return { value: query[key], keys: key };
		} else {
			const destinationValues = transformConfig[key as keyof T];
			if (destinationValues) {
				return { value: query[key], keys: destinationValues };
			} else {
				return { value: query[key], keys: key };
			}
		}
	});
}

function transformData<T>(item: any, transformConfig: TransformConfig<T>) {
	let transformedItem: Partial<T> = {};
	Object.keys(transformConfig).forEach((key: string) => {
		const sourceKey = transformConfig[key as keyof T];
		transformedItem = {
			...transformedItem,
			[key]: item[sourceKey]
		};
	});
	return transformedItem;
}

export function createDataMiddleware<T = void>() {
	const factory = create({ invalidator, destroy, diffProperty }).properties<DataProperties<T>>();

	const data = factory(({ middleware: { invalidator, destroy, diffProperty }, properties }) => {
		const optionsWrapperMap = new Map<Resource, Map<string, OptionsWrapper>>();
		destroy(() => {
			[...optionsWrapperMap.keys()].forEach((resource) => {
				resource.unsubscribe(invalidator);
			});
		});

		diffProperty('resource', properties, ({ resource: currentResource }, { resource: nextResource }) => {
			if (isResourceWithData(currentResource) && isResourceWithData(nextResource)) {
				const result = auto(currentResource.data, nextResource.data);
				if (result.changed) {
					invalidator();
				}
			}
			return nextResource;
		});

		return (dataOptions: DataInitializerOptions = {}) => {
			function getResource() {
				return dataOptions.resource || (properties().resource as ResourceWithData | ResourceWrapper);
			}
			let passedResourceProperty = getResource();
			const { transform } = passedResourceProperty;

			if (isResourceWithData(passedResourceProperty)) {
				const { resource, data } = passedResourceProperty;
				if (data) {
					resource.set(data);
				}
			}

			let resourceWrapper: ResourceWrapper<any, any>;

			if (isResourceWrapper(passedResourceProperty)) {
				resourceWrapper = passedResourceProperty;
			} else {
				resourceWrapper = createResourceWrapper(passedResourceProperty.resource, transform);
			}

			if (dataOptions.reset) {
				resourceWrapper = createResourceWrapper(resourceWrapper.resource, transform);
			}

			const { resource } = resourceWrapper;
			const { key = '' } = dataOptions;

			let keyedCachedOptions = optionsWrapperMap.get(resource);
			if (!keyedCachedOptions) {
				keyedCachedOptions = new Map<string, OptionsWrapper>();
			}

			let cachedOptions = keyedCachedOptions.get(key);
			let optionsWrapper: OptionsWrapper;

			if (cachedOptions) {
				optionsWrapper = cachedOptions;
			} else {
				const newOptionsWrapper = resourceWrapper.createOptionsWrapper();
				keyedCachedOptions.set(key, newOptionsWrapper);
				optionsWrapperMap.set(resource, keyedCachedOptions);
				optionsWrapper = newOptionsWrapper;
			}

			return {
				getOrRead(options: Options): T extends void ? any : T[] | undefined {
					const resourceContainer = getResource();
					const { transform, resource } = resourceContainer;

					const resourceOptions = createResourceOptions(options, resourceContainer);

					resource.subscribe('data', resourceOptions, invalidator);

					const data = resource.getOrRead(resourceOptions);

					if (data && data.length && transform) {
						return data.map((item: any) => transformData(item, transform));
					}

					return data;
				},
				get(options: Options): T extends void ? any : T[] | undefined {
					const resourceContainer = getResource();
					const { transform, resource } = resourceContainer;

					const resourceOptions = createResourceOptions(options, resourceContainer);

					const data = resource.get(resourceOptions);

					if (data && data.length && transform) {
						return data.map((item: any) => transformData(item, transform));
					}

					return data;
				},
				getTotal(options: Options) {
					const resourceContainer = getResource();
					const { resource } = resourceContainer;

					const resourceOptions = createResourceOptions(options, resourceContainer);

					resource.subscribe('total', resourceOptions, invalidator);
					return resource.getTotal(resourceOptions);
				},
				isLoading(options: Options) {
					const resourceContainer = getResource();
					const { resource } = resourceContainer;

					const resourceOptions = createResourceOptions(options, resourceContainer);

					resource.subscribe('loading', resourceOptions, invalidator);
					return resource.isLoading(resourceOptions);
				},
				isFailed(options: Options) {
					const resourceContainer = getResource();
					const { resource } = resourceContainer;

					const resourceOptions = createResourceOptions(options, resourceContainer);

					resource.subscribe('failed', resourceOptions, invalidator);
					return resource.isFailed(resourceOptions);
				},
				setOptions(newOptions: Options) {
					optionsWrapper.setOptions(newOptions, invalidator);
				},
				getOptions() {
					return optionsWrapper.getOptions(invalidator);
				},
				get resource() {
					return resourceWrapper;
				},
				shared(): ResourceWrapper<T, T> {
					return createResourceWrapper(resource, transform, optionsWrapper);
				}
			};
		};
	});
	return data;
}

export default createDataMiddleware;
