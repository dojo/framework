# @dojo/stores

[![Build Status](https://travis-ci.org/dojo/stores.svg?branch=master)](https://travis-ci.org/dojo/stores)
[![codecov.io](https://codecov.io/gh/dojo/stores/branch/master/graph/badge.svg)](https://codecov.io/gh/dojo/stores/branch/master)
[![npm version](https://badge.fury.io/js/%40dojo%2Fstores.svg)](https://badge.fury.io/js/%40dojo%2Fstores)

This library provides an application store designed to complement @dojo/widgets and @dojo/widget-core or any other reactive application.

## Usage

To use `@dojo/stores`, install the package along with its required peer dependencies:

```bash
npm install @dojo/stores

# peer dependencies
npm install @dojo/core
npm install @dojo/has
npm install @dojo/shim
npm install @dojo/widget-core
```

## Features

 * Application state store designed to work with a reactive component architecture
 * Out of the box support for asynchronous commands
 * All state operations are recorded per process and undoable via a process callback
 * Supports the optimistic pattern with the ability to roll back on a failure
 * Fully serializable operations and state

-----

 - [Overview](#overview)
 - [Basics](#basics)
     - [Operations](#operations)
     - [Commands](#commands)
     - [Processes](#processes)
     - [Initial State](#initial-state)
 - [How Does This Differ From Redux](#how-does-this-differ-from-Redux)
 - [Advanced](#advanced)
     - [Subscribing To Store Changes](#subscribing-to-store-changes)
	 - [Connecting Store Updates To Widgets](#connecting-store-updates-to-widgets)
     - [Transforming Executor Arguments](#transforming-executor-arguments)
     - [Optimistic Update Pattern](#optimistic-update-pattern)
     - [Executing Concurrent Commands](#executing-concurrent-commands)
     - [Decorating Processes](#decorating-processes)
        - [Decorating Multiple Processes](#decorating-multiple-processes)
 - [How Do I Contribute?](#how-do-i-contribute)
    - [Setup Installation](#setup-installation)
    - [Testing](#testing)
 - [Licensing Information](#licensing-information)

-----

## Overview

Dojo 2 stores is a predictable, consistent state container for Javascript applications with inspiration from Redux and Flux architectures. However Dojo 2 stores aims to provide more built in support for common patterns such as asynchronous behaviors, undo support and **more**!

Managing state can become difficult to coordinate when an application becomes complicated with multiple views, widgets, components and models. With each of these attempting to update attributes of state at varying points within the application lifecycle things can get **confusing**. When state changes are hard to understand and/or non-deterministic it becomes increasingly difficult to identify and reproduce bugs or add new features.

Dojo 2 stores provides a centralized store, designed to be the **single source of truth** for an application. It operates using uni-directional data flow. This means all application data follows the same lifecycle, ensuring the application logic is predictable and easy to understand.

__Note__: Do you need a centralised store? Lifting state up to parent widgets and using local state are likely to be sufficient in less complex applications.

## Basics

To work with the Dojo 2 store there are three core but simple concepts - Operations, Commands and Processes.

 * `Operation`
   * Granular instructions to manipulate state based on JSON Patch
 * `Command`
   * Simple functions that ultimately return operations needed to perform the required state change
 * `Process`
   * A function that executes a group of commands that usually represent a complete application behavior

### Operations

Operations are the raw instructions the store uses to make modifications to the state. The operations are based on the JSON Patch and JSON Pointer specifications that have been customized specifically for Dojo 2 stores, primarily to prevent access to the state's root.

Dojo 2 stores support four of the six JSON Patch operations: "add", "remove", "replace", and "test". The "copy" and "move" operations are not currently supported. Each operation is a simple object which contains instructions with the `OperationType`, `path` and optionally the `value` (depending on operation).

```ts
import { OperationType } from '@dojo/stores/State/patch';
import { Pointer } from '@dojo/stores/state/Pointer';

const operations = [{
	op: OperationType.ADD,
	path: new Pointer('/foo'),
	value: 'foo'
}, {
	op: OperationType.REPLACE,
	path: new Pointer('/bar'),
	value: 'bar'
}, {
	op: OperationType.REMOVE,
	path: new Pointer('/qux')
}];
```

Dojo 2 stores provides a helper package that can generate `PatchOperation` objects from `@dojo/stores/state/operations`:

* `add` - Returns a `PatchOperation` of type `OperationType.ADD` for the `path` and `value`
* `remove`  - Returns a `PatchOperation` of type `OperationType.REMOVE` for the `path`
* `replace` - Returns a `PatchOperation` of type `OperationType.REPLACE` for the `path` and `value`
* `test` - Returns a `PatchOperation` of type `OperationType.TEST` for the `path` and `value`

These functions accept a `Path` type. This is returned by the `path` and `at` methods on a store. More often this will be created using the `path` and `at` functions provided as part of the arguments to a [command](#commands), which are described in more detail below. Rather than accepting a full string path, the `path` and `at` functions accept a series of arguments and provide type checking to verify that the path created actually exists on the state object.

### Commands

Commands are simply functions which are called internally by the store when executing a `Process` and return an array of `PatchOperations` that tells the `store` what state changes needs to be performed.

Each command is passed a `CommandRequest` which provides `path` and `at` functions to generate `Path`s in a typesafe way, a `get` function for access to the store's state, and a `payload` object for the argument that the process executor was called with.

The `get` function returns back state for a given `Path`, for example `get(path('my', 'deep', 'state'))` or `get(at(path('my', 'array', 'item'), 9))`.

```ts
function addTodoCommand({ at, path, get, payload }: CommandRequest) {
	const todosPath = path('todos');
	const length = get(todosPath).length;
	const operations = [
		add(at(todosPath, length), payload)
	];

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

 *Important:* Access to state root is not permitted and will throw an error, for example `get(path('/'))`. This applies for `Operations` also, it is not possible to create an operation that will update the state root. Best practices with @dojo/stores mean touching the smallest part of the store as is necessary.

##### Asynchronous Commands

Commands support asynchronous behavior out of the box simply by returning a `Promise<PatchOperation[]>`.

```ts
async function postTodoCommand({ get, path, payload: { id }}: CommandRequest): Promise<PatchOperation[]> {
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

### Processes

A `Process` is the construct used to execute commands against a `store` instance in order to make changes to the application state. `Processes` are created using the `createProcess` factory function that accepts an array of commands and an optional callback that can be used to manage errors thrown from a command. The optional callback receives an `error` object and a `result` object. The `error` object contains the `error` stack and the command that caused the error.

The result object contains the following:

* The `payload` passed to the process
* `undoOperations` to undo the `process`
* A function to execute an additional `process`.

The array of `Commands` are executed in sequence by the store until the last Command is completed or a `Command` throws an error. These processes often represent an application behavior. For example adding a todo in a simple todo application which will be made up with multiple discreet commands.

A simple `process` to add a todo and recalculate the todo count:

```ts
const addTodoProcess = createProcess('add-todo', [ addTodoCommand, calculateCountCommand ]);
```

A `callback` can be provided which will be called when an error occurs or the process is successfully completed:


```ts
function addTodoProcessCallback(error, result) {
	if (error) {
		// do something with the error
		// possibly undo the operations
		result.store.apply(result.undoOperations);
	}
	// possible additional state changes by running another process using result.executor(otherProcess)
}

const addTodoProcess = createProcess('add-todo', [ addTodoCommand, calculateCountCommand ], addTodoProcessCallback);
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
const process = createProcess<any, { foo: string }>('foo', [ command ]);
const processExecutor = process(store);

// The executor will require an argument that satisfies `{ foo: string }`
processExecutor({ foo: 'bar' });
processExecutor({ foo: 1 }); // Compile error
```

The process executor's `payload` type will also be inferred by the `payload` type of the commands if not specified explicitly, however the `payload` type for all the commands must be assignable, when this is not the case the payload generic type needs to be explicitly passed.

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
const processTwo = createProcess<any, { foo: string, bar: string }>('two', [commandOne, commandTwo]);
const executorTwo = processTwo(store);
executorTwo({ foo: 'foo' }); // compile error, as requires both `bar` and `foo`
executorTwo({ foo: 'foo', bar: 'bar' }); // Yay, valid
```

Alternatively the payload can be typed at command creation

```ts
const createCommandOne = createCommandFactory<MyState>();
const commandOne = createCommandOne<{ foo: string }>(({ get, path, payload }) => []);
```

## How does this differ from Redux

Although Dojo 2 stores is a big atom state store, you never get access to the entire state object. To access the sections of state that are needed we use pointers to return the slice of state that is needed i.e. `path('path', 'to', 'state')`. State is never directly updated by the user, with state changes only being processed by the operations returned by commands.

There is no concept of `reducers`, meaning that there is no confusion about where logic needs to reside between `reducers` and  `actions`. `Commands` are the only place that state logic resides and return `operations` that dictate what `state` changes are required and processed internally by the `store`.

Additionally, this means that there is no need to coordinate `actions` and `reducers` using a string action key. Commands are simple function references that can be reused in multiple `processes`.

## Advanced

### Subscribing to store changes

To be notified of changes in the store, use the `onChange()` function, which takes a `path` or an array of `path`'s and a callback for when that portion of state changes, for example:

```ts
store.onChange(store.path('foo', 'bar'), () => {
	// do something when the state at foo/bar has been updated.
});
```

or

```ts
store.onChange([
	store.path('foo', 'bar'),
	store.path('baz')
], () => {
	// do something when the state at /foo/bar or /baz has been updated.
});
```

In order to be notified when any changes occur within the store's state, simply register to the stores `.on()` method for a type of `invalidate` passing the function to be called.

```ts
store.on('invalidate', () => {
	// do something when the store's state has been updated.
});
```

### Connecting Store Updates To Widgets

Store data can be connected to widgets within your application using the [Containers & Injectors Pattern](https://github.com/dojo/widget-core#containers--injectors) supported by `@dojo/widget-core`. `@dojo/stores` provides a specialized injector that invalidates store containers on two conditions:

1. The recommended approach is to register `paths` on container creation to ensure invalidation will only occur when state you are interested in changes.
2. A catch all when no `paths` are defined for the container, it will invalidate when any data changes in the store.

```ts
import { WidgetBase } from '@dojo/widget-core/WidgetBase';
import { Store } from '@dojo/stores/Stores';
import { StoreInjector, StoreContainer } from '@dojo/stores/StoreInjector';

interface State {
	foo: string;
	bar: {
		baz: string;
	}
}

// Will only invalidate when the foo property is changed
const Container = Container(WidgetBase, 'state', { paths: [ [ 'foo' ] ], getProperties(store: Store<State>) {
	return {
		foo: store.get(store.path('foo'))
	}
}});

// Catch all, will invalidate if _any_ state changes in the store even if the container is not interested in the changes
const Container = Container(WidgetBase, 'state', { getProperties(store: Store<State>) {
	return {
		foo: store.get(store.path('foo'))
	}
}});
```

To provide a typed container for the store's state, use the `createStoreContainer` function from `@dojo/stores/StoreInjector` passing in the state interface as a generic and then export the returned `Container` to be available throughout your application.

```ts
interface State {
	foo: string;
}

const StoreContainer = createStoreContainer<State>();
```

### Transforming Executor Arguments

An optional `transformer` can be passed to a process that is used to transform the `executor`s payload to the `command` payload type. The return type of the `transformer` must match the `command` `payload` type of the `process`. The argument type of the `executor` is inferred from transformers `payload` type.

```ts
interface CommandPayload {
	bar: number;
	foo: number;
}
// `CommandPayload` types the command payload and the argument of the process executor
const createCommand = createCommandFactory<any, CommandPayload>();

// `payload` is typed to `CommandPayload`
const command = createCommand(({ get, path, payload }) => {
});

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

In the case of adding a todo item for instance, with optimistic updating we can immediately add the todo before we even make a request to the server and avoid having an unnatural waiting period or loading indicator. When the server responds we can then reconcile the outcome based on whether it is successful or not.

In the success scenario, we might need to update the added Todo item with an id that was provided in the response from the server, and change the color of the Todo item to green to indicate it was successfully saved.

In the error scenario, it might be that we want to show a notification to say the request failed, and turn the Todo item red, with a "retry" button. It's even possible to revert/undo the adding of the Todo item or anything else that happened in the process.

```ts
const handleAddTodoErrorProcess = createProcess('error', [ () => [ add(path('failed'), true) ]; ]);

function addTodoCallback(error, result) {
	if (error) {
		result.store.apply(result.undoOperations);
		result.executor(handleAddTodoErrorProcess);
	}
}

const addTodoProcess = createProcess('add-todo', [
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

async function deleteTodoCommand({ get, payload: { id } }: CommandRequest) {
    const { todo, index } = find(get('/todos'), byId(id))
    await fetch(`/todo/${todo.id}`, { method: 'DELETE' } );
    return [ remove(path('todos', index)) ];
}

const deleteTodoProcess = createProcess('delete', [ deleteTodoCommand, calculateCountsCommand ]);
```

*Note:* The process requires the counts to be recalculated after successfully deleting a todo, the process above shows how easily commands can be shared and reused.

### Executing concurrent commands

A `Process` supports concurrent execution of multiple commands by specifying the commands in an array when creating the process:

```ts
const myProcess = createProcess('my-process', [ commandOne, [ concurrentCommandOne, concurrentCommandTwo ], commandTwo ]);
```

In this example, `commandOne` is executed, then both `concurrentCommandOne` and `concurrentCommandTwo` are executed concurrently. Once all of the concurrent commands are completed the results are applied in order before continuing with the process and executing `commandTwo`.

**Note:** Concurrent commands are always assumed to be asynchronous and resolved using `Promise.all`.

### Decorating Processes

The `Process` callback provides a hook to apply generic/global functionality across multiple or all processes used within an application. This is done using higher order functions that wrap the process' local `callback` using the error and result payload to decorate or perform an action for all processes it is used for.

`callback` decorators can be composed together to combine multiple units of functionality, such that in the example below `myProcess` would run the `error` and `result` through the `collector`, `logger` and then `snapshot` callbacks.

```ts
const myProcess = createProcess('my-process', [ commandOne, commandTwo ], collector(logger(snapshot())));
```

#### Decorating Multiple Processes

Specifying a `callback` decorator on an individual process explicitly works for targeted behavior but can become cumbersome when the decorator needs to be applied across multiple processes throughout the application.

The `createProcessWith` higher order function can be used to specify `callback` decorators that need to be applied across multiple `processes`. The function accepts an array of `callback` decorators and returns a new `createProcess` factory function that will automatically apply the decorators to any process that it creates.

```ts
const customCreateProcess = createProcessWith([ logger ]);

// `myProcess` will automatically be decorated with the `logger` callback decorator.
const myProcess = customCreateProcess('my-process', [ commandOne, commandTwo ]);
```

An additional helper function `createCallbackDecorator` can be used to turn a simple `ProcessCallback` into a decorator that ensures the passed callback is executed after the decorating `callback` has been run.

```ts
const myCallback = (error: ProcessError, result: ProcessResult) => {
	// do things with the outcome from the process
};

// turns the callback into a callback decorator
const myCallbackDecorator = createCallbackDecorator(myCallback);

// use the callback decorator as normal
const myProcess = createProcess('my-process', [ commandOne ], myCallbackDecorator());
```

## How do I contribute?

We appreciate your interest!  Please see the [Dojo 2 Meta Repository](https://github.com/dojo/meta#readme) for the
Contributing Guidelines.

### Code Style

This repository uses [`prettier`](https://prettier.io/) for code styling rules and formatting. A pre-commit hook is installed automatically and configured to run `prettier` against all staged files as per the configuration in the projects `package.json`.

An additional npm script to run `prettier` (with write set to `true`) against all `src` and `test` project files is available by running:

```bash
npm run prettier
```

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

© 2018 [JS Foundation](https://js.foundation/). [New BSD](http://opensource.org/licenses/BSD-3-Clause) license.
