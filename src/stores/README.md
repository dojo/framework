# @dojo/stores

[![Build Status](https://travis-ci.org/dojo/stores.svg?branch=master)](https://travis-ci.org/dojo/stores)
[![codecov.io](https://codecov.io/gh/dojo/stores/branch/master/graph/badge.svg)](https://codecov.io/gh/dojo/stores/branch/master)
[![npm version](https://badge.fury.io/js/%40dojo%2Fstores.svg)](https://badge.fury.io/js/%40dojo%2Fstores)

This library provides an application store designed to complement @dojo/widgets and @dojo/widget-core or any other reactive application.

**WARNING** This is *alpha* software. It is not yet production ready, so you should use at your own risk.

## Usage

To use `@dojo/stores`, install the package along with its required peer dependencies:

```bash
npm install @dojo/stores

# peer dependencies
npm install @dojo/core
npm install @dojo/has
npm install @dojo/shim
```

## Features

 * Application state store designed to work with a reactive component architecture
 * Out of the box support for asynchronous commands
 * All state operations are recorded per process and undoable via a process callback
 * Supports the optimistic pattern with that can be rolled back on a failure
 * Fully serializable operations and state

## Overview

Dojo 2 stores is a predictable, consistent state container for Javascript applications with inspiration from Redux and Flux architectures. However Dojo 2 stores aims to provide more built in support for common patterns such as asynchronous behaviors, undo support and **more**!

Managing state can become difficult to coordinate when an application becomes complicated with multiple views, widgets, components and models. With each of these attempting to update attributes of state at varying points within the application lifecycle things can get **confusing**. When state changes are hard to understand and/or non-deterministic it becomes increasingly difficult to identify and reproduce bug or add new features.

Dojo 2 stores provides a centralized store is designed to be the **single source of truth** for an application and operates using uni-directional data flow. This means all application data follows the same lifecycle, ensuring the application logic is predictable and easy to understand.

## Basics

To work with the Dojo 2 store there are three core but simple concepts - Operations, Commands and Processes.

 * `Operation`
   * Granular instructions to manipulate state based on JSON Patch
 * `Command`
   * Simple functions that ultimately return operations needed to perform the required state change
 * `Process`
   * A function that to execute a group of commands that usually represent a complete application behavior

### Operations

Operations are the raw instructions the store uses to make modifications to the state. The operations are based on the JSON Patch and JSON Pointer specifications that have been customized specifically for Dojo 2 stores, primarily to prevent access to the state's root.

Each operation is a simple object which contains instructions with the `OperationType`, `path` and optionally the `value` (depending on operation).

```ts
const operations = [
	{ op: OperationType.ADD, path: new JsonPointer('/foo'), value: 'foo' },
	{ op: OperationType.REPLACE, path: new JsonPointer('/bar'), value: 'bar' },
	{ op: OperationType.REMOVE, path: new JsonPointer('/qux') },
];
```

Dojo 2 stores provides a helper package that can generate `PatchOperation` objects from `@dojo/stores/state/operations`:

* `add`     - Returns a `PatchOperation` of type `OperationType.ADD` for the `path` and `value`
* `remove`  - Returns a `PatchOperation` of type `OperationType.REMOVE` for the `path`
* `replace` - Returns a `PatchOperation` of type `OperationType.REPLACE` for the `path` and `value`

### Commands

Commands are simply functions which are called internally by the store when executing a `Process` and return an array of `PatchOperations` that tells the `store` what state changes needs to be performed.

Each command is passed a `CommandRequest` which provides a `get` function for access to the stores state and a `payload` object which contains the an array of arguments that the process executor was called with.

The `get` function returns back state for a given "path" or "selector", for example `get('/my/deep/state')` or `get('/my/array/item/9')`.

```ts
function addTodoCommand({ get, payload }: CommandRequest) {
	const todos = get('/todos');
	const operations = [
		{ op: OperationType.ADD, path: `/todos/${todos.length}`, value: payload[0] }
	];

	return operations;
}

function calculateCountsCommand({ get }: CommandRequest) {
	const todos = get('/todos');
	const completedTodos = todos.filter((todo: any) => todo.completed);
	const operations = [
		{ op: OperationType.REPLACE, path: '/activeCount', value: todos.length - completedTodos.length },
		{ op: OperationType.REPLACE, path: '/completedCount', value: completedTodos.length }
	];
	return operations;
}
```

 *Important:* Access to state root is not permitted and will throw an error, for example `get('/')`. This applies for `Operations` also, it is not possible to create an operation that will update the state root.

 ##### Asynchronous Commands

Commands support asynchronous behavior out of the box simply by returning a `Promise<PatchOperation[]>`.

```ts
async function postTodoCommand({ get, payload: [ id ] }: CommandRequest): Promise<PatchOperation[]> {
	const response = await fetch('/todos');
	if (!response.ok) {
		throw new Error('Unable to post todo');
	}
	const json = await response.json();
	const todos = get('/todos');
	const index = findIndex(todos, byId(id));
	// success
	return [
		replace(`/todos/${index}`, { ...todos[index], loading: false, id: data.uuid
	];
}
```

### Processes

A `Process` is the construct used to execute commands against a `store` instance in order to make changes to the application state. `Processes` are created using the `createProcess` factory function that accepts an array of commands and an optional callback that can be used command to manage errors thrown from a command. The optional callback receives an `error` object and a `result` object. The `error` object contains the `error` stack and the command that caused the error. The `result` object contains the `payload` passed to the process, a function to undo the operations of the `process` and a function to execute an additional `process`.

The array of `Commands` that are executed in sequence by the store until the last Command is completed or a `Command` throws an error, these processes often represent an application behavior. For example adding a todo in a simple todo application which will be made up with multiple discreet commands.

A simple `process` to add a todo and recalculate the todo count:

```ts
const addTodoProcess = createProcess([ addTodoCommand, calculateCountCommand ]);
```

A `callback` can be provided which will be called when an error occurs or the process is successfully completed:


```ts
function addTodoProcessCallback(error, result) {
	if (error) {
		// do something with the error
		// possibly run the `undo` function from result to rollback the changes up to the
		// error
		result.undo();
	}
	// possible additional state changes by running another process using result.executor(otherProcess)
}

const addTodoProcess = createProcess([ addTodoCommand, calculateCountCommand ], addTodoProcessCallback);
```

The `Process` creates a deferred executor by passing the `store` instance `addTodoProcess(store)` which can be executed immediately by passing the `payload` `addTodoProcess(store)(arg1, arg2)` or more often passed to your widgets and used to initiate state changes on user interactions. The `payload` arguments passed to the `executor` are passed to each of the `Process`'s commands in a `payload` argument

```ts
const addTodoExecutor = addTodoProcess(store);

addTodoExecutor('arguments', 'get', 'passed', 'here');
```

### Initial State

Initial state can be defined on store creation by executing a `Process` after the store has been instantiated.

```ts
// Command that creates the basic initial state
function initialStateCommand() {
	return [
		add('/todos', []),
		add('/currentTodo', ''),
		add('/activeCount', 0),
		add('/completedCount', 0)
	]);
}

const initialStateProcess = createProcess([ initialStateCommand ]);

// creates the store, initializes the state and runs the `getTodosProcess`.
const store = createStore();
initialStateProcess(store)();
// if a process contains an async command, like fetching initial data from a remote service the return promise can be used
// to control the flow.
getTodosProcess(store)().then(() => {
	// do things once the todos have been fetched.
});
```

## How does this differ from Redux

Although Dojo 2 stores is a big atom state store, you never get access to the entire state object. To access the sections of state that are needed we use pointers to return the slice of state that is needed i.e. `path/to/state`. State is never directly updated by the user, with state changes only being processed by the operations returned by commands.

There is no concept of `reducers`, meaning that there is no confusion about where logic needs to reside between `reducers` and  `actions`. `Commands` are the only place that state logic resides and return `operations` that dictate what `state` changes are required and processed internally by the `store`.

Additionally means that there is no need to coordinate `actions` and `reducers` using a string action key, commands are simple function references that can be reused in multiple `processes`.

## Advanced

### Subscribing to store changes

In order to be notified when changes occur within the store's state, simply register to the stores `.on()` for a type of `invalidate` passing the function to be called.

```ts
store.on('invalidate', () => {
	// do something when the store's state has been updated.
});
```

### Undo Processes

The store records undo operations for every `Command`, grouped by it's `Process`. The `undo` function is passed as part of the `result` argument in the `Process` callback.

```ts
function processCallback(error, result) {
	result.undo();
}
```

The `undo` function will rollback all the operations that were performed by the `process`.

**Note:** Each undo operation has an associated `test` operation to ensure that the store is in the expected state to successfully run the undo operation, if the test fails then an error is thrown and no changes are performed.

### Transforming Executor Arguments

An optional `transformer` can be passed to the `createExecutor` function that will be used to parse the arguments passed to the executor.

```ts
function transformer(...payload: any[]): any {
	return { id: uuid(), value: payload[0] };
}

const executor = process(state, transformer);

executor('id');
```

Each `Command` will be passed the result of the transformer as the `payload` for example: `{ id: 'UUID-VALUE', value }`

### Typing with `store.get`

All access to the internal store state is restricted through `store.get`, the function that is passed to each `Command` when they are executed. It is possible to specify the expected type of the data by passing a generic to `get`.

```ts
interface Todo {
	id: string;
	label: string;
	completed: boolean;
}

// Will return an array typed as Todo items
const todos = store.get<Todo[]>('/todos');
```

### Optimistic Update Pattern

Optimistic updating can be used to build a responsive UI despite interactions that might take some time to respond, for example saving to a remote resource.

In the case of adding a todo item for instance, with optimistic updating we can immediately add the todo before we even make a request to the server and avoid having an unnatural waiting period or loading indicator. When the server responds we can then reconcile the outcome based on whether it is successful or not.

In the success scenario, we might need to update the added Todo item with an id that was provided in the response from the server, and change the color of the Todo item to green to indicate it was successfully saved.

In the error scenario, it might be that we want to show a notification to say the request failed, and turn the Todo item red, with a "retry" button. It's even possible to revert/undo the adding of the Todo item or anything else that happened in the process.

```ts
const handleAddTodoErrorProcess = createProcess([ () => [ add('/failed', true) ]; ]);

function addTodoCallback(error, result) {
	if (error) {
		result.undo();
		result.executor(handleAddTodoErrorProcess);
	}
}

const addTodoProcess = createProcess([
		addTodoCommand,
		calculateCountsCommand,
		postTodoCommand,
		calculateCountsCommand
	],
	addTodoCallback);
```

* `addTodoCommand`: Adds the new todo into the application state
* `calculateCountsCommand`: Recalculates the count of completed and active todo items
* `postTodoCommand`: posts the todo item to a remote service and using the process callback we can make changes if there is a failure
  * on failure: the previous two commands are reverted and the `failed` state field is set to `true`
  * on success: Returns operations that update the todo item `id` field with the value received from the remote service
* `calculateCountsCommand`: Runs again after the success of `postTodoCommand`

To support "pessimistic" updates to the application state, i.e. wait until a remote service call has been completed before changing the application state simply put the async command before the application store update. This can be useful when performing a deletion of resource, when it can be surprising if item is removed from the UI "optimistically" only for it to reappear back if the remote service call fails.

```ts
function byId(id: string) {
	return (item: any) => id === item.id;
}

async function deleteTodoCommand({ get, payload: [ id ] }: CommandRequest) {
    const { todo, index } = find(get('/todos'), byId(id))
    await fetch(`/todo/${todo.id}`, { method: 'DELETE' } );
    return [ remove(`/todos/${index}`) ];
}

const deleteTodoProcess = createProcess([ deleteTodoCommand, calculateCountsCommand ]);
```

*Note:* The process requires the counts to be recalculated after successfully deleting a todo, the process above shows how easily commands can be shared and reused.

### Executing concurrent commands

A `Process` supports multiple commands to be executed concurrently by specifying the commands in an array when creating the process:

```ts
const myProcess = createProcess([ commandOne, [ concurrentCommandOne, concurrentCommandTwo ], commandTwo ]);
```

In this example, `commandOne` is executed, then both `concurrentCommandOne` and `concurrentCommandTwo` are executed concurrently. Once all of the concurrent commands are completed the results are applied in order before continuing with the process and executing `commandTwo`.

**Note:** Concurrent commands are always assumed to be asynchronous and resolved using `Promise.all`.

### Decorating Processes

The `Process` callback provides a hook to apply generic/global functionality across multiple or all processes used within an application. This is done using higher order functions that wrap the process' local `callback` using the error and result payload to decorate or perform an action for all processes it used for.

Dojo 2 stores provides a simple `UndoManager` that collects the undo function for each process onto a single stack and exposes an `undoer` function that can be used to undo the last `process` executed. If the local `undo` function is called then it will be automatically removed from the managers stack.

```ts
import { createProcess } from '@dojo/stores/process';
import { createUndoManager } from '@dojo/stores/extras';

const { undoCollector, undoer } = createUndoManager();
// if the process doesn't need a local callback, the collector can be used without.
const myProcess = createProcess([ commandOne, commandTwo ], undoCollector());
const myOtherProcess = createProcess([ commandThree, commandFour ], undoCollector());

// running `undeor` will undo the last process executed, that had registered the `collector` as a callback.
undoer();
```

Decorating `callbacks` can composed together to combine multiple units of functionality, such that in the example below `myProcess` would run the `error` and `result` through the `collector`, `logger` and then `snapshot` callbacks.

```ts
const myProcess = createProcess([ commandOne, commandTwo ], collector(logger(snapshot())));
```

#### Decorating Multiple Process

Specifying a `callback` decorator on an individual process explicitly works for targeted behavior but can become cumbersome when the decorator needs to be applied across multiple processes throughout the application.

The `createProcessWith` higher order function can be used to specify `callback` decorators that need to be applied across multiple `processes`. The function accepts an array of `callback` decorators and returns a new `createProcess` factory function that will automatically apply the decorators to any process that it creates.

```ts
const customCreateProcess = createProcessWith([ undoCollector, logger ]);

// `myProcess` will automatically be decorated with the `undoCollector` and `logger` callback decorators.
const myProcess = customCreateProcess([ commandOne, commandTwo ]);
```

An additional helper function `createCallbackDecorator` can be used to turn a simple `ProcessCallback` into a decorator that ensures passed callback is executed after the decorating `callback` has been run.

```ts
const myCallback = (error: ProcessError, result: ProcessResult) => {
	// do things with the outcome from the process
};

// turns the callback into a callback decorator
const myCallbackDecorator = createCallbackDecorator(myCallback);

// use the callback decorator as normal
const myProcess = createProcess([ commandOne ], myCallbackDecorator());
```

## How do I contribute?

We appreciate your interest!  Please see the [Dojo 2 Meta Repository](https://github.com/dojo/meta#readme) for the
Contributing Guidelines and Style Guide.

### Installation

To start working with this package, clone the repository and run `npm install`.

In order to build the project run `grunt dev` or `grunt dist`.

### Testing

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

© 2017 [JS Foundation](https://js.foundation/). [New BSD](http://opensource.org/licenses/BSD-3-Clause) license.
