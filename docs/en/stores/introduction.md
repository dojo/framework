# Introduction

Dojo **stores** provide a predictable, consistent state container with built-in support for common state management patterns.

The Dojo stores package provides a centralized store designed to be the single source of truth for an application. Dojo applications operate using uni-directional data flow; as a result, all application data follows the same lifecycle, ensuring the application logic is predictable and easy to understand.

| Feature                            | Description                                                                               |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| **Global data store**              | Application state gets stored globally in a single source of truth.                       |
| **Uni-directional data flow**      | Predictable and global application state management.                                      |
| **Type-safe**                      | Access and modification of state gets protected by interfaces.                            |
| **Operation-driven state changes** | Encapsulated, well-defined state modifications that can be recorded, undone and replayed. |
| **Asynchronous support**           | Async commands supported out-of-the-box.                                                  |
| **Operational middleware**         | Before and after operations, error handling, and data transformation.                     |
| **Simple widget integration**      | Tools and patterns for easy integration with Dojo widgets.                                |

## Basic usage

Dojo provides a reactive architecture concerned with constantly modifying and rendering the current state of an application. In simple systems this can happen at a local level and widgets can maintain their own state. However, as a system becomes more complex the need to better compartmentalize and encapsulate data and create a clean separation of concerns quickly grows.

Stores provide a clean interface for storing, modifying, and retrieving data from a global object through unidirectional data flow. Stores include support for common patterns such as asynchronous data retrieval, middleware, and undo. Stores and their patterns allow widgets to focus on their primary role of providing a visual representation of information and listening for user interactions.

### The store

The store holds the global, atomic state for the entire application. The store should be created when the application gets created and defined in the `Registry` with an injector.

> main.ts

```ts
import { registerStoreInjector } from '@dojo/framework/stores/StoreInjector';
import Store from '@dojo/framework/stores/Store';
import { State } from './interfaces';

const store = new Store<State>();
const registry = registerStoreInjector(store);
```

`State` defines the structure of the global store using an interface. Everything inside `State` should be serializable, i.e. convertible to/from JSON, as this improves performance by making it easier for the Dojo virtual DOM system to determine when changes to the data occur.

> interfaces.d.ts

```ts
interface User {
	id: string;
	name: string;
}

export interface State {
	auth: {
		token: string;
	};
	users: {
		current: User;
		list: User[];
	};
}
```

The above is a simple example that defines the structure for the store used in the rest of the examples in this guide.

### Updating stores

There are three core concepts when working with Dojo stores.

-   **Operations** - instructions to manipulate the state held by the store
-   **Commands** - simple functions that perform business logic and return operations
-   **Processes** - execute a group of commands and represent application behavior

#### Commands and operations

To modify a store, when executing a process, a command function gets invoked. The command function returns a list of operations to apply to the store.. Each command is passed a `CommandRequest` which provides `path` and `at` functions to generate `Path`s in a type-safe way, a `get` function for access to the store's state, a `payload` object for the argument that the process executor was called with.

##### Command factory

Stores have a simple wrapper function that acts as a type-safe factory for creating new commands.

To create a store factory:

```ts
import { createCommandFactory } from '@dojo/framework/stores/process';
import { State } from './interfaces';

const createCommand = createCommandFactory<State>();

const myCommand = createCommand(({ at, get, path, payload, state }) => {
	return [];
});
```

`createCommand` ensures that the wrapped command has the correct typing and the passed `CommandRequest` functions get typed to the `State` interface provided to `createCommandFactory`. While it is possible to manually type commands, the examples in this guide use `createCommand`.

##### `path`

The path is a `string` that describes the location where an operation gets applied. The `path` function is part of the `CommandRequest` and is accessible inside of a `Command`.

In this example the `path` describes a location in the store. The `State` is the same as defined above in `interface.d.ts`. The `State` interface gets used by the `Store` to understand the shape of the state data.

To define a `path` for the current user name:

```ts
const store = new Store<State>();
const { path } = store;

path('users', 'current', 'name');
```

This path refers to the `string` value located at `/users/current/name`. `path` gets used to transverse the hierarchy in a type-safe way, ensuring that only the property names defined in the `State` interface get used.

##### `at`

The `at` function gets used in conjunction with `path` to identify a location in an array. This example leverages the `at` function.

```ts
const store = new Store<State>();
const { at, path } = store;

at(path('users', 'list'), 1);
```

This path refers to the `User` located at `/users/list` at offset `1`.

##### `add` operation

Adds a value to an object or inserts it into an array.

