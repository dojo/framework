# Basic Usage

Dojo is a reactive architecture concerned with constantly modifying and rendering the current state of an application. In simple systems this can happen at a local level and widgets can maintain their own state. However, as a system becomes more complex the need to better compartmentalize and encapsulate data and create a clean separation of concerns quickly grows.

Stores provide a clean interface for storing, modifying, and retrieving data from a global object using a unidirectional data flow. Common patterns such as asynchronous retrieval, middleware, and undo patterns are built in. This allows widgets to remain focused on their primary roles of providing a visual representation of themselves and listening for user interactions.

## The Store

The store holds the global, atomic state for the entire application. It is created when the application is created and defined in the `Registry` with an injector.

> main.ts

```ts
import { registerStoreInjector } from '@dojo/framework/store/StoreInjector';
import Store from '@dojo/framework/stores/Store';
import { State } from './interfaces';

const store = new Store<State>();
const registry = registerStoreInjector(store);
```

`State` defines the shape of the global store using an interface. It is important that everything inside `State` is serializable, as this improves performance and makes it easier for Dojo to determine when changes to the data occur.

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

The above is a simple example for illustrative purposes. Examples in this reference guide will refer back to this interface to reduce repetition.

## Updating stores

To work with Dojo Stores there are three core concepts.

-   **Operations** are instructions to manipulate the state held by the store
-   **Commands** are simple functions that perform business logic and return operations
-   **Processes** execute a group of commands and represent application behavior

### Commands & Operations

Stores cannot be modified directly. Instead, operations that modify the store are returned from commands, which are simply functions that are called while executing a process. Each command is passed a `CommandRequest` which provides `path` and `at` functions to generate `Path`s in a type-safe way, a `get` function for access to the store's state, a `payload` object for the argument that the process executor was called with.

#### The command factory

Stores have a simple wrapper function that acts as a type-safe factory for creating new commands.

> Creating a store factory

```ts
import { createCommandFactory } from '@dojo/framework/stores/process';
import { State } from './interfaces';

const createCommand = createCommandFactory<State>();

const myCommand = createCommand(({ at, get, path, payload, state }) => {
	return [];
});
```

`createCommand` will ensure that the wrapped command has the correct typing and the passed `CommandRequest` functions will be typed to the `State` interface provided to `createCommandFactory`. While it is possible to manually type commands this guide will use `createCommand` in its examples.

#### `path`

The path is a `string` that describes the location where an operation is applied. The `path` function is part of the `CommandRequest` and is accessible inside of a `Command`.

Here is an example to show how `path` describes a location in the store. The `State` is the same as defined above in `interface.d.ts`. It is used by the `Store` to understand the shape of the state data.

> `path` of the current user name

```ts
const store = new Store<State>();
const { path } = store;

path('users', 'current', 'name');
```

This path refers to the `string` value located at `/users/current/name`. `path` is used to transverse the hierarchy in a type-safe way. It ensures only the property names defined in the `State` interface are used.

#### `at`

The `at` function is used in conjunction with `path` to identify a location in an array. Here is an example of using the `at` function.

```ts
const store = new Store<State>();
const { at, path } = store;

at(path('users', 'list'), 1);
```

This path refers to the `User` located at `/users/list` at offset `1`.

#### `add` operation

Adds a value to an object or inserts it into an array.

> `add` example

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

This will add `user` to the beginning of the user list.

#### `remove` operation

Removes a value from an object or an array

> `remove` example

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

This example will add an initial state for `users` and remove the first `user` in the list.

#### `replace` operation

Replaces a value. Equivalent to a `remove` followed by an `add`.

> `replace` example

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

This example will replace the second user in the `list` with `newUser`.

#### `get`

The `get` function returns a value from the store at a specified path or `undefined` if a value does not exist at that location.

> Using `get`

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

#### `payload`

The `payload` is an object literal passed into a command when it is called from a process. The `payload`'s type may be defined when constructing the command.

> Defining a `payload`

```ts
import { createCommandFactory } from '@dojo/framework/stores/process';
import { State } from './interfaces';
import { remove, replace } from '@dojo/framework/stores/state/operations';

const createCommand = createCommandFactory<State>();

const addUser = createCommand<User>(({ at, path, payload }) => {
	return [add(at(path('users', 'list'), 0), payload)];
});
```

This example adds a user provided in the `payload` to the beginning of `/users/list`.

#### Asynchronous commands

