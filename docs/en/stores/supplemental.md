# StoreProvider

## StoreProvider API

The StoreProvider accepts three properties

-   `renderer`: A render function that has the store injected in order to access state and pass processes to child widgets.
-   `stateKey`: The key of the state in the registry.
-   `paths` (optional): A function to connect the Container to sections of the state.

## Invalidation

The `StoreProvider` has two main ways to trigger invalidation and cause a rerender.

1.  The recommended approach is to register `path`s on container creation to ensure invalidation will only occur when state you are interested in changes.
1.  A catch-all when no `path`s are defined for the container, it will invalidate when _any_ data changes in the store.

## Pre-typing

A pre-typed container can be created by extending the standard `StoreProvider` and passing the `State` type as a generic.

> TypedStoreProvider.ts

```ts
import { State } from './interface';

export class TypedStoreProvider extends StoreProvider<State> {}
```

**However** in order for TypeScript to infer this correctly when using w(), the generic will need to be explicitly passed.

```ts
w<TypedStoreProvider>(TypedStoreProvider, {
	stateKey: 'state',
	renderer(store) {
		const { get, path } = store;
		return v('div', [get(path('users', 'current', 'name'))]);
	}
});
```

# Process Middleware

Middleware is applied around processes using optional `before` and `after` methods. This allows for generic, sharable actions to occur around the behavior defined by processes.

Multiple middlewares may be defined by providing a list. They are called synchronously in the order listed.

## Before

A `before` middleware block is passed a `payload` and a reference to the `store`.

> middleware/beforeLogger.ts

```ts
const beforeOnly: ProcessCallback = () => ({
	before(payload, store) {
		console.log('before only called');
	}
});
```

## After

An `after` middleware block is passed an `error` (if one occurred) and the `result` of a process.

> middleware/afterLogger.ts

```ts
const afterOnly: ProcessCallback = () => ({
	after(error, result) {
		console.log('after only called');
	}
});
```

The `result` implements the `ProcessResult` interface to provide information about the changes applied to the store and provide access to that store.

-   `executor` allows additional processes to run against the store
-   `store` a reference to the store
-   `operations` a list of applied operations
-   `undoOperations` a list of operations that can be used to reverse the applied operations
-   `apply()` the apply method from the store
-   `payload` the provided payload
-   `id` the id used to name the process

# Process Lifecycle

A Process has an execution lifecycle that defines the flow of the behavior being defined.

1.  If a transformer is present it is executed first to transform the payload
1.  `before` middleware are executed synchronously in-order
1.  commands are executed in the order defined
1.  operations are applied from the commands after each command (or block of commands in the case of multiple commands) is executed.
1.  If an excption is thrown during commands then no more commands are executed and the current set of operations are not applied
1.  `after` middleware are executed synchronously in-order

# Common Patterns

## Initial State

Initial application state can be defined on a store creating by executing a process.

> main.ts

```ts
const store = new Store<State>();
const { path } = store;

const createCommand = createCommandFactory<State>();

const initialStateCommand = createCommand(({ path }) => {
	return [add(path('auth'), { token: undefined }), add(path('users'), { list: [] })];
});

const initialStateProcess = createProcess('initial', [initialStateCommand]);

initialStateProcess(store)({});
```

## Undo

Dojo Stores tracks changes to the underlying store using patch operations. This makes it easy for Dojo to automatically create a set of operations to undo a set of operations and reinstate any data that has changed as part of a set of commands. The `undoOperations` are available in the `after` middleware as part of the `ProcessResult`.

This is useful when a process involves several commands that alter the state of the store and one of them fails necessitating a rollback.

> undo middleware

```ts
const undoOnFailure = () => {
	return {
		after: () => (error, result) {
			if (error) {
				result.store.apply(result.undoOperations);
			}
		}
	};
};

const process = createProcess('do-something', [
	command1, command2, command3
], [ undoOnFailure ])
```

If any of the commands fail during their execution the `undoOnFailure` middleware will have an opportunity to apply `undoOperations`.

It is important to note that `undoOperations` only apply to the commands fully executed during the process. It will not contain any operations to rollback state that changed as a result of other processes that may be executed asynchronously or state changes performed in middleware or directly on the store itself. These use cases are outside the scope of the undo system.

