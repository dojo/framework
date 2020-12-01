# Resource Concepts

Dojo resources is designed to provide a cohesive and consistent mechanism for working with data within a Dojo application. There are 3 core concepts for Dojo Resources:

-   Resource Templates
-   Resource Store
-   Resource Middleware

## Templates

The resource template is a description that the resource uses to `read`, `find`, and `init` data in the store. Resource templates are flexible enough to enable connecting resources to multiple different providers, such as RESTful APIs or client data (using an in-memory template).

Templates should be stateless so they can be re-used throughout an application by using the resource options to determine the data required and the resource controls to interact with the resource store, such as putting the data into the store.

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

The resource store is where all the data is stored and is responsible for wiring widgets using the `resource` middleware with the `ResourceTemplate` passed to the widget. The store invalidates all widgets that have subscribed for events based on the type and details of the event as well as handling asynchronous results from the resource template. The resource store is automatically created for a template that is passed to a widget. A user never explicitly creates or works directly with the resource store.

> MyWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { createResourceMiddleware } from '@dojo/framework/core/middleware/resources';

import DataAwareWidget from './DataAwareWidget';
import userResourceTemplate from './userResourceTemplate';

const resource = createResourceMiddleware();
const factory = create({ resource });

export default factory(function MyWidget({ middleware: { resource }}) {
	return (
		<div>
			{/* The resource store is created internally for the template passed to the widget */}
			<DataAwareWidget resource={resource({ template: userResourceTemplate })}>
		</div>
	);
});
```

## Middleware

The `resource` middleware is the interface required to work with resource templates and "resource-aware" widgets. The middleware exposes a complete API for working with resource templates.

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
// passing the generic type means that the `resource` property will
// be exposed on the widget's property interface
const resource = createResourceMiddleware<ResourceItem>();

// pass the created middleware to the `create` function
const factory = create({ resource });

export default factory(function MyResourceAwareWidget({ id, properties, middleware: { resource } }) {
	// de-structure the required resource APIs, these can also be accessed
	// directly from `resource`
	const { getOrRead, isLoading, createOptions } = resource;
	// get the `template` and `options` from the widgets properties
	// the options are optional so need to be defaulted using the
	// createOptions function from `resource`
	const {
		resource: { template, options = createOptions(id) }
	} = properties();
	// Call `getOrRead` to request the data based on the `template` and `options`
	const [items = []] = getOrRead(template, options({ page: 1, size: 20 }));
	// Check if the resource is current loading
	if (isLoading(template, options())) {
		// if the resource is loading return a fancy loading indicator
		return <FancyLoadingIndicator />;
	}
	// If the items have been loaded return them in a list
	return <div>{items.map((item) => <li>{item.label}</li>)}</div>;
});
```

Please see the [`resource` middleware](/learn/resources/resource-middleware) for more information.

# Resource Templates

A resource template describes how Dojo resources interact with its data-source based on the options passed. Resource templates are statically defined and used throughout an application to power "resource aware" widgets. There are two types of `ResourceTemplate` that can be used: a standard template, and a template that accepts initialization options.

A `ResourceTemplate` consists of two APIs:

-   `read()`
    -   The function responsible for fetching the resource data based on the `ResourceReadRequest` and setting it in the store.
-   `find()`
    -   The function responsible for `finding` an item in the resource data based on the `ResourceFindRequest` and setting it in the store.

A `ResourceTemplateWithInit` adds an additional `init` API

-   `init()`
    -   An initializer function designed to deal with data passed to widgets with the template.

```tsx
interface ResourceTemplate<S = {}, T = {}> {
	read: ResourceRead<S>;
	find: ResourceFind<S>;
}

interface ResourceTemplateWithInit<S = {}, T = {}> {
	read: ResourceRead<S>;
	find: ResourceFind<S>;
	init: ResourceInit<S>;
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

The `ResourceReadRequest` contains the offset, page size, and query of the request. The `query` is a an object with the key mapping to a key of the resource item data interface for the associated value.

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

The `ResourceFindRequest` contains the current resource `options`, `query`, `type`, and `start` index for the find request. The `query` is the same as the `query` object used with `ResourceFindRequest`: an object with the key mapping to a key of the resource item data interface for the associated value.

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

The `init` function is used to deal with options passed with the `template` using the `resource` middleware. These options are defined when creating the template and passing an interface for the required options, `createResourceTemplate<RESOURCE, INIT>` as the second generic parameter.

```tsx
import { createResourceTemplate } from '@dojo/framework/core/middleware/resources';


