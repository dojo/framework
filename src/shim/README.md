# @dojo/shim

[![Build Status](https://travis-ci.org/dojo/shim.svg?branch=master)](https://travis-ci.org/dojo/shim)
[![codecov](https://codecov.io/gh/dojo/shim/branch/master/graph/badge.svg)](https://codecov.io/gh/dojo/shim)
[![npm version](https://badge.fury.io/js/@dojo/shim.svg)](http://badge.fury.io/js/@dojo/shim)

This package provides functional shims for ECMAScript.

It is targeted at providing function shims for ECMAScript 6 and beyond targeted at ECMAScript 5.  It is different
other solutions of shimming or polyfilling functionality, in that it does not provide the functionality via
augmenting the built in classes in the global namespace.

The one exception to this though is the `Symbol` functionality, in that the well-known symbols need to be located
off of the global `Symbol` object in order to ensure that the correct symbol is referenced.

**WARNING** This is *beta* software.  While we do not anticipate significant changes to the API at this stage, we may feel the need to do so.  This is not yet production ready, so you should use at your own risk.

## Features

TODO: Add sections on features of this package

### Data Structures

#### Map

The [`@dojo/shim/Map` class](docs/Map.md) is an implementation of the ES2015 Map specification
without iterators for use in older browsers.

#### WeakMap

The `@dojo/shim/WeakMap` class is an implementation of the ES2015 WeakMap specification
without iterators for use in older browsers. The main difference between WeakMap and Map
is that WeakMap's keys can only be objects and that the store has a weak reference
to the key/value pair. This allows for the garbage collector to remove pairs.

Look at [Map](docs/Map.md) for more information on how to use WeakMap.


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

© 2004–2016 Dojo Foundation & contributors. [New BSD](http://opensource.org/licenses/BSD-3-Clause) license.