## Optimistic Updates

Optimistic updating can be used to build a responsive UI despite interactions that might take some time to respond, for example saving to a remote resource.

In the case of adding a todo item for instance, with optimistic updating, we can immediately add the todo before we even make a request to the server and avoid having an unnatural waiting period or loading indicator. When the server responds we can then reconcile the outcome based on whether it is successful or not.

In the success scenario, we might need to update the added Todo item with an id that was provided in the response from the server and change the color of the Todo item to green to indicate it was successfully saved.

In the error scenario, it might be that we want to show a notification to say the request failed and turn the Todo item red, with a "retry" button. It's even possible to revert/undo the adding of the Todo item or anything else that happened in the process.

> Undo example

```ts
const handleAddTodoErrorProcess = createProcess('error', [ () => [ add(path('failed'), true) ]; ]);

const addTodoErrorMiddleware = () => {
	return {
		after: () => (error, result) {
			if (error) {
				result.store.apply(result.undoOperations);
				result.executor(handleAddTodoErrorProcess);
			}
		}
	};
};

const addTodoProcess = createProcess('add-todo', [
		addTodoCommand,
		calculateCountsCommand,
		postTodoCommand,
		calculateCountsCommand
	],
	[ addTodoCallback ]);
```

-   `addTodoCommand` adds the new todo into the application state
-   `calculateCountsCommand` recalculates the count of completed and active todo items
-   `postTodoCommand` posts the todo item to a remote service and using the process `after` middleware we can make changes if there is a failure
    -   on _failure_ the changes are reverted and the failed state field is set to true
    -   on _success_ update the todo item id field with the value received from the remote service
-   `calculateCountsCommand` runs again after the success of `postTodoCommand`

### Synchronized updates

In some cases it is better to wait for the server to update for the process to wait until a remote call has been completed. For instance when a process will remove an element from the screen or when the outlet changes to display a different view. Restoring a state that triggered these type of actions can be surprising.

Since processes support asynchronous commands simply return a `Promise` to wait for a result.

> delete process

```ts
function byId(id: string) {
	return (item: any) => id === item.id;
}

async function deleteTodoCommand({ get, payload: { id } }: CommandRequest) {
	const { todo, index } = find(get('/todos'), byId(id));
	await fetch(`/todo/${todo.id}`, { method: 'DELETE' });
	return [remove(path('todos', index))];
}

const deleteTodoProcess = createProcess('delete', [deleteTodoCommand, calculateCountsCommand]);
```

## Concurrent commands

A `Process` supports concurrent execution of multiple commands by specifying the commands in an array.

> process.ts

```ts
createProcess('my-process', [commandLeft, [concurrentCommandOne, concurrentCommandTwo], commandRight]);
```

In this example, `commandLeft` is executed, then both `concurrentCommandOne` and `concurrentCommandTwo` are executed concurrently. Once all of the concurrent commands are completed the results are applied in order. If an error occurs in either of the concurrent commands then none of the operations are applied. Finally `commandRight` is executed.

## Alternative State implementations

When a store is instantiated an implementation of the `MutableState` interface is used by default. In most circumstances the default state interface is well optimized and sufficient to use for the general case. If a particular use case merits an alternative implementation.

> Providing an alternative state

```ts
const store = new Store({ state: myStateImpl });
```

### `MutableState` API

Any `State` implemention must provide four methods to properly apply operations to the state.

-   `get<S>(path: Path<M, S>): S` takes a `Path` object and returns the value in the current state that that path points to
-   `at<S extends Path<M, Array<any>>>(path: S, index: number): Path<M, S['value'][0]>` returns a `Path` object that points to the provided `index` in the array at the provided path
-   `path: StatePaths<M>` is a typesafe way to generate a `Path` object for a given path in the state
-   `apply(operations: PatchOperation<T>[]): PatchOperation<T>[]` applies the provided operations to the current state

### ImmutableState

Dojo Stores provide an implementation of the MutableState interface that leverages [Immutable](). This implementation may provide better performance if there are frequent, deep updates to the store's state. Performance should be tested and verified before fully committing to this implementation.

> Using Immutable

