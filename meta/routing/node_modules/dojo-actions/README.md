# dojo-actions

[![Build Status](https://travis-ci.org/dojo/actions.svg?branch=master)](https://travis-ci.org/dojo/actions)
[![codecov.io](http://codecov.io/github/dojo/actions/coverage.svg?branch=master)](http://codecov.io/github/dojo/actions?branch=master)

A memento like library for Dojo 2 Applications.

**NOTE** At this stage, this is a functional prototype for a proposal that is under discussion.  This is not yet intended for production use.  Consider it *pre-alpha* and is intended to allow people to assess the API. **Use at your own risk and the final API may or may not look anything like this**

## Features

Actions embody the concept of "doing", "undoing" and "redoing" things.  The how these semantics are applied are up to the implementor of the action and the Action classs is essentially a mechanism to making writing actions easier.

### Creation

The `dojo-actions/actions` module has a default export of the actions factory, a factory which generates instances of the action class.

Creating an action requires at least two options at least to be specified.  There is `type` which is a unique string or symbol.  Also an action must implement a `do()` method.  For example:

```typescript
import actionFactory from 'dojo-actions/actions';

const actionFoo = actionFactory({
    type: 'foo',
    do() {
        /* do something */
    }
});
```

The action factory maintains a registry of all action types (to be able to be referenced without having a direct reference).  This means that any new types of actions must be unique.  If there is an attempt to create a non-unqique action type, an error will be thrown.

### state

The action instance contains a property named `state` which is intended for storage of any state related to this action instance, which will be available via `this` in any of the methods.  This can also be typed in TypeScript by either having the type inferred from setting the state property or the generic type (`S`) on construction.  The state interface should extend the `ActionState` interface.

An example of typing the state during construction:

```typescript
import actionFactory, { ActionState } from 'dojo-actions/actions';

interface FooState extends ActionState {
    currentFoo?: string;
}

const actionFoo = actionFactory<any, any, FooState>({
    type: 'foo',
    do() {
        /* do something */
    },
    state: { currentFoo: 'bar' }
});
```

### do()

The method supplied during construction will be "wrapped" by the action to provide some additional functionality.  When specifying the `do()` method, you can supply a single object argument, usually named `options` and an extension of the `ActionOptions<T>` interface that can supply additional information needed by your action.  This can be inferred or specified in the generic type arguments.  An example of inferring `options`:

```typescript
import actionFactory from 'dojo-actions/actions';

const actionFoo = actionFactory({
    type: 'foo',
    do(options: { target: any, foo: string }) {
        if (options.target) {
            console.log(options.foo);
        }
    }
});

actionFoo.do({ target: {}, foo: 'bar' });
```

Irrespective of what the `do()` method supplied returns a `Promise` that will resolved with whatever is returned or resolved from the `do()` method.  If the method throws during execution, this will result in the `Promise` returned being rejected.  If the method returns a `Thenable` result, this will be used as the return result, but decorated with some additional methods.

Invoking the `do()` method on the action instance will return a decorated `Promise` which will have additional methods of `undo()` and `redo()`.  These methods will not execute until the `do()` promise is resolved.  An example:

```typescript
import actionFactory from 'dojo-actions/actions';

const actionFoo = actionFactory({
    type: 'foo',
    do(options: { target: any }) {
        options.target.foo = 'foo';
    }
});

const obj1: any = {};
const obj2: any = {};

actionFoo
    .do({ target: obj1 })
    .redo({ target: obj2 });
```

### redo()

Like `do()`, `redo()` optionally supplied during construction will be called whenever the `redo()` method is called on the action.  If specified, `redo()` accepts the same `options` type as `do()`.  If a `redo()` method is not supplied, `do()` will be called instead.  So conceptually, if the action does not need different logic to be able to *redo* it's action, then there is no need to specify the method.  `redo()` behaves like `do()` and returns a `Promise` which has been decorated with `redo()` and `undo()`.  `redo()` will not be called until `do()` is resolved (and bypassed if `do()` is rejected/throws).

An example of specifying a `redo()` method:

```typescript
import actionFactory from 'dojo-actions/actions';

const actionFoo = actionFactory({
    type: 'foo',
    do(options: { target: any }) {
        options.target.foo = 'do';
    },
    redo(options: { target: any }) {
        options.target.foo = 'redo';
    }
});

const obj1: any = {};
const obj2: any = {};

const memo = actionFoo.do({ target: obj1 });

memo.redo({ target: obj2 });
```

### undo()

`undo()` is slightly different than `do()` and `redo()`.  Conceptually, `undo()` shouldn't take any arguments, as it should know what it needs to affect in order to *undo* something.  If an `undo()` method is not supplied during construction, it will result in a noop, but will still return a promise that is resolved.

An example of implementing `undo()`:

```typescript
import actionFactory from 'dojo-actions/actions';

const actionFoo = actionFactory({
    type: 'foo',
    do(options: { target: any }) {
        this.state.target = { foo: target.foo }; /* store old foo */
        target.foo = 'foo';
    },
    undo() {
        target.foo = this.state.target.foo;
    }
});

const obj: any = { foo: 'bar' };

const memo = actionFoo
    .do({ target: obj })
    .then(() => {
        console.log(obj.foo); // foo
    });

memo
    .undo()
    .then(() => {
        console.log(obj.foo); // bar
    });
```

## How do I use this package?

TODO: Add appropriate usage and instruction guidelines

## How do I contribute?

We appreciate your interest!  Please see the [Dojo 2 Meta Repository](https://github.com/dojo/meta#readme) for the
Contributing Guidelines and Style Guide.

## Testing

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

© 2004–2015 Dojo Foundation & contributors. [New BSD](http://opensource.org/licenses/BSD-3-Clause) license.

