# Basic Usage

## Styling a widget

For a given application (this will be relevant in later examples when specifying [widget theme keys](./supplemental.md#widget-theme-keys)):

> package.json

```json
{
	"name": "my-app"
}
```

Defining [per-widget CSS modules](./supplemental.md#structural-widget-styling):

> src/styles/MyWidget.m.css

```css
.root {
	font-family: sans-serif;
}
```

> src/widgets/MyWidget.tsx

```tsx
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import { tsx } from '@dojo/framework/widget-core/tsx';

import * as css from '../styles/MyWidget.m.css';

export default class MyWidget extends WidgetBase {
	protected render() {
		return <div classes={[css.root]}>My Widget</div>;
	}
}
```

## Making a widget themeable

Extending `ThemedMixin`, applying the `@theme()` decorator to a widget's imported CSS modules, and wrapping CSS class names in calls to `this.theme()` when rendering to allow a [widget's default styles to be overridden by a theme](./supplemental.md#making-themeable-widgets):

> src/widgets/MyWidget.tsx

```tsx
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import ThemedMixin, { theme } from '@dojo/framework/widget-core/mixins/Themed';
import { tsx } from '@dojo/framework/widget-core/tsx';

import * as css from '../styles/MyWidget.m.css';

@theme(css)
export default class MyWidget extends ThemedMixin(WidgetBase) {
	protected render() {
		return <div classes={[this.theme(css.root)]}>My Widget</div>;
	}
}
```

## Creating a theme

Overriding a default CSS class that a widget uses with [custom theme properties](./supplemental.md#working-with-themes):

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

Importing a central `variables.css` regular CSS file that defines [CSS custom properties](./supplemental.md#css-custom-properties), then referring to the custom properties via `var()`:

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

Using the theme injector function, [`registerThemeInjector()`](./supplemental.md#making-themeable-applications), to automatically provide a custom theme to all themeable widgets in an application:

> src/main.tsx

```tsx
import renderer from '@dojo/framework/widget-core/vdom';
import { tsx } from '@dojo/framework/widget-core/tsx';
import Registry from '@dojo/framework/widget-core/Registry';
import { registerThemeInjector } from '@dojo/framework/widget-core/mixins/Themed';

import myTheme from './themes/MyTheme/theme';
import App from './widgets/App';

const registry = new Registry();
registerThemeInjector(myTheme, registry);

const r = renderer(() => <App />);
r.mount({ registry });
```

## Changing the theme within an application

Using the [ThemeSwitcher utility widget](./supplemental.md#changing-the-currently-active-theme) to allow users to choose between available themes, and enact a theme change via [`ThemeSwitcher`'s `updateTheme` method](./supplemental.md#themeswitcher-properties). This should be used together with [`registerThemeInjector`](./supplemental.md#making-themeable-applications) to reactively propagate theme changes to all themeable widgets.

> src/widgets/App.tsx

```tsx
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import ThemedMixin, { ThemeSwitcher, theme, UpdateTheme } from '@dojo/framework/widget-core/mixins/Themed';
import { tsx } from '@dojo/framework/widget-core/tsx';

import myTheme from '../themes/MyTheme/theme';
import alternativeTheme from '../themes/MyAlternativeTheme/theme';

import * as css from '../styles/App.m.css';

@theme(css)
class App extends ThemedMixin(WidgetBase) {
	protected render() {
		return (
			<div classes={[this.theme(css.container)]}>
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
			</div>
		);
	}
}
```
