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
import WidgetBase from '@dojo/framework/core/WidgetBase';
import { tsx } from '@dojo/framework/core/tsx';

import * as css from '../styles/MyWidget.m.css';

export default class MyWidget extends WidgetBase {
	protected render() {
		return <div classes={[css.root]}>My Widget</div>;
	}
}
```

## Making a widget themeable

-   Extending `ThemedMixin`
-   Applying the `@theme()` decorator to a widget's imported CSS modules
-   Wrapping CSS class names in calls to `this.theme()` when rendering to allow a [widget's default styles to be overridden by a theme](./supplemental.md#making-themeable-widgets)

> src/widgets/MyWidget.tsx

```tsx
import WidgetBase from '@dojo/framework/core/WidgetBase';
import ThemedMixin, { theme } from '@dojo/framework/core/mixins/Themed';
import { tsx } from '@dojo/framework/core/tsx';

import * as css from '../styles/MyWidget.m.css';

@theme(css)
export default class MyWidget extends ThemedMixin(WidgetBase) {
	protected render() {
		return <div classes={[this.theme(css.root)]}>My Widget</div>;
	}
}
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

-   Using the theme injector function, [`registerThemeInjector()`](./supplemental.md#making-themeable-applications), to automatically provide a custom theme to all themeable widgets in an application

> src/main.tsx

```tsx
import renderer from '@dojo/framework/core/vdom';
import { tsx } from '@dojo/framework/core/tsx';
import Registry from '@dojo/framework/core/Registry';
import { registerThemeInjector } from '@dojo/framework/core/mixins/Themed';

import myTheme from './themes/MyTheme/theme';
import App from './widgets/App';

const registry = new Registry();
registerThemeInjector(myTheme, registry);

const r = renderer(() => <App />);
r.mount({ registry });
```

## Changing the theme within an application

-   Using the [ThemeSwitcher utility widget](./supplemental.md#changing-the-currently-active-theme) to allow users to choose between available themes
-   Enacting a theme change via [`ThemeSwitcher`'s `updateTheme` method](./supplemental.md#themeswitcher-properties)
-   Used in combination with [`registerThemeInjector`](./supplemental.md#making-themeable-applications) to reactively propagate theme changes to all themeable widgets

> src/widgets/App.tsx

```tsx
import WidgetBase from '@dojo/framework/core/WidgetBase';
import ThemedMixin, { ThemeSwitcher, theme, UpdateTheme } from '@dojo/framework/core/mixins/Themed';
import { tsx } from '@dojo/framework/core/tsx';

import myTheme from '../themes/MyTheme/theme';
import alternativeTheme from '../themes/MyAlternativeTheme/theme';

class App extends ThemedMixin(WidgetBase) {
	protected render() {
		return (
			<ThemeSwitcher
				renderer={(updateTheme: UpdateTheme) => {
					return (
						<div>
							<button
								onclick={() => {
									updateTheme(myTheme);
								}}
							>
								Use Default Theme
							</button>
							<button
								onclick={() => {
									updateTheme(alternativeTheme);
								}}
							>
								Use Alternative Theme
							</button>
						</div>
					);
				}}
			/>
		);
	}
}
```
