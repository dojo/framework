# Store concepts in detail

## `State` object

In modern browsers a `state` object is passed as part of the `CommandRequest`. Any modification to this `state` object gets translated to the appropriate patch operations and applied against the store.

```ts
import { createCommandFactory } from '@dojo/framework/stores/process';
import { State } from './interfaces';
import { remove, replace } from '@dojo/framework/stores/state/operations';

const createCommand = createCommandFactory<State>();

const addUser = createCommand<User>(({ payload, state }) => {
	const currentUsers = state.users.list || [];
	state.users.list = [...currentUsers, payload];
});
```

Note that attempting to access state is not supported in IE11 and will immediately throw an error.

## `StoreProvider`

The StoreProvider accepts three properties

-   `renderer`: A render function that has the store injected to access state and pass processes to child widgets.
-   `stateKey`: The key of the state in the registry.
-   `paths` (optional): A function to connect the provider to sections of the state.

### Invalidation

The `StoreProvider` has two main ways to trigger invalidation and cause a re-render.

1.  The recommended approach is to register `path`s by passing the `paths` property to the provider to ensure invalidation only occurs when relevant state changes.
2.  A catch-all when no `path`s are defined for the container, it will invalidate when _any_ data changes in the store.

## `Process`

### Lifecycle

A `Process` has an execution lifecycle that defines the flow of the behavior being defined.

1.  If a transformer is present it gets executed first to transform the payload
1.  `before` middleware get executed synchronously in order
1.  commands get executed in the order defined
1.  operations get applied from the commands after each command (or block of commands in the case of multiple commands) gets executed
1.  If an exception is thrown during commands, no more commands get executed and the current set of operations are not applied
1.  `after` middleware get executed synchronously in order

### Transformers

By using a transformer, you can modify a payload before it is used by a processes commands. This is a way to
create additional process executors that accept different payloads.

```ts
interface PricePayload {
	price: number;
}

const createCommand = createCommandFactory<any, PricePayload>();

// `payload` is typed to `PricePayload`
const setNumericPriceCommand = createCommand(({ get, path, payload }) => {});
const setNumericPrice = createProcess('set-price', [setNumericPriceCommand]);
```

First, create a transformer to convert another type of input into `PricePayload`:

```ts
interface TransformerPayload {
	price: string;
}

// The transformer return type must match the original `PricePayload`
const transformer = (payload: TransformerPayload): PricePayload => {
	return {
		price: parseInt(payload.price, 10)
	};
};
```

Now simply create the process with this transformer.

```ts
const processExecutor = setNumericPrice(store);
const transformedProcessExecutor = setNumericPrice(store, transformer);

processExecutor({ price: 12.5 });
transformedProcessExecutor({ price: '12.50' });
```

### Process middleware

Middleware gets applied around processes using optional `before` and `after` methods. This allows for generic, sharable actions to occur around the behavior defined by processes.

Multiple middlewares may get defined by providing a list. Middlewares get called synchronously in the order listed.

#### Before

A `before` middleware block gets passed a `payload` and a reference to the `store`.

> middleware/beforeLogger.ts

```ts
const beforeOnly: ProcessCallback = () => ({
	before(payload, store) {
		console.log('before only called');
	}
});
```

#### After

An `after` middleware block gets passed an `error` (if one occurred) and the `result` of a process.

> middleware/afterLogger.ts

```ts
const afterOnly: ProcessCallback = () => ({
	after(error, result) {
		console.log('after only called');
	}
});
```

The `result` implements the `ProcessResult` interface to provide information about the changes applied to the store and provide access to that store.

-   `executor` - allows additional processes to run against the store
-   `store` - a reference to the store
-   `operations` - a list of applied operations
-   `undoOperations` - a list of operations that can be used to reverse the applied operations
-   `apply` - the apply method from the store
-   `payload` - the provided payload
-   `id` - the id used to name the process

## Subscribing to store changes

The `Store` has an `onChange(path, callback)` method that takes a path or an array of paths and invokes a callback function whenever that state changes.

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

# Common state management patterns

## Initial state

When a store is first created, it will be empty. A process can then be used to populate the store with initial application state.

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

Dojo Stores track changes to the underlying store using patch operations. This makes it easy for Dojo to automatically create a set of operations to undo a set of operations and reinstate any data that has changed as part of a set of commands. The `undoOperations` are available in the `after` middleware as part of the `ProcessResult`.

Undo operations are useful when a process involves several commands that alter the state of the store and one of the commands fails, necessitating a rollback.

> undo middleware

```ts
const undoOnFailure = () => {
	return {
		after: (error, result) => {
			if (error) {
				result.store.apply(result.undoOperations);
			}
		}
	};
};

const process = createProcess('do-something', [command1, command2, command3], [undoOnFailure]);
```

If any of the commands fail during their execution the `undoOnFailure` middleware will have an opportunity to apply `undoOperations`.

It is important to note that `undoOperations` only apply to the commands fully executed during the process. It will not contain any operations to rollback state that changed as a result of other processes that may get executed asynchronously or state changes performed in middleware or directly on the store itself. These use cases are outside the scope of the undo system.

