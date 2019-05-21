# Introduction

Dojo stores is a predictable, consistent state container with built-in support for common patterns.

This package provides a centralized store designed to be the single source of truth for an application. It operates using uni-directional data flow. This means all application data follows the same lifecycle, ensuring the application logic is predictable and easy to understand.

| Feature                   | Description                                                          |
| ------------------------- | -------------------------------------------------------------------- |
| global data store         | application state is stored globally in a single source of truth     |
| uni-directional data flow | predictable and global application state management                  |
| type safe                 | access and modification of state is protected by interfaces          |
| asynchronous support      | async commands supported out-of-the-box                              |
| middleware                | before and after operations, error handling, and data transformation |
| widget integration        | tools and patterns for integrating with Dojo widgets                 |
| operations                | encapsulated, well-defined state modifications                       |
