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

## Promises and Asynchronous Operations

`dojo-core/Promise` implements an extensible, ES2015-compatible Promise shim,
which includes state reporting and a `finally` method.

`dojo-core/async` contains a number of utilities to simplify working with asynchronous operations.

## How do I use this package?

Users will need to download and compile directly from the repository for the time being. Precompiled AMD/CommonJS modules will be provided in the near future as our release tools are improved.

## How do I contribute?

We appreciate your interest!  Please see the [contributing guidelines](CONTRIBUTING.md).

## Testing

Test cases MUST be written using Intern using the Object test interface and Assert assertion interface.

90% branch coverage MUST be provided for all code submitted to this repository, as reported by istanbul’s combined coverage results for all supported platforms.

## Licensing information

© 2004–2015 Dojo Foundation & contributors. [New BSD](http://opensource.org/licenses/BSD-3-Clause) license.
