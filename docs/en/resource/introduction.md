# Introduction

Dojo **resource** provides a consistent means to make widgets data aware.

A Dojo resource is initialized with a `DataTemplate` that describes how to read data, and enables creation of a single data store which can be passed into multiple widgets. It allows data to be cached, transformed and filtered to suit the needs of the widget using it. Coupled with the data middleware, resources allow consistent, source-agnostic data access for widgets, without the widgets being aware of the underlying data fetching implementation or the raw data format being used, as these are abstracted away by both the template read mechanism and the resource.

| Feature                                   | Description                                                                                                                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Single data source**                    | Resources allow creation of a single source of data for a given template that can be shared between multiple widgets using the data middleware.                                            |
| **Data transforms**                       | Allows specifying the data format that a widget requires, and transparently transforms source data into the expected output format for the widget to consume                                                |
| **Support for async and sync data reads** | Resource templates can read data in any way they like - once data becomes available, the data middleware reactively invalidates any affected widgets.                       |
| **Consistent Resource Options**           | Resource options objects are passed to all api functions ensuring that all api functions are pure and provide only the data that was requested                               |
| **Sharable Resource Options**             | Resource options can be shared between widgets via the data middleware, allowing multiple widgets to react to any changes such as modifying a query, moving to a different page number, etc. |

# Basic usage

A Dojo resource can be created to fetch data in some way, and widgets are then able to access data from the resource through the data middleware.

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

When a call is made to the resource api which requires data to be read, the `read` function will be called with the `readoptions`, a `put` function and a `get` function. These two helper functions can be used to sideload data or to read existing data from the resource. More information on this can be found in the [supplemental documentation](/learn/resource/data-templates).

## Transforming data

Resources provides a `createTransformer` function which can be used to create a type safe transform object. In order to correctly type the transform source values, a generic must be passed to the `DataTemplate` to type the `read` return type. When used with the `createTransformer` function, this ensures that only return values from the read function can be used as source values.

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

## Passing a resource to a widget

A widget that uses the data middleware can be passed a `resource` to use.

> main.ts

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

## Accessing data within a widget

A data aware widget should use the `data` middleware to access data via its API. Each call made to the data apis require `Options` to be passed. These should be accessed and set via `getOptions` and `setOptions` functions to ensure that any widgets sharing the resource are using the same options.

> List.ts

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { data } from '@dojo/framework/core/middleware/data';

const factory = create({ data });

export const List = factory(function Select({ middleware: { data } }) {
	const { getOrRead, getOptions } = data();

	const items = getOrRead(getOptions());
});
```

As this example shows, `getOrRead` is being called with the result of `getOptions`. This is a reactive api and will return data if it is available or invalidate the widget when a read is complete and the data becomes available.