```ts
import { createCommandFactory } from '@dojo/framework/stores/process';
import { State } from './interfaces';
import { add } from '@dojo/framework/stores/state/operations';

const createCommand = createCommandFactory<State>();
const myCommand = createCommand(({ at, get, path, payload, state }) => {
	const user = { id: '0', name: 'Paul' };

	return [add(at(path('users', 'list'), 0), user)];
});
```

This adds `user` to the beginning of the user list.

##### `remove` operation

Removes a value from an object or an array.

```ts
import { createCommandFactory } from '@dojo/framework/stores/process';
import { State } from './interfaces';
import { add, remove } from '@dojo/framework/stores/state/operations';

const createCommand = createCommandFactory<State>();
const myCommand = createCommand(({ at, get, path, payload, state }) => {
	const user = { id: '0', name: 'Paul' };

	return [
		add(path('users'), {
			current: user,
			list: [user]
		}),
		remove(at(path('users', 'list'), 0))
	];
});
```

This example adds an initial state for `users` and removes the first `user` in the list.

##### `replace` operation

Replaces a value. Equivalent to a `remove` followed by an `add`.

```ts
import { createCommandFactory } from '@dojo/framework/stores/process';
import { State } from './interfaces';
import { add, replace } from '@dojo/framework/stores/state/operations';

const createCommand = createCommandFactory<State>();
const myCommand = createCommand(({ at, get, path, payload, state }) => {
	const users = [{ id: '0', name: 'Paul' }, { id: '1', name: 'Michael' }];
	const newUser = { id: '2', name: 'Shannon' };

	return [
		add(path('users'), {
			current: user[0],
			list: users
		}),
		replace(at(path('users', 'list'), 1), newUser)
	];
});
```

This example replaces the second user in the `list` with `newUser`.

##### `get`

The `get` function returns a value from the store at a specified path or `undefined` if a value does not exist at that location.

```ts
import { createCommandFactory } from '@dojo/framework/stores/process';
import { State } from './interfaces';
import { remove, replace } from '@dojo/framework/stores/state/operations';

const createCommand = createCommandFactory<State>();

const updateCurrentUser = createCommand(async ({ at, get, path }) => {
	const token = get(path('auth', 'token'));

	if (!token) {
		return [remove(path('users', 'current'))];
	} else {
		const user = await fetchCurrentUser(token);
		return [replace(path('users', 'current'), user)];
	}
});
```

This example checks for the presence of an authentication token and works to update the current user information.

##### `payload`

The `payload` is an object literal passed into a command when it is called from a process. The `payload`'s type may be defined when constructing the command.

```ts
import { createCommandFactory } from '@dojo/framework/stores/process';
import { State } from './interfaces';
import { remove, replace } from '@dojo/framework/stores/state/operations';

const createCommand = createCommandFactory<State>();

const addUser = createCommand<User>(({ at, path, payload }) => {
	return [add(at(path('users', 'list'), 0), payload)];
});
```

This example adds the user provided in the `payload` to the beginning of `/users/list`.

##### Asynchronous commands

Commands can be synchronous or asynchronous. Asynchronous commands should return a `Promise` to indicate when they finish. Operations are collected and applied atomically after each command completes successfully.

#### Processes

A `Process` is a construct used to sequentially execute commands against a `store` in order to makes changes to the application state. Processes are created using the `createProcess` factory function that accepts a list of commands and optionally a list of middleware.

##### Creating a process

First, create a couple commands responsible for obtaining a user token and use that token to load a `User`. Then create a process that uses those commands. Every process must be identified by a unique process ID. This ID is used internally in the store.

```ts
import { createCommandFactory, createProcess } from "@dojo/framework/stores/process";
import { State } from './interfaces';
import { add, replace } from "@dojo/framework/stores/state/operations";

const createCommand = createCommandFactory<State>();

const fetchUser = createCommand(async ({ at, get, payload: { username, password } }) => {
	const token = await fetchToken(username, password);

	return [
		add(path('auth', 'token'), token);
	];
}

const loadUserData = createCommand(async ({ path }) => {
	const token = get(path('auth', 'token'));
	const user = await fetchCurrentUser(token);
	return [
		replace(path('users', 'current'), user)
	];
});

export const login = createProcess('login', [ fetchUser, loadUserData ]);
```

##### `payload` type

The process executor's `payload` is inferred from the `payload` type of the commands. If the payloads differ then it is necessary to explicitly define the `payload` type.

```ts
const createCommand = createCommandFactory<State>();

const commandOne = createCommand<{ one: string }>(({ payload }) => {
	return [];
});

const commandTwo = createCommand<{ two: string }>(({ payload }) => {
	return [];
});

const process = createProcess<State, { one: string; two: string }>('example', [commandOne, commandTwo]);

process(store)({ one: 'one', two: 'two' });
```

