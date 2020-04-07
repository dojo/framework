# Resource

Dojo **resource** provides a consistent means to make widgets data aware.

Dojo resource allows you to create a single store of data, backed by a template describing how to read data which can be passed into multiple widgets. It allows data to be cached, transformed and filtered to suit the needs of the widget it's using. Coupled with the data middleware, resources allow consistent, source agnostic data access for your widgets without them being aware of the underlying data fetching implementation or the raw data format being used.

| Feature                                   | Description                                                                                                                                                                   |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Single data source**                    | Resources allows you to create a single resource for a given template and share it with multiple widgets via the data middleware.                                             |
| **Data transforms**                       | A data tranform mechanism allows you to specify the data form at your widget requires and transforms the data transparently                                                   |
| **Support for async and sync data reads** | The resource template can read data in any way it sees fit, the data middleware uses a reactive API to invalidate widgets when data becomes available.                        |
| **Consistent Resource Options**           | Resource options objects are passed to all api functions ensuring that all api functions are pure and provide only the data that was requested                                |
| **Sharable Resource Options**             | Resource options can be shared between widgets via the data middleware meaning that multiple widgets can react to changes to the resource options, ie. query, page number etc |

# Basic Usage

Dojo resource is comprised of a resource which you create to get and read data and a data middleware which you use within your widgets to access the resource.

## The resource

A basic resource requires only a DataTemplate to be created which specifies a `read` function.

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

## The transformer

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

## Passing a resource to a widget

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