// only showing the init api
const template = createResourceTemplate<{ foo: string }, { data: { foo: string; }[]; extra: number; }>({
	init: (options, controls) {
		// the options matches the type passed as the second generic
		const { data, extra } = options;
		// use the controls to work with the store, for example store the init data
		controls.put({ data, total: data.length});
	}
});

interface ResourceInitRequest<S> {
	id: string;
	data: S[];
}

export interface ResourceInit<S, I> {
	(request: I & { id: string; }, controls: ResourceControls<S>): void;
}
```

The init options are injected into the function along with the standard `ResourceControls` to be used to add the initialize the resource store.

## Default Resource Templates

Dojo resources offers a pre-configured default resource template that implements the complete resource template API. The default template is designed to work with [data passed to a widget when using the template](/learn/resources/using-resource-templates) that initializes the resource store for the template. The memory template is created using the `createResourceTemplate` factory from `@dojo/framework/core/middleware/resources` passing no arguments.

> MyWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { createResourceTemplate, createResourceMiddleware } from '@dojo/framework/core/middleware/resources';

interface ResourceItem {
	value: string;
}

interface MyWidgetProperties {
	items: ResourceItem[];
}

const resource = createResourceMiddleware();
const factory = create({ resource }).properties<MyWidgetProperties>();

const template = createResourceTemplate<ResourceItem>();

export default factory(function MyWidget({ id, properties, middleware: { resource } }) {
	const { items } = properties();
	return <MyResourceAwareWidget resource={resource({ template, initOptions: { id, data: items } } )}>
});
```

For more information please see the [Using Resource Templates](/learn/resource/using-resource-templates).

## Custom Resource Templates

To connect a resource to an custom data-source - such as a RESTful API - the `createResourceTemplate()` factory can be used. At a minimum, the `read` API needs to be fulfilled while `init` and `find` are optional.

> myResourceTemplate.ts

```tsx
import { createResourceTemplate } from '@dojo/framework/core/middleware/resources';

interface MyResource {
	id: string;
	name: string;
	email: string;
}

export default createResourceTemplate<MyResource>({
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

### Create a Resource Template with initialization options

If the resource template needs to support custom initialization the `createResourceTemplate` can be used. This requires the template to have an `init` API that will be called when a backing resource is created. The initialize options required are typed using the second generic on the factory function.

```tsx
import { createResourceTemplate } from '@dojo/framework/core/middleware/resources';

interface MyResource {
	id: string;
	name: string;
	email: string;
}

