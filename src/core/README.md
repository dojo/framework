# core

Provides a set of language helpers, utility functions, and classes for writing TypeScript applications. It includes APIs for feature detection, asynchronous operations, basic event handling,
and making HTTP requests.

## Features

- [Feature Detection](#feature-detection)
- [Language Utilities](#language-utilities)
  - [lang](#lang)
  - [load](#load)
  - [string](#string)
- [UrlSearchParams](#urlsearchparams)
- [Event Handling](#event-handling)
- [HTTP Requests](#http-requests)
- [Promises and Asynchronous Operations](#promises-and-asynchronous-operations)
  - [Promise](#promise)
  - [Task](#task)

### Feature Detection

Using the latest Web technologies isn't always as straightforward as developers would like due to differing support across platforms. [`@dojo/framework/core/has`](../../docs/core/has.md) provides a simple feature detection API that makes it easy to
detect which platforms support which features.

### Language Utilities

The core package provides modules offering language utilities.  Some of these are heavily based
on methods in the ES2015 proposal; others are additional APIs for commonly-performed tasks.

#### lang

The [`@dojo/framework/core/lang` module](../../docs/core/lang.md) contains various utility functions for tasks such as copying objects
and creating late-bound or partially applied functions.

### load
The [`@dojo/framework/core/load` module](../../docs/core/load.md) can be used to dynamically load modules or other arbitrary resources via plugins.

#### string

The [`@dojo/framework/core/stringExtras` module](../../docs/core/stringExtras.md) contains various string functions that are not available as part of the ES2015 String APIs.

#### UrlSearchParams

The [`@dojo/framework/core/UrlSearchParams` class](../../docs/core/UrlSearchParams.md) can be used to parse and generate URL query strings.

#### Event handling

The [`@dojo/framework/core/on` module](../../docs/core/on.md) contains methods to handle events across types of listeners.  It also includes methods to handle different event use cases including only firing
once and pauseable events.

#### HTTP requests

The [`@dojo/framework/core/request` module](../../docs/core/request.md) contains methods to simplify making HTTP requests. It can handle
making requests in both node and the browser through the same methods.

### Promises and Asynchronous Operations

#### Promise

The `@dojo/framework/core/Promise` class is an implementation of the ES2015 Promise API that also includes static state inspection and a `finally` method for cleanup actions.

`@dojo/framework/core/async` contains a number of classes and utility modules to simplify working with asynchronous operations.

#### Task

The `@dojo/framework/core/async/Task` class is an extension of `@dojo/framework/core/Promise` that provides cancelation support.

<!-- doc-viewer-config
{
	"api": "docs/core/api.json",
	"pages": [
		"docs/core/UrlSearchParams.md",
		"docs/core/has.md",
		"docs/core/lang.md",
		"docs/core/load.md",
		"docs/core/on.md",
		"docs/core/request.md",
		"docs/core/stringExtras.md"
	]
}
-->
