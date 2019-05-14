# Basic Usage

-   Overview of Dojo stores
    _ https://github.com/dojo/framework/blob/master/src/stores/README.md#overview
    _ https://github.com/dojo/framework/blob/master/src/stores/README.md#how-does-this-differ-from-redux
    _ global store
    _ type safe \* uni-directional data flow

## The Store

-   Overview
    _ one global store per application
    _ in general store data should be serializable \* special cases need special care

### Setting up a store

-   Creating and registering a store

## Updating stores

-   Overview

### Operations

-   https://github.com/dojo/framework/blob/master/src/stores/README.md#operations
-   JSON patch
    _ add
    _ remove
    _ replace
    _ test

### Commands

-   https://github.com/dojo/framework/blob/master/src/stores/README.md#commands
-   Overview
    _ functions with access to the store
    _ return patch operation(s) \* may be async
-   CommandRequest (Command API)
    _ at
    _ path
    _ get
    _ payload \* state object
-   creating commands
    _ command factory
    _ examples

### Processes

-   overview \* https://github.com/dojo/framework/blob/master/src/stores/README.md#processes
-   Combine commands into a single process
-   execute commands against a store
-   attach a middleware
    _ before commands
    _ useful for gating
    _ after commands
    _ useful for error handling

### Initial State

Example for setting up an application's initial state
https://github.com/dojo/framework/blob/master/src/stores/README.md#initial-state

## Widgets and Stores

### Container

-   Overview
    _ wraps a Widget
    _ has access to a store
    _ provides dependencies
    _ interfaces matches the widget
-   When should I use
    _ Containers are useful when a 1:1 mapping is desired
    _ Useful for connecting processes + store data

### StoreProvider

-   Overview
    _ has access to a store
    _ has its own renderer
    _ is usually encapsulated in a widget
    _ therefore can have a different interface
-   When should I use
    _ StoreProviders are more flexible than Containers
    _ Useful for encapsulating widgets
    _ Can do the same thing as Containers
    _ Can change the interface of a wrapped widget
