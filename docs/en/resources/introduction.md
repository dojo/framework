# Dojo Resources

Dojo Resources is designed to provide a consistent pattern to make widgets "resource aware". Resources can be configured to work with any type of data sources. A resource is essentially a Dojo managed data store with built-in caching, pagination, filtering, and custom Apis. Coupled with the `resource` middleware, resources allow consistent, source-agnostic data access for widgets, without the widgets requiring knowledge about the fetching implementation or the raw data format.

| Feature                                   | Description                                                                                                                                                  |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Support for any type of data source**   | Resources can be used backed by pre-loaded data or data from an external source.                                                                             |
| **Single data source**                    | Resources allow creation of a single source of data for a given template that can be shared between multiple widgets using the data middleware.              |
| **Support for async and sync data reads** | Resource templates can read data in any way they like - once data becomes available, the resource middleware reactively invalidates any affected widgets.    |
| **Data transforms**                       | Allows specifying the data format that a widget requires, and transparently transforms source data into the expected output format for the widget to consume |
| **Consistent Resource Options**           | Resource options objects are passed to apis designed to read data.                                                                                           |
| **Sharable Resource Options**             | Resource options can be shared between widgets via the resource middleware, allowing multiple widgets to react to resource changes, such as page changes     |

## Basic Usage

In order to work with Dojo resources, widgets need to use the `resource` middleware created with the `createResourceMiddleware` factory from `@dojo/framework/middleware/resources`. There are two types of "resource-aware" widgets: widgets that expose a `resource` on their property API and widgets that need to use a resource internally. The same factory is used to create both types of middleware, but the main difference is for widgets that require resources to be passed via properties, a resource type is needed on creation.

```tsx
interface ResourceData {
	id: string;
	name: string;
}

// Add `resource` to the widgets API
const resource = createResourceMiddleware<ResourceData>();

// For using resources internally only, no property is added to the
// widget property API
const resource = createResourceMiddleware();
```

Using the `resource` middleware enables working with resource templates in your widget. Resources templates are created using the `createResourceTemplate` factory from `@dojo/framework/middleware/resources`. If a custom template is not passed to the `createResourceTemplate` factory the default resources template will be used.

To create a default template requires a generic to define the type of the resource data and the `idKey` of the resource data, this means the property that resources will treat as the unique id of the data.

```tsx
interface ResourceData {
	id: string;
	name: string;
}

const template = createResourceTemplate<ResourceData>('id');
```

The default template requires initialization with an `id` to identify the instance of the resource and array of data for the resource, this can be used when working with a data set that is already loaded. Template's that require initialization need to be called to create the "stamped" template that can be used with resources.

```tsx
template({ id: 'id', data: [{ id: '1', name: 'First' }] });
```

For the basic usage scenario to passing a template does not require importing and using the `resource` middleware inside your widget. If the resource data interface and the required data interface for the widget match and no custom options are required then the template can be passed directly to the `resource` property. If the default template is required, then a template is not required as Dojo Resources will automatically create a default template using an `id`, `data` and `idKey` passed as an object to resources.

> App.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { createResourceTemplate } from '@dojo/framework/core/middleware/resources';
import ResourceAwareWidget from './ResourceAwareWidget';

interface ResourceData {
	id: string;
	name: string;
}

const myTemplate = createResourceTemplate<{ id: string }>();
const factory = create();

const App = factory(function App({ id }) {
	return (
		<div>
			<ResourceAwareWidget resource={template({ id, data })} />
			<ResourceAwareWidget resource={{ id, data, idKey: 'id' }} />
		</div>
});
```

## Customizing a template's data source

Dojo resources can be configured for a user-defined data source, such as a RESTful API. This is done by creating a resource template with a custom implementation of the `read` API, using the `createResourceTemplate` factory. The `read` function receives the request that contains details including the offset, page size, and a set of controls which includes a `put` that is used to "set" the read response.

> userResourceTemplate.tsx

```tsx
import { createResourceTemplate } from '@dojo/framework/core/middleware/resources';

interface RemoteResourceData {
	id: string;
	name: string;
}

export default createResourceTemplate<RemoteResourceData>({
	idKey: 'id',
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

Accessing data in the widget is performed using the `get` function from the return from by passing the template to the `resource.template` factory. The `get` function requires the standard options, `offset`, `size` and `query`. Dojo resources provides a standard mechanism, `createOptions` from the resource middleware, for creating and managing options, including ensuring that widgets are invalidated when "shared" options are updated. The `createOptions` factory accepts a function that is called when the options are updated allow the owner of the options to control the changes, with the current and next options are passed to the setter.

```tsx
const { createOptions } = resource;

// by default, the setter will normally need to merge the next
// options over the current options
const options = createOptions((curr, next) => {
	return { ...curr, ...next };
});

// however if certain queries are always required for the resource
// such as an "id' that can be always set
const options = createOptions((curr, next) => {
	return { ...curr, ...next, query: { ...next.query, id: 'my-id' } };
});
```

By default the `get` function will not try to read from the template, only attempting to fullfil the request with existing data. To ensure that Dojo resources tries to read the data if the request cannot be fulfilled a "read" function needs to be passed to the `get` function.

```tsx
const {
	createOptions,
	get,
	template: { read }
} = resource.template(myTemplate);

const options = createOptions((curr, next) => ({ ...curr, ...next }));
const data = get(options(), { read });
```

If the `read` function on the resource template is asynchronous the result could be `undefined` while the data is being fetched and the widget will re-render when the data is available.

> ResourceAwareWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { createResourceMiddleware } from '@dojo/framework/core/middleware/resources';

interface ResourceData {
	value: string;
}

const resource = createResourceMiddleware<ResourceData>('value');

const factory = create({ resource });

export const DataAwareWidget = factory(function DataAwareWidget({ id, properties, middleware: { resource } }) {
	const {
		resource: { template, options = resource.createOptions(id) }
	} = properties();
	const {
		get,
		template: { read }
	} = resource.template(template);

	const items = get(options(), { read });
	if (items) {
		return <ul>{items.map((item) => <li>{item.value}</li>)}</ul>;
	}
	return <div>Loading...</div>;
});
```
