# Resource Concepts

Dojo resources is designed to provide a cohesive and consistent mechanism for working with data within a Dojo application. There are core concepts for Dojo Resources:

-   Resource Templates
-   Resource Store
-   Resource Middleware

## Templates

The resource template is a description that the resources uses to `read`, `find` and `init` data in the store. Resource templates are flexible to enable connecting resources to multiple different providers, for example RESTful APIs, client data (using an in-memory template).

Templates should be stateless so that they can be re-used across through-out an application, using the resource options to determine the data required and the resource controls to interact with the resource store, for example putting the data into the store.

Create a template using `createResourceTemplate` from the `@dojo/framework/core/middleware/resources` module.

> userResourceTemplate.ts

```tsx
import { createResourceTemplate } from '@dojo/framework/core/middleware/resources';

interface User {
	firsName: string;
	lastName: string;
	username: string;
	email: string;
}

// The type for the data is passed to the `createResourceTemplate` factory
export default createResourceTemplate<User>({
	init: (data: User[], controls: ResourceControls) => {
		// initialize the resource with any data that is passed
		// to the widget using the resource controls
	},
	read: (request: ResourceReadRequest, controls: ResourceControls) => {
		// use the `request` to "fetch" the data from the data-source
		// and use the controls to set the data into the store.
	},
	find: (request: ResourceFindRequest, controls: ResourceControls) => {
		// use the controls with the request to set the found item based
		// on the request
	}
});
```

The resource controls are injected to all the data template functions to enable working with the backing resource store. `get()` is used to return data from the store based on the `request` passed and `put()` is used to set data into the store for the `request`.

See the [Resource Templates section](/learn/resources/resource-templates) for more details.

## Store

The resource store is where all the data is stored and responsible for wiring widgets using the `resource` middleware with the `ResourceTemplate` passed to the widget. The store invalidates all widgets that have subscribed for events based on the type and details of the event as well as handling asynchronous results from the resource template. The resource store is automatically created for a template that is passed to a widget. A user never explicitly creates or works directly with the resource store.

> MyWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';

import DataAwareWidget from './DataAwareWidget';
import userResourceTemplate from './userResourceTemplate';

const factory = create();

export default factory(function MyWidget() {
	return (
		<div>
			{/* The resource store is created internally for the template passed to the widget */}
			<DataAwareWidget resource={userResourceTemplate()}>
		</div>
	);
});
```

## Middleware

The resource middleware is responsible for creating and initializing the resource store based for the template passed as a widget's `resource` property. The middleware exposes the complete API for working with the created resource's data.

> MyResourceAwareWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { createResourceMiddleware } from '@dojo/framework/core/middleware/resources';

import FancyLoadingIndicator from './FancyLoadingIndicator';

// The resource item interface
interface ResourceItem {
	label: string;
}

// create the resource middleware passing the type of the resource required
const resource = createResourceMiddleware<ResourceItem>();

// pass the created middleware to the `create` function
const factory = create({ resource });

export default factory(function MyResourceAwareWidget({ middleware: { resource } }) {
	// Call the `resource` middleware for access to the API
	const { getOrRead, isLoading, options } = resource();
	// Call `getOrRead` to request the data based on the `options`
	const [items = []] = getOrRead(options({ page: 1, size: 20 }));
	// Check if the resource is current loading
	if (isLoading(options())) {
		// if the resource is loading return a fancy loading indicator
		return <FancyLoadingIndicator />;
	}
	// If the items have been loaded return them in a list
	return <div>{items.map((item) => <li>{item.label}</li>)}</div>;
});
```

Please see the [`resource` middleware](/learn/resources/resource-middleware) for more information.

# Resource Templates

A resource template describes how Dojo resources interact with it's data-source based on the options passed. Resource templates are statically defined and used through an application to power "resource aware" widgets. A `ResourceTemplate` consists of three APIs:

-   `init()`
    -   An initializer function designed to deal with data passed to widgets with the template.
-   `read()`
    -   The function responsible for fetching the resource data based on the `ResourceReadRequest` and setting it in the store.
-   `find()`
    -   The function responsible for `finding` an item in the resource data based on the `ResourceFindRequest` and setting it in the store.

```tsx
interface ResourceTemplate<S = {}, T = {}> {
	read: ResourceRead<S>;
	init?: ResourceInit<S>;
	find?: ResourceFind<S>;
}
```

## Resource Controls

`ResourceControls` are injected as the second argument to all the `ResourceTemplate` APIs and need to be used to get existing cached data from the resource store and put items into the store.

