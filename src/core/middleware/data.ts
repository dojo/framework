import { create, invalidator } from '../vdom';

type Invalidator = () => void;

export interface ResourceOptions {
	pageNumber?: number;
	query?: string;
	pageSize?: number;
}

export interface Resource {
	getOrRead: (options: ResourceOptions, invalidator: Invalidator) => any;
	getTotal: (options: ResourceOptions, invalidator: Invalidator) => number | undefined;
}

interface OptionsWrapper {
	getOptions(invalidator: Invalidator): ResourceOptions;
	setOptions(newOptions: ResourceOptions, invalidator: Invalidator): void;
}

export interface ResourceWrapper {
	resource: Resource;
	createOptionsWrapper(): OptionsWrapper;
}

export type ResourceOrResourceWrapper = Resource | ResourceWrapper;

interface DataProperties {
	resource: ResourceOrResourceWrapper;
}

interface DataTransformProperties<T = void> {
	transform(item: any): T;
	resource: ResourceOrResourceWrapper;
}

interface DataInitialiserOptions {
	reset?: boolean;
	resource?: ResourceOrResourceWrapper;
	key?: string;
}

function isResource(resourceWrapperOrResource: ResourceOrResourceWrapper): resourceWrapperOrResource is Resource {
	return !(resourceWrapperOrResource as any).resource;
}

function isDataTransformProperties<T>(
	properties: DataTransformProperties | DataProperties
): properties is DataTransformProperties<T> {
	return !!(properties as any).transform;
}

function createOptionsWrapper(): OptionsWrapper {
	let options: ResourceOptions = {};

	const invalidators = new Set<Invalidator>();

	function invalidate() {
		[...invalidators].forEach((invalidator) => {
			invalidator();
		});
	}

	return {
		setOptions(newOptions: ResourceOptions, invalidator: Invalidator) {
			invalidators.add(invalidator);
			if (newOptions !== options) {
				options = newOptions;
				invalidate();
			}
		},
		getOptions(invalidator: Invalidator) {
			invalidators.add(invalidator);
			return options;
		}
	};
}

function createResourceWrapper(resource: Resource, options?: OptionsWrapper): ResourceWrapper {
	return {
		resource,
		createOptionsWrapper: options ? () => options : createOptionsWrapper
	};
}

export function createDataMiddleware<T = void>() {
	const factory = create({ invalidator }).properties<T extends void ? DataProperties : DataTransformProperties<T>>();

	const data = factory(({ middleware: { invalidator }, properties }) => {
		const optionsWrapperMap = new WeakMap<Resource, Map<string, OptionsWrapper>>();

		return (dataOptions: DataInitialiserOptions = {}) => {
			let resourceWrapperOrResource = dataOptions.resource || properties().resource;
			let resourceWrapper: ResourceWrapper;

			// Get or create the resource wrapper
			if (isResource(resourceWrapperOrResource)) {
				resourceWrapper = createResourceWrapper(resourceWrapperOrResource);
			} else {
				resourceWrapper = resourceWrapperOrResource as ResourceWrapper;
			}

			// Create a new wrapper if reset is set to true
			if (dataOptions.reset) {
				resourceWrapper = createResourceWrapper(resourceWrapper.resource);
			}

			const { resource } = resourceWrapper;
			const { key = '' } = dataOptions;

			// Get or create an options wrapper
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
				getOrRead(options: ResourceOptions) {
					const data = resource.getOrRead(options, invalidator);
					const props = properties();

					if (data && data.length && isDataTransformProperties(props)) {
						return data.map(props.transform);
					}

					return data;
				},
				getTotal(options: ResourceOptions) {
					return resource.getTotal(options, invalidator);
				},
				setOptions(newOptions: ResourceOptions) {
					optionsWrapper.setOptions(newOptions, invalidator);
				},
				getOptions() {
					return optionsWrapper.getOptions(invalidator);
				},
				get resource() {
					return resourceWrapper;
				},
				shared() {
					return createResourceWrapper(resource, optionsWrapper);
				}
			};
		};
	});
	return data;
}

export const data = createDataMiddleware();

export default data;
