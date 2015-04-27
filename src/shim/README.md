# Dojo 2 core [![Build Status](https://travis-ci.org/dojo/dojo2.png)](https://travis-ci.org/sitepen/core)

## Modules

### core/lang

### core/async

`core/async` contains a number of classes and utility modules to simplify working with asynchronous operations.

#### Promise

The `Promise` class extends `dojo-core/Promise` with several new features, including static state inspection, cancelation support, and a `finally` method for easy cleanup.

### core/has

Using the latest Web technologies isn't always as straight forward as developers would like due to differing support across browsers. `core/has` provides a simple feature detection API that makes it easy to detect which browsers support which features.

This module is lazily instantiated. Code that determines if the feature is detected is not executed until the feature is actually requested. The return value is then cached for future calls for the same feature.

#### Detecting Features

`core/has` returns a function that accepts a single parameter: the name of the feature to test for. If the feature is available, a truthy value is returned, otherwise a falsy value is returned:

```js
if (has('add-eventlistener')) {
    element.addEventListener('click', function () { /* ... */ })
}
```

#### Adding Feature Detections

It's important to be able to add new feature tests that aren't provided out-of-the-box by `core/has`.This can be done easily by using the `has.add` function. It accepts two parameters: the name of the feature and either a boolean value indicating its availability or a function that resolves to a truthy or falsy value:

```js
has.add('queryselector', 'querySelector' in document && 'querySelectorAll' in document);

// Lazily executed; useful if a polyfill is loaded after page load
has.add('typedarray', function () {
    return 'ArrayBuffer' in window;
});

```

#### Accessing the Feature Cache

`core/has` maintains an object containing keys that correspond to all features that have been both registered _and_ requested. The value associated with each feature name key corresponds to that feature's availability in the current browser. This object is accessed via `has.cache`.

## How do I use this package?

Users will need to download and compile directly from the repository for the time being. Precompiled AMD modules will be provided in the near future as our release tools are improved.

## How do I contribute?

1. [Open an issue](https://github.com/sitepen/core/issues) for the work you are going to do.
2. Sign the [Dojo Foundation Contributor License Agreement](http://dojofoundation.org/about/claForm).
   You only need to do this once to contribute to all Dojo Foundation projects.
3. Submit a pull request!

## Licensing information

© 2004–2015 Dojo Foundation & contributors. [New BSD](http://opensource.org/licenses/BSD-3-Clause) license.
