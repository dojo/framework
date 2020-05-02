# Dojo Resources

Dojo Resources is designed to provide a consistent pattern to make widgets "data aware". Resource can be configured to work with both external data sources and memory data sources. The resource is essentially a Dojo managed data store with caching, pagination and filtering built in. Coupled with the `data` middleware, resources allow consistent, source-agnostic data access for widgets, without the widgets needing to know about the fetching implementation or the raw data format.

| Feature                                   | Description                                                                                                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Built in support for memory resources** | Default support for using resources with in-memory data.                                                                                                     |
| **Single data source**                    | Resources allow creation of a single source of data for a given template that can be shared between multiple widgets using the data middleware.              |
| **Data transforms**                       | Allows specifying the data format that a widget requires, and transparently transforms source data into the expected output format for the widget to consume |
| **Support for async and sync data reads** | Resource templates can read data in any way they like - once data becomes available, the data middleware reactively invalidates any affected widgets.        |
| **Consistent Resource Options**           | Resource options objects are passed to all api functions ensuring that all api functions are pure and provide only the data that was requested.              |
| **Sharable Resource Options**             | Resource options can be shared between widgets via the data middleware, allowing multiple widgets to react to resource changes.                              |

# Basic Usage

Dojo resources are created using the `createResource` factory from `@dojo/framework/core/resource`. The default resource comes with built-in support for working with in-memory data that can be used with data-aware widgets.

> resource.tsx

```tsx
import { createResource } from '@dojo/framework/core/resource';

export default createResource();
```

This resource can be used with "data aware" widget, meaning any widget that uses the `data` middleware from `@dojo/framework/core/middleware/data`.

> App.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import myResource from './resource';
import DataAwareWidget from './DataAwareWidget';

const factory = create();

const App = factory(function App() {
	return <DataAwareWidget resource={myResource({ data: [] })} />;
});
```

# Customizing a resource's data source

Dojo resources can be configured from a user defined data source, for example a RESTful API. This is done by passing an object with a `read` function that is responsible for fetching and returning the external datam known as a `DataTemplate`.

> userResource.tsx

```tsx
import { createResource } from '@dojo/framework/core/resource';

export default createResource({
	read: async (options: ReadOptions) => {
		// The template is injected with read options, offset, size and query
		const { offset, size } = options;
		// The options can be used to determine the data to fetch
		const response = await fetch(`https://my.user.endpount.com?offset=${offset}&size=${size}`);
		const data = await response.json();

		// The template needs to return the array of data and the total number of items
		return {
			data: data.data,
			total: data.total
		};
	}
});
```

# Accessing data within a widget

A "data aware" widget needs use the `data` middleware that provides an API to work with passed `resource` property. The `data` middleware needs to be created using the `createDataMiddleware` factory from `@dojo/framework/core/middleware/data`, passing an interface that defines the expected `data` structure for the widget.

Accessing data in the widget is performed using the `getOrRead` function from the `data` middleware. `getOrRead` requires options to be passed that tell the `resource` what data is required, these options should be accessed using the `getOptions` function. The `getOrRead` method will return the data if it is available, otherwise it will call the `read` function of the resource's data template. If the `read` function on the data template is asynchronous the result will be `undefined` while the data is being fetched and the widget will re-render when the data is available.

> DataAwareWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { createDataMiddleware } from '@dojo/framework/core/middleware/data';

interface DataState {
	value: string;
}

const data = createDataMiddleware<DataState>();

const factory = create({ data });

export const DataAwareWidget = factory(function DataAwareWidget({ middleware: { data } }) {
	const { getOrRead, getOptions } = data();
	const items = getOrRead(getOptions());
	if (items) {
		return <ul>{items.map((item) => <li>{item.value}</li>)}</ul>;
	}
	return <div>Loading...</div>;
});
```
