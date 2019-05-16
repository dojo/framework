# StoreProvider

# Working with Commands

## Asynchronous Commands

## Process Middleware

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

<!-- TODO
StoreProvider

    Using the StoreProvider
    StoreProvider API
    Registering paths for invalidation etc

Working with Commands

    Type safe commands with the command factory
    The Command Request API

Asynchronous and Concurrent Commands
Process Middleware
Immutable patterns when updating state
Optimistic Update Pattern
Handling errors and rollback
Composing Commands
Working with Arrays
Transforming Process Payloads
Normalizing State
Custom State Management Implementation (i.e. immutable)
Working with external / remote data sources
Dojo provided middleware (i.e. local storage, history etc)
Undo support
Architectural considerations
_ local state
_ stored while the widget is connected
_ global state
_ stored for the lifetime of the application \* easy to reinstate and alter
-->
