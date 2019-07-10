# Basic Usage

> **Note:** The following examples build upon each other in a linear order. Individual examples are kept brief to only highlight relevant changes from any previous examples.

These examples assume an application with the following name:

> package.json

```json
{
	"name": "my-app"
}
```

The application name becomes relevant when specifying [widget theme keys](./supplemental.md#widget-theme-keys).

## Styling a widget

-   Defining a [CSS module](./supplemental.md#structural-widget-styling) for a widget
-   Using the corresponding typed style classes within the widget's TypeScript code

> src/styles/MyWidget.m.css

```css
.root {
	font-family: sans-serif;
}
```

> src/widgets/MyWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';

import * as css from '../styles/MyWidget.m.css';

const factory = create();

export default factory(function MyWidget() {
	return <div classes={[css.root]}>My Widget</div>;
});
```

## Making a widget themeable

-   Inject the `theme` middleware
-   Using `theme.classes` to return the themed css class name, whidh allows a [widget's default styles to be overridden by a theme](./supplemental.md#making-themeable-widgets)

> src/widgets/MyWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import theme from '@dojo/framework/core/middleware/theme';

import * as css from '../styles/MyWidget.m.css';

const factory = create({ theme });

export default factory(function MyWidget({ middleware: { theme } }) {
	const { root } = theme.classes(css);
	return <div classes={[root]}>My Widget</div>;
});
```

## Creating a theme

-   Overriding a widget's default CSS class with custom theme style properties
-   Linking one or more overrides via the appropriate [widget theme keys](./supplemental.md#widget-theme-keys) into a [theme structure](./supplemental.md#working-with-themes)

> src/themes/MyTheme/MyWidget.m.css

```css
.root {
	color: hotpink;
	background-color: slategray;
}
```

> src/themes/MyTheme/theme.ts

```ts
import * as myWidgetCss from './MyWidget.m.css';

export default {
	'my-app/MyWidget': myWidgetCss
};
```

## Abstracting common theme properties

-   Importing a central `variables.css` regular CSS file that defines [CSS custom properties](./supplemental.md#css-custom-properties)
-   Referring to the custom properties via `var()`

> src/themes/variables.css

```css
:root {
	--foreground: hotpink;
	--background: slategray;
}
```

> src/themes/MyTheme/MyWidget.m.css

```css
@import '../variables.css';

.root {
	color: var(--foreground);
	background-color: var(--background);
}
```

## Specifying a default application theme

The `theme` middleware can be used to set the application theme. To set a "default" or initial theme, the `theme.set` function can be used with the `theme.get` function to determine if the theme needs to be set. Setting the default theme should be done in the application's top level widget.

> src/App.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import theme from '@dojo/framework/core/middleware/theme';

import myTheme from '../themes/MyTheme/theme';

const factory = create({ theme });

export default factory(function App({ middleware: { theme }}) {
	// if the theme isn't set, set the default theme
	if (!theme.get()) {
		theme.set(myTheme);
	}
	return (
		// the application's widgets
	);
});
```

**Note:** When using both function-based and class-based widgets, the theme needs to be registered with the application registry. This is true when using any class-based widget dependencies such as `@dojo/widgets`. Please see the [class-based theming section]() for more details.

## Changing the theme within an application

-   Using the [`theme` middleware](./supplemental.md#changing-the-currently-active-theme) to allow users to choose between available themes

> src/widgets/ThemeSwitcher.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import theme from '@dojo/framework/core/middleware/theme';

import myTheme from '../themes/MyTheme/theme';
import alternativeTheme from '../themes/MyAlternativeTheme/theme';

const factory = create({ theme });

export default factory(function ThemeSwitcher({ middleware: { theme } }) {
	return (
		<div>
			<button
				onclick={() => {
					theme.set(myTheme);
				}}
			>
				Use Default Theme
			</button>
			<button
				onclick={() => {
					theme.set(alternativeTheme);
				}}
			>
				Use Alternative Theme
			</button>
		</div>
	);
});
```
