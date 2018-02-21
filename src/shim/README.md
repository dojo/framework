# @dojo/shim

[![Build Status](https://travis-ci.org/dojo/shim.svg?branch=master)](https://travis-ci.org/dojo/shim)
[![codecov](https://codecov.io/gh/dojo/shim/branch/master/graph/badge.svg)](https://codecov.io/gh/dojo/shim)
[![npm version](https://badge.fury.io/js/%40dojo%2Fshim.svg)](https://badge.fury.io/js/%40dojo%2Fshim)

This package provides functional shims for ECMAScript, access to the Typescript helpers, and a quick way to include the polyfills needed to run Dojo 2 in the browser.

It is targeted at providing function shims for ECMAScript 6 and beyond targeted at ECMAScript 5.  It is different than other solutions of shimming or polyfilling functionality, in that it does not provide the functionality via augmenting the built-in classes in the global namespace.

There are two exceptions to this. One is the `Promise` object, which needs to be globally available for async/await operations. The other exception is the `Symbol` functionality, in that the well-known symbols need to be located off of the global `Symbol` object in order to ensure that the correct symbol is referenced.

## Usage

To use `@dojo/shim`, install the package along with its required peer dependencies:

```bash
npm install @dojo/shim

# peer dependencies
npm install @dojo/has
```

Include the module in your project to load the global shims and Typescript helpers.

```typescript
import '@dojo/shim';
```

Since the main module loads the Typescript helpers, you'll want to turn off helper generation in your project. Add the following option to your `tsconfig.json`.

```json
{
	"compilerOptions": {
		"noEmitHelpers": true
	}
}
```

If you are using Dojo 2 in the browser, you will want to load the browser polyfills. These are available by simply importing the `@dojo/shim/browser` module.

```typescript
// load polyfills for features used by Dojo 2
import '@dojo/shim/browser';
```

*Note*: Other Dojo 2 packages will include these dependencies.  You only need to worry about this if you are using this package stand alone.

## Features

Many of the features in this package will fallback to a native implementation if one is available.

- [Array](#array-methods)
- [Data Structures](#data-structures)
    - [Map](#map)
    - [Set](#set)
    - [WeakMap](#weakmap)
- [Iterators](#iterators)
- [Math](#math)
- [Number](#number)
- [Object](#object)
- [Observables](#observables)
- [Promises](#promises)
- [String](#string)
- [Symbols](#symbols)

### Array Methods

[`@dojo/shim/array`](docs/array.md) provides implementations of many array utilities.

### Data Structures

#### Map

The [`@dojo/shim/Map` class](docs/Map.md) is an implementation of the ES2015 Map specification
without iterators for use in older browsers.

#### Set

The `@dojo/shim/Set` class is an implementation of the [ES2015 Set specification](http://www.ecma-international.org/ecma-262/6.0/#sec-set-objects).  A Set is used to create a collection of unique values.

```typescript
import Set from '@dojo/shim/Set';

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

The `@dojo/shim/WeakMap` class is an implementation of the ES2015 WeakMap specification
without iterators for use in older browsers. The main difference between WeakMap and Map
is that WeakMap's keys can only be objects and that the store has a weak reference
to the key/value pair. This allows for the garbage collector to remove pairs.

See the [Map](docs/Map.md) documentation for more information on how to use WeakMap.

### Iterators

The `@dojo/shim/iterator` module is an implementation of the [ES2015 Iterator specification](http://www.ecma-international.org/ecma-262/6.0/#sec-iteration).

### Math

The [`@dojo/shim/math`](docs/math.md) module provides implementations for many math methods.

### Number

The `dojo/shim/number` module provides implementations for several `Number` methods.

* `isNaN`
* `isFinite`
* `isInteger`
* `isSafeInteger`

### Object

The `dojo/shim/object` provides implementations of `Object` methods.

* is
* getOwnPropertySymbols
* getOwnPropertyNames
* getOwnPropertyDescriptor
* values
* entries

### Observables

The [`@dojo/shim/Observable`](docs/Observable.md) class is an implementation of the proposed [Observable specification](https://tc39.github.io/proposal-observable/).  Observables are further extended in [`@dojo/core/Observable`](https://github.com/dojo/core/blob/master/src/Observable.ts).

### Promises

[`@dojo/shim/Promise`](docs/Promise.md) is an implementation of the [ES2015 Promise specification](http://www.ecma-international.org/ecma-262/6.0/#sec-promise-objects).

### String

The [`@dojo/shim/string`](docs/string.md) module contains `String` methods.

### Symbols

`@dojo/shim/Symbol` provides an implementation of the [ES2015 Symbol specification](http://www.ecma-international.org/ecma-262/6.0/#sec-symbol-objects) for environments that do not natively support `Symbol`.

## How do I contribute?

We appreciate your interest!  Please see the [Dojo 2 Meta Repository](https://github.com/dojo/meta#readme) for the Contributing Guidelines.

### Code Style

This repository uses [`prettier`](https://prettier.io/) for code styling rules and formatting. A pre-commit hook is installed automatically and configured to run `prettier` against all staged files as per the configuration in the project's `package.json`.

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

© 2018 [JS Foundation](https://js.foundation/) & contributors. [New BSD](http://opensource.org/licenses/BSD-3-Clause) license.

