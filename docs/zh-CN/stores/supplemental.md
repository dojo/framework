# Store 概念详解

<!--
https://github.com/dojo/framework/blob/master/docs/en/stores/supplemental.md
commit b61c6ff6ce70fa52dc3545f473b13db0d20df50c
-->

## `State` 对象

在现代浏览器中，`state` 对象是作为 `CommandRequest` 的一部分传入的。对 `state` 对象的任何修改都将转换为相应的 operation，然后应用到 store 上。

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

注意，IE 11 不支持访问 state，如果尝试访问将立即抛出错误。

## `StoreProvider`

StoreProvider 接收三个属性

-   `renderer`: 一个渲染函数，已将 store 注入其中，能访问状态并向子部件传入 process。
-   `stateKey`: 注册状态时使用的 key 值。
-   `paths` (可选): 将此 provider 连接到状态的某一局部上。

### 失效

`StoreProvider` 有两种方法触发失效并促使重新渲染。

1.  推荐的方式是，通过向 provider 传入 `paths` 属性来注册 `path`，以确保只有相关状态变化时才会失效。
2.  另一种是较笼统的方式，当没有为 provider 定义 `path` 时，store 中的 _任何_ 数据变化都会引起失效。

## `Process`

### 生命周期

`Process` 有一个执行生命周期，它定义了所定义行为的流程。

1.  如果存在转换器，则首先执行转换器来转换 payload 对象
2.  按顺序同步执行 `before` 中间件
3.  按顺序执行定义的 command
4.  在执行完每个 command （如果是多个 command 则是一块 command）之后，应用命令返回的 operation
5.  如果在执行命令期间抛出了异常，则不会再执行后续命令，并且也不会应用当前的 operation
6.  按顺序同步执行 `after` 中间件

### Process 中间件

使用可选的 `before` 和 `after` 方法在 process 的前后应用中间件。这允许在 process 所定义行为的前和后加入通用的、可共享的操作。

也可以在列表中定义多个中间件。会根据中间件在列表中的顺序同步调用。

#### Before

`before` 中间件块能获取传入的 `payload` 和 `store` 的引用。

> middleware/beforeLogger.ts

```ts
const beforeOnly: ProcessCallback = () => ({
	before(payload, store) {
		console.log('before only called');
	}
});
```

#### After

`after` 中间件块能获取传入的 `error` (如果发生了错误的话)和 process 的 `result`。

> middleware/afterLogger.ts

```ts
const afterOnly: ProcessCallback = () => ({
	after(error, result) {
		console.log('after only called');
	}
});
```

`result` 实现了 `ProcessResult` 接口，以提供有关应用到 store 上的变更信息和提供对 store 的访问。

-   `executor` - 允许在 store 上运行其他 process
-   `store` - store 引用
-   `operations` - 一组应用的 operation
-   `undoOperations` - 一组 operation，用来撤销所应用的 operation
-   `apply` - store 上的 apply 方法
-   `payload` - 提供的 payload
-   `id` - 用于命名 process 的 id

## 订阅 store 的变化

`Store` 有一个 `onChange(path, callback)` 方法，该方法接收一个或一组 path，并在状态变更时调用回调函数。

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

`Store` 中还有一个 `invalidate` 事件，store 变化时就触发该事件。

> main.ts

```ts
store.on('invalidate', () => {
	// do something when the store's state has been updated.
});
```

# 共享的状态管理模式

## 初始状态

首次创建 store 时，它为空。然后，可以使用一个 process 为 store 填充初始的应用程序状态。

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

Dojo store 使用 patch operation 跟踪底层 store 的变化。这样，Dojo 就很容易创建一组 operation，然后撤销这组 operation，以恢复一组 command 所修改的任何数据。`undoOperations` 是 `ProcessResult` 的一部分，可在 `after` 中间件中使用。

当一个 process 包含了多个修改 store 状态的 command，并且其中一个 command 执行失败，需要回滚时，撤销(Undo) operation 非常有用。

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

在执行时，任何 command 出错，则 `undoOnFailure` 中间件就负责应用 `undoOperations`。

需要注意的是，`undoOperations` 仅适用于在 process 中完全执行的 command。在回滚状态时，它将不包含以下任何 operation，这些状态的变更可能是异步执行的其他 process 引起的，或者在中间件中执行的状态变更，或者直接在 store 上操作的。这些用例不在 undo 系统的范围内。

## 乐观更新

乐观更新可用于构建响应式 UI，尽管交互可能需要一些时间才能响应，例如往远程保存资源。

例如，假使正在添加一个 todo 项，通过乐观更新，可以在向服务器发送持久化对象的请求之前，就将 todo 项添加到 store 中，从而避免尴尬的等待期或者加载指示器。当服务器响应后，可以根据服务器操作的结果成功与否，来协调 store 中的 todo 项。

在成功的场景中，使用服务器响应中提供的 `id` 来更新已添加的 `Todo` 项，并将 `Todo` 项的颜色改为绿色，以指示已保存成功。

在出错的场景中，可以显示一个通知，说明请求失败，并将 `Todo` 项的颜色改为红色，同时显示一个“重试”按钮。甚至可以恢复或撤销添加的 Todo 项，以及在 process 中发生的其他任何操作。

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

