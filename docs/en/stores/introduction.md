# Introduction

Dojo stores is a predictable, consistent state container with built-in support for common patterns.

This package provides a centralized store designed to be the single source of truth for an application. It operates using uni-directional data flow. This means all application data follows the same lifecycle, ensuring the application logic is predictable and easy to understand.

| Feature                   | Description                                                          |
| ------------------------- | -------------------------------------------------------------------- |
| global data store         | Application state is stored globally in a single source of truth     |
| uni-directional data flow |                                                                      |
| type safe                 | access and modification of state is protected by interfaces          |
| asynchronous support      | async commands supported out-of-the-box                              |
| middleware                | before and after operations, error handling, and data transformation |
| widget integration        | tools and patterns for integrating with Dojo widgets                 |

<!-- TODO more features? Clean up descriptions above.
Dojo stores have the benefit of using JSON Patch to ensure the underlying data is appropiately updated (as opposed to reducers that rely on the user to properly clone. So how do I say that?

-   immutable data patterns
-   no access to underlying data means no mistakes
-->
