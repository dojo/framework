# Basic Usage

## Creating middleware

-   Defining middleware via the same `create()` primitive used for defining function-based widgets
-   Optionally defining a properties interface that augments the properties interface of widgets that compose the middleware. Property values are given when creating instances of the composing widgets.
-   Returning a simple function reference that defines the middleware's API that other composing widgets or middleware can interact with

> src/middleware/myMiddleware.ts

```ts
import { create } from '@dojo/framework/core/vdom';

const factory = create().properties<{ middlewareProp?: boolean }>();

export const myMiddleware = factory(({ properties }) => {
	return () => {
		return properties.middlewareProp ? 'Conditional is true' : 'Conditional is false';
	};
});

export default myMiddleware;
```

## Composing middleware

-   Combining middleware and returning an object to expose a more complex API
-   Using the core [`invalidator`](./supplemental.md#invalidator) middleware to flag the composing widget as requiring re-rendering

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

## Using middleware within a widget

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