```tsx
export interface ResourceGet<S> {
	(request?: ResourceReadRequest<S>): ResourceReadResponse<S>;
}
export interface ResourcePut<S> {
	(readResponse: ResourceReadResponse<S>, readRequest: ResourceReadRequest<S>): void;
	(findResponse: ResourceFindResponse<S> | undefined, findRequest: ResourceFindRequest<S>): void;
}
export interface ResourceControls<S> {
	get: ResourceGet<S>;
	put: ResourcePut<S>;
}
```

## `read()`

The `ResourceTemplate.read` function is responsible for fetching requested data for the resource and setting it in the store using the `put` resource control. There are no restrictions to how the data is sourced as long as the `ResourceReadResponse` is set in the store using the `put` resource control.

```tsx
interface ResourceRead<S> {
	(request: ResourceReadRequest<S>, controls: ResourceControls<S>): void | Promise<void>;
}
```

The `ResourceReadRequest` has the offset, page size and query of the request. The `query` is a an object with the key mapping to a key of the resource item data interface for the associated value.

```tsx
type ResourceQuery<S> = { [P in keyof S]?: any };

interface ResourceReadRequest<S> {
	offset: number;
	size: number;
	query: ResourceQuery<S>;
}
```

## `find()`

The `ResourceTemplate.find` function is responsible for finding specific items within a resource based on the find criteria and setting it in the store using the `put` resource control. There are no restrictions to how the data is found as long as the `ResourceFindResponse` is set in the store using the `put` resource control.

```tsx
export interface ResourceFind<S> {
	(options: ResourceFindRequest<S>, controls: ResourceControls<S>): void | Promise<void>;
}
```

The `ResourceFindRequest` has the current resource `options`, `query`, `type` and `start` index for the find request. The `query` is the same as the `query` object used with `ResourceFindRequest`, an object with the key mapping to a key of the resource item data interface for the associated value.

```tsx
type FindType = 'exact' | 'contains' | 'start';

interface ResourceFindRequest<S> {
	options: ResourceOptions<S>;
	query: ResourceQuery<S>;
	start: number;
	type: FindType;
}
```

```tsx
import { createResourceTemplate } from '@dojo/framework/core/middleware/resources';

interface User {
	firsName: string;
	lastName: string;
	username: string;
	email: string;
}
```

The `type` describes how to use the query to find the item in the resource, there are three different types.

-   `contains` (default)
    -   Requesting an item where the value contains the the query item value
-   `exact`
    -   Requesting an item that are an exact match of the query value
-   `start`
    -   Requesting an item that where the value starts with the query value

## `init()`

The `init` function is used to deal with data passed with the `template` when passed to a widget. By default any data is added to the resource store, the `init` function should only be required to deal with custom scenarios.

```tsx
interface ResourceInit<S> {
	(data: S[], controls: ResourceControls<S>): void;
}
```

The `data` is injected into the function along with the standard `ResourceControls` to be used to add the data into the resource store.

## Memory Resource Templates

Dojo resources offers a pre-configured memory resource template that implements the complete resource template API. The memory template is designed to work with [data passed to a widget when using the template](/learn/resources/using-resource-templates) that initializes the resource store for the template. The memory template is created using the `createMemoryResourceTemplate` factory from `@dojo/framework/core/middleware/resources`, with the type of the resource data being passed to the factory.

> MyWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { createMemoryResourceTemplate } from '@dojo/framework/core/middleware/resources';

interface ResourceItem {
	value: string;
}

interface MyWidgetProperties {
	items: ResourceItem[];
}

const factory = create().properties;

const template = createMemoryResourceTemplate<ResourceItem>();

export default factory(function MyWidget({ properties }) {
	const { items } = properties();
	return <MyResourceAwareWidget resource={template({ data: items })}>
});
```

For more information please see the [Using Resource Templates](/learn/resource/using-resource-templates).

## Custom Resource Templates

To connect a resource to an custom data-source, such as a RESTful API the `createResourceTemplate()` factory can be used. At a minimum the `read` API needs to be fulfilled with the additional `init` and `find` optional.

> myResourceTemplate.ts

```tsx
import { createResourceTemplate } from '@dojo/framework/core/middleware/resources';

interface MyResource {
	id: string;
	name: string;
	email: string;
}

