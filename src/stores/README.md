# stores

An application store for dojo.

## Features

-   Application state store designed to work with a reactive component architecture
-   Out of the box support for asynchronous commands
-   All state operations are recorded per process and undoable via middleware
-   Supports the optimistic pattern with the ability to roll back on a failure
-   Fully serializable operations and state

<!-- start-github-only -->

---

-   [Overview](#overview)
-   [Basics](#basics)
    -   [Operations](#operations)
    -   [Commands](#commands)
    -   [Processes](#processes)
    -   [Initial State](#initial-state)
-   [How Does This Differ From Redux](#how-does-this-differ-from-Redux)
-   [Advanced](#advanced)
    -   [Connecting Stores To Widgets](#connecting-stores-to-widgets)
    -   [Subscribing To Store Changes](#subscribing-to-store-changes)
    -   [Transforming Executor Arguments](#transforming-executor-arguments)
    -   [Optimistic Update Pattern](#optimistic-update-pattern)
    -   [Executing Concurrent Commands](#executing-concurrent-commands)
    -   [Providing An Alternative State Implementation](#providing-an-alternative-state-implementation)
-   [Middleware](#middleware)
    -   [After Middleware](#after-middleware)
    -   [Before Middleware](#before-middleware)
    -   [Applying Middleware to Multiple Processes](#applying-middleware-to-multiple-processes)
    -   [Combining Before and After Callbacks](#combining-before-and-after-callbacks)
    -   [Local Storage Middleware](#local-storage-middleware)

---

<!-- end-github-only -->

## Overview

Dojo stores is a predictable, consistent state container for Javascript applications with inspiration from Redux and Flux architectures. However, the `@dojo/framework/stores` package aims to provide more built-in support for common patterns such as asynchronous behaviors, undo support and **more**!

Managing state can become difficult to coordinate when an application becomes complicated with multiple views, widgets, components, and models. With each of these attempting to update attributes of state at varying points within the application lifecycle things can get **confusing**. When state changes are hard to understand and/or non-deterministic it becomes increasingly difficult to identify and reproduce bugs or add new features.

The `@dojo/framework/stores` package provides a centralized store, designed to be the **single source of truth** for an application. It operates using uni-directional data flow. This means all application data follows the same lifecycle, ensuring the application logic is predictable and easy to understand.

**Note**: Do you need a centralized store? Lifting state up to parent widgets and using local state are likely to be sufficient in less complex applications.

## Basics

To work with `@dojo/framework/stores` there are three core but simple concepts - Operations, Commands, and Processes.

-   `Operation`
    -   Granular instructions to manipulate state based on JSON Patch
-   `Command`
    -   Simple functions that ultimately return operations needed to perform the required state change
-   `Process`
    -   A function that executes a group of commands that usually represent a complete application behavior

### Operations

Operations are the raw instructions the store uses to make modifications to the state. The operations are based on the JSON Patch and JSON Pointer specifications that have been customized specifically for Dojo stores, primarily to prevent access to the state's root.

Dojo stores support four of the six JSON Patch operations: "add", "remove", "replace", and "test". The "copy" and "move" operations are not currently supported. Each operation is a simple object which contains instructions with the `OperationType`, `path` and optionally the `value` (depending on operation).

```ts
import { OperationType } from '@dojo/framework/stores/State/patch';
import { Pointer } from '@dojo/framework/stores/state/Pointer';

const operations = [
	{
		op: OperationType.ADD,
		path: new Pointer('/foo'),
		value: 'foo'
	},
	{
		op: OperationType.REPLACE,
		path: new Pointer('/bar'),
		value: 'bar'
	},
	{
		op: OperationType.REMOVE,
		path: new Pointer('/qux')
	}
];
```

Dojo stores provides a helper package that can generate `PatchOperation` objects from `@dojo/framework/stores/state/operations`:

-   `add` - Returns a `PatchOperation` of type `OperationType.ADD` for the `path` and `value`
-   `remove` - Returns a `PatchOperation` of type `OperationType.REMOVE` for the `path`
-   `replace` - Returns a `PatchOperation` of type `OperationType.REPLACE` for the `path` and `value`
-   `test` - Returns a `PatchOperation` of type `OperationType.TEST` for the `path` and `value`

These functions accept a `Path` type. This is returned by the `path` and `at` methods on a store. More often this will be created using the `path` and `at` functions provided as part of the arguments to a [command](#commands), which are described in more detail below. Rather than accepting a full string path, the `path` and `at` functions accept a series of arguments and provide type checking to verify that the path created actually exists on the state object.

### Commands

Commands are simply functions which are called internally by the store when executing a `Process` and return an array of `PatchOperations` that tells the `store` what state changes needs to be performed.

Each command is passed a `CommandRequest` which provides `path` and `at` functions to generate `Path`s in a typesafe way, a `get` function for access to the store's state, and a `payload` object for the argument that the process executor was called with.

The `get` function returns back state for a given `Path`, for example `get(path('my', 'deep', 'state'))` or `get(at(path('my', 'array', 'item'), 9))`.

```ts
function addTodoCommand({ at, path, get, payload }: CommandRequest) {
	const todosPath = path('todos');
	const length = get(todosPath).length;
	const operations = [add(at(todosPath, length), payload)];

	return operations;
}

function calculateCountsCommand({ get, path }: CommandRequest) {
	const todos = get(path('todos'));
	const completedTodos = todos.filter((todo: any) => todo.completed);
	const operations = [
		replace(path('activeCount'), todos.length - completedTodos.length),
		replace(path('completedCount'), completedTodos.length)
	];

	return operations;
}
```

A `Command`, or the `CommandRequest` argument to it, can be provided with generics that indicate the type of the state of the store they are intended to target and the payload that will be passed. This will provide type checking for all calls to `path` and `at` and usages of `payload`, ensuring that the operations will be targeting real properties of the store, and providing type inference for the return type of `get`.

```ts
interface MyState {
	id: string;
}

interface Payload {
	id: string;
}
const command = (request: CommandRequest<MyState, Payload>) => {
	return [
		add(path('id'), request.payload.id);
	];
};
```

In order to avoid typing each `Command` explicitly, a `CommandFactory` can be created that will pass its generic types onto all commands it creates. Creating commands using a factory is essentially the same as creating them without one. It is simply a convenience to avoid repeating the same typings for each command.

```ts
interface Todo {
	completed: boolean;
	label: string;
}

interface TodoState {
	todos: Todo[];
	activeCount: number;
	completedCount: number;
}

const createCommand = createCommandFactory<TodoState>();

const addTodoCommand = createCommand(({ at, get, path, payload }) => {
	const todos = get(path('todos'));
	// const todos = get(path('todoes')); Fails to compile because `todoes` is not a property on the state
	// const value = todos + 3;  Fails to compile because todos is typed as inferred to be an array of `Todo` objects
	const operations = [
		// Using the utilities provided by the `operations` module ensures that the paths provided are valid,
		// and that the values being added or replaced are of the appropriate type
		add(at(path('todos'), todos.length), payload)
	];

	return operations;
});

const calculateCountsCommand = createCommand(({ get, path }) => {
	const todos = get(path('todos'));
	const completedTodos = todos.filter((todo: any) => todo.completed);
	const operations = [
		replace(path('activeCount'), todos.length - completedTodos.length),
		replace(path('completedCount'), completedTodos.length)
	];
	return operations;
});
```

_Important:_ Access to state root is not permitted and will throw an error, for example, `get(path('/'))`. This applies to `Operations` also, it is not possible to create an operation that will update the state root. Best practices with @dojo/framework/stores mean touching the smallest part of the store as is necessary.

##### Asynchronous Commands

Commands support asynchronous behavior out of the box simply by returning a `Promise<PatchOperation[]>`.

```ts
async function postTodoCommand({ get, path, payload: { id } }: CommandRequest): Promise<PatchOperation[]> {
	const response = await fetch('/todos');
	if (!response.ok) {
		throw new Error('Unable to post todo');
	}
	const json = await response.json();
	const todos = get(path('todos'));
	const index = findIndex(todos, byId(id));
	// success
	return [
		replace(at(path('todos'), index), {
			...todos[index],
			loading: false,
			id: data.uuid
		})
	];
}
```

#### The `state` Object

In modern browsers, commands can also directly modify a `state` object that is passed in as part of the CommandRequest.
Any modifications to this object will be translated into the appropriate patch operations and executed against the store.
Commands that modify the state object can be synchronous or asynchronous, but if they are asynchronous they must return
a promise that will resolve when modifications are complete. Note that attempting to access `state` is not supported in IE
and will immediately throw an error.

```ts
function calculateCountsCommand = createCommand(({ state }) => {
	const todos = state.todos;
	const completedTodos = todos.filter((todo: any) => todo.completed);

	state.activeCount = todos.length - completedTodos.length;
	state.completedCount = completedTodos.length;
});

async function postTodoCommand({ state }: CommandRequest): Promise<PatchOperation[]> {
	const response = await fetch('/todos');
	if (!response.ok) {
		throw new Error('Unable to post todo');
	}
	const json = await response.json();
	const todos = state.todos
	const index = findIndex(todos, byId(id));
	// success
	state.todos[index] = {
		...todos[index],
		loading: false,
		id: json.uuid
	};
}
```

### Processes

A `Process` is the construct used to execute commands against a `store` instance in order to make changes to the application state. `Processes` are created using the `createProcess` factory function that accepts an array of commands and an optional callback that can be used to manage errors thrown from a command. The optional callback receives an `error` object and a `result` object. The `error` object contains the `error` stack and the command that caused the error.

The result object contains the following:

-   The `payload` passed to the process
-   `undoOperations` to undo the `process`
-   A function to execute an additional `process`.

The array of `Commands` are executed in sequence by the store until the last Command is completed or a `Command` throws an error. These processes often represent an application behavior. For example, adding a todo in a simple todo application which will be made up with multiple discreet commands.

A simple `process` to add a todo and recalculate the todo count:

```ts
const addTodoProcess = createProcess('add-todo', [addTodoCommand, calculateCountCommand]);
```

An after `middleware` can be provided which will be called when an error occurs or the process is successfully completed:

```ts
const addTodoProcessMiddleware = () => {
	return {
		after: (error, result) => {
			if (error) {
				// do something with the error
				// possibly undo the operations
				result.store.apply(result.undoOperations);
			}
			// possible additional state changes by running another process using result.executor(otherProcess)
		};
	};
};

const addTodoProcess = createProcess('add-todo', [addTodoCommand, calculateCountCommand], [ addTodoProcessMiddleware ]);
```

The `Process` creates a deferred executor by passing the `store` instance `addTodoProcess(store)` which can be executed immediately by passing the `payload`, `addTodoProcess(store)(payload)`. Or more often passed to your widgets and used to initiate state changes on user interactions. The `payload` argument for the `executor` is required and is passed to each of the `Process`'s commands in a `payload` argument.

```ts
const addTodoExecutor = addTodoProcess(store);

addTodoExecutor({
	foo: 'arguments',
	bar: 'get',
	baz: 'passed',
	qux: 'here'
});
```

### Initial State

Initial state can be defined on store creation by executing a `Process` after the store has been instantiated.

```ts
// Command that creates the basic initial state
const initialStateCommand = createCommand({ path }) => {
	return [
		add(path('todos'), []),
		add(path('currentTodo'), ''),
		add(path('activeCount'), 0),
		add(path('completedCount'), 0)
	]);
}

const initialStateProcess = createProcess('initial', [ initialStateCommand ]);

// creates the store, initializes the state and runs the `getTodosProcess` shown below.
const store = createStore();
initialStateProcess(store)();
// if a process contains an async command, like fetching initial data from a remote service the return promise can be used
// to control the flow.
getTodosProcess(store)().then(() => {
	// do things once the todos have been fetched.
});
```

The `payload` argument for the process executor can be specified as the second generic type when using `createProcess`

```ts
const process = createProcess<any, { foo: string }>('foo', [command]);
const processExecutor = process(store);

// The executor will require an argument that satisfies `{ foo: string }`
processExecutor({ foo: 'bar' });
processExecutor({ foo: 1 }); // Compile error
```

The process executor's `payload` type will also be inferred by the `payload` type of the commands if not specified explicitly, however, the `payload` type for all the commands must be assignable when this is not the case the payload generic type needs to be explicitly passed.

```ts
const createCommandOne = createCommandFactory<any, { foo: string }>();
const createCommandTwo = createCommandFactory<any, { bar: string }>();
const commandOne = createCommandOne(({ get, path, payload }) => []);
const commandTwo = createCommandTwo(({ get, path, payload }) => []);

const processOne = createProcess('one', [commandOne]);
const executorOne = processOne(store); // payload for executor inferred based on `commandOne`

executorOne({ foo: 'foo' });
executorOne({ bar: 'foo' }); // compile error

// compile error as payload types for commandOne and commandTwo are not assignable
const processTwo = createProcess('two', [commandOne, commandTwo]);
// Explicitly passing a generic that satisfies all the command payload types enables payload type widening
const processTwo = createProcess<any, { foo: string; bar: string }>('two', [commandOne, commandTwo]);
const executorTwo = processTwo(store);
executorTwo({ foo: 'foo' }); // compile error, as requires both `bar` and `foo`
executorTwo({ foo: 'foo', bar: 'bar' }); // Yay, valid
```

Alternatively, the payload can be typed at command creation

```ts
const createCommandOne = createCommandFactory<MyState>();
const commandOne = createCommandOne<{ foo: string }>(({ get, path, payload }) => []);
```

## How does this differ from Redux

Although Dojo stores is a big atom state store, you never get access to the entire state object. To access the sections of state that are needed we use pointers to return the slice of state that is needed i.e. `path('path', 'to', 'state')`. State is never directly updated by the user, with state changes only being processed by the operations returned by commands.

There is no concept of `reducers`, meaning that there is no confusion about where logic needs to reside between `reducers` and `actions`. `Commands` are the only place that state logic resides and return `operations` that dictate what `state` changes are required and processed internally by the `store`.

Additionally, this means that there is no need to coordinate `actions` and `reducers` using a string action key. Commands are simple function references that can be reused in multiple `processes`.

## Advanced

### Connecting Store To Widgets

Store data can be connected to widgets within your application using the `StoreProvider` widget provided by `@dojo/framework/stores`.

Container Property API:

-   `renderer`: A render function that has the store injected in order to access state and pass processes to child widgets.
-   `stateKey`: The key of the state in the registry.
-   `paths` (optional): A function to connect the `Container` to sections of the state.

There are two mechanisms to connect the `StoreProvider` to the `Store`:

1.  The recommended approach is to register `paths` on container creation to ensure invalidation will only occur when state you are interested in changes.
2.  A catch-all when no `paths` are defined for the container, it will invalidate when any data changes in the store.

```ts
import { WidgetBase } from '@dojo/framework/core/WidgetBase';
import { Store } from '@dojo/framework/stores/Stores';
import StoreProvider from '@dojo/framework/stores/StoreProvider';

interface State {
	foo: string;
	bar: {
		baz: string;
	};
}

class MyApp extends WidgetBase {
	protected render() {
		return w(StoreProvider, {
			stateKey: 'state',
			renderer: (store: Store<State>) => {
				return v('div', [store.get(store.path('foo'))]);
			}
		});
	}
}
```

A pre-typed container can be created by extending the standard `StoreProvider` and passing the `State` type as a generic.

```ts
interface State {
	foo: string;
}

export class MyTypeStoreProvider extends StoreProvider<State> {}
```

**However** in order for TypeScript to infer this correctly when using `w()`, the generic will need to be explicitly passed.

```ts
w<MyTypeStoreProvider>(MyTypeStoreProvider, {
	stateKey: 'state',
	renderer(store) {
		return v('div', [store.get(store.path('foo'))]);
	}
});
```

### Subscribing to store changes

To be notified of changes in the store, use the `onChange()` function, which takes a `path` or an array of `path`'s and a callback for when that portion of state changes, for example:

```ts
store.onChange(store.path('foo', 'bar'), () => {
	// do something when the state at foo/bar has been updated.
});
```

or

```ts
store.onChange([store.path('foo', 'bar'), store.path('baz')], () => {
	// do something when the state at /foo/bar or /baz has been updated.
});
```

In order to be notified when any changes occur within the store's state, simply register to the stores `.on()` method for a type of `invalidate` passing the function to be called.

```ts
store.on('invalidate', () => {
	// do something when the store's state has been updated.
});
```

### Transforming Executor Arguments

An optional `transformer` can be passed to a process that is used to transform the `executor`'s payload to the `command` payload type. The return type of the `transformer` must match the `command` `payload` type of the `process`. The argument type of the `executor` is inferred from transformers `payload` type.

```ts
interface CommandPayload {
	bar: number;
	foo: number;
}
// `CommandPayload` types the command payload and the argument of the process executor
const createCommand = createCommandFactory<any, CommandPayload>();

// `payload` is typed to `CommandPayload`
const command = createCommand(({ get, path, payload }) => {});

const process = createProcess('example', [command]);

interface TransformerPayload {
	foo: string;
}

// The transformer return type must match the original `CommandPayload`
const transformer = (payload: TransformerPayload): CommandPayload => {
	return {
		bar: 1,
		foo: 2
	};
};

// when no transformer passed to the process the executor `payload` is typed to `CommandPayload`
const processExecutor = process(store);
// Works
processExecutor({ bar: 1, foo: 2 });
// These shouldn't work as `payload` does not match `CommandPayload` interface
processExecutor({ bar: '', foo: 2 });
processExecutor({ foo: '' });

// when a `transformer` passed to the process the `transformer` return type must match `CommandPayload`
// and the executor `payload` type becomes `payload` type of the `transformer`
const processExecutor = process(store, transformer);
// Works as the `transformer` payload type is `{ foo: string }`
processExecutor({ foo: '' });
// Shouldn't work as `payload` does not match the `TransformerPayload` type
processExecutor({ bar: 1, foo: 2 });
processExecutor({ bar: 1, foo: '' });
```

Each `Command` will be passed the result of the transformer as the `payload` for example: `{ bar: 1, foo: 2 }`

### Optimistic Update Pattern

Optimistic updating can be used to build a responsive UI despite interactions that might take some time to respond, for example saving to a remote resource.

In the case of adding a todo item for instance, with optimistic updating, we can immediately add the todo before we even make a request to the server and avoid having an unnatural waiting period or loading indicator. When the server responds we can then reconcile the outcome based on whether it is successful or not.

In the success scenario, we might need to update the added Todo item with an id that was provided in the response from the server and change the color of the Todo item to green to indicate it was successfully saved.

In the error scenario, it might be that we want to show a notification to say the request failed and turn the Todo item red, with a "retry" button. It's even possible to revert/undo the adding of the Todo item or anything else that happened in the process.

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

-   `addTodoCommand`: Adds the new todo into the application state
-   `calculateCountsCommand`: Recalculates the count of completed and active todo items
-   `postTodoCommand`: posts the todo item to a remote service and using the process after middleware we can make changes if there is a failure
    -   on failure: the previous two commands are reverted and the `failed` state field is set to `true`
    -   on success: Returns operations that update the todo item `id` field with the value received from the remote service
-   `calculateCountsCommand`: Runs again after the success of `postTodoCommand`

To support "pessimistic" updates to the application state, i.e. wait until a remote service call has been completed before changing the application state simply put the async command before the application store update. This can be useful when performing a deletion of a resource, when it can be surprising if an item is removed from the UI "optimistically" only for it to reappear back if the remote service call fails.

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

_Note:_ The process requires the counts to be recalculated after successfully deleting a todo, the process above shows how easily commands can be shared and reused.

### Executing concurrent commands

A `Process` supports concurrent execution of multiple commands by specifying the commands in an array when creating the process:

```ts
const myProcess = createProcess('my-process', [commandOne, [concurrentCommandOne, concurrentCommandTwo], commandTwo]);
```

In this example, `commandOne` is executed, then both `concurrentCommandOne` and `concurrentCommandTwo` are executed concurrently. Once all of the concurrent commands are completed the results are applied in order before continuing with the process and executing `commandTwo`.

**Note:** Concurrent commands are all assumed to be asynchronous and resolved using `Promise.all` if any returns a `Promise`.

### Providing an alternative State implementation

Processing operations and updating the store state is handled by an implementation of the `MutableState` interface
defined in `Store.ts`. This interface defines four methods necessary to properly apply operations to the state.

-   `get<S>(path: Path<M, S>): S` Takes a `Path` object and returns the value in the current state that that path points to
-   `at<S extends Path<M, Array<any>>>(path: S, index: number): Path<M, S['value'][0]>` Returns a `Path` object that
    points to the provided `index` in the array at the provided `path`
-   `path: StatePaths<M>` A typesafe way to generate a `Path` object for a given path in the state
-   `apply(operations: PatchOperation<T>[]): PatchOperation<T>[]` Apply the provided operations to the current state

The default state implementation is reasonably optimized and in most circumstances will be sufficient.
If a particular use case merits an alternative implementation it can be provided to the store constructor

```ts
const store = new Store({ state: myStateImpl });
```

#### ImmutableState

An implementation of the `MutableState` interface that leverages [Immutable](https://github.com/immutable-js/immutable-js) under the hood is provided as an example. This implementation may provide better performance if there are frequent, deep updates to the store's state, but performance should be tested and verified for your app before switching to this implementation.

## Middleware

Middleware provides a hook to apply generic/global functionality across multiple or all processes used within an application. Middleware is a function that returns an object with optional `before` and `after` callback functions.

Multiple middlewares can be provided, and in this case any `before` callbacks will be called in the order they are provided, the process will run, and then `after` callbacks will be called in the order provided.

### After Middleware

If provided, the `after` callback will be passed the error and the result of a process to perform a specific action. If multiple middlewares are provided, their `after` callbacks will be
executed in the order they were provided.

In the example below, the `after` callbacks returned by callback, logger, and snapshot will be called in that order.

```ts
const myProcess = createProcess('my-process', [commandOne, commandTwo], [callback, logger, snapshot]);
```

### Before Middleware

If provided, the `before` callback functions will be passed payload passed to the process and a reference to the store. They can be synchronous or asynchronous, designated by returning a promise,
but if they are asynchronous they will make any processes they are attached to asynchronous as well.

In the example below, the `before` callbacks returned by authenticator and logger would be called in that order.

```ts
const myProcess = createProcess('my-process', [commandOne, commandTwo], [authenticator, logger]);
```

### Applying Middleware to Multiple Processes

Specifying a middleware on an individual process explicitly works for targeted behavior but can become cumbersome when the middleware needs to be applied to multiple processes throughout the application.

The `createProcessFactoryWith` higher order function can be used to specify middlewares that need to be applied across multiple `processes`. The function accepts an array of middleware and returns a new `createProcess` factory function that will automatically apply the middleware to any process that it creates.

```ts
const customCreateProcess = createProcessFactoryWith([logger]);

// `myProcess` will automatically be decorated with `logger` middleware.
const myProcess = customCreateProcess('my-process', [commandOne, commandTwo]);
```

### Combining Before and After Callbacks

The example below demonstrates the usage of both `before` and `after` callbacks

```ts
const logger: ProcessCallback = () => {
	const beforeLogs: string[] = [];
	const afterLogs: string[] = [];
	return {
		before(payload, store) {
			const value = `${beforeLogs.length}th payload: ${JSON.stringify(payload)}`;
			beforeLogs.push(value);
			store.apply([
				{
					op: OperationType.ADD,
					path: new Pointer(`/beforeLogs/${beforeLogs.length}`),
					value
				}
			]);

			console.log('logger before called');
		},
		after(error, result) {
			const value = error ? 'Process failed' : 'Process Succeeded';
			afterLogs.push(value);
			result.apply([
				{
					op: OperationType.ADD,
					path: new Pointer(`/afterLogs/${afterLogs.length}`),
					value
				}
			]);
			console.log('logger after called');
		}
	};
};

const afterOnly: ProcessCallback = () => ({
	after(error, result) {
		console.log('after only called');
	}
});

const beforeOnly: ProcessCallback = () => ({
	before(payload, store) {
		console.log('before only called');
	}
});

const callback: ProcessCallback = () => ({
	before(payload, store) {
		console.log('callback before called');
	},
	after(error, result) {
		console.log('callback after called');
	}
});

const myProcess = createProcess('my-process', [commandOne, commandTwo], [logger, afterOnly, beforeOnly, callback]);

// Subsequent usages of this process will log the following to console:
// logger before called
// before only called
// callback before called
// logger after called
// after only called
// callback after called
```

### Local Storage Middleware

Middleware that provides a `collector` that saves state to `LocalStorage` and a `load` function to hydrate a store from `LocalStorage`.

```ts
export const myProcess = createProcess(
	'my-process',
	[command],
	collector('my-process', (path) => {
		return [path('state', 'to', 'save'), path('other', 'state', 'to', 'save')];
	})
);
```

```ts
import { load } from '@dojo/framework/stores/middleware/localStorage';
import { Store } from '@dojo/framework/stores/Store';

const store = new Store();
load('my-process', store);
```
