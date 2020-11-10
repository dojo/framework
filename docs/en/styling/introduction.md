# Introduction

As an HTML-based technology, Dojo makes use of CSS for styling elements across the framework and for applications developed with it.

Dojo promotes encapsulated structural styling of individual widgets for maximum reuse, as well as simplified presentational theming across all widgets within an application. This pattern gives users a predictable way to style and theme their applications, even when using a mixture of widgets from [Dojo's `@dojo/widgets` library](https://github.com/dojo/widgets), a third-party provider, or any that may be developed in-house for a particular application.

| Feature                                   | Description                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Per-widget stylesheets**                | [CSS Modules](https://github.com/css-modules/css-modules) can be used to define stylesheets that are scoped to individual widgets, avoiding potential cross-contamination and style name clashes. A widget can refer to its exact CSS class names via typed CSS module imports and IDE autocompletion.                                                                                                 |
| **Robust theming support**                | Themeable widgets can easily be developed that allow for simplified and centralized whole-application theming, as well as single-instance, targeted style tweaking and overriding, if required. [CLI tooling is available](https://github.com/dojo/cli-build-theme) to support distributing custom themes.                                                                                             |
| **Reactive theme change response**        | Similar to other reactive state changes within a Dojo application, only the affected widgets will be re-rendered when a theme change is made at either a widget level or across an entire application.                                                                                                                                                                                                 |
| **CSS properties**                        | CSS modules can use [CSS custom properties and `var()`](https://www.w3.org/TR/css-variables/) to utilise theme variant properties and colours.                                                                                                                                                                                                                                                         |
| **Simplified third-party widget theming** | Applications can easily extend their themes to cover third-party widgets, such as those from Dojo's native [widget library](https://github.com/dojo/widgets), and Dojo also provides [out-the-box themes](https://github.com/dojo/themes) which applications can base their own on. [CLI tooling is available](https://github.com/dojo/cli-create-theme) to streamline theme creation and composition. |

## Basic usage

> **Note:** The following examples build upon each other in a linear order. Individual examples are kept brief to only highlight relevant changes from any previous examples.

These examples assume an application with the following name:

> package.json

```json
{
	"name": "my-app"
}
```

The application name becomes relevant when specifying [widget theme keys](/learn/styling/working-with-themes#widget-theme-keys).

### Styling a widget

-   Defining a [CSS module](/learn/styling/styling-and-theming-in-dojo#structural-widget-styling) for a widget
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

### Making a widget themeable

-   Inject the `theme` middleware
-   Using `theme.classes` to return the themed css class name, which allows a [widget's default styles to be overridden by a theme](/learn/styling/theming-a-dojo-application#making-themeable-widgets)

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

### Using a theme variant within a widget

-   Set the `theme.variant` class on the widget's `root`.
-   css-properties get applied at the correct DOM level and do not leak out of the widget's DOM.

> src/widgets/MyWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import theme from '@dojo/framework/core/middleware/theme';

import * as css from '../styles/MyWidget.m.css';

const factory = create({ theme });

export default factory(function MyWidget({ middleware: { theme } }) {
	const { root } = theme.classes(css);
	const variantRoot = theme.variant();
	return <div classes={[root, variantRoot]}>My Widget</div>;
});
```

### Creating a theme

-   Overriding a widget's default CSS class with custom theme style properties
-   Linking one or more overrides via the appropriate [widget theme keys](/learn/styling/working-with-themes#widget-theme-keys) into a [theme structure](/learn/styling/working-with-themes)

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

### Creating theme variants

-   Placing theme variables into a `variant` module as [CSS custom properties](/learn/styling/styling-and-theming-in-dojo#css-custom-properties)
-   Referring to the custom properties via `var()`
-   Not relying on local variables or a common `variables.css` file.

> src/themes/variants/default.m.css

```css
/* single root class */
.root {
	--foreground: hotpink;
	--background: slategray;
}
```

> src/themes/MyTheme/MyWidget.m.css

```css
.root {
	color: var(--foreground);
	background-color: var(--background);
}
```

> src/themes/MyTheme/index.tsx

```tsx
import * as defaultVariant from './variants/default.m.css';
import * as myWidgetCss from './MyWidget.m.css';

export default {
	theme: {
		'my-app/MyWidget': myWidgetCss
	},
	variants: {
		default: defaultVariant
	}
};
```

### Specifying a default application theme

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

### Setting the theme variant

If using a theme with `variants`, the `default` variant will be selected automatically. Use the `theme.set` function to set a different variant - the variant name passed must be a key of the theme's exported `variants`.

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import theme from '@dojo/framework/core/middleware/theme';

import myTheme from '../themes/MyTheme/theme';

const factory = create({ theme });

export default factory(function App({ middleware: { theme }}) {
	// if the theme isn't set, set the default theme
	if (!theme.get()) {
		theme.set(myTheme, 'variant-name');
	}
	return (
		// the application's widgets
	);
});
```

### Changing the theme within an application

-   Using the [`theme` middleware](/learn/styling/theming-a-dojo-application#changing-the-currently-active-theme) to allow users to choose between available themes

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