-   `addTodoCommand` - 在应用程序状态中添加一个 todo 项
-   `calculateCountsCommand` - 重新计算已完成的待办项个数和活动的待办项个数
-   `postTodoCommand` - 将 todo 项提交给远程服务，并使用 process 的 `after` 中间件在发生错误时执行进一步更改
    -   _失败时_ 将恢复更改，并将 failed 状态字段设置为 true
    -   _成功时_ 使用从远程服务返回的值更新 todo 项的 id 字段
-   `calculateCountsCommand` - `postTodoCommand` 成功后再运行一次

### 同步更新

在某些情况下，在继续执行 process 之前，最好等后端调用完成。例如，当 process 从屏幕中删除一个元素时，或者 outlet 发生变化要显示不同的视图，恢复触发这些操作的状态可能会让人感到很诡异（译注：数据先从界面上删掉了，因为后台删除失败，过一会数据又出现在界面上）。

因为 process 支持异步 command，只需简单的返回 `Promise` 以等待结果。

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

## 并发 command

`Process` 支持并发执行多个 command，只需将这些 command 放在一个数组中即可。

> process.ts

```ts
createProcess('my-process', [commandLeft, [concurrentCommandOne, concurrentCommandTwo], commandRight]);
```

本示例中，`commandLeft` 先执行，然后并发执行 `concurrentCommandOne` 和 `concurrentCommandTwo`。当所有的并发 command 执行完成后，就按需应用返回的结果。如果任一并发 command 出错，则不会应用任何操作。最后，执行 `commandRight`。

## 可替换的状态实现

当实例化 store 时，会默认使用 `MutableState` 接口的实现。在大部分情况下，默认的状态接口都经过了很好的优化，足以适用于常见情况。如果一个特殊的用例需要另一个实现，则可以在初始化时传入该实现。

```ts
const store = new Store({ state: myStateImpl });
```

### `MutableState` API

任何 `State` 实现都必须提供四个方法，以在状态上正确的应用操作。

-   `get<S>(path: Path<M, S>): S` 接收一个 `Path` 对象，并返回当前状态中该 path 指向的值
-   `at<S extends Path<M, Array<any>>>(path: S, index: number): Path<M, S['value'][0]>` 返回一个 `Path` 对象，该对象指向 path 定位到的数组中索引为 `index` 的值
-   `path: StatePaths<M>` 以类型安全的方式，为状态中给定的 path 生成一个 `Path` 对象
-   `apply(operations: PatchOperation<T>[]): PatchOperation<T>[]` 将提供的 operation 应用到当前状态上

### `ImmutableState`

Dojo Store 通过 [Immutable](https://github.com/dojo/framework/blob/master/src/stores/state/ImmutableState.ts) 为 MutableState 接口提供了一个实现。如果对 store 的状态做频繁的、较深层级的更新，则这个实现可能会提高性能。在最终决定使用这个实现之前，应先测试和验证性能。

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

## 本地存储

Dojo Store 提供了一组工具来使用本地存储（local storage）。

本地存储中间件监视指定路径上的变化，并使用 `collector` 中提供的 `id` 和 path 中定义的结构，将它们存储在本地磁盘上。

使用本地存储中间件：

```ts
export const myProcess = createProcess(
	'my-process',
	[command],
	collector('my-process', (path) => {
		return [path('state', 'to', 'save'), path('other', 'state', 'to', 'save')];
	})
);
```

来自 `LocalStorage` 中的 `load` 函数用于与 store 结合

与状态结合：

```ts
import { load } from '@dojo/framework/stores/middleware/localStorage';
import { Store } from '@dojo/framework/stores/Store';

const store = new Store();
load('my-process', store);
```

注意，数据要能够被序列化以便存储，并在每次调用 process 后都会覆盖数据。此实现不适用于不能序列化的数据（如 `Date` 和 `ArrayBuffer`）。

# 高级的 store operation

Dojo Store 使用 operation 来更改应用程序的底层状态。这样设计 operation，有助于简化对 store 的常用交互，例如，operation 将自动创建支持 `add` 或 `replace` operation 所需的底层结构。

在未初始化的 store 中执行一个深度 `add`：

```ts
import Store from '@dojo/framework/stores/Store';
import { add } from '@dojo/framework/stores/state/operations';

const store = new Store<State>();
const { at, path, apply } = store;
const user = { id: '0', name: 'Paul' };

apply([add(at(path('users', 'list'), 10), user)]);
```

结果为：

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

即使状态尚未初始化，Dojo 也能基于提供的 path 创建出底层的层次结构。这个操作是安全的，因为 TypeScript 和 Dojo 提供了类型安全。这允许用户很自然的使用 store 所用的 `State` 接口，而不需要显式关注 store 中保存的数据。

当需要显式使用数据时，可以使用 `test` 操作或者通过获取底层数据来断言该信息，并通过编程的方式来验证。

本示例使用 `test` 操作来确保已初始化，确保始终将 `user` 添加到列表的末尾：

```ts
import Store from '@dojo/framework/stores/Store';
import { test } from '@dojo/framework/stores/state/operations';

const store = new Store<State>();
const { at, path, apply } = store;

apply([test(at(path('users', 'list', 'length'), 0))]);
```

本示例通过编程的方式，确保 `user` 总是作为最后一个元素添加到列表的末尾：

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

禁止访问状态的根节点，如果访问将会引发错误，例如尝试执行 `get(path('/'))`。此限制也适用于 operation；不能创建一个更新状态根节点的 operation。`@dojo/framewok/stores` 的最佳实践是鼓励只访问 store 中最小的、必需的部分。
