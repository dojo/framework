# Basic Usage

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
-   Specifying [node `key`s](./supplemental.md##vdom-node-keys) to differentiate between sibling elements of the same type - here, two `div` elements. This allows the framework to more efficiently target only the relevant elements when updating the DOM as a result of an application state change.

> src/widgets/Greeter.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';

const factory = create().properties<{
	name: string;
	onNameChange?(newName: string): void;
}>();

export default factory(function Greeter({ properties: { name, onNameChange } }) {
	let newName: string = '';

	return (
		<div>
			<div key="appBanner">Welcome to a Dojo application!</div>
			{name && <div key="nameBanner">Hello, {name}!</div>}
			<label for="nameEntry">What's your name?</label>
			<input
				id="nameEntry"
				type="text"
				oninput={(e: Event) => {
					newName = (e.target as HTMLInputElement).value;
				}}
			/>
			<button
				onclick={() => {
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
-   Making use of [`invalidator` middleware](../middleware/supplemental.md#invalidator) to flag when a widget is dirty and requires a re-render

> src/widgets/NameHandler.tsx

```tsx
import { create, tsx, invalidator } from '@dojo/framework/core/vdom';

import Greeter from './Greeter';

const factory = create({ invalidator });

let currentName: string;

export default factory(function NameHandler({ middleware: { invalidator } }) {
	return (
		<Greeter
			name={currentName}
			onNameChange={(newName) => {
				currentName = newName;
				invalidator();
			}}
		/>
	);
});
```

## Rendering to the DOM

-   Connecting a widget hierarchy to its concrete representation within a webpage
-   Optionally allowing [more control](./supplemental.md#mountoptions-properties) over where Dojo applications appear in a page, for progressive adoption of smaller subcomponents or even to support multiple applications/frameworks within a single page

> src/main.tsx

```tsx
import renderer, { tsx } from '@dojo/framework/core/vdom';

import NameHandler from './widgets/NameHandler';

const r = renderer(() => <NameHandler />);
r.mount();
```
