# shim

This package provides functional shims for ECMAScript, access to the Typescript helpers, and a quick way to include the polyfills needed to run Dojo in the browser.

It is targeted at providing polyfills for ECMAScript 6 and beyond targeted at ECMAScript 5. For backwards compatibility function shims are also provided in some cases.

There are two exceptions to this. One is the `Promise` object, which needs to be globally available for async/await operations. The other exception is the `Symbol` functionality, in that the well-known symbols need to be located off of the global `Symbol` object in order to ensure that the correct symbol is referenced.

## Usage

Include the module in your project to load the global shims and Typescript helpers.

```typescript
import '@dojo/framework/shim';
```

Since the main module loads the Typescript helpers, you'll want to turn off helper generation in your project. Add the following option to your `tsconfig.json`.

```json
{
	"compilerOptions": {
		"noEmitHelpers": true
	}
}
```

If you are using Dojo in the browser, you will want to load the browser polyfills. These are available by simply importing the `@dojo/framework/shim/browser` module.

```typescript
// load polyfills for features used by Dojo
import '@dojo/framework/shim/browser';
```

_Note_: Other Dojo packages will include these dependencies. You only need to worry about this if you are using this package stand alone.

<!-- start-github-only -->

## Features

Many of the features in this package will fallback to a native implementation if one is available.

-   [Array](#array-methods)
-   [Data Structures](#data-structures)
    -   [Map](#map)
    -   [Set](#set)
    -   [WeakMap](#weakmap)
-   [Iterators](#iterators)
-   [Math](#math)
-   [Number](#number)
-   [Object](#object)
-   [Observables](#observables)
-   [Promises](#promises)
-   [String](#string)
-   [Symbols](#symbols)

<!-- end-github-only -->

### Array Methods

[`@dojo/framework/shim/array`](../../docs/shim/array.md) provides implementations of many array utilities.

### Data Structures

#### Map

The [`@dojo/framework/shim/Map` class](../../docs/shim/Map.md) is an implementation of the ES2015 Map specification
without iterators for use in older browsers.

#### Set

The `@dojo/framework/shim/Set` class is an implementation of the [ES2015 Set specification](http://www.ecma-international.org/ecma-262/6.0/#sec-set-objects). A Set is used to create a collection of unique values.

```typescript
import Set from '@dojo/framework/shim/Set';

const values = new Set<string>();
values.add('one');
values.add('two');
values.add('one');

values.forEach((value) => {
	console.log(value);
});

// output:
// one
// two
```

#### WeakMap

The `@dojo/framework/shim/WeakMap` class is an implementation of the ES2015 WeakMap specification
without iterators for use in older browsers. The main difference between WeakMap and Map
is that WeakMap's keys can only be objects and that the store has a weak reference
to the key/value pair. This allows for the garbage collector to remove pairs.

See the [Map](../../docs/shim/Map.md) documentation for more information on how to use WeakMap.

### Iterators

The `@dojo/framework/shim/iterator` module is an implementation of the [ES2015 Iterator specification](http://www.ecma-international.org/ecma-262/6.0/#sec-iteration).

### Math

The [`@dojo/framework/shim/math`](../../docs/shim/math.md) module provides implementations for many math methods.

### Number

The `dojo/shim/number` module provides implementations for several `Number` methods.

-   `isNaN`
-   `isFinite`
-   `isInteger`
-   `isSafeInteger`

### Object

The `dojo/shim/object` provides implementations of `Object` methods.

-   is
-   getOwnPropertySymbols
-   getOwnPropertyNames
-   getOwnPropertyDescriptor
-   values
-   entries

### Observables

The [`@dojo/framework/shim/Observable`](../../docs/shim/Observable.md) class is an implementation of the proposed [Observable specification](https://tc39.github.io/proposal-observable/).

### Promises

[`@dojo/framework/shim/Promise`](../../docs/shim/Promise.md) is an implementation of the [ES2015 Promise specification](http://www.ecma-international.org/ecma-262/6.0/#sec-promise-objects).

### String

The [`@dojo/framework/shim/string`](../../docs/shim/string.md) module contains `String` methods.

### Symbols

`@dojo/framework/shim/Symbol` provides an implementation of the [ES2015 Symbol specification](http://www.ecma-international.org/ecma-262/6.0/#sec-symbol-objects) for environments that do not natively support `Symbol`.

<!-- doc-viewer-config
{
	"pages": [
		"docs/shim/array.md",
		"docs/shim/Map.md",
		"docs/shim/math.md",
		"docs/shim/Observable.md",
		"docs/shim/Promise.md",
		"docs/shim/string.md"
	]
}
-->
