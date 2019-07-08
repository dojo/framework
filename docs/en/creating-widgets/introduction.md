# Introduction

Dojo encourages writing modular, single-responsibility components known as **widgets**, which are designed to be composable and reusable across application codebases. Widgets can be wired together in a reactive manner to efficiently handle rendering updates based on changes to application state.

| Feature                  | Description                                                                                                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Reactive by design**   | Dojo widgets are designed around core reactive principles to ensure predictable, consistent behavior as state changes propagate through an application.                 |
| **Encapsulated widgets** | Create independent, encapsulated widgets that can be wired together in a variety of configuration to create complex and beautiful user interfaces.                      |
| **DOM abstractions**     | The framework provides suitable reactive abstractions that mean Dojo applications do not need to interact directly with an imperative DOM.                              |
| **Efficient rendering**  | Dojo's rendering system can detect changes to specific subtrees of a widget hierarchy, allowing efficient re-rendering of only the affected portions of an application. |
| **Enterprise-ready**     | Cross-cutting requirements such as internationalization, localization and theming are supported by default.                                                             |
