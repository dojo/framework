# @dojo/stores

[![Build Status](https://travis-ci.org/dojo/stores.svg?branch=master)](https://travis-ci.org/dojo/stores)
[![codecov.io](http://codecov.io/gh/dojo/stores/branch/master/graph/badge.svg)](http://codecov.io/gh/dojo/stores/branch/master)
[![npm version](https://badge.fury.io/js/%40dojo%2Fstores.svg)](https://badge.fury.io/js/%40dojo%2Fstores)

This library provides a data store, and several mixins built using [@dojo/compose](https://github.com/dojo/compose) and TypeScript. The mixins provide additional functionality and APIs that can be added to the base store dynamically.

**WARNING** This is *alpha* software. It is not yet production ready, so you should use at your own risk.

## Features

### Storage

The underlying `Storage` interface provides the basic CRUD functionality, and is leveraged to provide the `Store` interface, which is the interface intended to be consumed. This means that the basic `createStore` factory, which defaults to using the provided `createInMemoryStorage` can be repurposed to interact with any storage medium by providing an object implementing the simpler `Storage` interface at instantiation.
```typescript
import createStore from 'store/createStore';
import { Storage } from 'store/createInMemoryStorage';
const myCustomStorage: Storage = {
  // Implement storage API
}
const myCustomStore = createStore({
  storage: myCustomStorage
});
```

### Store

The `Store` interface provides basic CRUD operations, methods to retrieve records, and methods to create IDs. 
```typescript
get(ids: string[] | string): Promise<T[]>;
```
Retrieves store items associated with the provided ID or IDs. Will return undefined for any items that don't exist in the store.
```typescript
identify(items: T[] | T): string[];
```
Returns the IDs for the passed in items. By default the store will look for an `id` property on an item, if another property should be used, the `idProperty` can be specified when creating the store. The `idFunction` property can be provided if a more complicated, composite ID needs to be generated.
```typescript
createId(): Promise<string>;
```
Generates a new ID. The default implementation of `createId` involves incrementing an internally stored integer every time it is called.
```typescript
add(items: T[] | T, options?: O): StoreObservable<T, U>;
```
Adds the item(s) to the store, failing if they already exist, unless the `rejectOverwrite` property is set to `false`. For the default store implementation `rejectOverwrite` is the only option used by the store.
```typescript
put(items: T[] | T, options?: O): StoreObservable<T, U>;
```
Adds or overwrites the specified items in the store. If overwrites should not be allowed, `rejectOverwrite` should be set to `true` in the provided options.
```typescript
patch(updates: PatchArgument<T>, options?: O): StoreObservable<T, U>;
```
Updates the item(s) indicated by PatchArgument in place in the store. The `Patch` interface is based on the [JSON Patch spec](https://tools.ietf.org/html/rfc6902), and can be serialized(not fully tested) to a format compliant with an HTTP patch request
```typescript
delete(ids: string[] | string): StoreObservable<string, U>;
```
Delete the item(s) with the provided IDs from the store
```typescript
fetch(): FetchResult<T>;
```
Returns a promise that will resolve to all of the data in the store
```typescript
fetch<U>(query: Query<T, U>): Promise<U[]>;
```
Returns a promise to the data matching the provided `Query` in the store.

#### Basic Usage

```typescript
store.fetch().then(function(storeData) {
	// storeData = data;
});
store.delete('1').then(function(deleted) {
	// deleted = [ '1' ]
});
store.delete([ '2', '3' ]).then(function(deleted) {
	// delete = [ '2', '3' ]
});
store.add([
	{ id: '1', value: 2 },
	{ id: '2', value: 3 },
	{ id: '3', value: 4 }
]);
store.put([
	{ id: '1', value: 5 },
	{ id: '4', value: 4 }
]);
// These won't compile, because they don't match
// the item type. The item type was inferred by the data argument
// in the createStore initialization options, but it can also be
// specified explicitly(i.e. createStore<TypeOfData, CrudOptions>();)
// store.put({ id: '5', value: '' });
// store.add('5');
store.patch({ id: '2', patch: diff(
	{ id: '2', value: 3 },
	{ id: '2', value: 10 }
)});
store.fetch().then(function(data) {
	// data =  [
	// 	 { id: '1', value: 5 },
	//	 { id: '2', value: 10 },
	//	 { id: '3', value: 4 },
	//	 { id: '4', value: 4 }
	// ]);
});
```

#### Store Observable

The return type of the CRUD methods on the `Store` interface is a `StoreObservable`. This type extends `Promise`. `then` returns the final results of the operation to the callback provided if it is successful, and passes any errors that occurred to the error callback otherwise.

But it is also observable. By default any subscribers will get exactly one `UpdateResults` object or an error before being completed.

```typescript
interface UpdateResults<T> {
	currentItems?: T[];
	failedData?: CrudArgument<T>[];
	successfulData: T[] | string[];
	type: StoreOperation;
}
```

The built in store will only populate the `type` and `successfulData` properties, but this provides an extension point for store implementations to provide more details about the results of the operation, report results incrementally, or allow for the operation to be retried in the case of recoverable errors(e.g. data conflicts or network errors).

### createObservableStoreMixin

This store provides an API for observing the store itself, or specific items within the store.

```typescript
export interface ObservableStoreMixin<T> {
	/**
	 * Observe the entire store, receiving deltas indicating the changes to the store.
	 * When observing, an initial update will be sent with the last known state of the store in the `afterAll` property.
	 * If fetchAroundUpdates is true, the store's local data will by synchronized with the underlying Storage.
	 * If fetchAroundUpdates is not true, then the data will be the result of locally applying updates to the data
	 * retrieved from the last fetch.
	 */
	observe(): Observable<StoreDelta<T>>;
	/**
	 * Receives the current state of the item with the specified ID whenever it is updated. This observable will be
	 * completed if the item is deleted
	 * @param id The ID of the item to observe
	 */
	observe(id: string): Observable<T>;
	/**
	 * Receives the current state of the items in an `ItemUpdate` object whenever they are updated. When any of the
	 * items are deleted an `ItemUpdate` with the item's ID and no item property will be sent out. When all of the
	 * observed items are deleted the observable will be completed.
	 * @param ids - The IDS of the items to observe
	 */
	observe(ids: string[]): Observable<ItemUpdate<T>>;
}

interface StoreDelta<T> {
	updates: T[];
	deletes: string[];
	adds: T[];
	beforeAll: T[];
	afterAll: T[];
}

interface ItemUpdate<T> {
	item?: T;
	id: string;
}
```

#### Observing the store

When observing the whole store, an initial update will be received that contains the current data in the store in the `afterAll` property, and subsequent updates will represent the changes in the store since the last update.

If the `fetchAroundUpdates` property is set to `true` in the options when creating the store, then the data in the store will be kept up to date with the underlying storage, and any updates will represent the latest data from the storage. If `fetchAroundUpdates` is `false` or not specified, then the local data will be modified in place according to the updates indicated by the `StoreDelta`, but it may become out of sync with the underlying storage. In this case, when fetching manually, the local data will be synced again. An update is sent after a `fetch`, and the update following a fetch may contain new items in the `afterAll` property that are not represented by the `updates`, `adds`, and `deletes` of the `StoreDelta` when `fetchAroundUpdates` is `false` and the store is out of sync with its storage.

Example usage
```typescript
import { createObservableStore } from '@dojo/stores/store/mixins/createObservableStoreMixin';

const observableStore = createObservableStore({
	data: [{ id: '1', value: 1 }]
});

observableStore.observe().subscribe(function(update) {
	// update = {
	// 	 updates: [ any items updated since last notification ],
	// 	 deletes: [ any items deleted since last notification ],
	// 	 beforeAll: [ Empty for the first update, previous state for following updates],
	// 	 afterAll: [ Current state of the sotre ],
	// 	 adds: [ any items added since last notification ]
	// }
});

observableStore.observe('itemId').subscribe(function(update) {
	// update will be the item itself
}, undefined, function() {
	// completion callback will be called if the item is deleted
});

observableStore.observe([ 'itemId', 'otherItemId' ]).subscribe(function() {
	// update = {
	//   item: The updated or null if the item was deleted,
	//   id: The id of the item
	// }
}, undefined, function() {
	// completion callback will be called if all items are deleted
});

```

### createQueryTransformMixin

This mixin provides the ability to filter, sort, select a range of, transform, or query for items using a custom query function. 
```typescript
export interface QueryTransformMixin<T, S extends ObservableStore<T, any, any>> {
	/**
	 * Creates a query transform result with the provided query
	 * @param query
	 */
	query(query: Query<T>): MappedQueryTransformResult<T, S>;
	/**
	 * Creates a query transform result with the provided filter
	 * @param filter
	 */
	filter(filter: Filter<T>): MappedQueryTransformResult<T, S>;
	/**
	 * Creates a query transform result with a filter built from the provided test
	 * @param test
	 */
	filter(test: (item: T) => boolean): MappedQueryTransformResult<T, S>;
	/**
	 * Creates a query transform result with the provided range
	 * @param range
	 */
	range(range: StoreRange<T>): MappedQueryTransformResult<T, S>;
	/**
	 * Creates a query transform result with a range built based on the provided start and count
	 * @param start
	 * @param cound
	 */
	range(start: number, count: number): MappedQueryTransformResult<T, S>;
	/**
	 * Creates a query transform result with the provided sort or a sort build from the provided comparator or a
	 * comparator for the specified property
	 * @param sort
	 * @param descending
	 */
	sort(sort: Sort<T> | ((a: T, b: T) => number) | string, descending?: boolean): MappedQueryTransformResult<T, S>;
	/**
	 * Create a query transform result that cannot be tracked, and cannot send tracked updates. This is the case because
	 * the resulting query transform result will have no way to identify items, making it impossible to determine
	 * whether their position has shifted or differentiating between updates and adds
	 * @param transformation
	 */
	transform<V>(transformation: Patch<T, V> | ((item: T) => V)): QueryTransformResult<V, S>;
	/**
	 * Create a trackable query transform result with the specified transformation
	 * @param transformation
	 * @param idTransform
	 */
	transform<V>(transformation: Patch<T, V> | ((item: T) => V), idTransform: string | ((item: V) => string)): MappedQueryTransformResult<V, S>;
}
```


The result of querying or transforming will be a read only `QueryTransformResult`.

```typescript
export interface QueryTransformResult<T, S extends ObservableStore<any, any, any>> {
	query(query: Query<T>): this;
	filter(filter: Filter<T>): this;
	filter(test: (item: T) => boolean): this;
	range(range: StoreRange<T>): this;
	range(start: number, count: number): this;
	sort(sort: Sort<T> | ((a: T, b: T) => number) | string, descending?: boolean): this;
	observe(): Observable<StoreDelta<T>>;
	observe(id: string): Observable<T>;
	observe(ids: string[]): Observable<ItemUpdate<T>>;
	get(ids: string | string[]): Promise<T[]>;
	transform<V>(transformation: Patch<T, V> | ((item: T) => V)): QueryTransformResult<V, S>;
	transform<V>(transformation: Patch<T, V> | ((item: T) => V), idTransform: string | ((item: V) => string)): this;
	fetch(query?: Query<T>): FetchResult<T>;
	source: S;
}
```

The `QueryTransformResult` can be further queried or transformed, as well as observed, and has a reference to the source store if updates need to be performed on the original data.

The observation API for the `QueryTransformResult` is very similar to the store's with a few changes.

#### MappedQueryTransformResult
Unless the transform method is called without an idTransform, the result of any queries to a store with the createQueryTransformMixin will be a `MappedQueryTransformResult`, which includes additional data in its `StoreDelta` updates, and provides a `track()` method. The `StoreDelta` interface is extended by the `TrackedStoreDelta` interface which the `MappedQueryTransformResult` provides to observers. This augments the interface by providing data indicating the current and previous indices of items that have been moved within, added to, or removed from, the view represented by the `MappedQueryTransformResult`. Unlike `updates`, `deletes`, and `adds`, these properties are not related to specific operations, but instead just represent changes in the position of items within the collection. 

```typescript
export interface TrackableStoreDelta<T> extends StoreDelta<T> {
	/**
	 * Contains info for any items that were formerly in the tracked collection and are now not, regardless of how
	 * those items were removed
	 */
	removedFromTracked: { item: T; id: string; previousIndex: number; }[];
	/**
	 * Contains info for any items that are now in the tracked collection and formerly were not, regardless of how
	 * those items were added
	 */
	addedToTracked: { item: T; id: string; index: number; }[];
	/**
	 * Contains info were previously and still are in the tracked collection but have changed position, regardless of
	 * how the items were moved.
	 */
	movedInTracked: { item: T; id: string; previousIndex: number; index: number }[];
}

```

As with the observable store mixin, the locally tracked data in a `MappedQueryTransformResult` has the potential to become out of sync with the underlying storage. If the source `ObservableStore` has `fetchAroundUpdates` set to true, then any query transform results produced from it will only send up to date information to observers. If the source is not fetching around updates, the `track()` method provided as part of the `MappedQueryTransformResult` interface can be used to create a copy of a `QueryTransformResult` that will fetch after any updates from its source to make sure it has the latest data. `track()` produces a `TrackedQueryTransformResult`, which has a `release()` method that provides a new, non-tracked query transform result.

When `transform()` is called without an `idTransform`, the resulting `QueryTransformResult` has no way of determining the ID of a transformed item, and so it cannot tell whether changes from the source store represent updates or additions, and cannot keep an index to easily track the position of items within the store. As a result, a `QueryTransformResult` created this way will not contain positional information in its updates to observers, and cannot be tracked.

Example Usage
```typescript
import { createQueryStore } from '@dojo/stores/store/mixins/createQueryTransformMixin';

const data = [
		{ id: '1', value: 1 },
		{ id: '2', value: 2 },
		{ id: '3', value: 3 }
 	];
const queryStore = createQueryStore({
	data: data
});

const filteredView = queryStore.filter((item) => item.value > 1);
filteredView.fetch().then((data) => {
	// data = [ { id: '2', value: 2 }, { id: '3', value: 3 } ]
});

filteredView.observe().subscribe((update) => {
	/*
		initial update = {
			deletes: [],
			adds: [],
			updates: [],
			addedToTracked: [],
			removedFromTracked: [],
			movedInTracked: [],
			beforeAll: [],
			afterAll: []
		}

		subsequent update = {
			deletes: [],
			adds: data,
			updates: [],
			addedToTracked: [
				{
					id: '1',
					item: data[0],
					index: 0
				},
				{
					id: '2',
					item: data[1],
					index: 1
				},
				{
					id: '3',
					item: data[2],
					index: 2
				}
			],
			beforeAll: [],
			afterAll: []
		};

	*/
});

```

If the observer starts observing after the initial add is already resolved, the first update they receive will be the `subsequent update` in this example. Here the first update is provided to an observer that subscribes synchronously with the initialization of the store, but the initial add happens asynchronously and so is not yet resolved. For a tracked collection, the first update will contain the data form a `fetch` to the source.


### Fetch Results

Both the `Store` and `QueryTransformResult` interfaces return a type called a `FetchResult` from `fetch`.
This is a `Promise` that resolves to the fetched data, but it also has two other properties: `totalLength` and `dataLength`.
For both the `Store` and `QueryTransformResult`, `totalLength` is a `Promise` that resolves to the total number of items
in the underlying `Storage`.

For a `Store`, `dataLength` resolves to the same value as `totalLength`, and is only provided for consistency between the interfaces.

For a `QueryTransformResult`, `dataLength` resolves to the number of items that match the `QueryTransformResult`'s
queries. Note that in all cases, these values do not change if a query is passed to fetch.

Example Usage
```typescript
import { createQueryStore } from '@dojo/stores/store/mixins/createQueryTransformMixin';
const queryStore = createQueryStore({
    data: [
        { id: 'item-1', value: 1 },
        { id: 'item-2', value: 2 },
        { id: 'item-3', value: 3 }
    ]
});

const withoutQuery = queryStore.fetch();
// This filter will not change the value of dataLength or totalLength
const withQuery = queryStore.fetch(createFilter<any>().lessThan('value', 2));

Promise.all(
    [ withoutQuery.totalLength, withoutQuery.dataLength, withQuery.totalLength, withQuery.dataLength ]
).then((values) => {
    // values[0] === values[1] === values[2] === values[3] === 3
});

const queryResult = queryStore.filter((item) => item.value < 3);
const queryResultWithoutQuery = queryResult.fetch();
// This filter will not change the value of dataLength or totalLength
const queryResultsWithQuery = queryResult.fetch(createFilter<any>().lessThan('value', 2));
Promise.all([
    queryResultWithoutQuery.totalLength,
    queryResultsWithQuery.totalLength,
    queryResultWithoutQuery.dataLength,
    queryResultsWithQuery.dataLength
]).then((values) => {
    // values[0] === values[1] === 3 The totalLength in both cases is still the total number of items
    // values[2] === values[3] === 2 The dataLength in both cases is the number of items matching the
    // result's queries
});
```

## How do I contribute?

We appreciate your interest!  Please see the [Dojo 2 Meta Repository](https://github.com/dojo/meta#readme) for the
Contributing Guidelines and Style Guide.

## Testing

Test cases MUST be written using [Intern](https://theintern.github.io) using the Object test interface and Assert assertion interface.

90% branch coverage MUST be provided for all code submitted to this repository, as reported by istanbul’s combined coverage results for all supported platforms.

To test locally in node run:

`grunt test`

To test against browsers with a local selenium server run:

`grunt test:local`

To test against BrowserStack or Sauce Labs run:

`grunt test:browserstack`

or

`grunt test:saucelabs`

## Licensing information

TODO: If third-party code was used to write this library, make a list of project names and licenses here

* [Third-party lib one](https//github.com/foo/bar) ([New BSD](http://opensource.org/licenses/BSD-3-Clause))

© 2004–2016 Dojo Foundation & contributors. [New BSD](http://opensource.org/licenses/BSD-3-Clause) license.
