# @dojo/framework

[![Build Status](https://travis-ci.org/dojo/framework.svg?branch=master)](https://travis-ci.org/dojo/framework)
[![codecov](https://codecov.io/gh/dojo/framework/branch/master/graph/badge.svg)](https://codecov.io/gh/dojo/framework)
[![npm version](https://badge.fury.io/js/%40dojo%2Fframework.svg)](https://badge.fury.io/js/%40dojo%2Fframework)
[![Join the chat at https://discordapp.com/invite/M7yRngE](https://img.shields.io/discord/471607790213922816.svg?logo=discord)](https://discordapp.com/invite/M7yRngE)

Dojo is a progressive framework for modern web applications built with TypeScript.

Visit us at [dojo.io](https://dojo.io/) for documentation, tutorials, cookbooks, and other materials. This repository contains detailed information on the structure of Dojo, while `dojo.io` is focused on getting started with and learning Dojo.

## Sub-packages within `@dojo/framework`

There are eight sub-packages that form the framework for building a Dojo application:

* [`dojo/core`](src/core/README.md) - The foundational code of the Dojo platform
* [`dojo/has`](src/has/README.md) - A feature detection library
* [`dojo/i18n`](src/i18n/README.md) - A set of internationalization tooling
* [`dojo/routing`](src/routing/README.md) - A routing service to build web applications with
* [`dojo/shim`](src/shim/README.md) - Modules that provide fills of ES6+ functionality
* [`dojo/stores`](src/stores/README.md) - A lightweight state container
* [`dojo/widget-core`](src/widget-core/README.md) - The foundation code of Dojo widgets
* [`dojo/testing`](src/testing/README.md) - A set of modules to help with testing Dojo

## External packages

We have additional packages within the Dojo ecosystem to aid in quickly and easily creating Dojo apps:

* [`dojo/interop`](https://github.com/dojo/interop) - Interoperability with other frameworks (currently Dojo 1 Dijits and Redux)
* [`dojo/loader`](https://github.com/dojo/loader) - A TypeScript based AMD loader
* [`dojo/themes`](https://github.com/dojo/themes) - Collection of Dojo themes.
* [`dojo/widgets`](https://github.com/dojo/widgets) - A set of rich UI elements

### Dojo CLI

* [`dojo/cli`](https://github.com/dojo/cli) - Command Line Tooling for Dojo Applications
* [`dojo/cli-build-app`](https://github.com/dojo/cli-build-app) - A CLI command for building Dojo applications
* [`dojo/cli-build-widget`](https://github.com/dojo/cli-build-widget) - A CLI command for building widgets
* [`dojo/cli-create-app`](https://github.com/dojo/cli-create-app) - Command for creating application boilerplates
* [`dojo/cli-create-theme`](https://github.com/dojo/cli-create-theme) - Command for scaffolding a widget theme
* [`dojo/cli-create-widget`](https://github.com/dojo/cli-create-widget) - Command for creating a widget template and all associated boilerplate
* [`dojo/cli-test-intern`](https://github.com/dojo/cli-test-intern) - Command for testing projects with [Intern](https://theintern.github.io)

### Support Packages

There are several packages which are designed to support the Dojo platform.  Generally these packages are not directly used by end developers:

* [`dojo/scripts`](https://github.com/dojo/scripts) - A package of scripts to aid with Dojo package development.
* [`dojo/webpack-contrib`](https://github.com/dojo/webpack-contrib) - Specialized webpack loaders and plugins used by the Dojo toolchain.


## Migrating Versions

### Version 2.x to 3.x Migration Guide

See the [v3 migration guide](./docs/V3-Migration-Guide.md) for details on upgrading from version 2.x to version 3.x.

### Version 3.x to 4.x Migration Guide

See the [v4 migration guide](./docs/V4-Migration-Guide.md) for details on upgrading from version 3.x to version 4.x.

### Version 4.x to 5.x Migration Guide

See the [v5 migration guide](./docs/V5-Migration-Guide.md) for details on upgrading from version 4.x to version 5.x.

### Examples

We have added a repository of examples which have been built on Dojo.  Those examples are available
in the [dojo/examples](https://github.com/dojo/examples) repository and are _live_ at [dojo.github.io/examples](https://dojo.github.io/examples).

## Guidelines and Style Guide

There are several documents that are relevant for contributing to Dojo.

* [Contributing Guidelines](CONTRIBUTING.md) - Guidelines for contributing code (or documentation) to Dojo
* [Code Of Conduct](CODE_OF_CONDUCT.md) - Guidelines for participation in all Dojo OSS communities.
* [Style Guide](STYLE.md) - The style guide for Dojo for packages that do not use [prettier](https://prettier.io)
* [tslint.json](https://github.com/dojo/dojo2-package-template/blob/master/tslint.json) - The configuration file [tslint](https://palantir.github.io/tslint/) that is used to validate Dojo code against

## Dependent Technologies

While Dojo tries to provide a holistic set of tools to build web applications, there are several key technologies where we feel that Dojo would be better integrating and building upon versus building from the ground up.

In order to ensure that Dojo is a solid set of JavaScript tools and libraries, Dojo is built on [TypeScript](https://www.typescriptlang.org/).  This provides us with structural design time typing as well as an effective way to communicate the intent of the Dojo APIs.  It also provides us the ability to adopt ES6+ syntax features but make distributables that will be backwards compatible to the target browsers for Dojo.

### TypeScript and Dojo Compatibility Matrix

TypeScript and Dojo both iterate rapidly. In general Dojo strives for maximum compatibility, with a plan to periodically increase the minimum TypeScript version so we can begin relying on newer TypeScript features. Please review this list when using Dojo:

|Dojo version|TypeScript version (minimum)|TypeScript version (maximum)|
|-------|---------|-------------|
|3.0|2.6.x|2.6.x|
|4.0|2.6.x|3.1.x|
|5.0|2.6.x|3.2.x|

## Licensing information

© 2018 [JS Foundation](https://js.foundation/) & contributors. [New BSD](http://opensource.org/licenses/BSD-3-Clause) license.