## Optimistic updates

Optimistic updating can be used to build a responsive UI despite interactions that might take some time to respond, for example saving to a remote resource.

For example, in the case of adding a todo item, with optimistic updating a todo item can be immediately added to a store before a request is made to persist the object on the server, avoiding an unnatural waiting period or loading indicator. When the server responds, the todo item in the store can then get reconciled based on whether the outcome of the server operation was successful or not.

In the success scenario, the added `Todo` item can be updated with an `id` provided in the server response, and the color of the `Todo` item can be changed to green to indicate it was successfully saved.

In the error scenario, a notification could be shown to say the request failed and the Todo item color can be changed to red, together with showing a "retry" button. It's even possible to revert/undo the adding of the Todo item or anything else that happened during the process.

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

-   `addTodoCommand` - adds the new todo into the application state
-   `calculateCountsCommand` - recalculates the count of completed and active todo items
-   `postTodoCommand` - posts the todo item to a remote service and, using the process `after` middleware, further changes can be made if a failure occurs
    -   on _failure_ the changes get reverted and the failed state field gets set to true
    -   on _success_ update the todo item id field with the value received from the remote service
-   `calculateCountsCommand` - runs again after the success of `postTodoCommand`

### Synchronized updates

In some cases it is better to wait for a back-end call to complete before continuing on with process execution. For example, when a process will remove an element from the screen or when the outlet changes to display a different view, restoring a state that triggered these actions can be surprising.

Because processes support asynchronous commands, simply return a `Promise` to wait for a result.

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

In this example, `commandLeft` gets executed, then both `concurrentCommandOne` and `concurrentCommandTwo` get executed concurrently. Once all of the concurrent commands are completed the results get applied in order. If an error occurs in either of the concurrent commands then none of the operations get applied. Finally, `commandRight` gets executed.

## Alternative state implementations

When a store gets instantiated an implementation of the `MutableState` interface gets used by default. In most circumstances the default state interface is well optimized and sufficient to use for the general case. If a particular use case merits an alternative implementation, the implementation can be passed in during initialization.

```ts
const store = new Store({ state: myStateImpl });
```

### `MutableState` API

Any `State` implementation must provide four methods to properly apply operations to the state.

-   `get<S>(path: Path<M, S>): S` takes a `Path` object and returns the value in the current state at the provided path
-   `at<S extends Path<M, Array<any>>>(path: S, index: number): Path<M, S['value'][0]>` returns a `Path` object that points to the provided `index` in the array at the provided path
-   `path: StatePaths<M>` is a type-safe way to generate a `Path` object for a given path in the state
-   `apply(operations: PatchOperation<T>[]): PatchOperation<T>[]` applies the provided operations to the current state

### `ImmutableState`

Dojo Stores provide an implementation of the MutableState interface that leverages [Immutable](https://github.com/dojo/framework/blob/master/src/stores/state/ImmutableState.ts). This implementation may provide better performance if there are frequent, deep updates to the store's state. Performance should be tested and verified before fully committing to this implementation.

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

## Local storage

Dojo Stores provides a collection of tools to leverage local storage.

The local storage middleware watches specified paths for changes and stores them locally on disk using the `id` provided to the `collector` and structure as defined by the path.

Using local storage middleware:

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

To hydrate state:

```ts
import { load } from '@dojo/framework/stores/middleware/localStorage';
import { Store } from '@dojo/framework/stores/Store';

const store = new Store();
load('my-process', store);
```

Note that data is serialized for storage and the data gets overwritten after each process call. This implementation is not appropriate for non-serializable data (e.g. `Date` and `ArrayBuffer`).

# Advanced store operations

Dojo Stores use operations to make changes to the underlying state of an application. The operations are designed in a way to help simplify common interactions with the store, so, for example, operations will automatically create the underlying structure necessary to support an `add` or `replace` operation.

To perform a deep `add` in an uninitialized store:

```ts
import Store from '@dojo/framework/stores/Store';
import { add } from '@dojo/framework/stores/state/operations';

const store = new Store<State>();
const { at, path, apply } = store;
const user = { id: '0', name: 'Paul' };

apply([add(at(path('users', 'list'), 10), user)]);
```

Which gives a result of:

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

When an explicit state is required, that information can get asserted by using a `test` operation or by getting the underlying data and validating it programmatically.

This example ensures that `user` always gets added to the end of the list as the last element by using a `test` operation to ensure initialization:

```ts
import Store from '@dojo/framework/stores/Store';
import { test } from '@dojo/framework/stores/state/operations';

const store = new Store<State>();
const { at, path, apply } = store;

apply([test(at(path('users', 'list', 'length'), 0))]);
```

This example ensures that `user` is always added to the end of the list as the last element by programmatic introspection:

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

Access to state root is not permitted and will throw an error, for example when trying to perform `get(path('/'))`. This restriction also applies to operations; it is not possible to create an operation that will update the state root. Best practices with `@dojo/framework/stores` encourage accessing the smallest necessary part of the store.
