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

# Process Lifecycle

A Process has an execution lifecycle that defines the flow of the behavior being defined.

1.  If a transformer is present it is executed first to transform the payload
1.  `before` middleware are executed synchronously in-order
1.  commands are executed in the order defined
1.  operations are applied from the commands after each command (or block of commands in the case of multiple commands) is executed.
1.  If an excption is thrown during commands then no more commands are executed and the current set of operations are not applied
1.  `after` middleware are executed synchronously in-order

# Common Patterns

## Local vs Global State

_ local state
_ stored while the widget is connected
_ global state
_ stored for the lifetime of the application \* easy to reinstate and alter
\_ widgets should either fully control their state or be controlled
_ initial state + local state
_ external state

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

<!-- TODO -->

## Optimistic Updates

https://github.com/dojo/framework/tree/master/src/stores#optimistic-update-pattern

## Transforming Process Arguments

https://github.com/dojo/framework/tree/master/src/stores#transforming-executor-arguments

## Concurrent commands

https://github.com/dojo/framework/tree/master/src/stores#executing-concurrent-commands

## Immutable State

https://github.com/dojo/framework/tree/master/src/stores#immutablestate

## Local Storage

https://github.com/dojo/framework/tree/master/src/stores#local-storage-middleware

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
