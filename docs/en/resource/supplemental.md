# Data Templates

Data templates tell the resource how to read data and can accept a generic which is used to type the transformer.
The template's `read` function receives three paramaters.

-   options: This is a `ReadOptions` object consisting of the current `query`, the read `offset` and the page `size` to request.
-   put: This is a function that can be used to side-load data into the resource. This could be used by the template to pre-fetch data or to load the full data payload in a memory template. This function takes two parameters, an `offset` to place the data and the array of `data` to load. It is pre-configured to use the current `ReadOption` query when setting data.
-   get: This function can be used to query the current data in the resource. This function accepts a single parameter of the `query` string you wish to use.

## Creating a template

A template is a simple object containing a `read` function. The read function recieves the params documented above which enable it to fetch and return the appropriate data. The read function should return both the `data` requested and the `total` number of results.

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

## Creating a memory template

Sometimes we may want to create a template that works off of a local in-memory array rather than via an async endpoint. When creating this type of template, the same approach is taken but we have a couple of things to consider.

-   We should cater for filering via the query option.
-   We can side load the full data set using the `put` param. This will allow data-aware widgets access to the full data set up front and is useful for widgets such as `select` which need to skip to content related to a given keypress etc...

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

When the local data you're using may change or is generated, an alternative approach is required to set up a memory template and pass data to the widget.

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

The above approach will allow the `data` to be changed at any time causing the resource to be cleared and the new data sideloaded again. This is the approach that should be used in most in memory data array scenarios and can be seen being used within our `TimePicker` widget when time options are generated and passed to the `Select`.

# Data Middleware

The data middleware provides a widget with access to the underlying resource via the data middleware which offers an api to initialise and share the resource and functions to interact with it. The middleware should be imported and passed to the widgets `create` function the same as other middlwares. It will add two extra properties to your widget; `resource` and `transform`.

```ts
import { create } from '@dojo/framework/core/vdom';
import { createDataMiddleware } from '@dojo/framework/core/middleware/data';

const factory = create({ data });

export const DataAwareWidget = factory(function ({
	middleware: { data }
}) {
	const api = data();
}
```

## The Resource Property

The resource property added to a widget can be used to pass a resource, a resource factory and data to initialise the resource with or a resource wrapper.

### resource

A resource is the result of the `createResource` function. It is a new resource and does not have any `ResourceOptions` or data middleware connections associated to it. This is how you will pass a resource into a widget in most cases pertaining to a remote data source.

```tsx
import { DataTemplate, createResource } from '@dojo/framework/core/resource';
import { fetcher } from './personfetcher';
import { List } from './List';

const template: DataTemplate = {
	read: fetcher
};

const resource = createResource(template);

export default factory(function() {
	return <List resource={resource} />;
});
```

### resource factory with data

A resource factory with data is the approach you would use when you wish to side load data into the resource. This will commonly be used when working in an in memory data array and a memory template as it allows the resource data to be reloaded when the data passed is changed.

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

### resource wrapper

The resource wrapper is obtained from the data middleware. It is used inside widgets when they wish to pass the resource onto a child widget either as a new wrapper with it's own `ReadOptions` or as a `shared` wrapper with a common set of `ReadOption`.

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
			// with no shared `ReadOptions
			<List resource={resource} />
			// this List will share `ReadOptions` with the
			// parent widget
			<List resource={shared()} />
		</virtual>
	)
}
```

This shared approach is used within our typeahead widget to share the query between the text input and the list of options. See more information on this in the `sharing` section below.

## The Transform Property

The `transform` property is used to convert the data returned by the `read` function to the format expected by the widget. When a widget uses the standard `data` middleware, `transform` is an optional property. However, when a widget creates a typed middleware using the `createDataMiddleware` function, it becomes a required property and is typed via a generic to ensure that the correct data format is created by the transform config.

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

Transforms can also be used to join source keys together to create composite fields. For example, with the same resource data as above

```ts
// with a transform of
const transform = {
	value: ['firstname', 'lastname']
};

// would create
const transformedData = [{ value: 'joe bloggs' }, { value: 'jane doe' }];
```

### using a typed transform

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

## API

The data middleware is provided as a function

### get options

### set options

### get

### getorread

### gettotal

## Sharing

## Named prop for resource

## Reset resource
