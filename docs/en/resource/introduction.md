# Resource

Dojo **resource** provides a consistent means to make widgets data aware.

Dojo resource allows you to create a single store of data which can be passed into multiple widgets. It allows data to be cached, transformed and filtered to suit the needs of the widget using it. Coupled with the data middleware, resources allow consistent, source agnostic data access for your widgets without them being aware of the underlying data fetching implementation or the raw data format being used.

| Feature                                   | Description                                                                                                                                                                   |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Single data source**                    | Resources allows you to create a single resource for a given template and share it with multiple widgets via the data middleware.                                             |
| **Data transforms**                       | A data tranform mechanism allows you to specify the data form that your widget requires and transforms the data transparently                                                   |
| **Support for async and sync data reads** | The resource template can read data in any way it sees fit, the data middleware uses a reactive API to invalidate widgets when data becomes available.                        |
| **Consistent Resource Options**           | Resource options objects are passed to all api functions ensuring that all api functions are pure and provide only the data that was requested                                |
| **Sharable Resource Options**             | Resource options can be shared between widgets via the data middleware. This allows multiple widgets to react to changes to the resource options, ie. query, page number etc |

# Basic Usage

Dojo resource is comprised of a resource which you create to get and read data and a data middleware which you use within your widgets to access the resource.

## Creating a resource

A basic resource requires only a `DataTemplate` to be created which specifies a `read` function.

> main.ts

```ts
import { DataTemplate, createResource } from '@dojo/framework/core/resource';
import { fetcher } from './personfetcher';

const template: DataTemplate = {
	read: fetcher
};

const resource = createResource(template);
```

When a call is made to the resource api which requires data to be read, the read function will be called with the readoptions, a put function and a get function. These two helper functions can be used to side load data or to read existing data from the resource.

## Transforming Data

Resources provides a `createTransformer` function which works in conjuction with the generic attached to the `DataTemplate` to ensure that only values returned in the object from the `read` functions are used to transform the data.

> main.ts

```ts
import { DataTemplate, createResource, createTransformer } from '@dojo/framework/core/resource';
import { fetcher } from './personfetcher';

const template: DataTemplate<{ firstName: string; lastName: string }> = {
	read: fetcher
};

const transformer = createTransformer(template, {
	value: ['firstName'],
	label: ['firstName', 'lastName']
});
```

The transformer can be passed to a widget which uses the data middleware to ensure that the data it receives from the resource is correct.

## Passing a Resource to a Widget

A widget that uses the data middleware can be passed a `resource` to use.

> main.ts

```tsx
import { DataTemplate, createResource, createTransformer } from '@dojo/framework/core/resource';
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

## Accessing data within a widget

A data aware widget should use the `data` middleware to access data via its API. Each call made to the data apis require `ReadOptions` to be passed. These should be accessed and set via `getOptions` and `setOptions` functions to ensure that any widgets sharing the resource are using the same options.

> List.ts

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { createDataMiddleware } from '@dojo/framework/core/middleware/data';

const factory = create({ data });

export const List = factory(function Select({ middleware: { data } }) {
	const { getOrRead, getOptions } = data();

	const items = getOrRead(getOptions());
});
```

As you can see in the above example, `getOrRead` is being called with the result of `getOptions`. This is a reactive api and will return data if it is available or invalidate the widget when a read is complete and the data becomes available.
