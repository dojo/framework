# Dojo Resources

Dojo Resources is designed to provide a consistent pattern to make widgets "resource aware". Resources can be configured to work with any type of data sources. A resource is essentially a Dojo managed data store with built-in caching, pagination, and filtering. Coupled with the `resource` middleware, resources allow consistent, source-agnostic data access for widgets, without the widgets needing to know about the fetching implementation or the raw data format.

| Feature                                   | Description                                                                                                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Support for memory resources**          | Support for using resources as an in-memory data set.                                                                                                        |
| **Single data source**                    | Resources allow creation of a single source of data for a given template that can be shared between multiple widgets using the data middleware.              |
| **Support for async and sync data reads** | Resource templates can read data in any way they like - once data becomes available, the resource middleware reactively invalidates any affected widgets.    |
| **Data transforms**                       | Allows specifying the data format that a widget requires, and transparently transforms source data into the expected output format for the widget to consume |
| **Consistent Resource Options**           | Resource options objects are passed to all api functions ensuring they are pure and provide only the data that was requested.                                |
| **Sharable Resource Options**             | Resource options can be shared between widgets via the resource middleware, allowing multiple widgets to react to resource changes.                          |

## Basic Usage

In order to work with Dojo resources, widgets need to use the `resource` middleware created with the `createResourceMiddleware` factory from `@dojo/framework/middleware/resources`. There are two types of "resource-aware" widgets: widgets that expose a `resource` on their property API and widgets that need to use a resource internally. The same factory is used to create both types of middleware, but the main difference is for widgets that require resources to be passed via properties, a resource type is needed on creation.

Using the `resource` middleware enables working with resource templates in your widget. Resources templates are created using the `createResourceTemplate` factory from `@dojo/framework/middleware/resources`. If a custom template is not passed to the `createResourceTemplate` factory the default resources template will be used. The default template required `initOptions` which include `data` and an `id` to identify the instance of the resource and is passed with `template` into the `resource` middleware to use with a "resource" aware widget.

> App.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { createResourceTemplate, createResourceMiddleware } from '@dojo/framework/core/middleware/resources';
import DataAwareWidget from './DataAwareWidget';

const resource = createResourceMiddleware();
const factory = create({ resource });
const myTemplate = createResourceTemplate<{ foo: string }>();

const App = factory(function App({ id, middleware: { resource } }) {
	return <DataAwareWidget resource={resource({ template, initOptions: { id, data: [{ foo: 'string' }] } })} />;
});
```

## Customizing a template's data source

Dojo resources can be configured for a user-defined data source, such as a RESTful API. This is done by passing an object with a `read` function that is responsible for fetching and setting the external data. The `read` function receives the request that contains details including the offset, page size, and a set of controls which includes a `put` that is used to "set" the read response.

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

## Accessing data within a widget

A "resource aware" widget needs to use the `resource` middleware which provides an API to work with the resource template. The `resource` middleware needs to be created using the `createResourceMiddleware` factory from `@dojo/framework/core/middleware/resources`, passing an interface that defines the expected `resource` data structure for the widget.

Accessing data in the widget is performed using the `getOrRead` function from the `resource` middleware. `getOrRead` requires options to be passed that tell the `resource` what data is required. These options should be accessed using the `options` function. The `getOrRead` method will return the data if it is available, otherwise it will call the `read` function of the resource template. If the `read` function on the resource template is asynchronous the result will be `[undefined]` while the data is being fetched and the widget will re-render when the data is available.

> ResourceAwareWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { createResourceMiddleware } from '@dojo/framework/core/middleware/resources';

interface ResourceData {
	value: string;
}

const resource = createResourceMiddleware<ResourceData>();

const factory = create({ resource });

export const DataAwareWidget = factory(function DataAwareWidget({ id, properties, middleware: { resource } }) {
	const { getOrRead, createOptions } = resource;
	const {
		resource: { template, options = createOptions(id) }
	} = properties();
	const [items] = getOrRead(template, options());
	if (items) {
		return <ul>{items.map((item) => <li>{item.value}</li>)}</ul>;
	}
	return <div>Loading...</div>;
});
```
