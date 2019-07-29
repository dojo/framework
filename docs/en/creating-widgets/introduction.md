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

# Basic usage

## Defining a widget

-   Using the [`create()` primitive](./supplemental.md#basic-widget-structure) to define a widget as a render function factory
-   Returning [virtual DOM nodes](./supplemental.md#working-with-the-vdom) that define the widget's structural representation, declared as [TSX syntax](./supplemental.md#tsx-support)

> src/widgets/MyWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';

const factory = create();

export default factory(function MyWidget() {
	return <div>Hello from a Dojo widget!</div>;
});
```

## Specifying widget properties

-   Making widgets more reusable by abstracting out [state](./supplemental.md#managing-state), configuration and [event handling](./supplemental.md#interactivity) via a [typed properties interface](./supplemental.md#intermediate-passing-widget-properties)
-   Providing [middleware](../middleware/introduction.md) to widgets via their `create` factory
-   Specifying [node `key`s](./supplemental.md#vdom-node-keys) to differentiate between sibling elements of the same type - here, two `div` elements. This allows the framework to more efficiently target only the relevant elements when updating the DOM as a result of an application state change

> src/widgets/Greeter.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import icache from '@dojo/framework/core/middleware/icache';

const factory = create({ icache }).properties<{
	name: string;
	onNameChange?(newName: string): void;
}>();

export default factory(function Greeter({ middleware: { icache }, properties }) {
	const { name, onNameChange } = properties();
	let newName = icache.get<string>('new-name') || '';
	return (
		<div>
			<div key="appBanner">Welcome to a Dojo application!</div>
			{name && <div key="nameBanner">Hello, {name}!</div>}
			<label for="nameEntry">What's your name?</label>
			<input
				id="nameEntry"
				type="text"
				value={newName}
				oninput={(e: Event) => {
					icache.set('new-name', (e.target as HTMLInputElement).value);
				}}
			/>
			<button
				onclick={() => {
					icache.set('new-name', undefined);
					onNameChange && onNameChange(newName);
				}}
			>
				Set my name
			</button>
		</div>
	);
});
```

## Composing widgets

-   Defining a hierarchy of widgets that combine to implement more complex application requirements
-   Providing state and event handler [properties](./supplemental.md#node-properties) to child widgets
-   Making use of [`icache` middleware](../middleware/supplemental.md#icache) to manage state and invalidate/re-render affected widgets when the state is changed

> src/widgets/NameHandler.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import icache from '@dojo/framework/core/middleware/icache';

import Greeter from './Greeter';

const factory = create({ icache });

export default factory(function NameHandler({ middleware: { icache } }) {
	let currentName = icache.get<string>('current-name') || '';
	return (
		<Greeter
			name={currentName}
			onNameChange={(newName) => {
				icache.set('current-name', newName);
			}}
		/>
	);
});
```

## Rendering to the DOM

-   Using the framework's `renderer` to mount a widget hierarchy into the DOM
-   Optionally allowing [more control](./supplemental.md#mountoptions-properties) over where Dojo applications appear in a page, for progressive adoption of smaller subcomponents or even to support multiple applications/frameworks within a single page

> src/main.tsx

```tsx
import renderer, { tsx } from '@dojo/framework/core/vdom';

import NameHandler from './widgets/NameHandler';

const r = renderer(() => <NameHandler />);
r.mount();
```
