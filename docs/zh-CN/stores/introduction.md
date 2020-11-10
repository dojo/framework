# 介绍

<!--
https://github.com/dojo/framework/blob/master/docs/en/stores/introduction.md
commit b61c6ff6ce70fa52dc3545f473b13db0d20df50c
-->

Dojo **store** 提供可预测的、一致的状态容器，内置了对共享状态管理模式的支持。

Dojo store 包提供了一个集中式存储，为应用程序提供真正的单一数据源。Dojo 应用程序的操作使用单向数据流；因此，所有应用程序数据遵循相同的生命周期，确保应用程序逻辑是可预测的，且易于理解。

| 功能                   | 描述                                               |
| ---------------------- | -------------------------------------------------- |
| **全局数据存储**       | 应用程序状态全局存储在真正的单一数据源中。         |
| **单向数据流**         | 可预测的、全局的应用程序状态管理。                 |
| **类型安全**           | 对状态的访问和修改都受接口的保护。                 |
| **操作驱动的状态变更** | 封装的、定义良好的状态修改，可以记录、撤消和重放。 |
| **异步支持**           | 开箱即用的异步命令（command）支持。                |
| **操作中间件**         | 在操作前和操作后进行错误处理和数据转换。           |
| **简单的部件集成**     | 提供与 Dojo 部件轻松集成的工具和模式。             |

## 基本用法

Dojo 提供了一种响应式架构，能够持续修改和渲染应用程序的当前状态。在简单系统中，这通常发生在部件内部，并且部件可以修改自己的状态。然而，随着系统变得越来越复杂，就需要更好的划分和封装数据，并随着快速增长创建一个清晰的隔离。

Store 提供了一个清晰的接口，通过单向数据流对全局对象进行存储、修改和检索。Store 中包含对共享模式的支持，如异步数据获取、中间件和撤销。Store 及其模式允许部件聚焦于它们的主要角色，即对信息的可视化展示和监听用户交互。

### store 对象

store 对象存储整个应用程序全局的、原子的状态。应该在创建应用程序时创建 store 对象，并使用一个注入器将其定义到 `Registry` 中。

> main.ts

```ts
import { registerStoreInjector } from '@dojo/framework/stores/StoreInjector';
import Store from '@dojo/framework/stores/Store';
import { State } from './interfaces';

const store = new Store<State>();
const registry = registerStoreInjector(store);
```

`State` 使用接口定义全局存储的结构。`State` 中的所有内容都应是可序列化的，即能转换为 JSON 或从 JSON 转换回来，这样的话， Dojo 的虚拟 DOM 系统更容易确定何时更改了数据，从而提高性能。

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

上面是一个简单的示例，定义了 store 的结构，会在本指南的其余示例中使用。

### 更新 store

使用 Dojo store 时需注意三个核心概念。

-   **Operation** - 操作 store 所持状态的指令
-   **Command** - 执行业务逻辑并返回 operation 的简单函数
-   **Process** - 执行一组 command 和表示应用程序的行为

#### Command 和 operation

要修改 store 中的值，则在执行 process 时，会调用一个 command 函数。command 函数返回要应用到 store 上的一系列 operation。每个 command 都要传入一个 `CommandRequest` 参数，它提供了 `path` 和 `at` 函数，会以类型安全的方式生成 `Path`，也提供了 `get` 函数来访问 store 中的状态，以及提供 `payload` 对象来为被调用的 process 执行器传入参数。

##### Command 工厂

Store 中有一个简单的封装函数，用于创建 command，是一个类型安全的工厂函数。

创建 store 工厂：

```ts
import { createCommandFactory } from '@dojo/framework/stores/process';
import { State } from './interfaces';

const createCommand = createCommandFactory<State>();

const myCommand = createCommand(({ at, get, path, payload, state }) => {
	return [];
});
```

`createCommand` ensures that the wrapped command has the correct typing and the passed `CommandRequest` functions get typed to the `State` interface provided to `createCommandFactory`. While it is possible to manually type commands, the examples in this guide use `createCommand`.
`createCommand` 确保封装的 command 具有正确的类型，而传入的 `CommandRequest` 函数能获得通过 `createCommandFactory` 提供的 `State` 接口的类型。虽然可以手动为 command 设置类型，但本指南中的示例使用 `createCommand`。

##### `path`

path 是一个 `string`，用于描述应用 operation 的位置。`path` 函数是 `CommandRequest` 中的一部分，可以在 `Command` 中访问。

本示例中，`path` 描述了 store 中的一个位置。`State` 与上面 `interface.d.ts` 中定义的相同。`Store` 通过 `State` 接口获知状态数据的形状。