```ts
import State from './interfaces';
import Store from '@dojo/framework/stores/Store';
import Registry from '@dojo/framework/widget-core/Registry';
import ImmutableState from '@dojo/framework/stores/state/ImmutableState';

const registry = new Registry();
const customStore = new ImmutableState<State>();
const store = new Store<State>({ store: customStore });
```

## Local Storage

Dojo Stores provides a collection of tools to leverage local storage.

The local storage middleware watches specified paths for changes and stores them locally on disk using the `id` provided to the `collector` and structure as defined by the path.

> Local storage middleware

```ts
export const myProcess = createProcess(
	'my-process',
	[command],
	collector('my-process', (path) => {
		return [path('state', 'to', 'save'), path('other', 'state', 'to', 'save')];
	})
);
```

The `load` function hydrates a store from `LocalStorage`

> Hydrating state

```ts
import { load } from '@dojo/framework/stores/middleware/localStorage';
import { Store } from '@dojo/framework/stores/Store';

const store = new Store();
load('my-process', store);
```

Note that data is serialized for storage and the data is overwritten after each process call. This implementation is not appropriate for non-serializable data (e.g. `Date` and `ArrayBuffer`).

# Subscribing to Store changes

The `Store` has an `onChange(path, callback)` method that takes a path or an array of paths and will call a callback function whenever that state changes.

> main.ts

```ts
const store = new Store<State>();
const { path } = store;

store.onChange(path('auth', 'token'), () => {
	console.log('new login');
});

store.onChange([path('users', 'current'), path('users', 'list')], () => {
	// Make sure the current user is in the user list
});
```

The `Store` also has an `invalidate` event that fires any time the store changes.

> main.ts

```ts
store.on('invalidate', () => {
	// do something when the store's state has been updated.
});
```

# JSON Patch and Store operations

In the basic usage guide we show how Dojo Stores use operations in detail to make changes to the underlying state of an application and state that these operations are based on [JSON patch](). However, Stores deviates from the JSON Patch specification, [RFC 6902](https://tools.ietf.org/html/rfc6902), in a number of ways.

First and foremost Dojo Stores was designed with simplicity in mind. For instance, operations will automatically create the underlying structure necessary to support an `add` or `replace` operation.

> Deep `add` in an uninitialized store

```ts
import Store from '@dojo/framework/stores/Store';
import { add } from '@dojo/framework/stores/state/operations';

const store = new Store<State>();
const { at, path, apply } = store;
const user = { id: '0', name: 'Paul' };

apply([add(at(path('users', 'list'), 10), user)]);
```

> Result

```json
{
	"users": {
		"list": [
			{
				"id": "0",
				"name": "Paul"
			}
		]
	}
}
```

Even though state has not been initialized, Dojo is able to create the underlying hierarchy based on the provided path. This operation is safe because of the type safety that TypeScript and Dojo Stores provide. This allows for users to work naturally with the `State` interface used by the store instead of needing to be concerned with the data explicitly held by the store.

When an explicit state is required that information can asserted by using a `test` operation or by getting the underlying data and validating it programmatically.

This example will throw a test exception since `/users/list` has not been initialized.

> Using `test` to ensure initialization

```ts
import Store from "@dojo/framework/stores/Store";
import { test } from "@dojo/framework/stores/state/operations";

const store = new Store<State>();
const { at, path, apply } = store;

apply([
	test(at(path('users', 'list', 'length), 0))
]);
```

This example ensures that `user` is always added to the end of the list as the last element.

> Programmatic introspection

```ts
import Store from '@dojo/framework/stores/Store';
import { add, test } from '@dojo/framework/stores/state/operations';

const store = new Store<State>();
const { get, at, path, apply } = store;
const user = { id: '0', name: 'Paul' };
const pos = get(path('users', 'list', 'length')) || 0;
apply([
	add(at(path('users', 'list'), pos), user),
	test(at(path('users', 'list'), pos), user),
	test(path('users', 'list', 'length'), pos + 1)
]);
```

Access to state root is not permitted and will throw an error, for example, get(path('/')). This applies to Operations also, it is not possible to create an operation that will update the state root. Best practices with @dojo/framework/stores mean touching the smallest part of the store as is necessary.
