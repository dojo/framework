# Dojo 2 core

[![Build Status](https://travis-ci.org/dojo/core.svg?branch=master)](https://travis-ci.org/dojo/core)
[![codecov.io](https://codecov.io/github/dojo/core/coverage.svg?branch=master)](https://codecov.io/github/dojo/core?branch=master)
[![npm version](https://badge.fury.io/js/%40dojo%2Fcore.svg)](https://badge.fury.io/js/%40dojo%2Fcore)
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fdojo%2Fcore.svg?type=shield)](https://app.fossa.io/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fdojo%2Fcore?ref=badge_shield)

This package provides a set of language helpers, utility functions, and classes for writing TypeScript applications. It includes APIs for feature detection, asynchronous operations, basic event handling,
and making HTTP requests.

## Usage

To use `@dojo/core`, install the package along with its required peer dependencies:

```bash
npm install @dojo/core

# peer dependencies
npm install @dojo/has
npm install @dojo/shim
```

## Features

- [Feature Detection](#feature-detection)
- [Language Utilities](#language-utilities)
  - [array](#array)
  - [lang](#lang)
  - [load](#load)
  - [math](#math)
  - [string](#string)
- [UrlSearchParams](#urlsearchparams)
- [Event Handling](#event-handling)
- [HTTP Requests](#http-requests)
- [Promises and Asynchronous Operations](#promises-and-asynchronous-operations)
  - [Promise](#promise)
  - [Task](#task)

### Feature Detection

Using the latest Web technologies isn't always as straightforward as developers would like due to differing support across platforms. [`@dojo/core/has`](docs/has.md) provides a simple feature detection API that makes it easy to
detect which platforms support which features.

### Language Utilities

The core package provides modules offering language utilities.  Some of these are heavily based
on methods in the ES2015 proposal; others are additional APIs for commonly-performed tasks.

#### array

The [`@dojo/core/array` module](docs/array.md) contains analogs to some of the ES2015 Array APIs.

#### lang

The [`@dojo/core/lang` module](docs/lang.md) contains various utility functions for tasks such as copying objects
and creating late-bound or partially applied functions.

### load
The [`@dojo/core/load` module](docs/load.md) can be used to dynamically load modules or other arbitrary resources via plugins.

#### math

The [`@dojo/core/math` module](docs/math.md) contains analogs to a number of ES2015 APIs, including many trigonometric and logarithmic functions.

#### string

The [`@dojo/core/stringExtras` module](docs/stringExtras.md) contains various string functions that are not available as part of the ES2015 String APIs.

#### UrlSearchParams

The [`@dojo/core/UrlSearchParams` class](docs/UrlSearchParams.md) can be used to parse and generate URL query strings.

#### Event handling

The [`@dojo/core/on` module](docs/on.md) contains methods to handle events across types of listeners.  It also includes methods to handle different event use cases including only firing
once and pauseable events.

#### HTTP requests

The [`@dojo/core/request` module](docs/request.md) contains methods to simplify making HTTP requests. It can handle
making requests in both node and the browser through the same methods.

### Promises and Asynchronous Operations

#### Promise

The `@dojo/core/Promise` class is an implementation of the ES2015 Promise API that also includes static state inspection and a `finally` method for cleanup actions.

`@dojo/core/async` contains a number of classes and utility modules to simplify working with asynchronous operations.

#### Task

The `@dojo/core/async/Task` class is an extension of `@dojo/core/Promise` that provides cancelation support.

## How Do I Contribute?

We appreciate your interest! Please see the [Dojo 2 Meta Repository](https://github.com/dojo/meta#readme)
for the Contributing Guidelines.

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

© 2004–2018 [JS Foundation](https://js.foundation/) & contributors. [New BSD](http://opensource.org/licenses/BSD-3-Clause) license.

Some string functions (`codePointAt`, `fromCodePoint`, and `repeat`) adopted from polyfills by Mathias Bynens,
under the [MIT](http://opensource.org/licenses/MIT) license.

See [LICENSE](LICENSE) for details.

[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fdojo%2Fcore.svg?type=large)](https://app.fossa.io/projects/git%2Bhttps%3A%2F%2Fgithub.com%2Fdojo%2Fcore?ref=badge_large)