定义一个获取当前用户名的 `path`：

```ts
const store = new Store<State>();
const { path } = store;

path('users', 'current', 'name');
```

这个 path 引用的 `string` 值位于 `/users/current/name`。`path` 以类型安全的方式遍历层次结构，确保只能使用在 `State` 接口中定义的属性名。

##### `at`

`at` 函数与 `path` 函数一起标识数组中的位置。本示例使用了 `at` 函数。

```ts
const store = new Store<State>();
const { at, path } = store;

at(path('users', 'list'), 1);
```

这个 path 引用的是位于 `/user/list` 中偏移量为 `1` 的 `User`。

##### `add` operation

用于向对象中添加值或者向数组中插入值。

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

会将 `user` 插入到用户列表的起始位置。

##### `remove` operation

从对象或数组中移除值。

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

本示例先为 `users` 添加一个初始状态，然后移除 list 中的第一个 `user`。

##### `replace` operation

替换值。相当于先 `remove` 再 `add`。

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

本示例使用 `newUser` 替换掉 `list` 中的第二个用户信息。

##### `get`

`get` 函数会返回 store 在指定 path 位置的值，如果该位置不存在值，则返回 `undefined`。

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

本示例检查是否存在身份认证令牌，然后据此更新当前用户的信息。

##### `payload`

`payload` 是一个对象字面量，当 process 调用 command 时，会将其传给 command。也可以在构建命令时传入 `payload` 的类型。

```ts
import { createCommandFactory } from '@dojo/framework/stores/process';
import { State } from './interfaces';
import { remove, replace } from '@dojo/framework/stores/state/operations';

const createCommand = createCommandFactory<State>();

const addUser = createCommand<User>(({ at, path, payload }) => {
	return [add(at(path('users', 'list'), 0), payload)];
});
```

本示例将 `payload` 提供的用户信息添加到 `/users/list` 的起始位置。

##### 异步 command

command 可以同步执行，也可以异步执行。异步 command 应该返回一个 `Promise`，以便指出何时完成。每个 command 成功完成后，将自动收集和应用 operation。

#### Process

`Process` 在 `store` 上按顺序执行 command，以修改应用程序的状态。使用 `createProcess` 工厂函数创建 process，该函数可传入一系列 command，以及选择性的传入一系列中间件。

##### 创建 process

首先，创建两个 command，负责获取用户令牌，并使用该令牌加载 `User`。然后创建一个 process 来使用这两个 command。每一个 process 都应该使用 ID 唯一标识。此 ID 在 store 内部使用。

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

##### `payload` 类型

process 执行器(process executor)的 `payload` 是从 command 的 `payload` 类型推断出来的。如果命令间的 payload 类型不同，则需要显式定义 process 执行器的 `payload` 类型。

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

### 关联部件和 store

有两个状态容器可用于部件：`StoreContainer` 和 `StoreProvider`。这些容器将应用程序的 store 与部件关联起来。当使用函数部件时，也可以创建类型化的 store 中间件。

注意，本节旨在介绍部件和状态（通过 store 提供的）是如何关联起来的。有关部件状态管理的更多信息，请参阅[创建部件参考指南](/learn/creating-widgets/状态管理)。

#### Store 中间件

当使用基于函数的部件时，`createStoreModdleware` 帮助函数用于创建类型化的 store 中间件，让部件能访问 store。

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

此中间件包含一个 `executor` 方法，用于在 store 上运行 process。

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

`StoreProvider` 是一个 Dojo 部件，它拥有 `renderer`，并与 store 关联。它总是封装在另一个部件内，因为它无法定义自己的属性。

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

`StoreProvider` 是 `User` 渲染内容的一部分，并且跟其它 Dojo 部件一样，提供了自己的 `renderer`。

#### Container

`Container` 是一个部件，它完全封装另一个部件。它使用 `getProperties` 函数将 store 关联到部件上。

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

本示例中，`UserContainer` 封装了显示当前用户名的 `User`。`createStoreContainer` 是一个封装器，用于确保 `getProperties` 中的类型正确。`getProperties` 负责从 store 中访问数据，并为部件创建属性。

`StoreContainer` 属性与其封装部件的属性是 1:1 映射的。部件的属性成为 `StoreContainer` 的属性，但这些属性都是可选的。

#### 执行 process

process 只是为一组数据定义了一个执行流。要执行 process，就需要让 process 基于 store 创建一个执行器。`StoreContainer` 和 `StoreProvider` 部件都支持访问 store。

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
