# Introduction

Dojo's **middleware** system provides a way to manage asynchronous or imperative APIs in a reactive way, as well as influence behavior and the property API of any composing function-based widgets or other middleware.

Several core and optional middleware are provided by the framework, however, application developers can easily write their own.

| Feature                                        | Description                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Reactive DOM access**                        | Via middleware, function-based widgets can work with concrete information and APIs from the sections of the DOM corresponding to their output nodes.                                                                                                                                                                           |
| **Widget render lifecycle control**            | Middleware can control the portions of Dojo's rendering pipeline for any composing widgets, such as invalidating widgets when they require a rendering update. Widget rendering can also be paused and resumed, allowing for short-circuiting of the render output while waiting for critical information to become available. |
| **A variety of framework-provided middleware** | Dojo provides optional middleware that allow widgets to implement a range of functionality such as responding to and controlling focus, simple value caching, responding to element intersection and resize events, CSS theming, internationalization and build-time rendering amongst others.                                 |
| **Easy composition and re-use**                | The middleware design is closely aligned with function-based widgets, allowing consistent composition within a widget hierarchy as well as re-use when developing custom middleware.                                                                                                                                           |

## Basic usage

### Creating middleware

-   Defining middleware via the same `create()` primitive used for defining function-based widgets
-   Optionally defining a properties interface that augments the properties interface of widgets that compose the middleware. Property values are given when creating instances of the composing widgets.
-   Returning a simple function reference that defines the middleware's API that other composing widgets or middleware can interact with

> src/middleware/myMiddleware.ts

```ts
import { create } from '@dojo/framework/core/vdom';

const factory = create().properties<{ middlewareProp?: boolean }>();

export const myMiddleware = factory(({ properties }) => {
	return () => {
		return properties().middlewareProp ? 'Conditional is true' : 'Conditional is false';
	};
});

export default myMiddleware;
```

### Composing middleware

-   Combining middleware and returning an object to expose a more complex API
-   Using the core [`invalidator`](/learn/middleware/core-render-middleware#invalidator) middleware to flag the composing widget as requiring re-rendering

> src/middleware/myComposingMiddleware.ts

```ts
import { create, invalidator } from '@dojo/framework/core/vdom';
import myMiddleware from './myMiddleware';

const factory = create({ myMiddleware, invalidator });

export const myComposingMiddleware = factory(({ middleware: { myMiddleware, invalidator } }) => {
	return {
		get() {
			return myMiddleware();
		},
		set() {
			invalidator();
		}
	};
});

export default myComposingMiddleware;
```

### Using middleware within a widget

-   Augmenting the widget's properties interface with additional properties from any middleware used
-   Passing in middleware properties when using widgets that compose them

> src/widgets/MyWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import myComposingMiddleware from '../middleware/myComposingMiddleware';

const factory = create({ myComposingMiddleware });

export default factory(function MyWidget({ properties, middleware: { myComposingMiddleware } }) {
	return (
		<virtual>
			<div>{`Middleware property value: ${properties.middlewareProp}`}</div>
			<div>{`Middleware usage: ${myComposingMiddleware.get()}`}</div>
		</virtual>
	);
});
```

> src/main.tsx

```tsx
import renderer, { tsx } from '@dojo/framework/core/vdom';
import MyWidget from './widgets/MyWidget';

const r = renderer(() => <MyWidget middlewareProp={true} />);
r.mount();
```