export default createResourceTemplate<MyResource>({
	init: (data: User[], controls: ResourceControls) => {
		// adds any data passed with the template to resource store
		controls.put(data);
	},
	read: async (request: ResourceReadRequest, controls: ResourceControls) => {
		const { offset, size, query } = request;
		// use the request details to fetch the required set of data
		const url = `https://my-data-source.com?size=${size}&offset=${offset}&query${JSON.stringify(query)}`;
		const response = await fetch(url);
		const json = await response.json();
		controls.put({ data: json.data, total: json.total }, request);
	},
	find: (request: ResourceFindRequest, controls: ResourceControls) => {
		const { query, options, start, type } = request;
		// use the start, query, type and options to find an item from the data-source
		const url = `https://my-data-source.com/?start=${start}&type=${type}&find${JSON.stringify(query)}`;
		const response = await fetch(url);
		const json = await response.json();
		controls.put({ item: json.item, index: json.index }, request);
	}
});
```

## Typing Resource Templates

The resource template factories all accept a generic that is used to type the shape of the resource data. It is highly recommended to provide typings to the template so that when the template is passed to a widget the typings for data and transform can be inferred correctly. As referenced in the previous examples, typing a resource requires passing the resource data type interface on creation of the template.

> userResourceTemplate.ts

```tsx
import { createResourceTemplate } from '@dojo/framework/core/middleware/resources';

interface User {
	firsName: string;
	lastName: string;
	username: string;
	email: string;
}

export default createResourceTemplate<User>({
	// the template implementation
});
```

# Using Resource Templates

Resource templates can be passed to any widget that has been created using the [`resources` middleware](/learn/resources/resource-aware-widgets).

> MyWidget.ts

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { createResourceTemplate } from '@dojo/framework/core/middleware/resources';

import MyResourceAwareWidget from './MyResourceAwareWidget';

const factory = create();

interface MyResourceType {
	value: string;
}

const template = createResourceTemplate<MyResourceType>({
	read: (request, controls) => {
		// use the request to get the required data
		// use the controls to populate the resource
	}
});

export factory(function MyWidget() {
	return (
		<div>
			<MyResourceAwareWidget resource={template()}>
		</div>
	);
});
```

## Passing Resource Data

Data can be passed with the template to initialize the resource, even if the resource template is configured to with a custom data source. The `data` is an array of the resource templates data type, in this example this is `{ value: string; }[]`.

> MyWidget.ts

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { createResourceTemplate } from '@dojo/framework/core/middleware/resources';

import MyResourceAwareWidget from './MyResourceAwareWidget';

const factory = create();

interface MyResourceType {
	value: string;
}

const template = createResourceTemplate<MyResourceType>({
	read: (request, controls) => {
		// use the request to get the required data
		// use the controls to populate the resource
	}
});

export factory(function MyWidget() {
	return (
		<div>
			<MyResourceAwareWidget resource={template({ data: [{ value: 'foo'}, { value: 'bar'}] })}>
		</div>
	);
});
```

## Transforming Data

When a widget has been configured with to use `resources` middleware with a different data interface to the template a "transform" descriptor is required. The `transform` is an object keyed by a key of the `resources` middleware type that maps to a key of the resource template type.

> MyWidget.ts

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { createResourceTemplate } from '@dojo/framework/core/middleware/resources';

import MyResourceAwareWidget from './MyResourceAwareWidget';

const factory = create();

interface MyResourceType {
	custom: string;
}

const template = createResourceTemplate<MyResourceType>({
	read: (request, controls) => {
		// use the request to get the required data
		// use the controls to populate the resource
	}
});

export factory(function MyWidget() {
	return (
		<div>
			<MyResourceAwareWidget resource={template({
				transform: { value: 'custom' },
				data: [{ custom: 'foo'}, { custom: 'bar'}]
			})}>
		</div>
	);
});
```

# Resource Middleware

The `resource` middleware is used to create "resource-aware" widgets, the middleware automatically decorates the widget with the required `resource` property and is used by the widget to interact with any resource passed. The `resources` middleware passed to the widget is a factory that returns back the complete API for working with resources. The simplest scenario is using the `resources` middleware to return data for a requested page. This is done using the `getOrRead` API that required the data options, `getOrRead(options())`, the `getOrRead` function is designed to be reactive, meaning if the data is not immediately available (i.e. the resource is asynchronous and not already been read for the provided options) then it will return `undefined` for each page requested, so that the widget can deal with the "loading" data scenario.

> MyResourceAwareWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { createResourceMiddleware } from '@dojo/framework/core/middleware/resources';

interface ResourceData {
	value: string;
	label: string;
}

