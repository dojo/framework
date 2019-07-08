# Basic Usage

## Defining a widget

-   Using the [`create()` primitive](./supplemental.md#basic-widget-structure) to define a widget as a render function factory
-   Returning virtual DOM nodes that define the widget's structural representation, declared as [TSX syntax](./supplemental.md#tsx-support)

> src/widgets/MyWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';

const renderFactory = create();

export const MyWidget = renderFactory(() => <div>Hello from a Dojo widget!</div>);

export default MyWidget;
```

## Specifying widget properties

-   Abstracting out widget [state](./supplemental.md#managing-state), configuration and [event handling](./supplemental.md#interactivity) via a [typed properties interface](./supplemental.md#intermediate-passing-widget-properties), allowing for greater component re-use and supporting reactive data propagation

> src/widgets/NameChanger.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';

const renderFactory = create().properties<{
	name: string;
	onNameChange?(newName: string): void;
}>();

export const NameChanger = renderFactory(({ properties: { name, onNameChange } }) => {
	let newName: string = '';

	return (
		<div>
			<span>Hello, {name}! Not you? Set your name:</span>
			<input
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
				Set new name
			</button>
		</div>
	);
});

export default NameChanger;
```

## Composing widgets

-   Defining a widget hierarchy, facilitated through modular and reusable components, in order to implement more complex application requirements
-   Making use of [`invalidator` middleware](../middleware/supplemental.md#invalidator) to flag when a widget is dirty and requires a re-render

> src/widgets/NameHandler.tsx

```tsx
import { create, tsx, invalidator } from '@dojo/framework/core/vdom';

import NameChanger from './NameChanger';

const renderFactory = create({ invalidator });

let currentName: string = 'Alice';

export const NameHandler = renderFactory(({ middleware: { invalidator } }) => (
	<NameChanger
		name={currentName}
		onNameChange={(newName) => {
			currentName = newName;
			invalidator();
		}}
	/>
));

export default NameHandler;
```

## Rendering to the DOM

-   Tieing a widget hierarchy to its concrete representation within a webpage
-   Optionally allowing [more control](./supplemental.md#mountoptions-properties) over where Dojo applications appear in a page, for progressive adoption or even to support multiple applications/frameworks within a single page

> src/main.tsx

```tsx
import renderer, { tsx } from '@dojo/framework/core/vdom';

import NameHandler from './widgets/NameHandler';

const r = renderer(() => <NameHandler />);
r.mount();
```
