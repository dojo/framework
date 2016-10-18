# store

A library providing client side data management

This library provides a data store, and several mixins built using [dojo-compose](https://github.com/dojo/compose) and TypeScript. The mixins provide additional functionality and APIs that can be added to the base store dynamically.

## Storage

The underlying `Storage` interface provides the basic CRUD functionality, and is leveraged to provide the `Store` interface, which is the interface intended to be consumed. This means that the basic `createStore` factory, which defaults to using the provided `createInMemoryStorage` can be repurposed to interact with any storage medium by providing an object implementing the simpler `Storage` interface at instantiation.

```typescript
import createStore from store/createStore';
import { Storage } from store/createInMemroyStorage';

const myCustomStorage: Storage = {
  // Implement storage API
}

const myCustomStore = createStore({
  storage: myCustomStorage
});
```

## Store

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
fetch(): Promise<T[]>;
```
Returns a promise that will resolve to all of the data in the store

```typescript
fetch<U>(query: Query<T, U>): Promise<U[]>;
```
Returns a promise to the data matching the provided `Query` in the store.

###Basic Usage
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

###Store Observable

The return type of the CRUD methods on the `Store` interface is a `StoreObservable`. This type provides a `then` method that operates the same way as a `Promise`, returning the final results of the operation to the callback provided to then if it is successful and passing any errors that occur to the error callback.

But it is also an observable. By default any subscribers will get exactly one `UpdateResults` object or an error before being completed.

```typescript
interface UpdateResults<T> {
	currentItems?: T[];
	failedData?: CrudArgument<T>[];
	successfulData: T[] | string[];
	type: StoreOperation;
}
```

The built in store will only populate the `type` and `successfulData` properties, but this provides an extension point for store implementations to provide more details about the results of the operation, report results incrementally, or allow for the operation to be retried in the case of recoverable errors(e.g. data conflicts or network errors).


## Subcollection Store

The other base factory provided by this package is `createSubcollectionStore`. This base is required for certain mixins, specifically `createQueryMixin`, `createTrackableMixin`, but doesn't provide significant useful functionality other than that. As such, `createStore` should be preferred unless its specific functionality or those mixins are needed.

A subcollection will delegate all crud operations to its `source`, which is the store it was created from.

## createObservableStoreMixin

This store provides an API for observing the store itself, or specific items within the store.

```typescript
interface UpdateResults<T> {
	currentItems?: T[];
	failedData?: CrudArgument<T>[];
	successfulData: T[] | string[];
	type: StoreOperation;
}

interface StoreDelta<T> {
	updates: T[];
	deletes: string[];
	adds: T[];
	beforeAll?: T[];
	afterAll?: T[];
}

interface ItemUpdate<T> {
	item?: T;
	id: string;
}
```

Example usage
```typescript
interface ObservableStoreFactory extends ComposeFactory<ObservableStore<{}, {}, any>, ObservableStoreOptions<{}, {}>> {
	<T, O extends CrudOptions, U extends UpdateResults<T>>(options?: ObservableStoreOptions<T, O>): ObservableStore<T, O, U>;
}
const createObservableStore: ObservableStoreFactory = createStore
	.mixin(createObservableStoreMixin());

const observableStore: ObservableStore = createObservableStore({
	data: [{ id: '1', value: 1 }]
});
observableStore.observe().subscribe(function(update) {
	// update = {
	// 	 updates: [ any items updated since last notification ],
	// 	 deletes: [ any items deleted since last notification ],
	// 	 beforeAll: undefined,
	// 	 afterAll: undefined,
	// 	 adds: [ any items added since last notification ]
	// }
});

observableStore.observe('itemId').subscribe(function(update) {
	// update will be the item itself
}, null, function() {
	// completion callback will be called if the item is deleted
});

observableStore.observe([ 'itemId', 'otherItemId' ]).subscribe(function() {
	// update = {
	//   item: The updated or null if the item was deleted,
	//   id: The id of the item
	// }
}, null, function() {
	// completion callback will be called if all items are deleted
});

```
A couple of things to note about this example:  
* It's necessary to provide the factory interface in order to be able to specify the generics on the store.
* If `fetchAroundUpdates` was set to true, the `beforeAll` and `afterAll` properties on the update object would be populated with the items in the store before and after the update respectively.
* If this store is a subcollection of another store, observing the child store will result in receiving all updates from the parent store.

## createQueryMixin

This mixin provides the ability to filter items, sort items, select a range of items, or query for items via anything else that implements the `Query` interface.

```typescript
interface QueryMixin<T, O extends CrudOptions, U extends UpdateResults<T>, C extends Store<T, O, U>> {
	query(query: Query<T, T>): C & this;
	filter(filter: Filter<T>): C & this;
	filter(test: (item: T) => boolean): C & this;
	range(range: StoreRange<T>): C & this;
	range(start: number, count: number): C & this;
	sort(sort: Sort<T> | ((a: T, b: T) => number) | string, descending?: boolean): C & this;
}
```

Any of the calls to the query method will return a new store, which will be a subcollection of the original store. Calling `fetch` on that store will return the appropriate data by applying the query to the data in the original store. Any updates made to this store will be propagated back up to the original store, as with all subcollections.

Example Usage
```typescript
interface QueryStoreFactory extends ComposeFactory<QueryStore<{}, {}, any, any>, SubcollectionOptions<{}, {}, any>> {
	<T, O extends CrudOptions, U extends UpdateResults<T>>(options?: SubcollectionOptions<T, O, U>): QueryStore<T, O, U, Store<T, O, U>>;
}

const createQueryStore: QueryStoreFactory = createSubcollectionStore
	.mixin(createQueryMixin());

const queryStore = createQueryStore<ItemType, CrudOptions, any>({
	data: createData()
});

queryStore
	.filter(createFilter<ItemType>().lessThan('value', 3))
	.sort('value', true)
	.fetch().then(function(data) {
		// data will contain all items satisfying the 
		// filter, sorted by the 'value' property
	}));