### Connecting widgets and stores

There are two state containers available for widgets: `StoreContainer` and `StoreProvider`. These containers connect the application store with a widget. When using functional widgets, a typed store middleware can also be created.

Note that the documentation in this section is intended to show how widgets and state (provided by a store) are connected. For more information on widget state management in general, see the [Creating Widgets reference guide](/learn/creating-widgets/managing-state).

#### Store middleware

When using function-based widgets, the `createStoreMiddleware` helper can be used to create a typed store middleware that provides a widget access to the store.

> middleware/store.ts

```tsx
import createStoreMiddleware from '@dojo/framework/core/middleware/store';
import { State } from '../interfaces';

export default createStoreMiddleware<State>();
```

> widgets/User.tsx

```tsx
import { create } from '@dojo/framework/core/vdom';
import store from '../middleware/store';
import { State } from '../../interfaces';

const factory = create({ store }).properties();
export const User = factory(function User({ middleware: { store } }) {
	const { get, path } = store;
	const name = get(path('users', 'current', 'name'));

	return <h1>{`Hello, ${name}`}</h1>;
});
```

This middleware contains an `executor` method that can be used to run processes on the store.

```tsx
import { create } from '@dojo/framework/core/vdom';
import store from '../middleware/store';
import logout from '../processes/logout';
import { State } from '../../interfaces';

const factory = create({ store }).properties();
export const User = factory(function User({ middleware: { store } }) {
	const { get, path } = store;
	const name = get(path('users', 'current', 'name'));

	const onLogOut = () => {
		store.executor(logout)({});
	};

	return (
		<h1>
			{`Hello, ${name}`}
			<button onclick={onLogOut}>Log Out</button>
		</h1>
	);
});
```

#### StoreProvider

A `StoreProvider` is a Dojo widget that has its own `renderer` and connects to the store. It is always encapsulated in another widget because it does not define its own properties.

> widget/User.ts

```tsx
import { create } from '@dojo/framework/core/vdom';
import { State } from '../../interfaces';

const factory = create().properties();
export const User = factory(function User() {
	return (
		<StoreProvider
			stateKey="state"
			paths={(path) => [path('users', 'current')]}
			renderer={(store) => {
				const { get, path } = store;
				const name = get(path('users', 'current', 'name'));

				return <h1>{`Hello, ${name}`}</h1>;
			}}
		/>
	);
});
```

The `StoreProvider` occurs as part of `User`'s render and provides its own `renderer` like any other Dojo widget.

#### Container

A `Container` is a widget that fully encapsulates another widget. It connects the store to the widget with a `getProperties` function.

> widget/User.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';

interface UserProperties {
	name?: string;
}
const factory = create().properties<UserProperties>();
export const User = factory(function User({ properties }) {
	const { name = 'Stranger' } = properties();
	return <h1>{`Hello, ${name}`}</h1>;
});
```

> widget/User.container.ts

```ts
import { createStoreContainer } from '@dojo/framework/stores/StoreContainer';
import { State } from '../interfaces';
import User from './User';

const StoreContainer = createStoreContainer<State>();

const UserContainer = StoreContainer(User, 'state', {
	getProperties({ get, path }) {
		const name = get(path('user', 'current', 'name'));

		return { name };
	}
});
```

In this example `UserContainer` wraps `User` to display the current user's name. `createStoreContainer` is a wrapper that gets used to ensure the proper typing of `getProperties`. `getProperties` is responsible for accessing data from the store and creating properties for the widget.

A `StoreContainer`'s properties are a 1:1 mapping to the widget it wraps. The widget's properties become the properties of the `StoreContainer`, but they are all optional.

#### Executing a process

A process simply defines an execution flow for a set of data. To execute a process, the process needs access to the store to create an executor. Both the `StoreContainer` and `StoreProvider` widgets provide access to the store.

```tsx
import { logout } from './processes/logout';
import StoreProvider from '@dojo/framework/stores/StoreProvider';
import { State } from '../../interfaces';
import User from './User';
import { create, tsx } from '@dojo/framework/core/vdom';

const factory = create().properties();
export const UserProvider = factory(function UserProvider() {
	return (
		<StoreProvider
			stateKey="state"
			paths={(path) => [path('users', 'current')]}
			renderer={(store) => {
				const { get, path } = store;
				const name = get(path('users', 'current', 'name'));
				const onLogOut = () => {
					logout(store)({});
				};

				return <User name={name} onLogOut={onLogOut} />;
			}}
		/>
	);
});
```
