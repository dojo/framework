# Dojo 2 core

[![Build Status](https://travis-ci.org/dojo/core.svg?branch=master)](https://travis-ci.org/dojo/core)
[![codecov.io](http://codecov.io/github/dojo/core/coverage.svg?branch=master)](http://codecov.io/github/dojo/core?branch=master)
[![npm version](https://badge.fury.io/js/dojo-core.svg)](http://badge.fury.io/js/dojo-core)

This package provides a set of language helpers, utility functions, and classes for writing TypeScript applications.
It includes APIs for feature detection, asynchronous and streaming operations, basic event handling,
and making HTTP requests.

## Installation

This package is currently in Alpha with a initial stable release scheduled for later this year. You can download
the Alpha by cloning or downloading this repository.

## Usage

### TypeScript

To access modules use after cloning or downloading the repository, you can reference it by:

```ts
import * as lang from 'src/lang'; // this imports all exports of the module as the object lang

import { lateBind, mixin } from 'src/lang'; // this imports lateBind and mixin from the module
```

### Compile To JavaScript

Once downloaded, you can compile the TypesScript files by first installing the project dependencies with:

```
npm install
```

The by running this command:

```
grunt dev
```

This will run the grunt 'dev' task.

## Features

### Feature Detection

Using the latest Web technologies isn't always as straightforward as developers would like due to differing support
across platforms. [`dojo-core/has`](docs/has.md) provides a simple feature detection API that makes it easy to
detect which platforms support which features.

### Language Utilities

The core package provides modules offering language utilities.  Some of these are heavily based
on methods in the ES2015 proposal; others are additional APIs for commonly-performed tasks.

#### array

The [`dojo-core/array` module](docs/array.md) contains analogues to some of the ES2015 Array APIs.

#### lang

The [`dojo-core/lang` module](docs/lang.md) contains various utility functions for tasks such as copying objects
and creating late-bound or partially applied functions.

#### math

The [`dojo-core/math` module](docs/math.md) contains analogues to a number of ES2015 APIs, including many trigonometric and logarithmic
functions.

#### string

The [`dojo-core/string` module](docs/string.md) contains analogues to the some of the ES2015 String APIs.

#### UrlSearchParams

The [`dojo-core/UrlSearchParams` class](docs/UrlSearchParams.md) can be used to parse and generate URL query strings.

#### Event handling

The [`dojo-core/on` module](docs/on.md) contains methods to handle events across types of listeners.  It also includes methods to handle different event use cases including only firing
once and pauseable events.

#### HTTP requests

The [`dojo-core/request` module](docs/request.md) contains methods to simplify making http requests. It can handle
making requests in both node and the browser through the same methods.

### Promises and Asynchronous Operations

#### Promise

The `dojo-core/Promise` class is an implementation of the ES2015 Promise API that also includes static state
inspection and a `finally` method for cleanup actions.

`dojo-core/async` contains a number of classes and utility modules to simplify working with asynchronous operations.

#### Task

The `dojo-core/async/Task` class is an extension of `dojo-core/Promise` that provides cancelation support.

### Data Structures

#### Map

The [`dojo-core/Map` class](docs/Map.md) is an implementation of the ES2015 Map specification
without iterators for use in older browsers.

#### WeakMap

The `dojo-core/WeakMap` class is an implementation of the ES2015 WeakMap specification
without iterators for use in older browsers. The main difference between WeakMap and Map
is that WeakMap's keys can only be objects and that the store has a weak reference
to the key/value pair. This allows for the garbage collector to remove pairs.

Look at [Map](docs/Map.md) for more information on how to use WeakMap.

## How do I contribute?

We appreciate your interest! Please see the [Dojo 2 Meta Repository](https://github.com/dojo/meta#readme)
for the Contributing Guidelines and Style Guide.

Dojo core's continuous integration tests use the [BrowserStack](http://www.browserstack.com) cloud.

[![BrowserStack](resources/BrowserStackLogo.png)](http://www.browserstack.com)

## Licensing information

© 2004–2015 Dojo Foundation & contributors. [New BSD](http://opensource.org/licenses/BSD-3-Clause) license.

Some string functions (`codePointAt`, `fromCodePoint`, and `repeat`) adopted from polyfills by Mathias Bynens,
under the [MIT](http://opensource.org/licenses/MIT) license.

See [LICENSE](LICENSE) for details.