```

##createTrackableMixin

This mixin allows a store to be `track`ed, providing additional details when it is observed. Specifically, updates from a tracked store will be limited to only those items that match a subcollection's query(if it is using query mixin), and will contain three new properties:
```typescript
removedFromTracked: { item: T; id: string; previousIndex: number; }[];
```
Indicates which items were removed from the tracked store, either because they were deleted, or because they were updated and no longer match the query for this subcollection.
```typescript
addedToTracked: { item: T; id: string; index: number; }[];
```
Indicates which items were added to the tracked store, either because they were added, or because they were updated and now match the query for this subcollection.
```typescript
movedInTracked: { item: T; id: string; previousIndex: number; index: number }[];
```
Indicates items that have moved within the tracked store because they have changed and are now sorted differently.

Example Usage
```typescript
interface TrackableObservableQueryStore<T, O extends CrudOptions, U extends UpdateResults<T>> extends
	ObservableStore<T, O, U>,
	SubcollectionStore<T, O, U, ObservableStore<T, O, U>>,
	QueryMixin<T, O, U, ObservableStore<T, O, U>>,
	TrackableMixin<T, O, U, ObservableStore<T, O, U>> {
}

type TrackableQueryOptions<T, O extends CrudOptions> =
	TrackableOptions<T> & StoreOptions<T, CrudOptions> & QueryOptions<T> & ObservableStoreOptions<T, O>;

interface TrackableQueryStoreFactory extends ComposeFactory<TrackableObservableQueryStore<{}, {}, any>, TrackableQueryOptions<{}, {}>> {
	<T, O extends CrudOptions, U extends UpdateResults<T>>(options?: TrackableQueryOptions<T, O>): TrackableObservableQueryStore<T, O, U>;
}
interface TrackableObservableQueryStore<T, O extends CrudOptions, U extends UpdateResults<T>> extends
	ObservableStore<T, O, U>,
	SubcollectionStore<T, O, U, ObservableStore<T, O, U>>,
	QueryMixin<T, O, U, ObservableStore<T, O, U>>,
	TrackableMixin<T, O, U, ObservableStore<T, O, U>> {
}

type TrackableQueryOptions<T, O extends CrudOptions> =
	TrackableOptions<T> & StoreOptions<T, CrudOptions> & QueryOptions<T> & ObservableStoreOptions<T, O>;

interface TrackableQueryStoreFactory extends ComposeFactory<TrackableObservableQueryStore<{}, {}, any>, TrackableQueryOptions<{}, {}>> {
	<T, O extends CrudOptions, U extends UpdateResults<T>>(options?: TrackableQueryOptions<T, O>): TrackableObservableQueryStore<T, O, U>;
}

const trackableQueryStore = createTrackbleQueryStore({
	data: [ ...data ]
});

const trackedCollection = trackableQueryStore
	.filter(function(item) {
		return item.value > 1;
	})
	.sort('value')
	.track();
trackedCollection.observe().subscribe(function(update) {
  // handle updates
});

```

Things to note about this example:  
* The store in this example uses `QueryMixin`, and `TrackableMixin`, both of which are have methods that return `this` as the type. In order for `this` to match both of these interfaces, the `TrackableObservableQueryStore` interface, which extends both of these interfaces, needs to be created and used as the type of the store.
* This example uses the `createOrderedOperationsMixin`. This is to ensure that operations on the store all happen sequentially, and updates are what we would expect. See the section on the [createOrderedOperationsMixin](#createorderedoperationsmixin) for more details.

## createOrderedOperationsMixin
`Store` provides a consistent, `Promise` and `Observable` based API for all store implementations. However, with the default storage implementation, some surprising results can occur, because while all operations return asynchronously, the underlying update happens synchronously as it is operating on local data. Specifically, calling `then` on a promise(or `StoreObservable`), will result in the provided callback being executed on the next tick, so in the following example, the second `put` command is executed before the `then` from the first is resolved.

```typescript
const store = createStore({
 data: //some data
});

store.put(newItem).then(function() {
	// executes after the next put
});

store.put(anotherItem);
```

Under many circumstances this is not a problem. The actual updates of the data happen in the appropriate order, and the callbacks in these cases will only be returning the modified items anyways. However, in some cases, as with `createTrackableMixin`, or `createObservableStoreMixin` with `fetchAroundUpdates` set to true, this can create some surprising results. If you want to be able to rely on the assumption that you will receive an update from one operation before the next operation occurs, `createOrderedOperationsMixin` can be mixed into the base store factory before any other mixins. In some cases(e.g. a store making http) requests, the additional latency introduced by this restriction may cause significant performance penalties, so it's generally better not to use this mixin unless it is specifically needed.