Commands can be synchronous or asynchronous. Asynchronous commands should return a `Promise` to indicate when they are finished. Operations are collected and applied atomically after each command completes successfully.

### Processes

A `Process` is a construct used to sequentially execute commands against a `store` in order to makes changes to the application state. Processes are created using the `createProcess` factory function that accepts a list of commands and optionally a list of middleware.

#### Creating a Process

First, create a couple commands responsible for obtaining a user token and use that token to load a `User`. Then create a process that uses those commands.

> Create a process

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

#### Middleware

Middleware wraps a process in `before` and `after` callbacks that surround a process. A common use of middleware is for the handling of errors and reinstating consistent state.

Lets add some middleware that runs after the commands and resets the state if an error occurs.

> commands/login.ts example

```ts
import { createCommandFactory } from "@dojo/framework/stores/process";
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

const resetUserOnError = () => {
	return {
		after: (error, result) => {
			if (error) {
				result.store.apply([
					remove(path('auth', 'token')),
					remove(path('users', 'current'))
				])
			}
		}
	};
};

const login = createProcess('login', [ fetchUser, loadUserData ], [ resetUserOnError ]);
```

#### `payload` type

The process executor's `payload` is inferred from the `payload` type of the commands. If the payloads differ then it is necessary to explictly define the `payload` type.

> Explicitly defining `payload` type

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

## Widgets and Stores

There are two state containers available for widgets: `Container` and `StoreProvider`. These containers connect the application store with a widget.

Note that the documentation in this section is intended to show how widgets and state are connected. For a more detailed look see the [Widgets]() reference guide.

### StoreProvider

A `StoreProvider` is a widget that has its own `renderer` and connects to the store. It is always encapsulated in another widget because a it does not have properties defined.

> widget/User.ts

```tsx
import { tsx } from '@dojo/framework/widget-core/tsx';
import { WidgetBase } from '@dojo/framework/widget-core/WidgetBase';

import * as css from './styles/Hello.m.css';

interface UserProperties {}

export class User extends WidgetBase<UserProperties> {
	protected render() {
		return w<StoreProvider<State>>(StoreProvider, {
			stateKey: 'state',
			paths: (path) => [path('users', 'current')],
			renderer: (store) => {
				const { get, path } = store;
				const name = get(path('users', 'current', 'name'));

				return <h1 classes={[css.root]}>{`Hello, ${name}`}</h1>;
			}
		});
	}
}
```

The `StoreProvider` occurs as part of `User`'s render and provides its own renderer just like any other widget.

### Container

A `Container` is a widget that fully encapsulates another widget. It connects the store to the widget with a `getProperties` function.

> widget/User.tsx

```tsx
import { tsx } from '@dojo/framework/widget-core/tsx';
import { WidgetBase } from '@dojo/framework/widget-core/WidgetBase';

import * as css from './styles/Hello.m.css';

interface UserProperties {
	name?: string;
}

export class User extends WidgetBase<UserProperties> {
	protected render() {
		const { name = 'Stranger' } = this.properties;
		return <h1 classes={[css.root]}>{`Hello, ${name}`}</h1>;
	}
}
```

> widget/User.container.ts

```ts
import { createStoreContainer } from '@dojo/framework/stores/StoreInjector';
import { Container } from '@dojo/framework/widget-core/Container';
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

In this example `UserContainer` wraps `User` to display the current user's name. `createStoreContainer` is wrapper that is used to ensure the proper typing of `getProperties`. `getProperties` is responsible for getting to data from the store and creating properties for the widget.

The most important thing to note about a `Container` is its properties are a 1:1 mapping to the widget it wraps. In other words, all properties that appear on the widget should be provided by the `Container`.

### Excuting a Process

A process simply defines an execution flow for a set of data. To execute a process it needs access to the store to create an executor. Both the `Container` and `StoreProvider` widgets will provide you with access to the store.

```ts
import { logout } from './processes/logout';
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import { w } from '@dojo/framework/widget-core/d';
import StoreProvider from '@dojo/framework/stores/StoreProvider';
import { State } from '../../interfaces';
import User from './User';

export class UserProvider extends WidgetBase {
	protected render() {
		return w<StoreProvider<State>>(StoreProvider, {
			stateKey: 'state',
			paths: (path) => [path('users', 'current')],
			renderer: (store) => {
				const { get, path } = store;
				const name = get(path('users', 'current', 'name'));
				const onLogOut = () => {
					logout(store)({});
				};

				return w(User, { name, onLogOut });
			}
		});
	}
}
```

####
