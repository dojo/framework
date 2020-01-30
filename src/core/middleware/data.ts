import { create, invalidator } from '../vdom';

export interface ResourceOptions {
	pageNumber: number;
	query: string;
	pageSize: number;
}

interface Resource {
	getOrRead: (options: ResourceOptions) => any;
	registerInvalidator: (invalidator: any) => void;
}

interface ResourceWrapper {
	resource: Resource;
	createOptions: any;
}

interface DataProperties<T = void> {
	resource: Resource | ResourceWrapper;
	transform: (item: any) => T;
}

interface Basic {
	resource: Resource | ResourceWrapper;
}

interface DataOptions {
	reset?: boolean;
	resource?: Resource | ResourceWrapper;
	key?: string;
}

function isResource(resourceWrapperOrResource: ResourceWrapper | Resource): resourceWrapperOrResource is Resource {
	return !(resourceWrapperOrResource as any).resource;
}

function isDataProperties<T>(value: any): value is DataProperties<T> {
	return !!value.transform;
}

function createOptions() {
	let options: ResourceOptions = {
		pageNumber: 1,
		pageSize: 5,
		query: ''
	};

	let invalidators = new Set();

	function setOptions(newOptions: ResourceOptions) {
		if (newOptions !== options) {
			options = newOptions;
			invalidate();
		}
	}

	function invalidate() {
		[...invalidators].forEach((invalidator: any) => {
			invalidator();
		});
	}

	function getOptions() {
		return options;
	}

	return {
		setOptions,
		getOptions,
		registerInvalidator: (invalidator: () => void) => {
			invalidators.add(invalidator);
		}
	};
}

function createResourceWrapper(resource: Resource, options?: any): ResourceWrapper {
	return {
		resource,
		createOptions: options ? () => options : createOptions
	};
}

export function createDataMiddleware<T = void>() {
	const factory = create({ invalidator }).properties<T extends void ? Basic : DataProperties<T>>();

	const data = factory(({ middleware: { invalidator }, properties }) => {
		const optionsMap = new WeakMap<Resource, Map<string, Resource>>();

		return (dataOptions: DataOptions = {}) => {
			let resourceWrapperOrResource = dataOptions.resource || properties().resource;
			let resourceWrapper: ResourceWrapper;
			if (isResource(resourceWrapperOrResource)) {
				resourceWrapper = createResourceWrapper(resourceWrapperOrResource);
			} else {
				resourceWrapper = resourceWrapperOrResource;
			}
			if (dataOptions.reset) {
				resourceWrapper = createResourceWrapper(resourceWrapper.resource);
			}
			let options: any;
			const { resource } = resourceWrapper;
			const { key = '' } = dataOptions;

			let keyedCachedOptions = optionsMap.get(resource);
			if (!keyedCachedOptions) {
				keyedCachedOptions = new Map<string, Resource>();
			}

			let cachedOptions = keyedCachedOptions.get(key);

			if (!cachedOptions) {
				const newOptions = resourceWrapper.createOptions();
				keyedCachedOptions.set(key, newOptions);
				optionsMap.set(resource, keyedCachedOptions);
				options = newOptions;
			} else {
				options = cachedOptions;
			}

			return {
				getOrRead(options: ResourceOptions) {
					resource.registerInvalidator(invalidator);
					const data = resource.getOrRead(options);
					const props = properties();

					if (data && data.length && isDataProperties(props)) {
						return data.map(props.transform);
					}

					return data;
				},
				setOptions(newOptions: ResourceOptions) {
					options.registerInvalidator(invalidator);
					options.setOptions(newOptions);
				},
				getOptions() {
					options.registerInvalidator(invalidator);
					return options.getOptions();
				},
				get resource() {
					return resourceWrapper;
				},
				shared() {
					return createResourceWrapper(resource, options);
				}
			};
		};
	});
	return data;
}

export const data = createDataMiddleware();

export default data;
