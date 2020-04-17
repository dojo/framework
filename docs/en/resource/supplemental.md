# Data templates

Data templates tell a resource how to read data, and can accept a generic which is used to type the transformer.
The template's `read` function receives three paramaters.

-   `options`: A `ReadOptions` object consisting of the current `query`, the read `offset` and the page `size` to request.
-   `put`: A function used to sideload data into the resource. The template can use this to pre-fetch data or to load the full data payload into a memory template. This function takes two parameters, an `offset` at which the data should be set, and the array of `data` to set. It is pre-configured to use the current `ReadOption` query when setting data.
-   `get`: A function used to query the current data in the resource. This function accepts a single parameter, a `query` string used to identify the data to fetch.

## Creating a template

A template is an object containing a `read` function. The read function receives the `ReadOptions` documented above which enable it to fetch and return the appropriate data. The `read` function should return both the `data` requested and the `total` number of results.

> main.ts

```ts
const fetcher = async (options: ReadOptions) => {
	const { offset, size, query } = options;

	const response = await fetchDataFromSomewhere(query, offset, size);
	const data = await response.json();

	return {
		data: data.data,
		total: data.total
	};
};

const template: DataTemplate = {
	read: fetcher
};
```

## Memory templates

Templates that work off of a local in-memory array can also be used as a data source. These types of template use the same creation mechanism as any other template, but with a few extra considerations, namely:

-   Filtering should be catered for through the `query` parameter.
-   The full data set can be sideloaded using the `put` parameter. This gives data-aware widgets access to the full data set up front, and is useful for widgets such as `select` which need to skip to specific content related to a given keypress, for example.

```ts
import USStates from './states';

const memoryTemplate: DataTemplate = {
	read: ({ query }, put) => {
		// filter the data
		const filteredData = filter && query ? USStates.filter((i) => filter(query, i)) : USStates;
		// put the filtered data into the resource so it
		// won't try and read it again for the same query
		put(0, filteredData);
		// return the data that was requested
		return { data: filteredData, total: filteredData.length };
	}
};
```

## Initialising a resource with local data

When the local data being used can change over time, for example if it is dynamically generated, an alternative approach is required to set up a memory template and pass such dynamic data to a widget.

```ts
const memoryTemplate: DataTemplate = {
	read: ({ query }, get, put) => {
		// get the data from the resource
		let data: any[] = get();

		// filter the data
		const filteredData = filter && query ? data.filter((i) => filter(query, i)) : data;
		// put the filtered data into the resource so it
		// won't try and read it again for the same query
		put(0, filteredData);
		// return the data that was requested
		return { data: filteredData, total: filteredData.length };
	}
};

export default factory(function() {
	// pass a resource factory and the data to sideload
	// instead of just the resource
	return (
		<List
			resource={{
				resource: () => createResource(memoryTemplate),
				data: ['dog', 'fish', 'cat']
			}}
		/>
	);
});
```

This approach allows the `data` to be changed at any time, causing the resource to be cleared and the new data sideloaded again. This approach should be used for most in-memory data array scenarios - a good example is [Dojo's `TimePicker` widget](https://github.com/dojo/widgets/tree/master/src/time-picker), where time options are generated and passed to the underlying `Select`.

# Data middleware

The data middleware provides a widget access to the underlying resource and its data. It is comprised of an api to initialize and share the resource, as well as functions to interact with it. The data middleware should be imported and passed to a widget's `create` function in the same as any other middleware - when added to a widget, it exposes two extra widget properties - `resource` and `transform`.

```ts
import { create } from '@dojo/framework/core/vdom';
import data from '@dojo/framework/core/middleware/data';

const factory = create({ data });

export const DataAwareWidget = factory(function DataAwareWidget({
	middleware: { data }
}) {
	const api = data();
}
```

## Creating a typed data middleware

In order to type the data returned by the data middleware, a `createDataMiddleware` function is provided. This function takes a generic that defines both the return types from the `get` / `getOrRead` functions and the keys that must be provided by the `transform` property.
When using `createDataMiddleware` in a widget, the `transform` property becomes required. More information about data transforms can be found [here](/learn/resource/data-middlware#the-transform-prperty).

```tsx
import { create } from '@dojo/framework/core/vdom';
import { createDataMiddleware } from '@dojo/framework/core/middleware/data';

// create the middleware with a generic
const data = createDataMiddleware<{ value: string }>();
const factory = create({ data });
```

## API

The data middleware API provides the widget with access to the resource data.

### getOptions

`getOptions` returns the current `Options` object. The result of this function should be passed to each of the `get` api functions. It is important to use `getOptions` rather than constructing a new `Options` object in order to ensure that shared resources work as expected.

### setOptions

`setOptions` is used to update the current `Options` on the resource wrapper. This will reflect in any other widget using the same shared resource.

```ts
const { getOptions, setOptions } = data();

setOptions({
	...getOptions(),
	pageNumber: 1
});
```

### get

The `get` function takes an `Options` object and returns data as requested if it is already available on the resource. It will not perform a `read`.

```ts
const { getOptions, get } = data();

const data = get(getOptions());
```

### getOrRead

The `getOrRead` function takes an `Options` object and returns the requested data. If the data is not already available, it will perform a `read`. Once the data is available, the widget will be invalidated in a reactive manner.

```ts
const { getOptions, getOrRead } = data();

const data = getOrRead(getOptions());
```

### getTotal

The `getTotal` function takes an `Options` object and returns the current total for the given `query`.
When the total changes or becomes available, the widget will be invalidated.

```ts
const { getOptions, getTotal } = data();

const total = getTotal(getOptions());
```

### isLoading

The `isLoading` function takes an `Options` object and returns a `boolean` to indicate if there is a in-flight read underway for the current `Options`.

```ts
const { getOptions, isLoading } = data();

const loading = isLoading(getOptions());
```

### isFailed

The `isFailed` function takes an `Options` object and returns a `boolean` to indicate if a read with the current `Options` has failed.

```ts
const { getOptions, isFailed } = data();

const failed = isFailed(getOptions());
```

## Data initializer options

### Passed-in resource

If the `resource` is passed in via a different property, or multiple resources need to be provided, these can be given directly to the `data` initializer.

```ts
const { namedResource } = properties();
const { getOptions } = data({ resource: namedResource });
```

### Reset resource

Widgets that do not want to share a resource and need to ensure their resource always gets its own set of `Options` can indicate so with the `reset` initializer. This may be appropriate when creating a typeahead or other such filtering component, where a data query may be shared between multiple locations within an application. Each widget instance should ideally require its own unique copy to avoid inadvertently changing data elsewhere in the application. This option will also create a new `Options` object for widgets that have been passed a `shared` resource.

```ts
const { getOptions } = data({ reset: true });
```

### Resource key

When a widget needs to work with multiple sets of resource `Options` at the same time, a unique `key` should be passed to the middleware initializer for each `Options` set. This enables the data middleware to correctly differentiate between multiple resource options.

```ts
const { getOptions: getOptionsAlpha } = data({ key: 'alpha' });
const { getOptions: getOptionsBravo } = data({ key: 'bravo' });
```

## The resource property

The `resource` widget property can be used to pass a resource, a resource factory and data to initialize the resource with, or a resource wrapper.

### Passing a resource

A resource is the result of the `createResource` function without any `ResourceOptions` or data middleware connections associated to it. This is how a resource is passed into a widget in most cases pertaining to a remote data source.

```tsx
import { DataTemplate, createResource } from '@dojo/framework/core/resource';
import { List } from './List';

const template: DataTemplate = {
	read: async (options: ReadOptions) => {
		const { offset, size } = options;
		let url = `https://my.endpoint.com?offset=${offset}&size=${size}`;

		const response = await fetch(url);
		const data = await response.json();

		return {
			data: data.data,
			total: data.total
		};
	}
};

