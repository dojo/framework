# Dojo 2 core

This package provides a set of language helpers, utility functions, and classes for writing TypeScript applications.
It includes APIs for feature detection, asynchronous and streaming operations, basic event handling,
and making HTTP requests.

## Features

### Feature Detection

Using the latest Web technologies isn't always as straightforward as developers would like due to differing support
across platforms. `dojo-core/has` provides a simple feature detection API that makes it easy to detect which platforms
support which features.

#### Detecting Features

The default export of `dojo-core/has` is a function which accepts a single parameter: the name of the feature to test for.
If the feature is available, a truthy value is returned, otherwise a falsy value is returned:

```ts
if (has('dom-addeventlistener')) {
    element.addEventListener('click', function () { /* ... */ });
}
```

#### Adding Feature Detections

It's important to be able to add new feature tests that aren't provided out-of-the-box by `dojo-core/has`.
This can be done easily by using the `add` function exported by the `has` module. It accepts two parameters:
the name of the feature, and either an immediate value indicating its availability or a function that resolves to a
value.

When a function is passed, the feature will be lazily evaluated - i.e. the function is not executed until the feature is
actually requested. The return value is then cached for future calls for the same feature.

```ts
import { add as hasAdd } from 'dojo-core/has';
hasAdd('dom-queryselector', 'querySelector' in document && 'querySelectorAll' in document);

// Lazily executed; useful if a polyfill is loaded after page load
hasAdd('typedarray', function () {
    return 'ArrayBuffer' in window;
});
```

#### Accessing the Feature Cache

`dojo-core/has` maintains object hashes containing keys that correspond to all features that have been both
registered _and_ requested. The value associated with each feature name key corresponds to that feature's availability
in the current environment. The object hash containing evaluated features is accessible via the `cache` export.

### Language Utilities

The core package provides several modules offering a number of langauge utilities.  Some of these are heavily based
on methods in the ES2015 proposal; others are additional APIs for commonly-performed tasks.

#### array

The `array` module contains analogues to the following ES2015 Array APIs:

* `copyWithin` - Copies a sequence of elements to another position in the given array
* `from` - Creates an `Array` from an array-like object
* `fill` - Fills some or all elements of an array with a given value
* `find` - Returns the first value in the array satisfying a given function
* `findIndex` - Returns the first index in the array whose value satisfies a given function
* `of` - Creates an `Array` with the given arguments as its elements

#### lang

The `lang` module contains various utility functions for tasks such as copying objects and creating late-bound
or partial applications of functions.

#### math

The `math` module contains analogues to a number of ES2015 APIs, including many trigonometric and logarithmic
functions.

#### string

The `string` module contains analogues to the following ES2015 String APIs:

* `codePointAt` - Returns the UTF-16 encoded code point value of a position in a string
* `endsWith` - Determines whether a string ends with the given substring
* `fromCodePoint` - Creates a string using the specified sequence of code points
* `includes` - Determines whether a string includes the given substring
* `repeat` - Returns a string containing a string repeated a given number of times
* `startsWith` - Determines whether a string begins with the given substring

Special thanks to Mathias Bynens for granting permission to adopt code from his
[`codePointAt`](https://github.com/mathiasbynens/String.prototype.codePointAt),
[`fromCodePoint`](https://github.com/mathiasbynens/String.fromCodePoint), and
[`repeat`](https://github.com/mathiasbynens/String.prototype.repeat) polyfills.

The `string` module also contains the following utility functions:

* `escapeRegExp` - Escapes a string to safely be included in regular expressions
* `escapeXml` - Escapes XML (or HTML) content in a string
* `padEnd` - Adds padding to the end of a string to ensure it is a certain length
* `padStart` - Adds padding to the beginning of a string to ensure it is a certain length

#### UrlSearchParams

The `UrlSearchParams` class can be used to parse and generate URL query strings.

### Promises and Asynchronous Operations

#### Promise

The `dojo-core/Promise` class is an implementation of the ES2015 Promise API that also includes static state inspection
and a `finally` method for cleanup actions.

`dojo-core/async` contains a number of classes and utility modules to simplify working with asynchronous operations.

#### Task

The `dojo-core/async/Task` class is an extension of `dojo-core/Promise` that provides cancelation support.

## How do I use this package?

Users will need to download and compile directly from the repository for the time being. Precompiled AMD/CommonJS modules will be provided in the near future as our release tools are improved.

## How do I contribute?

We appreciate your interest!  Please see the [Guidelines Repository](https://github.com/dojo/guidelines#readme) for the
Contributing Guidelines and Style Guide.

## Testing

Test cases MUST be written using Intern using the Object test interface and Assert assertion interface.

90% branch coverage MUST be provided for all code submitted to this repository, as reported by istanbul’s combined coverage results for all supported platforms.

## Licensing information

© 2004–2015 Dojo Foundation & contributors. [New BSD](http://opensource.org/licenses/BSD-3-Clause) license.

Some string functions (`codePointAt`, `fromCodePoint`, and `repeat`) adopted from polyfills by Mathias Bynens,
under the [MIT](http://opensource.org/licenses/MIT) license.

See [LICENSE](LICENSE) for details.
