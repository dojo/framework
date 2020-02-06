import { create, invalidator } from '../vdom';

type Invalidator = () => void;

export interface ResourceOptions {
	pageNumber: number;
	query: string;
	pageSize: number;
}

export interface Resource {
	getOrRead: (options: ResourceOptions) => any;
	registerInvalidator: (invalidator: Invalidator) => void;
}

interface OptionsWrapper {
	readonly options: ResourceOptions;
	setOptions(newOptions: ResourceOptions): void;
	registerInvalidator(invalidator: Invalidator): void;
}

export interface ResourceWrapper {
	resource: Resource;
	createOptionsWrapper(): OptionsWrapper;
}

interface DataProperties {
	resource: Resource | ResourceWrapper;
}

interface DataTransformProperties<T = void> {
	transform(item: any): T;
	resource: Resource | ResourceWrapper;
}

interface DataInitialiserOptions {
	reset?: boolean;
	resource?: Resource | ResourceWrapper;
	key?: string;
}

function isResource(resourceWrapperOrResource: ResourceWrapper | Resource): resourceWrapperOrResource is Resource {
	return !(resourceWrapperOrResource as any).resource;
}

function isDataTransformProperties<T>(
	properties: DataTransformProperties | DataProperties
): properties is DataTransformProperties<T> {
	return !!(properties as any).transform;
}

function createOptionsWrapper(): OptionsWrapper {
	let options: ResourceOptions = {
		pageNumber: 1,
		pageSize: 10,
		query: ''
	};

	const invalidators = new Set<Invalidator>();

	function invalidate() {
		[...invalidators].forEach((invalidator) => {
			invalidator();
		});
	}

	return {
		setOptions(newOptions: ResourceOptions) {
			if (newOptions !== options) {
				options = newOptions;
				invalidate();
			}
		},
		get options() {
			return options;
		},
		registerInvalidator: (invalidator: Invalidator) => {
			invalidators.add(invalidator);
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

			if (!cachedOptions) {
				const newOptionsWrapper = resourceWrapper.createOptionsWrapper();
				keyedCachedOptions.set(key, newOptionsWrapper);
				optionsWrapperMap.set(resource, keyedCachedOptions);
				optionsWrapper = newOptionsWrapper;
			} else {
				optionsWrapper = cachedOptions;
			}

			// Return the data API
			return {
				getOrRead(options: ResourceOptions) {
					resource.registerInvalidator(invalidator);
					const data = resource.getOrRead(options);
					const props = properties();

					if (data && data.length && isDataTransformProperties(props)) {
						return data.map(props.transform);
					}

					return data;
				},
				setOptions(newOptions: ResourceOptions) {
					optionsWrapper.registerInvalidator(invalidator);
					optionsWrapper.setOptions(newOptions);
				},
				getOptions() {
					optionsWrapper.registerInvalidator(invalidator);
					return optionsWrapper.options;
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