export default createResourceTemplate<MyResource, { data: MyResource[] }>({
	init: (request: { id: string } & { data: MyResource[] }, controls: ResourceControls) => {
		const { data } = request;
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

All resource template factories accept a generic that is used to type the shape of the resource data. It is highly recommended to provide typings to the template so that when the template is passed to a widget the typings for data and transform can be inferred correctly. As referenced in the previous examples, typing a resource requires passing the resource data type interface on creation of the template.

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

Resource templates can be passed using the `resource` middleware to any widget that has a resource property exposed with the [`resources` middleware](/learn/resources/resource-aware-widgets).

> MyWidget.ts

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { createResourceTemplate, createResourceMiddleware } from '@dojo/framework/core/middleware/resources';

import MyResourceAwareWidget from './MyResourceAwareWidget';

const resource = createResourceMiddleware();
const factory = create({ resource });

interface MyResourceType {
	value: string;
}

const template = createResourceTemplate<MyResourceType>({
	read: (request, controls) => {
		// use the request to get the required data
		// use the controls to populate the resource
	}
});

export factory(function MyWidget({ middleware: { resource }}) {
	return (
		<div>
			<MyResourceAwareWidget resource={resource({ template })}>
		</div>
	);
});
```

## Passing Initialization Options

Initialization options can be passed with any template created using the `createResourceTemplate` factory and are passed to the template's `init` function to initialize the resource. The `initOptions` includes an `id` used to identify the backing resource and optional `data` that can be added to the resource on creation.

> MyWidget.ts

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { createResourceTemplate, createResourceMiddleware } from '@dojo/framework/core/middleware/resources';

import MyResourceAwareWidget from './MyResourceAwareWidget';

const resource = createResourceMiddleware();
const factory = create({ resource });

interface MyResourceType {
	value: string;
}

const template = createResourceTemplate<MyResourceType>({
	read: (request, controls) => {
		// use the request to get the required data
		// use the controls to populate the resource
	}
});

export factory(function MyWidget({ id, middleware: { resource }}) {
	return (
		<div>
			<MyResourceAwareWidget resource={resource({ template, initOptions: { id, data: [{ value: 'foo'}, { value: 'bar'}] } } )}>
		</div>
	);
});
```

## Transforming Data

When a widget has been configured to use `resources` middleware with a data interface different than the template, a "transform" descriptor is required. The `transform` is an object keyed by a key of the `resources` middleware type that maps to a key of the resource template type.

> MyWidget.ts

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { createResourceTemplate, createResourceMiddleware } from '@dojo/framework/core/middleware/resources';

import MyResourceAwareWidget from './MyResourceAwareWidget';

const resource = createResourceMiddleware();
const factory = create({ resource });

interface MyResourceType {
	custom: string;
}

const template = createResourceTemplate<MyResourceType>({
	read: (request, controls) => {
		// use the request to get the required data
		// use the controls to populate the resource
	}
});

export factory(function MyWidget({ id, middleware: { resource }}) {
	return (
		<div>
			<MyResourceAwareWidget resource={resource({ template, transform: { value: 'custom' }, initOptions: { id, data: [{ custom: 'foo'}, { custom: 'bar'}] } })} />
		</div>
	);
});
```

# Resource Middleware

The `resource` middleware is required to use resource templates and access resources. The middleware optionally automatically decorates the widget with the required `resource` property depending on whether an interface is passed to the `createResourceMiddleware` factory. The `resource` property is used by the widget to interact with any resource passed. The `resource` middleware passed to the widget is a factory that returns back the complete API for working with resources. The simplest scenario is using the `resource` middleware to return data for a requested page. This is done using the `getOrRead` API that requires the template and the resource options: `getOrRead(template, options())`. The `getOrRead` function is designed to be reactive, so if the data is not immediately available - i.e. the resource is asynchronous and not already been read for the provided options - it will return `undefined` for each page requested allowing the widget to deal with the "loading" data scenario.

The `resource` property consists of the `template` and an optional set of `options` which are used to interact with the `template'`s resource store. As the `options` can be undefined, they needed to be defaulted with options created using the `createOptions` API. The `createOptions` function takes an identifer used to track the options across renders. This `id` can usually use the widget's `id` injected into the widget along with the properties, children and middleware.

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

export default factory(function MyDataAwareWidget({ id, properties, resource }) {
	const { getOrRead, createOptions } = resource;
	const {
		resource: { template, options = createOptions(id) }
	};
	const [items] = getOrRead(template, options());

	if (!items) {
		return <div>Loading...</div>;
	}
	return <ul>{items.map((item) => <li>{item.label}</li>)}</ul>;
});
```

## `resource` middleware API

### `createOptions()`

`createOptions` creates a new instance of options that can be used with the `resource` API. An `id` is required in order to identify the option's instance across renders. The result of the `createOptions` function should be used when working with the `getOrRead`, `isLoading`, `isFailed`, and `find` APIs. It is important to use `options` rather than constructing a new `ResourceOptions` object in order to ensure that resources correctly invalidate when options have changed.

```tsx
const options = createOptions('id');
```

The resulting `options` variable is a function that can be used to set and get the instances option data.

```tsx
interface ResourceOptions<S> {
	page: number | number[];
	query: ResourceQuery<S>;
	size: number;
}
```

### `getOrRead()`

The `getOrRead` function takes a `template`, the `ResourceOptions`, and optionally any `initOptions` that are required. `getOrRead` returns an array of data for each of the pages requested in the passed `ResourceOptions`. If the data is not already available, it will perform a `read` using the passed template. Once the `data` has been set in the resource, the widget will be invalidated in a reactive manner.

> MyResourceAwareWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { createResourceMiddleware } from '@dojo/framework/core/middleware/resources';

const resource = createResourceMiddleware<{ value: string }>();

const factory = create({ resource });

export default factory(function MyDataAwareWidget({ id, properties, middleware: { resource } }) {
	const { getOrRead, createOptions } = resource;
	const {
		resource: { template, options = createOptions(id) }
	} = properties();
	const [pageTenItems] = getOrRead(options({ page: 10, size: 30 }));

	if (!pageTenItems) {
		return <div>Loading...</div>;
	}
	return <ul>{pageTenItems.map((item) => <li>{item.label}</li>)}</ul>;
});
```

The `query` object can be passed to specify a filter for a property of the data. If a `transform` was passed with the `template` then this query object will be mapped back to the original resource's key when passed to the resource template's `read` function.

> MyResourceAwareWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { createResourceMiddleware } from '@dojo/framework/core/middleware/resources';

const resource = createResourceMiddleware<{ value: string }>();

const factory = create({ resource });

export default factory(function MyDataAwareWidget({ id, properties, middleware: { resource } }) {
	const { getOrRead, createOptions } = resource;
	const {
		resource: { template, options = createOptions(id) }
	} = properties();
	const [pageTenItems] = getOrRead(template, options({ page: 10, size: 30, query: { value: 'query-value' } }));

	if (!pageTenItems) {
		return <div>Loading...</div>;
	}
	return <ul>{pageTenItems.map((item) => <li>{item.label}</li>)}</ul>;
});
```

Multiple pages can be passed in the `options`. Each of the pages requested will be returned in the resulting array. When requesting multiple pages it's not safe to check the first array value to determine if the `getOrRead` call could be fulfilled as its API will return any pages that were available and make the requests for the rest. To check the status of the request, the options can be passed into the [`isLoading`](/learn/resources/resource-middleware#isLoading) API. The pages are return in the same order that they are specified in the `options`. If desired, it may be useful to use `.flat()` on the pages array once it has been fully loaded to consolidate individual page results into a single list.

> MyResourceAwareWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { createResourceMiddleware } from '@dojo/framework/core/middleware/resources';

const resource = createResourceMiddleware<{ value: string }>();

const factory = create({ resource });

export default factory(function MyDataAwareWidget({ id, properties, middleware: { resource } }) {
	const { getOrRead, createOptions } = resource;
	const {
		resource: { template, options = createOptions(id) }
	} = properties();
	// [pageOne, pageTwo, pageThree, pageFour]
	const items = getOrRead(options({ page: [1, 2, 3, 4], size: 30 }));

	if (!isLoading(options())) {
		return <div>Loading...</div>;
	}
	return <ul>{items.flat().map((item) => <li>{item.label}</li>)}</ul>;
});
```

### `meta()`

The `meta` API returns the current meta information for the resources, including the current options themselves. The `MetaResponse` also contains the registered `total` of the resource, which can be used to determine conditional logic such as virtual rendering.

```tsx
meta(template, options, request): MetaResponse;
meta(template, options, initOptions, request): MetaResponse;
```

> MyResourceAwareWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { createResourceMiddleware } from '@dojo/framework/core/middleware/resources';

const resource = createResourceMiddleware<{ value: string }>();

const factory = create({ resource });

export default factory(function MyDataAwareWidget({ id, properties, middleware: { resource } }) {
	const { meta, createOptions } = resource;
	const {
		resource: { template, options = createOptions(id) }
	} = properties();

	// get the meta info for the current options
	const metaInfo = meta(template, options());

	if (metaInfo && metaInfo.total > 0) {
		// do something if there is a known total
	}
});
```

By default, calling meta will not initiate a request. If there is no meta info - i.e., `getOrRead` has not been called - it will never populate them and invalidate without a separate call to `getOrRead`. An additional parameter, `request`, can be passed as `true` in order to make a request for the passed options if there is no existing meta information.

> MyResourceAwareWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { createResourceMiddleware } from '@dojo/framework/core/middleware/resources';

const resource = createResourceMiddleware<{ value: string }>();

const factory = create({ resource });

export default factory(function MyDataAwareWidget({ id, properties, middleware: { resource } }) {
	const { meta, createOptions } = resource;
	const {
		resource: { template, options = createOptions(id) }
	} = properties();

	// get the meta info for the current options and make a `getOrRead`
	// request if there is no existing meta information. Once the request
	// is completed the widget will re-render with the meta information
	const metaInfo = meta(template, options(), true);

	if (metaInfo && metaInfo.total > 0) {
		// do something if there is a known total
	}
});
```

### `find()`

The `find` function takes the `template`, `ResourceFindOptions`, and `initOptions` if required by the template. `find` returns the `ResourceFindResult` or `undefined` depending on if the item could be found. The `ResourceFindResult` contains the identified item, the index of the resource data-set, the page the item belongs to (based on the page size set in the `options` property in the `ResourceFindOptions`), and the index of the item on that page. If the `find` result is not already known to the `resource` store and the request is asynchronous then the `find` call will return `undefined` and invalidate the widget once the find result available.

The `ResourceFindOptions` requires a starting index, `start`, the `ResourceOptions`, `options`, the type of search, `type` (`contains` is the default find type), and a query object for the find operation:

```ts
interface ResourceFindOptions {
	options: ResourceOptions;
	start: number;
	type: 'exact' | 'contains' | 'start';
	query: ResourceQuery;
}
```

> MyResourceAwareWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { createResourceMiddleware } from '@dojo/framework/core/middleware/resources';

const resource = createResourceMiddleware<{ value: string }>();

const factory = create({ resource });

export default factory(function MyDataAwareWidget({ id, properties, middleware: { resource } }) {
	const { find, createOptions } = resource;
	const {
		resource: { template, options = createOptions(id) }
	} = properties();
	const item = find(template, { options: options(), start: 0, type: 'contains', query: { value: 'find query' } });

	if (item) {
		return <div>{/* do something with the item */}</div>;
	}
	return <div>Loading</div>;
});
```

### `isLoading()`

The `isLoading` function takes a `template`, `ResourceOptions` or `ResourceFindOptions` object, and `initOptions` if required by the template. `isLoading` returns a `boolean` to indicate if there is an in-flight read underway for the passed options.

> MyResourceAwareWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { createResourceMiddleware } from '@dojo/framework/core/middleware/resources';

const resource = createResourceMiddleware<{ value: string }>();

const factory = create({ resource });

export default factory(function MyDataAwareWidget({ id, properties, middleware: { resource } }) {
	const { getOrRead, isLoading, createOptions } = resource;
	const {
		resource: { template, options = createOptions(id) }
	} = properties();
	const [items] = getOrRead(template, options({ page: 1, size: 30 }));

	if (!isLoading(template, options())) {
		return <div>Loading...</div>;
	}
	return <ul>{items().map((item) => <li>{item.label}</li>)}</ul>;
});
```

### `isFailed()`

The `isFailed` function takes a `template`, `ResourceOptions` or `ResourceFindOptions` object and `initOptions` if required by the template. `isFailed` returns a `boolean` to indicate if there is a in-flight read underway for the passed options.

> MyResourceAwareWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { createResourceMiddleware } from '@dojo/framework/core/middleware/resources';

const resource = createResourceMiddleware<{ value: string }>();

const factory = create({ resource });

export default factory(function MyDataAwareWidget({ id, properties, middleware: { resource } }) {
	const { getOrRead, isLoading, createOptions } = resource;
	const {
		resource: { template, options = createOptions(id) }
	} = properties();
	const [items] = getOrRead(template, options({ page: 1, size: 30 }));

	if (!isFailed(template, options())) {
		return <div>Failed...!</div>;
	}
	return <ul>{items().map((item) => <li>{item.label}</li>)}</ul>;
});
```

# Composing behavior with resources

Resources can be used in multiple widgets and the cached data will be shared. However, sharing the data is sometimes not sufficient when composing multiple "data-aware" widgets together. There are occasions that multiple widgets want to be able to share the current resource options, such that one widget can set a filter and another widget can react and render the filtered data set. This is where creating a resource with "shared options" come in. Sharing options across widgets is as simple as passing the same `options` to multiple widgets with along with the resource template.

**Note:** The widget itself can choose to ignore options that are passed with the template, this should be documented with the widget.

> MyComposedWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { createResourceMiddleware } from '@dojo/framework/core/middleware/resources';

interface ResourceData {
	value: string;
	label: string;
}

const resource = createResourceMiddleware<ResourceData>();

const factory = create({ resource });

export default factory(function MyComposedWidget({ id, middleware: { resource } }) {
	const { createOptions } = resource;
	const options = createOptions(id);

	return (
		<div>
			<Results resource={resource({ template, options })} />
			<Pagination resource={resource({ template, options })} />
		</div>
	);
});
```