const resource = createResource(template);

export default factory(function() {
	return <List resource={resource} />;
});
```

### Passing a resource factory with data

A resource factory with data is the approach used when data needs to be sideloaded into the resource. This will commonly be used when working with an in-memory data array and a memory template, as it allows the resource data to be reloaded when the provided data is changed.

```tsx
import { DataTemplate, createResource } from '@dojo/framework/core/resource';
import { List } from './List';

const memoryTemplate: DataTemplate = {
	read: ({ query }, get, put) => {
		let data: any[] = get();
		const filteredData = filter && query ? data.filter((i) => filter(query, i)) : data;
		put(0, filteredData);
		return { data: filteredData, total: filteredData.length };
	}
};

export default factory(function() {
	return (
		<List
			resource={{
				resource: () => createResource(memoryTemplate),
				data: ['dog', 'fish', 'cat']
			}}
		/>
	);
});
```

### Passing in a resource wrapper

A resource wrapper is obtained from the data middleware. It is used inside widgets when they wish to pass their resource into a child widget either as a new wrapper with it's own `Options`, or as a `shared` wrapper with a common set of `Options`.

```tsx
import { create } from '@dojo/framework/core/vdom';
import { data } from '@dojo/framework/core/middleware/data';

const factory = create({ data });

export const DataAwareWidget = factory(function ({
	middleware: { data }
}) {
	const { resource, shared } = data();

	return (
		<virtual>
			// this List will be given the underlying resource
			// with no shared `Options
			<List resource={resource} />
			// this List will share `Options` with the
			// parent widget
			<List resource={shared()} />
		</virtual>
	)
}
```

This approach is used within [Dojo's `Typeahead` widget](https://github.com/dojo/widgets/tree/master/src/typeahead) to share the query between the text input and the list of options. [More information on this is available in the sharing section below](#sharing).

## The transform property

The `transform` property is used to convert data returned by the `read` function into the format expected by the widget. When a widget uses the standard `data` middleware, `transform` is an optional property. However, when a widget creates a typed middleware using the `createDataMiddleware` function, it becomes a required property and is typed via a generic to ensure that the correct data format is created by the transform configuration.

The transform is transparent and occurs in the middleware before data is returned to the widget. When performing queries on the resource, a reverse transform is used to convert the widget values back to the source values provided.

```ts
// resource data
const resourceData = [{ firstname: 'joe', lastname: 'bloggs' }, { firstname: 'jane', lastname: 'doe' }];

// with a transform of
const transform = {
	value: ['firstname']
};

// would create
const transformedData = [{ value: 'joe' }, { value: 'jane' }];
```

Transforms can also be used to join source keys together to create composite fields. For example, with the same resource data as above:

```ts
// with a transform of
const transform = {
	value: ['firstname', 'lastname']
};

// would create
const transformedData = [{ value: 'joe bloggs' }, { value: 'jane doe' }];
```

### Using a typed transform

```tsx
import { create } from '@dojo/framework/core/vdom';
import { createDataMiddleware } from '@dojo/framework/core/middleware/data';

// create the middleware with a generic
const data = createDataMiddleware<{ value: string }>();
const factory = create({ data });

export const DataAwareWidget = factory(function ({
	middleware: { data }
}) {
	const { getOrRead, getOptions } = data();
	const data = getOrRead(getOptions());

	return (
		<virtual>
			{ data.map(item => <span>{item.value}</span>) }
		</virtual>;
	)
}

// in render function elsewhere
<List resource={resource} transform={{ value: ['firstname', 'lastname']}}>
// if a key other than `value` was passed in the transform or no transform at all
// was passed, a type error would occur
```
