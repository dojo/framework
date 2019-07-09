# Introduction

Dojo encourages writing simple, modular components known as **widgets** which implement single responsibilities out of the wider requirements of an application. Widgets are designed to be composable and reusable across a variety of scenarios, and can be wired together in a reactive manner to form more complex web application requirements.

Widgets describe their intended structural representation through virtual nodes returned from their rendering functions. Dojo's rendering system then handles ongoing translation of a widget hierarchy's render output to targeted, efficient DOM updates during application runtime.

| Feature                  | Description                                                                                                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Reactive by design**   | Dojo widgets are designed around core reactive principles to ensure predictable, consistent behavior as state changes propagate through an application.                                                 |
| **Encapsulated widgets** | Create independent, encapsulated widgets that can be wired together in a variety of configurations to create complex and beautiful user interfaces.                                                     |
| **DOM abstractions**     | The framework provides suitable reactive abstractions that mean Dojo applications do not need to interact directly with an imperative DOM.                                                              |
| **Efficient rendering**  | Dojo's rendering system can detect state changes within specific subtrees of a widget hierarchy, allowing efficient re-rendering of only the affected portions of an application when an update occurs. |
| **Enterprise-ready**     | Cross-cutting application requirements such as internationalization, localization and theming can easily be added to user-created widgets.                                                              |
