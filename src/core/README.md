# core

Provides a small set of base classes and core helpers for use within dojo/framework.

## Features

- [Destroyable](#destroyable)
- [Evented](#evented)
- [QueuingEvented](#queuingevented)
- [util](#util)

### Destroyable

A base class that provides APIs to `own` other destroyable handles and `destroy` the instance.

### Evented

An evented base class that extends `Destroyable` and provides an eventing API for emitting events and registering listeners for events.

### QueuingEvented

An extended version of `Evented` that queues events until a listener is attached.

### util

A collection of helper functions:

`deepAssign`

Copies the values of all enumerable own properties of one or more source objects to the target object, recursively copying all nested objects and arrays as well.

`deepMixin`

Copies the values of all enumerable (own or inherited) properties of one or more source objects to the target object, recursively copying all nested objects and arrays as well.

`mixin`

Copies the values of all enumerable (own or inherited) properties of one or more source objects to the target object.

`debounce`

Wraps a callback, returning a function which fires after no further calls are received over a set interval.

`throttle`

Wraps a callback, returning a function which fires at most once per set interval.

`uuid`

Generates a v4 uuid
