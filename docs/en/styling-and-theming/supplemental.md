# Styling & Theming in Dojo

Dojo widgets function best as simple components that each handle a single responsibility. They should be as encapsulated and modular as possible to promote reusability while avoiding conflicts with other widgets the application may also be using.

Widgets can be styled via regular CSS, but to support encapsulation and reuse goals, each widget should maintain its own independent CSS module that lives parallel to the widget's source code. This allows widgets to be styled independently, without clashing on similar class names used elsewhere in an application.

Dojo differentiates between several types of styling, each representing a different aspect and granularity of styling concerns within an enterprise web application:

-   [Widget non-themeable styles](#structural-widget-styling) (_granularity:_ per-widget)
    -   The minimum styles necessary for a widget to function, that are not intended to be overridden by a theme. Widgets refer to these style classes directly from their CSS module imports when rendering.
-   [Widget themeable styles](#making-themeable-widgets) (_granularity:_ per-widget)
    -   Widget styles that can be overridden via theming. Widgets wrap these style classes in a class-level `@theme()` decorator, then refer to them indirectly via the [`this.theme()` method](#themedmixin-thistheme-method) when rendering. Users of the widget can override some or all of these classes, as required.
-   [Cross-cutting styles](#making-themeable-applications) (_granularity:_ application-wide)
    -   Styles that apply across several widgets, whether widgets of different types, or multiple instances of a single widget type. These styles usually provide a consistent visual presentation for all themeable widgets used within an application. Cross-cutting styles can be provided/referenced via several mechanisms:
        -   Providing [an application-wide theme](#making-themeable-applications)
        -   [Specifying per-widget themes](#overriding-the-theme-of-specific-widget-instances)
        -   [Passing extra classes to a widget](#passing-extra-classes-to-widgets)
        -   Using [a centralized `variables.css` file](#css-custom-properties) that other stylesheets can import and reference
        -   [Composing classes](#css-module-composition) within a CSS module.
        -   [Using several CSS modules](#using-several-css-modules) within a widget.

As the above list illustrates, Dojo provides several complementary mechanisms for application developers to provide and override CSS styling classes, whether across an entire application or specific to individual style rules within a single styling class.

## Structural widget styling

Dojo leverages [CSS Modules](https://github.com/css-modules/css-modules) to provide all of the flexibility of CSS, but with the additional benefit of localized classes to help prevent inadvertent styling collisions across a large application. Dojo also generates type definitions for each CSS module, allowing widgets to import their CSS similar to any other TypeScript module and refer to CSS class names in a type-safe manner, at design-time via IDE autocompletion.

The CSS module file for a widget should have a `.m.css` extension, and by convention is usually named the same as the widget it is associated with. Files with this extension will be processed as CSS modules rather than plain CSS files.

### Example

Given the following CSS module file for a widget:

> src/styles/MyWidget.m.css

```css
.myWidgetClass {
	font-variant: small-caps;
}

.myWidgetExtraClass {
	font-style: italic;
}
```

This stylesheet can be used within a corresponding widget as follows:

> src/widgets/MyWidget.ts

```ts
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import { v } from '@dojo/framework/widget-core/d';

import * as css from '../styles/MyWidget.m.css';

export default class MyWidget extends WidgetBase {
	protected render() {
		return v('div', { classes: [css.myWidgetClass, css.myWidgetExtraClass] }, ['Hello from a Dojo widget!']);
	}
}
```

Similarly, if using TSX widget syntax:

> src/widgets/MyTsxWidget.tsx

```tsx
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import { tsx } from '@dojo/framework/widget-core/tsx';

import * as css from '../styles/MyWidget.m.css';

export default class MyTsxWidget extends WidgetBase {
	protected render() {
		return <div classes={[css.myWidgetClass, css.myWidgetExtraClass]}>Hello from a Dojo TSX widget!</div>;
	}
}
```

When inspecting the CSS classes of these sample widgets in a built application, they will not contain `myWidgetClass` and `myWidgetExtraClass`, but rather obfuscated CSS class names similar to `MyWidget-m__myWidgetClass__33zN8` and `MyWidget-m__myWidgetExtraClass___g3St`.

These obfuscated class names are localized to `MyWidget` elements, and are determined by Dojo's CSS modules build process. With this mechanism it is possible for other widgets in the same application to also use the `myWidgetClass` class name with different styling rules, and not encounter any conflicts between each set of styles.

**Warning:** The obfuscated CSS class names should be considered unreliable and may change with a new build of an application, so developers should not explicitly reference them (for examples if attempting to target an element from elsewhere in an application).

## Abstracting and extending stylesheets

### CSS custom properties

Dojo allows use of modern CSS features such as [custom properties and `var()`](https://www.w3.org/TR/css-variables/) to help abstract and centralize common styling properties within an application.

Rather than having to specify the same values for colors or fonts in every widget's CSS module, abstract custom properties can instead be referenced by name, with values then provided in a centralized CSS `:root` pseudo-class. This separation allows for much simpler maintenance of common styling concerns across an entire application.

For example:

> src/themes/variables.css

```css
:root {
	/* different sets of custom properties can be used if an application supports more than one possible theme */
	--light-background: lightgray;
	--light-foreground: black;

	--dark-background: black;
	--dark-foreground: lightgray;

	--padding: 32px;
}
```

> src/themes/myDarkTheme/MyWidget.m.css

```css
@import '../variables.css';

.root {
	margin: var(--padding);

	color: var(--dark-foreground);
	background: var(--dark-background);
}
```

Note that the `:root` pseudo-class is global within a webpage, but through Dojo's use of CSS modules, `:root` properties could potentially be specified in many locations across an application. However, Dojo does not guarantee the order in which CSS modules are processed, so to ensure consistency of which properties appear in `:root`, it is recommended that applications use a single `:root` definition within a centralized `variables.css` file in the application's codebase. This centralized variables file is a regular CSS file (not a CSS module) and can be `@import`ed as such in any CSS modules that require custom property values.

Dojo's default build process propagates custom properties as-is into the application's output stylesheets. This is fine when only targeting evergreen browsers, but can be problematic when also needing to target browsers that do not implement the CSS custom properties standard (such as IE). To get around this, applications can be built in legacy mode (`dojo build app --legacy`), in which case Dojo will resolve the values of custom properties at build time and duplicate them in the output stylesheets. One value will contain the original `var()` reference, and the second will be the resolved value that legacy browsers can fall back to when they are unable to process the `var()` values.

### CSS module composition

Applying a theme to a Dojo widget results in the widget's default styling classes being entirely overridden by those provided in the theme (see [Note 3 of `ThemedMixin`'s `this.theme()` method](#themedmixin-thistheme-method) for details). This can be problematic when only a subset of properties in a given styling class need to be modified through a theme, while the remainder can stay as default.

[CSS module files](https://github.com/css-modules/css-modules) in Dojo applications can leverage `composes:` functionality to apply sets of styles from one class selector to another. This can be useful when creating a new theme that tweaks an existing one, as well as for general abstraction of common sets of styling properties within a single theme (note that [CSS custom properties](#css-custom-properties) are a more standardized way of abstracting values for individual style properties).

**Warning:** Use of `composes:` can prove brittle, for example when extending a third-party theme that is not under direct control of the current application. Any change made by a third-party could break an application theme that `composes` the underlying theme, and such breakages can be problematic to pin down and resolve.

However, careful use of this feature can be helpful in large applications. For example, centralizing a common set of properties:

> src/themes/common/ButtonBase.m.css

```css
.buttonBase {
	margin-right: 10px;
	display: inline-block;
	font-size: 14px;
	text-align: left;
	background-color: white;
}
```

> src/themes/myBlueTheme/MyButton.m.css

```css
.root {
	composes: buttonBase from '../common/ButtonBase.m.css';
	background-color: blue;
}
```

## Dojo styling best-practices

As styles in a Dojo application are mostly scoped to individual widgets, there is little need for complex selector targeting. Style application in Dojo should be as simple as possible - developers can achieve this by following a few simple recommendations:

-   Maintain encapsulated widget styling
    -   A single CSS module should address a single concern. For widget-aligned modules, this usually means only including styling classes for the single accompanying widget. CSS modules can also be shared across several widgets, for example an application could define a common typography module that is shared across an application. It is common practice for [widgets to reference several CSS modules](#using-several-css-modules) within their TypeScript code.
    -   Do not refer to a widget via its styling classes outside of its CSS module, or a theme that provides style overrides for the widget.
    -   Do not rely on styling class names in built applications, as Dojo obfuscates them.
-   Prefer [class-level selector specificity](https://developer.mozilla.org/en-US/docs/Web/CSS/Class_selectors)
    -   Type selectors should not be used, as doing so breaks widget encapsulation and could negatively impact other widgets that use the same element types.
    -   ID selectors should not be used. Dojo widgets are intended to be encapsulated and reusable, whereas element IDs are contrary to this goal. Dojo provides alternative mechanisms to augment or override styles for specific widget instances, such as via a widget's [`classes`](#passing-extra-classes-to-widgets) or [`theme`](#overriding-the-theme-of-specific-widget-instances) properties.
-   Avoid selector nesting
    -   Widgets should be simple enough to only require single, direct class selectors. If required, widgets can use [multiple, independent classes](#themeable-widget-example) to apply additional style sets. A single widget can also use multiple classes defined across [several CSS modules](#using-several-css-modules).
    -   Complex widgets should be refactored to a simple parent element that composes simple child widgets, where specific, encapsulated styling can be applied to each composed widget.
-   Avoid BEM naming conventions
    -   Favour descriptive class names relevant to the widget's purpose.
-   Avoid use of `!important`

# Theming a Dojo application

Dojo applications need a way to present all the widgets they use in a consistent manner, so that users perceive and interact with application features holistically, rather than as a mashup of disjointed elements on a webpage. This is usually implemented via a corporate or product marketing theme that specifies colors, layout, font families, and more.

## Making themeable applications

In order to specify a theme for all themeable widgets in an application, `registerThemeInjector()` can be used in conjunction with the application's global registry. This injector utility function is available from the `@dojo/framework/widget-core/mixins/Themed` module.

For example, specifying a primary application theme:

> src/main.ts

```ts
import renderer from '@dojo/framework/widget-core/vdom';
import { w } from '@dojo/framework/widget-core/d';
import Registry from '@dojo/framework/widget-core/Registry';
import { registerThemeInjector } from '@dojo/framework/widget-core/mixins/Themed';

import myTheme from './src/themes/myTheme/theme';
import App from './App';

const registry = new Registry();
registerThemeInjector(myTheme, registry);

const r = renderer(() => w(App, {}));
r.mount({ registry });
```

See [Writing a theme](#writing-a-theme) for a description of how the `myTheme` import should be structured.

Note that using themeable widgets without specifying an explicit theme (for example, passing an empty theme object to `registerThemeInjector` and not [explicitly overriding a widget instance's theme or styling classes](#themedmixin-widget-properties)) will result in each widget using its default style rules.

If using an [independently-distributed theme](#distributing-themes) in its entirety, applications will also need to integrate the theme's overarching `index.css` file into their own styling. This can be done via an import in the project's `main.css` file:

> src/main.css

```css
@import '@{myThemePackageName}/{myThemeName}/index.css';
```

By contrast, another way of using only portions of an externally-built theme is [via theme composition](#composing-off-dojo-themes).

### Changing the currently active theme

`registerThemeInjector()` will return a handle to the `themeInjector` that can be used to change the active theme. Applications can call `themeInjector.set()`, passing in a new theme object, which will invalidate all themed widgets in the application tree and re-render them using the new theme.

To simplify the process of changing themes and to allow for easier dynamic switching in a running application, a `ThemeSwitcher` utility widget is also available from `@dojo/framework/widget-core/mixins/Themed`.

#### `ThemeSwitcher` Properties

-   `renderer: (updateTheme(theme: Theme) => void): DNode | DNode[]`
    -   The `renderer` that is called with an `updateTheme` function that can be used to switch themes based on user selection, for example. The `renderer` implementation should return `DNode | DNode[]`, which are the elements that will be rendered to allow theme selection within the application.
-   `registryLabel ?: string`
    -   (Optional) The registry label used to register the theme injector. When using the `registerThemeInjector` utility function, this property does not need to be set.

#### `ThemeSwitcher` Example Usage

The following example shows a themeable widget that uses `ThemeSwitcher` to render two buttons that allow users to switch between a `light` and `dark` theme.

> src/widgets/MyApp.ts

```ts
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import ThemedMixin, { ThemeSwitcher, theme, UpdateTheme } from '@dojo/framework/widget-core/mixins/Themed';

import lightTheme from '../themes/light-theme/theme';
import darkTheme from '../themes/dark-theme/theme';
import * as css from './styles/MyApp.m.css';

@theme(css)
class MyApp extends ThemedMixin(WidgetBase) {
	protected render() {
		return v('div', [
			w(ThemeSwitcher, {
				renderer: (updateTheme: UpdateTheme) => {
					return v('div', [
						v(
							'button',
							{
								onclick: () => {
									updateTheme(lightTheme);
								}
							},
							['light']
						),
						v(
							'button',
							{
								onclick: () => {
									updateTheme(darkTheme);
								}
							},
							['dark']
						)
					]);
				}
			}),
			v('div', { classes: this.theme(css.container) })
		]);
	}
}
```

## Making themeable widgets

There are three requirements for widgets to be considered themeable:

1.  The widget's class should have the `@theme()` decorator applied, passing in the widget's imported CSS module as a decorator argument.
    -   Note that widgets can import and reference multiple CSS modules, in which case additional `@theme()` decorators can be stacked, one for each corresponding CSS import intended to be themeable.
2.  The widget's parent class should extend `ThemedMixin`.
3.  One or more of the widget's styling classes should be wrapped in a call to `this.theme()` when rendering the widget.

By convention, there is a fourth requirement that is useful when developing widgets intended for distribution (this is a convention that widgets in Dojo's widget library follow):

4.  The widget's root VDOM node - that is, the outer-most node rendered by the widget - should include a styling class named `root`. Doing so provides a predictable way to target the top-level node of a third-party themeable widget when overriding its styles in a custom theme.

`ThemedMixin` and the `@theme()` decorator can be imported from the `@dojo/framework/widget-core/mixins/Themed` module. Using `ThemedMixin` on a widget provides access to the `this.theme()` function.

### `ThemedMixin` `this.theme()` method

```ts
type SupportedClassName = string | null | undefined | boolean;
```

-   `this.theme(classes: SupportedClassName): SupportedClassName`
-   `this.theme(classes: SupportedClassName[]): SupportedClassName[]`

    -   Widgets can pass in one or multiple CSS class names and will receive back the corresponding amount of themed class names, suitable for passing on to the `classes` property when rendering the widget's WNodes or VNodes.

        -   **Note 1:** Theme overrides are at the level of CSS classes only, not individual style properties within a class.

        -   **Note 2:** If the currently active theme does **not** provide an override for a given styling class, the widget will fall back to using its default style properties for that class.

        -   **Note 3:** If the currently active theme does provide an override for a given styling class, the widget will _only_ have the set of CSS properties specified in the theme applied to it. For example, if a widget's default styling class contains ten CSS properties but the current theme only specifies one, the widget will render with a single CSS property and lose the other nine that were not specified in the theme override.

### `ThemedMixin` Widget Properties

-   `theme` (optional)
    -   If specified, [the provided theme](#writing-a-theme) will act as an override for any theme that the widget may use, and will take precedence over [the application's default theme](#making-themeable-applications) as well as [any other theme changes made in the application](#changing-the-currently-active-theme).
-   `classes` (optional)
    -   described in the [Passing extra classes to widgets](#passing-extra-classes-to-widgets) section.

### Themeable Widget Example

Given the following CSS module file for a themeable widget:

> src/styles/MyThemeableWidget.m.css

```css
/* requirement 4, i.e. this widget is intended for wider distribution,
therefore its outer-most VDOM element uses the 'root' class: */
.root {
	font-family: sans-serif;
}

/* widgets can use any variety of ancillary CSS classes that are also themeable */
.myWidgetExtraThemeableClass {
	font-variant: small-caps;
}

/* extra 'fixed' classes can also be used to specify a widget's structural styling, which is not intended to be
overridden via a theme */
.myWidgetStructuralClass {
	font-style: italic;
}
```

This stylesheet can be used within a corresponding themeable widget as follows:

> src/widgets/MyThemeableWidget.ts

```ts
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import ThemedMixin, { theme } from '@dojo/framework/widget-core/mixins/Themed';
import { v } from '@dojo/framework/widget-core/d';

import * as css from '../styles/MyThemeableWidget.m.css';

/* requirement 1: */ @theme(css)
export default class MyThemeableWidget /* requirement 2: */ extends ThemedMixin(WidgetBase) {
	protected render() {
		return v(
			/* requirement 4: outer-most VDOM element */ 'div',
			{
				classes: [
					/* requirement 3: */ ...this.theme([
						/* requirement 4: */ css.root,
						css.myWidgetExtraThemeableClass
					]),
					css.myWidgetStructuralClass
				]
			},
			['Hello from a themed Dojo widget!']
		);
	}
}
```

Similarly, if using TSX widget syntax:

> src/widgets/MyThemeableTsxWidget.tsx

```tsx
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import ThemedMixin, { theme } from '@dojo/framework/widget-core/mixins/Themed';
import { tsx } from '@dojo/framework/widget-core/tsx';

import * as css from '../styles/MyThemeableWidget.m.css';

/* requirement 1: */ @theme(css)
export default class MyThemeableTsxWidget /* requirement 2: */ extends ThemedMixin(WidgetBase) {
	protected render() {
		return (
			<div
				classes={[
					/* requirement 3: */ ...this.theme([
						/* requirement 4: */ css.root,
						css.myWidgetExtraThemeableClass
					]),
					css.myWidgetStructuralClass
				]}
			>
				Hello from a themed Dojo TSX widget!
			</div>
		);
	}
}
```

#### Using several CSS modules

Widgets can also import and reference multiple CSS modules - this provides another way to abstract and reuse common styling properties through TypeScript code, in addition to the CSS-based methods described elsewhere in this guide ([CSS custom properties](#css-custom-properties) and [CSS module composition](#css-module-composition)).

Extending the above example:

> src/styles/MyThemeCommonStyles.m.css

```css
.commonBase {
	border: 4px solid black;
	border-radius: 4em;
	padding: 2em;
}
```

> src/widgets/MyThemeableTsxWidget.tsx

```tsx
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import ThemedMixin, { theme } from '@dojo/framework/widget-core/mixins/Themed';
import { tsx } from '@dojo/framework/widget-core/tsx';

import * as commonCss from '../styles/MyThemeCommonStyles.m.css';
import * as css from '../styles/MyThemeableWidget.m.css';

@theme(commonCss)
@theme(css)
export default class MyThemedTsxWidget extends ThemedMixin(WidgetBase) {
	protected render() {
		return (
			<div classes={[this.theme(css.root), this.theme(commonCss.commonBase), css.myWidgetExtraClass]}>
				Hello from a themed Dojo TSX widget!
			</div>
		);
	}
}
```

### Overriding the theme of specific widget instances

Users of a widget can override the theme of a specific instance by passing in a [valid theme](#writing-a-theme) to the instance's [`theme` property](#themedmixin-widget-properties). This is useful when needing to display a given widget in multiple ways across several occurrences within an application.

For example, building on the [themeable widget example](#themeable-widget-example):

> src/themes/myTheme/styles/MyThemeableWidget.m.css

```css
.root {
	color: blue;
}
```

> src/themes/myThemeOverride/theme.ts

```ts
import * as myThemeableWidgetCss from './styles/MyThemeableWidget.m.css';

export default {
	'my-app/MyThemeableWidget': myThemeableWidgetCss
};
```

> src/widgets/MyApp.tsx

```tsx
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import ThemedMixin, { theme } from '@dojo/framework/widget-core/mixins/Themed';
import { tsx } from '@dojo/framework/widget-core/tsx';

import MyThemeableTsxWidget from './src/widgets/MyThemeableTsxWidget.tsx';

import * as css from '../styles/MyApp.m.css';

import * as myThemeOverride from '../themes/myThemeOverride/theme.ts';

@theme(css)
export default class MyApp extends ThemedMixin(WidgetBase) {
	protected render() {
		return (
			<div>
				<MyThemeableTsxWidget />
				<MyThemeableTsxWidget theme={myThemeOverride} />
			</div>
		);
	}
}
```

Here, two instances of `MyThemeableTsxWidget` are rendered - the first uses the application-wide theme, if specified, otherwise the widget's default styling is used instead. By contrast, the second instance will always render with the theme defined in `myThemeOverride`.

### Passing extra classes to widgets

The theming mechanism provides a simple way to consistently apply custom styles across every widget in an application, but isn't flexible enough for scenarios where a user wants to apply additional styles to specific instances of a given widget.

Extra styling classes can be passed in through a [themeable widget's `classes` property](#themedmixin-widget-properties). They are considered additive, and do not override the widget's existing styling classes - their purpose is instead to allow fine-grained tweaking of pre-existing styles. Each set of extra classes provided need to be grouped by two levels of keys:

1.  The appropriate [widget theme key](#widget-theme-keys), specifying the widget that the classes should be applied to, including those for any child widgets that may be utilized.
2.  Specific existing CSS classes that the widget utilizes, allowing widget consumers to target styling extensions at the level of individual DOM elements, out of several that a widget may output.

For illustration, the type definition for the extra classes property is:

```ts
type ExtraClassName = string | null | undefined | boolean;

interface Classes {
	[widgetThemeKey: string]: {
		[baseClassName: string]: ExtraClassName[];
	};
}
```

As an example of providing extra classes, the following tweaks an instance of a [Dojo combobox](https://github.com/dojo/widgets/tree/master/src/combobox), as well as the [text input](https://github.com/dojo/widgets/tree/master/src/text-input) child widget it contains. This will change the background color to blue for both the text input control used by the combobox as well as its control panel. The down arrow within the combo box's control panel will also be colored red:

> src/styles/MyComboBoxStyleTweaks.m.css

```css
.blueBackground {
	background-color: blue;
}

.redArrow {
	color: red;
}
```

> src/widgets/MyWidget.tsx

```tsx
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import { tsx } from '@dojo/framework/widget-core/tsx';

import ComboBox from '@dojo/widgets/combobox';

import * as myComboBoxStyleTweaks from '../styles/MyComboBoxStyleTweaks.m.css';

const myExtraClasses = {
	'@dojo/widgets/combobox': {
		controls: [myComboBoxStyleTweaks.blueBackground],
		trigger: [myComboBoxStyleTweaks.redArrow]
	},
	'@dojo/widgets/text-input': {
		input: [myComboBoxStyleTweaks.blueBackground]
	}
};

export default class MyWidget extends WidgetBase {
	protected render() {
		return (
			<div>
				Hello from a tweaked Dojo combobox!
				<ComboBox classes={myExtraClasses} results={['foo', 'bar']} />
			</div>
		);
	}
}
```

Note that it is a widget author's responsibility to explicitly pass the `classes` property to all child widgets that are leveraged, as the property will not be injected nor automatically passed to children by Dojo itself.

# Working with themes

## Widget theme keys

Dojo's theming framework uses the concept of a 'widget theme key' to connect style overrides to the corresponding widget that the styles are intended for. Style overrides are usually [specified in a theme](#writing-a-theme), but can also be passed [directly via `ThemedMixin`'s `classes` override property](#passing-extra-classes-to-widgets), if required.

The theme key for a given widget is determined as:

    {package-name}/{widget-css-module-name}

where `package-name` is the value of the `name` property within the project's `package.json`, and `widget-css-module-name` is the filename of the primary CSS module used for the widget (_without_ the `.m.css` extension).

### Theme key example

For a given project:

> package.json

```json
{
	"name": "my-app"
}
```

When [following widget CSS module naming conventions](#structural-widget-styling), a given widget such as `src/widgets/MyWidget.ts` will use a corresponding CSS module name similar to `src/styles/MyWidget.m.css`. The theme key for `MyWidget` is therefore:

    my-app/MyWidget

Here, the name of the widget is the same as the the name of its CSS module file, but developers should be careful not to mistake the widget's theme key as representing the widget's TypeScript class name.

For a second widget that does not follow CSS module naming conventions, such as `src/widgets/BespokeWidget.ts` that uses a corresponding CSS module such as `src/styles/BespokeStyleSheet.m.css`, its widget theme key would instead be:

    my-app/BespokeStyleSheet

## Writing a theme

Themes are TypeScript modules that export a default object which maps [widget theme keys](#widget-theme-keys) to typed CSS module imports. CSS modules in a theme are the same as regular modules used directly in widgets. Once a theme is applied in an application, each widget identified via its theme key in the theme's definition object will have its styles overridden with those specified in the CSS module associated with that widget's theme key.

The following is a simple illustration of a complete theme for a single `MyWidget` widget (using a default CSS module of `MyWidget.m.css`), contained in a project named `my-app`:

> src/themes/myTheme/styles/MyWidget.m.css

```css
.root {
	color: blue;
}
```

> src/themes/myTheme/theme.ts

```ts
import * as myThemedWidgetCss from './styles/MyWidget.m.css';

export default {
	'my-app/MyWidget': myThemedWidgetCss
};
```

Here, `MyWidget` is following naming conventions with its [primary style class being named `root`](#making-themeable-widgets), allowing `myTheme` to easily override it via the `root` class in its `src/themes/myTheme/styles/MyWidget.m.css` CSS module.

The theme associates the new `root` styling class to `MyWidget` via its [theme key of `my-app/MyWidget`](#widget-theme-keys). When `myTheme` is applied, `MyWidget` will have its color set to blue and will no longer receive any other styles defined in the `root` class in its original CSS module (see [Note 3 of `ThemedMixin`'s `this.theme()` method](#themedmixin-thistheme-method) for details).

## Scaffolding themes for third-party widgets

It is likely that application themes will need to include styling of any third-party widgets that may be used, such as those provided by [Dojo's native widget library](https://github.com/dojo/widgets).

The [`@dojo/cli-create-theme`](https://github.com/dojo/cli-create-theme) package provides tooling support to quickly generate theme scaffolding for third party widgets, via its `dojo create theme` CLI command. It can be installed locally within an application via:

```bash
npm install --save-dev @dojo/cli-create-theme
```

and can be used as follows from a project's root directory:

```bash
dojo create theme -n {myThemeName}
```

Running this command will begin to create the specified `myThemeName` theme by asking two questions:

-   **What Package to do you want to theme?**
    -   The answer to this should be all the packages that contain the third-party widgets intended for theming, for example `@dojo/widgets`. The command will continue to ask for more packages until a user is done.
-   **Which of the _{third-party-package}_ theme files would you like to scaffold?**
    -   A list will be shown of all themeable widgets in the third-party packages that were specified when answering the first question. Users can then pick the subset of all compatible widgets that should be included in the resulting theme - usually only the widgets that are actually used in the current application will be selected, to help keep the theme's size to a minimum.

Several files will be created in the current project upon successful execution of the command:

-   `src/themes/{myThemeName}/theme.ts`
-   `src/themes/{myThemeName}/{third-party-package}/path/to/{selectedWidget}.m.css`

The theme's CSS modules created for all `{selectedWidget}`s come ready with themeable CSS selectors which can then be filled in with the appropriate stylings for `{myThemeName}`.

### Compatible packages

Any third-party package that has a `theme` directory containing widget CSS module files (`*.m.css`) and their corresponding compiled definition files ([`*.m.css.js` - see Distributing themes for details on what these are](#distributing-themes)) is compatible.

For example:

    node_modules
    └── {third-party-package}
        └── theme
            │   {widget}.m.css
            │   {widget}.m.css.js

## Distributing themes

Dojo's [`cli-build-theme`](https://github.com/dojo/cli-build-theme) package provides a CLI command to help build themes that are intended for distribution across multiple applications. It will create all files necessary to [use the theme in a variety of different ways](#theming-a-dojo-application).

Note that when using [`dojo create theme`](#scaffolding-themes-for-third-party-widgets) to scaffold a new theme, there is no need to use `dojo build theme`, as all relevant files will already be in place. This applies to themes in projects that are built either via [`@dojo/cli-build-app`](https://github.com/dojo/cli-build-app) or [`@dojo/cli-build-widget`](https://github.com/dojo/cli-build-widget).

To use the tooling, install `@dojo/cli-build-theme` locally in a theme project:

```bash
npm install --save-dev @dojo/cli-build-theme
```

Then to build a theme, run the command and specify a theme name as well as an optional release version:

```bash
dojo build theme --name={myThemeName} --release={releaseVersion}
```

If no `release` is specified, then the current version from `package.json` will be used instead.

Running the command will create a new `dist/src/{myThemeName}` directory in the project containing:

-   A primary [theme `index.js` file](#writing-a-theme) that can be imported and used to [theme an application or compatible widgets](#theming-a-dojo-application)
-   All widget CSS module `.m.css` files contained in the theme. These files can be referenced directly via [theme composition](#composing-off-dojo-themes) for any applications deriving their own theme off the newly-built one.
-   An `assets` directory containing all fonts and images included within the theme's directory.
-   An `index.css` file that should be [imported into an application's `main.css`](#making-themeable-applications), if using the theme in its entirety.
-   Extra files supporting [use of the theme in custom elements](#using-dojo-provided-themes):
    -   A `{name}-{release}.js` file that registers the theme with a global registry (added via a `<script>` tag).
    -   A `{name}-{release}.css` file that is added via a `<link rel="stylesheet">` tag.

## Using Dojo-provided themes

The [`@dojo/themes`](https://github.com/dojo/themes) package provides a collection of ready-to-use themes that cover all widgets in Dojo's [native widget library](https://github.com/dojo/widgets). The themes can be used as-is, or [composed as the basis](#composing-off-dojo-themes) for a full application theme.

1.  To use the themes, install `@dojo/themes` into your project, for example through `npm i @dojo/themes`. Then, for regular Dojo applications:

2.  Import the theme CSS into your project's `main.css`:

    ```css
    @import '~@dojo/themes/dojo/index.css';
    ```

3.  Import the theme TypeScript module and use it [as per any other theme](#making-themeable-applications):

    ```ts
    import theme from '@dojo/themes/dojo';

    render() {
    	return w(Button, { theme }, [ 'Hello World' ]);
    }
    ```

If attempting to use the themes in custom elements, after installing `@dojo/themes`:

1.  Add the custom element-specific theme CSS to `index.html`:

    ```html
    <link rel="stylesheet" href="node_modules/@dojo/themes/dojo/dojo-{version}.css" />
    ```

2.  Add the custom element-specific theme JS to `index.html`:

    ```html
    <script src="node_modules/@dojo/themes/dojo/dojo-{version}.js"></script>
    ```

### Composing off Dojo themes

Once `@dojo/themes` is installed in a project, it can be used as the basis for an extended application theme by including relevant components with [CSS modules' composes functionality](#css-module-composition) in the new theme.

`@dojo/themes` also includes its own [`:root` `variables.css` file](#css-custom-properties) which can be imported if the extended application theme would like to reference Dojo-specified properties elsewhere in the new theme.

The following is an example of a new theme for the `@dojo/widgets/button` widget that extends off `@dojo/themes`, and changes the button's background to green while retaining all other button theme style properties:

> src/themes/myTheme/theme.ts

```ts
import * as myButton from './myButton.m.css';

export default {
	'@dojo/widgets/button': myButton
};
```

> src/themes/myTheme/myButton.m.css

```css
@import '@dojo/themes/dojo/variables.css';

.root {
	composes: root from '@dojo/themes/dojo/button.m.css';
	background-color: var(--dojo-green);
}
```
