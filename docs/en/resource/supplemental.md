# Data Templates

Data templates tells the resource how to read data and can accept a generic which is used to type the transformer.
The templates `read` function receives three paramaters.

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
-   We can side load the full data set using the `put` param. This will allow data-aware widgets access to the full data set up front and is useful for widgets suchg as `select` which need to skip to content related to a given keypress etc...

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

The data middleware provides a widget with access to the underlying resource via the data middleware which offers an api to initialise and share the resource and functions to interact with it.

## API

### get options

### set options

### get

### getorread

### gettotal

## Sharing

## Named prop for resource

## Reset resource
