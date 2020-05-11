# Dojo Resources

Dojo Resources is designed to provide a consistent pattern to make widgets "resource aware". Resource can be configured to work with both external data sources and memory data sources. The resource is essentially a Dojo managed data store with caching, pagination and filtering built in. Coupled with the `resource` middleware, resources allow consistent, source-agnostic data access for widgets, without the widgets needing to know about the fetching implementation or the raw data format.

| Feature                                   | Description                                                                                                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Built in support for memory resources** | Default support for using resources with in-memory data.                                                                                                     |
| **Single data source**                    | Resources allow creation of a single source of data for a given template that can be shared between multiple widgets using the data middleware.              |
| **Data transforms**                       | Allows specifying the data format that a widget requires, and transparently transforms source data into the expected output format for the widget to consume |
| **Support for async and sync data reads** | Resource templates can read data in any way they like - once data becomes available, the resource middleware reactively invalidates any affected widgets.    |
| **Consistent Resource Options**           | Resource options objects are passed to all api functions ensuring that all api functions are pure and provide only the data that was requested.              |
| **Sharable Resource Options**             | Resource options can be shared between widgets via the resource middleware, allowing multiple widgets to react to resource changes.                          |

# Basic Usage

Dojo resources are created using the `createResourceTemplate` factory from `@dojo/framework/middleware/resources`. The default template comes with built-in support for working with in-memory data that can be used with data-aware widgets. This template can be used with "resource aware" widget, meaning any widget that uses the `resource` middleware from `@dojo/framework/core/middleware/resources`.

> App.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import DataAwareWidget from './DataAwareWidget';

const factory = create();
const template = createResourceTemplate<{ foo: string }>();

const App = factory(function App() {
	return <DataAwareWidget resource={template({ data: [{ foo: 'string' }] })} />;
});
```

# Customizing a template's data source

Dojo resources can be configured for a user defined data source, for example a RESTful API. This is done by passing an object with a `read` function that is responsible for fetching and setting the external data. The `read` function receives the request that contains details including the offset and page size and a set of controls, including `put` that need to be used to "set" the read response.

> userResourceTemplate.tsx

```tsx
import { createResourceTemplate } from '@dojo/framework/core/middleware/resources';

export default createResourceTemplate({
	read: async (request: ResourceReadRequest, controls: ResourceControls) => {
		// The template is injected with read request, offset, size and query
		const { offset, size } = request;
		// The request details are used to determine the data to fetch
		const response = await fetch(`https://my.user.endpount.com?offset=${offset}&size=${size}`);
		const data = await response.json();
		// The template needs to set the response using the resource controls put function
		// along with the original request
		controls.put({ data: data.data, total: data.total }, request);
	}
});
```

# Accessing data within a widget

A "resource aware" widget needs use the `resource` middleware that provides an API to work with the resource template. The `resource` middleware needs to be created using the `createResourceMiddleware` factory from `@dojo/framework/core/middleware/resources`, passing an interface that defines the expected `resource` data structure for the widget.

Accessing data in the widget is performed using the `getOrRead` function from the `resource` middleware. `getOrRead` requires options to be passed that tell the `resource` what data is required, these options should be accessed using the `options` function. The `getOrRead` method will return the data if it is available, otherwise it will call the `read` function of the resource template. If the `read` function on the resource template is asynchronous the result will be `[undefined]` while the data is being fetched and the widget will re-render when the data is available.

> ResourceAwareWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { createResourceMiddleware } from '@dojo/framework/core/middleware/resources';

interface ResourceData {
	value: string;
}

const resource = createDataMiddleware<ResourceData>();

const factory = create({ resource });

export const DataAwareWidget = factory(function DataAwareWidget({ middleware: { resource } }) {
	const { getOrRead, options } = resource();
	const [items] = getOrRead(options());
	if (items) {
		return <ul>{items.map((item) => <li>{item.value}</li>)}</ul>;
	}
	return <div>Loading...</div>;
});
```