const resource = createResourceMiddleware<ResourceData>();

const factory = create({ resource });

export default factory(function MyDataAwareWidget({ resource }) {
	const { getOrRead, options } = resource();
	// getOrRead supports multiple pages so the results are return in an array
	const [items] = getOrRead(options());

	if (!items) {
		return <div>Loading...</div>;
	}
	return <ul>{items.map((item) => <li>{item.label}</li>)}</ul>;
});
```

## `resource` middleware API

### `options`

`options` returns the current `ResourceOptions` object for the resource. The result of the `options` function should be used when working with the `getOrRead`, `isLoading`, `isFailed` and `find` APIs. It is important to `options` rather than constructing a new `ResourceOptions` object in order to ensure that resources that [share control of the options](/learn/resources/composing-behavior-with-resources) work as expected.

```tsx
interface ResourceOptions<S> {
	page: number | number[];
	query: ResourceQuery<S>;
	size: number;
}
```

`options` optionally accepts a partial of the `ResourceOptions` in order to update the resources options.

### `getOrRead`

The `getOrRead` function takes an `ResourceOptions` object and returns an array of data for each of the pages requested in the passed `options`. If the data is not already available, it will perform a `read` using the passed template. Once the `data` has been set in the resource, the widget will be invalidated in a reactive manner.

```tsx
const { options, getOrRead } = data();

const [data] = getOrRead(options({ page: 1, size: 30 }));
```

Multiple pages can be passed in the `options`, each of the pages requested will be returned in the resulting array.

```tsx
const { options, getOrRead } = data();

const [pageOneData, pageTwoData, pageThreeData] = getOrRead(options({ page: [1, 2, 3], size: 30 }));
```

### `isLoading`

The `isLoading` function takes an `ResourceOptions` object and returns a `boolean` to indicate if there is a in-flight read underway for the current `ResourceOptions`.

```tsx
const { options, isLoading } = data();

const loading = isLoading(options());
```

### `isFailed`

The `isFailed` function takes an `ResourceOptions` object and returns a `boolean` to indicate if a read with the current `ResourceOptions` has failed.

```tsx
const { options, isFailed } = data();

const failed = isFailed(options());
```

### `meta`

Words about meta

### `find`

Words about find

### `getResource`

Words about `getResource`

## Data initializer options

### `reset`

The `reset` options should be passed to the resource middleware for scenarios where the options shouldn't be shared externally. This means that even if a resource with "shared" options is passed to the widget it will be created with a new set of options that can be controlled by the widget or any widget that a resource with shared options is passed.

> MyResourceAwareWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { createResourceMiddleware } from '@dojo/framework/core/middleware/resources';

interface ResourceData {
	value: string;
	label: string;
}

const resource = createResourceMiddleware<ResourceData>();

const factory = create({ resource });

export default factory(function MyDataAwareWidget({ resource }) {
	// passing `reset: true` ensures that nothing external can control the
	// resource options
	const { getOrRead, options } = resource({ reset: true });
	const [items] = getOrRead(options());

	if (!items) {
		return <div>Loading...</div>;
	}
	return <ul>{items.map((item) => <li>{item.label}</li>)}</ul>;
});
```

### `resource`

If the `resource` is passed in via a different property, or multiple resources need to be provided, these can be given directly to the `data` initializer.

```tsx
const { namedResource } = properties();
const { getOptions } = data({ resource: { template: namedResource, key: 'my-custom-resource' } });
```

# Composing behavior with resources

Resources can be used in multiple widgets and the cached data will be shared, however sharing the data is sometimes not enough when composing multiple "data-aware" widgets together. There are occasions that multiple widgets want to be able to share the current resource options, such that one widget can set a filter and another widget can react and render the filtered data set. This is where creating a resource with shared options come in, a resource with shared options can be created by the `resources` middleware and passed into multiple widgets that will both share resource options, so that a pagination widget can set the `page` and another widget is used to render the page of items will react to the page change and fetch the new results.

> MyComposedWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { createResourceMiddleware } from '@dojo/framework/core/middleware/resources';

interface ResourceData {
	value: string;
	label: string;
}

const resources = createResourceMiddleware<ResourceData>();

const factory = create({ resources });

export default factory(function MyComposedWidget({ resources }) {
	const { getResource } = resources();
	const sharedResource = getResource({ sharedOptions: true });

	return (
		<div>
			<Results resource={sharedResource} />
			<Pagination resource={sharedResource} />
		</div>
	);
});
```
