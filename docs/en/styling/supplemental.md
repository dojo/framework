# Styling and theming in Dojo

Dojo widgets function best as simple components that each handle a single responsibility. They should be as encapsulated and modular as possible to promote reusability while avoiding conflicts with other widgets the application may also be using.

Widgets can be styled via regular CSS, but to support encapsulation and reuse goals, each widget should maintain its own independent CSS module that lives parallel to the widget's source code. This allows widgets to be styled independently, without clashing on similar class names used elsewhere in an application.

Dojo differentiates between several types of styling, each representing a different aspect and granularity of styling concerns within an enterprise web application:

-   [Widget non-themeable styles](/learn/styling/styling-and-theming-in-Dojo#structural-widget-styling) (_granularity:_ per-widget)
    -   The minimum styles necessary for a widget to function, that are not intended to be overridden by a theme. Widgets refer to these style classes directly from their CSS module imports when rendering.
-   [Widget themeable styles](/learn/styling/theming-a-dojo-application#making-themeable-widgets) (_granularity:_ per-widget)
    -   Widget styles that can be overridden via theming. Widgets use the [`theme.classes(css)`](/learn/styling/theming-a-dojo-application#theme-middleware-properties) API from the `theme` middleware, passing in the CSS that requires theming and using the returned class names when rendering. Users of the widget can override some or all of these classes as needed.
-   [Cross-cutting styles](/learn/styling/theming-a-dojo-application#making-themeable-applications) (_granularity:_ application-wide)
    -   Styles that apply across several widgets, whether widgets of different types, or multiple instances of a single widget type. These styles usually provide a consistent visual presentation for all themeable widgets used within an application. Cross-cutting styles can be provided/referenced via several mechanisms:
        -   Providing [an application-wide theme](/learn/styling/theming-a-dojo-application#making-themeable-applications)
        -   [Specifying per-widget themes](/learn/styling/theming-a-dojo-application#overriding-the-theme-of-specific-widget-instances)
        -   [Passing extra classes to a widget](/learn/styling/theming-a-dojo-application#passing-extra-classes-to-widgets)
        -   Defining [css properties](/learn/styling/theming-a-dojo-application#css-custom-properties) within a variant module and using them throughout widget stylesheets to aid consistency and theme variant creation
        -   [Composing classes](/learn/styling/theming-a-dojo-application#css-module-composition) within a CSS module.
        -   [Using several CSS modules](/learn/styling/theming-a-dojo-application#using-several-css-modules) within a widget.

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

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';

import * as css from '../styles/MyWidget.m.css';

const factory = create();

export default factory(function MyWidget() {
	return <div classes={[css.myWidgetClass, css.myWidgetExtraClass]}>Hello from a Dojo widget!</div>;
});
```

When inspecting the CSS classes of these sample widgets in a built application, they will not contain `myWidgetClass` and `myWidgetExtraClass`, but rather obfuscated CSS class names similar to `MyWidget-m__myWidgetClass__33zN8` and `MyWidget-m__myWidgetExtraClass___g3St`.

These obfuscated class names are localized to `MyWidget` elements, and are determined by Dojo's CSS modules build process. With this mechanism it is possible for other widgets in the same application to also use the `myWidgetClass` class name with different styling rules, and not encounter any conflicts between each set of styles.

**Warning:** The obfuscated CSS class names should be considered unreliable and may change with a new build of an application, so developers should not explicitly reference them (for examples if attempting to target an element from elsewhere in an application).

## Abstracting and extending stylesheets

### CSS custom properties

Dojo allows use of modern CSS features such as [custom properties and `var()`](https://www.w3.org/TR/css-variables/) to help abstract and centralize common styling properties within an application.

Rather than having to specify the same values for colors or fonts in every widget's CSS module, abstract custom properties can instead be referenced by name, with values then provided as a theme `variant` within a `.root` class. This separation allows for much simpler maintenance of common styling concerns across an entire application and for theme variants to be created by changing variables.

Note: do not import the theme variant file into a widget's css module; this is handled instead at run time via the `theme.variant()` class.

For example:

> src/themes/MyTheme/variants/default.m.css

```css
.root {
	--dark-background: black;
	--dark-foreground: lightgray;

	--padding: 32px;
}
```

> src/themes/MyTheme/MyWidget.m.css

```css
.root {
	margin: var(--padding);

	color: var(--dark-foreground);
	background: var(--dark-background);
}
```

Dojo's default build process propagates custom properties as-is into the application's output stylesheets. This is fine when only targeting evergreen browsers, but can be problematic when also needing to target browsers that do not implement the CSS custom properties standard (such as IE). To get around this, applications can be built in legacy mode (`dojo build app --legacy`), in which case Dojo will resolve the values of custom properties at build time and duplicate them in the output stylesheets. One value will contain the original `var()` reference, and the second will be the resolved value that legacy browsers can fall back to when they are unable to process the `var()` values.

### CSS module composition

Applying a theme to a Dojo widget results in the widget's default styling classes being entirely overridden by those provided in the theme. This can be problematic when only a subset of properties in a given styling class need to be modified through a theme, while the remainder can stay as default.

[CSS module files](https://github.com/css-modules/css-modules) in Dojo applications can leverage `composes:` functionality to apply sets of styles from one class selector to another. This can be useful when creating a new theme that tweaks an existing one, as well as for general abstraction of common sets of styling properties within a single theme (note that [CSS custom properties](/learn/styling/styling-and-theming-in-dojo#css-custom-properties) are a more standardized way of abstracting values for individual style properties).

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
    -   A single CSS module should address a single concern. For widget-aligned modules, this usually means only including styling classes for the single accompanying widget. CSS modules can also be shared across several widgets, for example an application could define a common typography module that is shared across an application. It is common practice for [widgets to reference several CSS modules](/learn/styling/theming-a-dojo-application#using-several-css-modules) within their TypeScript code.
    -   Do not refer to a widget via its styling classes outside of its CSS module, or a theme that provides style overrides for the widget.
    -   Do not rely on styling class names in built applications, as Dojo obfuscates them.
-   Prefer [class-level selector specificity](https://developer.mozilla.org/en-US/docs/Web/CSS/Class_selectors)
    -   Type selectors should not be used, as doing so breaks widget encapsulation and could negatively impact other widgets that use the same element types.
    -   ID selectors should not be used. Dojo widgets are intended to be encapsulated and reusable, whereas element IDs are contrary to this goal. Dojo provides alternative mechanisms to augment or override styles for specific widget instances, such as via a widget's [`classes`](/learn/styling/theming-a-dojo-application#passing-extra-classes-to-widgets) or [`theme`](/learn/styling/theming-a-dojo-application#overriding-the-theme-of-specific-widget-instances) properties.
-   Avoid selector nesting
    -   Widgets should be simple enough to only require single, direct class selectors. If required, widgets can use [multiple, independent classes](/learn/styling/theming-a-dojo-application#themeable-widget-example) to apply additional style sets. A single widget can also use multiple classes defined across [several CSS modules](/learn/styling/theming-a-dojo-application#using-several-css-modules).
    -   Complex widgets should be refactored to a simple parent element that composes simple child widgets, where specific, encapsulated styling can be applied to each composed widget.
-   Avoid BEM naming conventions
    -   Favor descriptive class names relevant to the widget's purpose.
-   Avoid use of `!important`

# Theming a Dojo application

Dojo applications need a way to present all the widgets they use in a consistent manner, so that users perceive and interact with application features holistically, rather than as a mashup of disjointed elements on a webpage. This is usually implemented via a corporate or product marketing theme that specifies colors, layout, font families, and more.

## Making themeable widgets

There are two requirements for widgets to be considered themeable:

1.  The widget's factory should have the `theme` middleware injected, `const factory = create({ theme })`
2.  One or more of the widget's styling classes should be passed using the result from the `theme.classes(css)` call when rendering the widget.

By convention, there is a third requirement that is useful when developing widgets intended for distribution (this is a convention that widgets in Dojo's widget library follow):

3.  The widget's root VDOM node - that is, the outer-most node rendered by the widget - should include a styling class named `root`. Doing so provides a predictable way to target the top-level node of a third-party themeable widget when overriding its styles in a custom theme.

The `theme` middleware is imported from the `@dojo/framework/core/middleware/theme` module.

### `theme.classes` method

The `theme.classes` transforms widgets CSS class names to the application or widget's theme class names.

```ts
theme.classes<T extends ClassNames>(css: T): T;
```

-   **Note 1:** Theme overrides are at the level of CSS classes only, not individual style properties within a class.
-   **Note 2:** If the currently active theme does **not** provide an override for a given styling class, the widget will fall back to using its default style properties for that class.
-   **Note 3:** If the currently active theme does provide an override for a given styling class, the widget will _only_ have the set of CSS properties specified in the theme applied to it. For example, if a widget's default styling class contains ten CSS properties but the current theme only specifies one, the widget will render with a single CSS property and lose the other nine that were not specified in the theme override.

### `theme` middleware properties

-   `theme` (optional)
    -   If specified, [the provided theme](/learn/styling/working-with-themes#writing-a-theme) will act as an override for any theme that the widget may use, and will take precedence over [the application's default theme](/learn/styling/theming-a-dojo-application#making-themeable-applications) as well as [any other theme changes made in the application](/learn/styling/theming-a-dojo-application#changing-the-currently-active-theme).
-   `classes` (optional)
    -   described in the [Passing extra classes to widgets](/learn/styling/theming-a-dojo-application#passing-extra-classes-to-widgets) section.
-   `variant` (optional)
    -   returns the `root` class from the current theme variant.
    -   should be applied to the widget's root

### Themeable widget example

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

> src/widgets/MyThemeableWidget.tsx

```ts
import { create, tsx } from '@dojo/framework/core/vdom';
import theme from '@dojo/framework/core/middleware/theme';

import * as css from '../styles/MyThemeableWidget.m.css';

/* requirement 1: */
const factory = create({ theme });

export default factory(function MyThemeableWidget({ middleware: { theme } }) {
	/* requirement 2 */
	const { root, myWidgetExtraThemeableClass } = theme.classes(css);
	return (
		<div
			classes={[
				/* requirement 3: */
				root,
				myWidgetExtraThemeableClass,
				css.myWidgetExtraThemeableClass,
				theme.variant()
			]}
		>
			Hello from a themed Dojo widget!
		</div>
	);
});
```

#### Using several CSS modules

Widgets can also import and reference multiple CSS modules - this provides another way to abstract and reuse common styling properties through TypeScript code, in addition to the CSS-based methods described elsewhere in this guide ([CSS custom properties](/learn/styling/styling-and-theming-in-dojo#css-custom-properties) and [CSS module composition](/learn/styling/styling-and-theming-in-dojo#css-module-composition)).

Extending the above example:

> src/styles/MyThemeCommonStyles.m.css

```css
.commonBase {
	border: 4px solid black;
	border-radius: 4em;
	padding: 2em;
}
```

> src/widgets/MyThemeableWidget.tsx

```ts
import { create, tsx } from '@dojo/framework/core/vdom';
import theme from '@dojo/framework/core/middleware/theme';

import * as css from '../styles/MyThemeableWidget.m.css';
import * as commonCss from '../styles/MyThemeCommonStyles.m.css';

const factory = create({ theme });

export default factory(function MyThemeableWidget({ middleware: { theme } }) {
	const { root } = theme.classes(css);
	const { commonBase } = theme.classes(commonCss);
	return (
		<div classes={[root, commonBase, css.myWidgetExtraThemeableClass, theme.variant()]}>
			Hello from a themed Dojo widget!
		</div>
	);
});
```

### Overriding the theme of specific widget instances

Users of a widget can override the theme of a specific instance by passing in a [valid theme](/learn/styling/working-with-themes#writing-a-theme) to the instance's [`theme` property](/learn/styling/theming-a-dojo-application#theme-middleware-properties). This is useful when needing to display a given widget in multiple ways across several occurrences within an application.

For example, building on the [themeable widget example](/learn/styling/theming-a-dojo-application#themeable-widget-example):

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
import { create, tsx } from '@dojo/framework/core/vdom';

import MyThemeableWidget from './src/widgets/MyThemeableWidget.tsx';
import * as myThemeOverride from '../themes/myThemeOverride/theme.ts';

const factory = create();

export default factory(function MyApp() {
	return (
		<div>
			<MyThemeableWidget />
			<MyThemeableWidget theme={myThemeOverride} />
		</div>
	);
});
```

Here, two instances of `MyThemeableWidget` are rendered - the first uses the application-wide theme, if specified, otherwise the widget's default styling is used instead. By contrast, the second instance will always render with the theme defined in `myThemeOverride`.

### Passing extra classes to widgets

The theming mechanism provides a simple way to consistently apply custom styles across every widget in an application, but isn't flexible enough for scenarios where a user wants to apply additional styles to specific instances of a given widget.

Extra styling classes can be passed in through a [themeable widget's `classes` property](/learn/styling/theming-a-dojo-application#theme-middleware-properties). They are considered additive, and do not override the widget's existing styling classes - their purpose is instead to allow fine-grained tweaking of pre-existing styles. Each set of extra classes provided need to be grouped by two levels of keys:

1.  The appropriate [widget theme key](/learn/styling/working-with-themes#widget-theme-keys), specifying the widget that the classes should be applied to, including those for any child widgets that may be utilized.
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
import { create, tsx } from '@dojo/framework/core/vdom';

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

const factory = create();

export default factory(function MyWidget() {
	return (
		<div>
			Hello from a tweaked Dojo combobox!
			<ComboBox classes={myExtraClasses} results={['foo', 'bar']} />
		</div>
	);
});
```

Note that it is a widget author's responsibility to explicitly pass the `classes` property to all child widgets that are leveraged, as the property will not be injected nor automatically passed to children by Dojo itself.

## Making themeable applications

In order to specify a theme for all themeable widgets in an application, the `theme.set` API from the `theme` middleware can be used in the application's top level widget. Setting a default or initial theme can be done by checking `theme.get` before calling `theme.set`.

For example, specifying a primary application theme:

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

See [Writing a theme](/learn/styling/working-with-themes#writing-a-theme) for a description of how the `myTheme` import should be structured.

Note that using themeable widgets without having an explicit theme (for example, not setting a default theme using `theme.set` and not [explicitly overriding a widget instance's theme or styling classes](#theme-widget-properties)) will result in each widget using its default style rules.

If using an [independently-distributed theme](/learn/styling/working-with-themes#distributing-themes) in its entirety, applications will also need to integrate the theme's overarching `index.css` file into their own styling. This can be done via an import in the project's `main.css` file:

> src/main.css

```css
@import '@{myThemePackageName}/{myThemeName}/index.css';
```

By contrast, another way of using only portions of an externally-built theme is [via theme composition](/learn/styling/working-with-themes#composing-off-dojo-themes).

### Changing the currently active theme

The `theme` middleware `.set(theme)` function can be used to change the active theme throughout an application. Passing the desired theme to `.set`, which will invalidate all themed widgets in the application tree and re-render them using the new theme.

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

# Working with themes

## Widget theme keys

Dojo's theming framework uses the concept of a 'widget theme key' to connect style overrides to the corresponding widget that the styles are intended for. Style overrides are usually [specified in a theme](/learn/styling/working-with-themes#writing-a-theme), but can also be passed [directly via `theme` middleware's `classes` override property](/learn/styling/theming-a-dojo-application#passing-extra-classes-to-widgets), if required.

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

When [following widget CSS module naming conventions](/learn/styling/styling-and-theming-in-dojo#structural-widget-styling), a given widget such as `src/widgets/MyWidget.ts` will use a corresponding CSS module name similar to `src/styles/MyWidget.m.css`. The theme key for `MyWidget` is therefore:

    my-app/MyWidget

Here, the name of the widget is the same as the the name of its CSS module file, but developers should be careful not to mistake the widget's theme key as representing the widget's TypeScript class name.

For a second widget that does not follow CSS module naming conventions, such as `src/widgets/BespokeWidget.ts` that uses a corresponding CSS module such as `src/styles/BespokeStyleSheet.m.css`, its widget theme key would instead be:

    my-app/BespokeStyleSheet

## Writing a theme

Themes are TypeScript modules that export a default object which maps [widget theme keys](/learn/styling/working-with-themes#widget-theme-keys) to typed CSS module imports. CSS modules in a theme are the same as regular modules used directly in widgets. Once a theme is applied in an application, each widget identified via its theme key in the theme's definition object will have its styles overridden with those specified in the CSS module associated with that widget's theme key.

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

Here, `MyWidget` is following naming conventions with its [primary style class being named `root`](/learn/styling/theming-a-dojo-application#making-themeable-widgets), allowing `myTheme` to easily override it via the `root` class in its `src/themes/myTheme/styles/MyWidget.m.css` CSS module.

The theme associates the new `root` styling class to `MyWidget` via its [theme key of `my-app/MyWidget`](/learn/styling/working-with-themes#widget-theme-keys). When `myTheme` is applied, `MyWidget` will have its color set to blue and will no longer receive any other styles defined in the `root` class in its original CSS module.

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

Any third-party package that has a `theme` directory containing widget CSS module files (`*.m.css`) and their corresponding compiled definition files ([`*.m.css.js` - see Distributing themes for details on what these are](/learn/styling/working-with-themes#distributing-themes)) is compatible.

For example:

    node_modules
    └── {third-party-package}
        └── theme
            │   {widget}.m.css
            │   {widget}.m.css.js

## Distributing themes

Dojo's [`cli-build-theme`](https://github.com/dojo/cli-build-theme) package provides a CLI command to help build themes that are intended for distribution across multiple applications. It will create all files necessary to [use the theme in a variety of different ways](/learn/styling/theming-a-dojo-application).

Note that when using [`dojo create theme`](/learn/styling/working-with-themes#scaffolding-themes-for-third-party-widgets) to scaffold a new theme, there is no need to use `dojo build theme`, as all relevant files will already be in place. This applies to themes in projects that are built either via [`@dojo/cli-build-app`](https://github.com/dojo/cli-build-app) or [`@dojo/cli-build-widget`](https://github.com/dojo/cli-build-widget).

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

-   A primary [theme `index.js` file](/learn/styling/working-with-themes#writing-a-theme) that can be imported and used to [theme an application or compatible widgets](#theming-a-dojo-application)
-   All widget CSS module `.m.css` files contained in the theme. These files can be referenced directly via [theme composition](/learn/styling/working-with-themes#composing-off-dojo-themes) for any applications deriving their own theme off the newly-built one.
-   An `assets` directory containing all fonts and images included within the theme's directory.
-   An `index.css` file that should be [imported into an application's `main.css`](#making-themeable-applications), if using the theme in its entirety.
-   Extra files supporting [use of the theme in custom elements](/learn/styling/working-with-themes#using-dojo-provided-themes):
    -   A `{name}-{release}.js` file that registers the theme with a global registry (added via a `<script>` tag).
    -   A `{name}-{release}.css` file that is added via a `<link rel="stylesheet">` tag.

## Using Dojo-provided themes

The [`@dojo/themes`](https://github.com/dojo/themes) package provides a collection of ready-to-use themes that cover all widgets in Dojo's [native widget library](https://github.com/dojo/widgets). The themes can be used as-is, or [composed as the basis](/learn/styling/working-with-themes#composing-off-dojo-themes) for a full application theme.

1.  To use the themes, install `@dojo/themes` into your project, for example through `npm i @dojo/themes`. Then, for regular Dojo applications:

2.  Import the theme CSS into your project's `main.css`:

    ```css
    @import '~@dojo/themes/dojo/index.css';
    ```

3.  Import the theme TypeScript module and use it [as per any other theme](/learn/styling/theming-a-dojo-application#making-themeable-applications):

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
