# Dojo 中的样式和主题

<!--
https://github.com/dojo/framework/blob/master/docs/en/styling/supplemental.md
commit 3e723153b8504dd5284116eb80ec0a17e029bd9a
-->

Dojo 部件最适合作为简单的组件，每个组件处理单一职责。它们应该尽可能的封装和模块化，以提高可重用性，同时避免与应用程序使用的其他组件出现冲突。

可以使用常规的 CSS 为部件设置样式，但是为了达到封装和复用的目标，每个部件应该维护各自的 CSS 模块（CSS module），该模块与部件的源代码存放在各自的文件中。这样就可以独立地设置各部件的样式，而不会与应用程序其他地方使用的类名冲突。

Dojo 界定出以下几类样式，每一类都代表了企业 web 应用程序中的样式需关注的不同方面和粒度：

-   [未主题化的部件样式](/learn/styling/styling-and-theming-in-Dojo#structural-widget-styling) (_粒度：_ 单个部件)
    -   部件所需的最小样式，不打算被主题覆盖。当渲染时，部件直接从导入的 CSS 模块中引用这些样式类。
-   [主题化的部件样式](/learn/styling/theming-a-dojo-application#making-themeable-widgets) (_粒度：_ 单个部件)
    -   可以被主题覆盖的部件样式。部件使用 `theme` 中间件中的 [`theme.classes(css)`](/learn/styling/theming-a-dojo-application#theme-middleware-properties) API，传入需要主题化的 CSS，并在渲染时使用返回的类名。部件的使用者可以按需覆写部分或所有类。
-   [应用于多个部件的样式](/learn/styling/theming-a-dojo-application#making-themeable-applications) (_粒度:_ 应用程序范围)
    -   应用于多个部件的样式，这些部件既可以是不同类型的部件，也可以是单个部件的多个实例。这些样式为应用程序中所有可主题化的部件提供一致的可视化外观。可通过以下几种机制提供（或引用）全局样式：
        -   提供一个[应用程序范围的主题](/learn/styling/theming-a-dojo-application#making-themeable-applications)
        -   [为每个部件指定主题](/learn/styling/theming-a-dojo-application#overriding-the-theme-of-specific-widget-instances)
        -   [为部件传入额外的样式](/learn/styling/theming-a-dojo-application#passing-extra-classes-to-widgets)
        -   在变体模块中定义 [css 属性](/learn/styling/theming-a-dojo-application#css-custom-properties)，然后在部件的样式中使用，这样有助于实现一致性和创建主题变体
        -   在一个 CSS 模块中[组合样式类](/learn/styling/theming-a-dojo-application#css-module-composition)
        -   在一个部件中[使用多个 CSS 模块](/learn/styling/theming-a-dojo-application#using-several-css-modules)

如上述列表所示，无论是跨整个应用程序，还是单个样式类中的单条样式规则，Dojo 为应用程序开发者提供了几种互相补充的机制来提供或重写 CSS 样式类。

## 部件的结构样式

Dojo 借助 [CSS Modules](https://github.com/css-modules/css-modules)，既提供了 CSS 的所有灵活性，又引入了本地化样式类的额外优势，防止大型应用程序中无意间的样式冲突。Dojo 也为每个 CSS 模块生成类型定义文件，允许部件用与导入其他 TypeScript 模块相似的方式来导入 CSS 模块，并以类型安全的方式引用 CSS 类名，同时在设计期间可以使用 IDE 自动完成功能。

部件的 CSS 模块文件应该使用 `.m.css` 扩展名，并约定 CSS 模块的文件名要与关联的部件名保持一致。具有此扩展名的文件会被当作 CSS 模块来处理，而不是普通的 CSS 文件。

### 示例

以下是部件的 CSS 模块文件：

> src/styles/MyWidget.m.css

```css
.myWidgetClass {
	font-variant: small-caps;
}

.myWidgetExtraClass {
	font-style: italic;
}
```

在对应的部件中使用此样式，如下所示：

> src/widgets/MyWidget.ts

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';

import * as css from '../styles/MyWidget.m.css';

const factory = create();

export default factory(function MyWidget() {
	return <div classes={[css.myWidgetClass, css.myWidgetExtraClass]}>Hello from a Dojo widget!</div>;
});
```

在构建的应用程序中查看示例部件中的 CSS 类时，它们不会直接包含 `myWidgetClass` 和 `myWidgetExtraClass`，而是经过混淆处理的 CSS 类名，类似于 `MyWidget-m__myWidgetClass__33zN8` 和 `MyWidget-m__myWidgetExtraClass___g3St`。

混淆后的类名专用于 `MyWidget` 元素，而这是由 Dojo 的 CSS 模块化构建流程决定的。有了这种机制，则同一个应用程序的其他部件也可以使用 `myWidgetClass` 类名，即使具有不同的样式规则，也不会在每组样式间出现任何冲突。

**警告：** 混淆处理的 CSS 类名是不稳定的，可能会随着应用程序的构建而更改，所以开发人员不能显式地引用它们（例如试图在应用程序的其他位置定位一个元素）。

## 提取和扩展样式

### CSS 自定义属性

Dojo 可以使用现代的 CSS 特性，例如[自定义属性和 `var()`](https://www.w3.org/TR/css-variables/)，来提取和集中管理应用程序中的通用样式属性。

不必在每个部件的 CSS 模块中为颜色或字体设置相同的值，而是通过提取自定义属性，在每个 CSS 模块中引用该属性名，然后在集中一处的 `.root` 样式类设置主题的 `variant`。这种隔离更易于维护跨整个应用程序的公共样式，并可以通过更改变量创建主题的变体。

注意：不要在部件的 CSS 模块中导入主题变体文件；这是在运行时通过 `theme.variant()` 类处理的。

例如：

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

Dojo 默认的构建流程按原样将自定义属性输出到应用程序的样式表中。对于最新的浏览器来说，这样做没有问题；但当使用的浏览器没有实现 CSS 自定义属性标准（如 IE）时，就会出现问题。为了解决这个问题，可以使用遗留模式（`dojo build app --legacy`）来构建应用程序，这种情况下，Dojo 会在构建期间解析自定义属性的值，并复制到输出的样式表中。一个值将包含原来的 `var()` 引用，第二个值是专为旧版浏览器解析的值，当无法处理 `var()` 时就使用解析后的值。

### CSS 模块的组合功能

将主题应用到 Dojo 部件后，部件的默认样式类会完全被主题提供的样式类覆盖。当只需要通过主题修改样式类中的一部分属性，而其余属性依然使用默认值时，就会出现问题。

Dojo 应用程序中的 [CSS 模块文件](https://github.com/css-modules/css-modules)可以使用 `composes:` 功能将样式从一个类选择器应用到另一个类选择器。当通过调整现有的主题来创建一个新主题时，或者在单个主题中提取通用的样式属性时（注意，提取单个属性的值是更标准的做法是 [CSS 自定义属性](/learn/styling/styling-and-theming-in-dojo#css-custom-properties)），这个功能是很有用的。

**警告：** `composes:` 功能可能会比较脆弱，例如当扩展一个不受当前应用程序控制的第三方主题时。第三方主题所做的任何更改，都可能会破坏基于 `composes` 功能的应用程序主题，且这样的破坏很难定位和解决。

但是，在大型应用程序中仔细使用此功能会很有用。比如，集中管理一组公共属性：

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

## Dojo 样式最佳实践

由于 Dojo 应用程序中的样式主要是针对单个部件的，因此不需要使用复杂的选择器。在 Dojo 中为应用程序设置样式时应尽可能简单，开发人员可通过以下几条简单的建议做到这一点：

-   维护封装的部件样式
    -   一个 CSS 模块应只解决一个问题。与部件一一对应的 CSS 模块，通常只包含对应单个部件的样式类。CSS 模块也可以被多个部件共享，比如应用程序定义一个跨整个应用程序的、公共的排版模块。在 TypeScript 代码中，[部件引用多个 CSS 模块](/learn/styling/theming-a-dojo-application#using-several-css-modules)也是一种常见的做法。
    -   不要在 CSS 模块之外使用样式类来引用部件，或者使用为部件提供覆盖样式的主题来引用部件。
    -   不要依赖构建的应用程序中的样式类名，因为 Dojo 会对类名做混淆处理。
-   Prefer [class-level selector specificity](https://developer.mozilla.org/en-US/docs/Web/CSS/Class_selectors)
-   优先使用[类选择器（class selector）](https://developer.mozilla.org/en-US/docs/Web/CSS/Class_selectors)
    -   不应使用类型选择器（type selector），因为这样做会破坏部件的封装性，可能对使用相同元素类型的其他部件产生负面影响。
    -   不应使用 id 选择器（id selector）。Dojo 部件旨在封装和复用，而使用元素的 id 违背此目标。Dojo 提供了其他机制来增强或覆盖特定部件实例的样式，如部件的 [`classes`](/learn/styling/theming-a-dojo-application#passing-extra-classes-to-widgets) 或 [`theme`](/learn/styling/theming-a-dojo-application#overriding-the-theme-of-specific-widget-instances) 属性。
-   避免嵌套选择器
    -   部件应该足够简单，只使用一个类选择器。如果需要，部件也能使用[多个、独立的类](/learn/styling/theming-a-dojo-application#themeable-widget-example)来应用额外的样式。单个部件也可以使用定义在[多个 CSS 模块](/learn/styling/theming-a-dojo-application#using-several-css-modules)中的样式。
    -   复杂的部件应该被重构为一个简单的父部件和多个简单的子部件，这样可以为单独每个部件封装专用的样式。
-   避免使用 BEM 命名规范
    -   优先使用与部件的用途相关的类名
-   避免使用 `!important`

# Dojo 应用程序支持主题

Dojo 应用程序需要一种方法，来为所有部件展示一致的外观，这样用户就可以整体地把握和使用应用程序功能，而不是认为将东拼西凑的元素混搭在网页中。这通常要根据公司或产品的营销主题来指定颜色、布局或字体等实现的。

## 制作支持主题的部件

考虑让部件支持主题需要做两方面的准备：

1.  需要为部件的工厂函数注入 `theme` 中间件，`const factory = create({ theme })`
2.  渲染部件时，应该使用 `theme.classes(css)` 返回的一个或多个部件样式类。

按惯例，当开发的部件需要分发时，还需要考虑第三点要求（Dojo 部件库中的部件都遵循此约定）：

3.  部件的 VDOM 根节点（即部件渲染后的最外围节点）应该包含一个名为 `root` 的样式类。这样当在自定义主题中覆写第三方可主题化部件的样式时，就能以一致的方式定位到顶层节点。

`theme` 中间件是从 `@dojo/framework/core/middleware/theme` 模块中导入的。

### `theme.classes` 方法

`theme.classes` 将部件的 CSS 类名转换应用程序或部件的主题类名。

```ts
theme.classes<T extends ClassNames>(css: T): T;
```

-   **注意事项 1：** 主题的重写只在 CSS 类一级，而不是 CSS 类中的单个样式属性。
-   **注意事项 2：** 如果当前激活的主题**没有**重写给定的样式类，则部件会退而使用该类的默认样式属性。
-   **注意事项 3：** 如果当前激活的主题的确重写了给定的样式类，则 _只会_ 将主题中指定的 CSS 属性应用到部件上。例如，如果部件的默认样式类包含 10 个 CSS 属性，但是当前的主题只指定了一个，则部件渲染时只会使用这一个 CSS 属性，并丢掉在主题中未重写的其他 9 个属性。

### `theme` 中间件属性

-   `theme` （可选）
    -   如果指定，则[所提供的主题](/learn/styling/working-with-themes#writing-a-theme)会重写部件使用的任何主题，并且优先于[应用程序的默认主题](/learn/styling/theming-a-dojo-application#making-themeable-applications)，以及[应用程序中切换的任何其他主题](/learn/styling/theming-a-dojo-application#changing-the-currently-active-theme)。
-   `classes` （可选）
    -   在[为部件传入外部样式类](/learn/styling/theming-a-dojo-application#passing-extra-classes-to-widgets)一节有详细描述。
-   `variant` （可选）
    -   从当前的主题变体中返回 `root` 类。
    -   应该应用到部件的根节点上。

### 可主题化部件示例

下面是一个可主题化部件的 CSS 模块文件：

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

在相应的可主题化的部件中使用这些样式：

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

#### 使用多个 CSS 模块

部件也能导入和引用多个 CSS 模块，除了本指南的其它部分介绍的基于 CSS 的方法（[CSS 自定义属性](/learn/styling/styling-and-theming-in-dojo#css-custom-properties) 和 [CSS 模块化组合功能](/learn/styling/styling-and-theming-in-dojo#css-module-composition)）之外，这提供了另一种通过 TypeScript 代码来提取和复用公共样式属性的方法。

扩展上述示例：

> src/styles/MyThemeCommonStyles.m.css

```css
.commonBase {
	border: 4px solid black;
	border-radius: 4em;
	padding: 2em;
}
```

> src/widgets/MyThemeableWidget.tsx

```tsx
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

### 重写部件实例的主题

部件的使用者可以将一个[有效的主题](/learn/styling/working-with-themes#writing-a-theme)传给部件实例的 [`theme` 属性](/learn/styling/theming-a-dojo-application#theme-middleware-properties)，来重写特定部件实例的主题。当需要在应用程序的不同部分以多种方式显示给定的部件时，这个功能就能派上用场。

例如，在[可主题化部件示例](/learn/styling/theming-a-dojo-application#themeable-widget-example)的基础上构建：

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

此处，渲染了两个 `MyThemeableWidget` 实例，如果指定了应用程序范围的主题，则第一个部件会使用此主题，否则使用部件的默认样式。相比之下，第二个部件始终使用 `myThemeOverride` 中定义的主题。

### 为部件传入额外的样式

主题机制提供了一种简便的方式，为应用程序中的每个部件统一应用自定义样式，但当用户希望为给定的部件实例应用额外的样式时，在这种场景下主题机制就不够灵活。

可以通过[可主题化部件的 `classes` 属性](/learn/styling/theming-a-dojo-application#theme-middleware-properties)来传入额外的样式类。这些样式类是追加的，不会重写部件已有的样式类，它们的目的是对已经存在的样式进行细粒度的调整。提供的每一组额外的样式类都需要按照两个级别的 key 进行分组：

1.  合适的[部件主题 key](/learn/styling/working-with-themes#widget-theme-keys)，用于指定应用样式类的部件，包括其中的任何子部件。
2.  小部件使用的某个已存在的 CSS 类，部件使用者可以在单个 DOM 元素上扩展样式，一个部件上可扩展多个样式。

例如，额外的样式类属性的类型定义为：

```ts
type ExtraClassName = string | null | undefined | boolean;

interface Classes {
	[widgetThemeKey: string]: {
		[baseClassName: string]: ExtraClassName[];
	};
}
```

作为一个提供额外样式类的示例，下面调整 [Dojo combobox](https://github.com/dojo/widgets/tree/master/src/combobox) 实例，以及其中的子部件 [text input](https://github.com/dojo/widgets/tree/master/src/text-input)。此操作会将 combobox 使用的 text input 控件的背景色以及其自身面板的背景色改为蓝色。combobox 控件面板中的下拉箭头也会变为红色：

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

注意，部件的作者负责显式地将 `classes` 属性传给所有的要使用样式类的子部件，因为 Dojo 本身无法将这个属性注入给或自动传给子部件。

## 制作支持主题的应用程序

要为应用程序中所有可主题化的部件指定一个主题，可在应用程序顶层部件中使用 `theme` 中间件中的 `theme.set` API。要设置默认的或初始的主题，则在调用 `theme.set` 之前要先使用 `theme.get` 进行确认。

例如，为应用程序设置一个初始主题：

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

有关导入的 `myTheme` 结构说明，请参考[编写主题](/learn/styling/working-with-themes#writing-a-theme)。

请注意，使用可主题化的部件时，如果没有显示指定主题（例如，没有使用 `theme.set` 设置一个默认主题，也没有[显式地重写部件实例的主题或样式类](#theme-widget-properties)），则每个部件都使用默认的样式规则。

如果使用一个完全独立分发的主题(/learn/styling/working-with-themes#distributing-themes)，应用程序还需要将囊括主题的 `index.css` 文件集成到自身的样式中来。在项目的 `main.css` 文件中导入。

> src/main.css

```css
@import '@{myThemePackageName}/{myThemeName}/index.css';
```

与之相比，另一种使用外部构建主题的部分内容的方法是通过主题组合功能(/learn/styling/working-with-themes#composing-off-dojo-themes)实现的。

### 更改当前激活的主题

`theme` 中间件中的 `.set(theme)` 函数用于在整个应用程序级别更改当前激活的主题。为 `.set` 传入所需的主题，这将让应用程序树中所有可主题化的部件失效，并使用新的主题重新渲染。

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

# 使用主题

## 部件的主题 key

Dojo 的主题框架使用“部件主题 key” 概念将重写的样式与对应部件的相关样式关联。覆盖的样式通常在[主题中指定](/learn/styling/working-with-themes#writing-a-theme)；但如果需要，也可以[直接传给 `theme` 中间件的 `classes` 属性](/learn/styling/theming-a-dojo-application#passing-extra-classes-to-widgets)。

一个部件的主题 key 的确切格式为：

    {package-name}/{widget-css-module-name}

其中 `package-name` 是项目 `package.json` 中 `name` 属性的值，`widget-css-module-name` 是部件使用的主 CSS 模块的文件名（_不包括_ `.m.css` 扩展名）。

### 主题 key 示例

给定如下项目：

> package.json

```json
{
	"name": "my-app"
}
```

[遵循部件的 CSS 模块命名规范](/learn/styling/styling-and-theming-in-dojo#structural-widget-styling)时，一个 `src/widgets/MyWidget.ts` 使用的 CSS 模块名类似于 `src/styles/MyWidget.m.css`。因此 `MyWidget` 的主题 key 为：

    my-app/MyWidget

此处，部件的名称与其 CSS 模块文件的名称相同，但是开发人员要注意，不要将部件的主题 key 误认为就是部件的 TypeScript 类名。

再看第二个部件，没有遵循 CSS 模块的命名规范，如 `src/widgets/BespokeWidget.ts` 使用的 CSS 模块为 `src/styles/BespokeStyleSheet.m.css`，则部件的主题 key 应改为：

    my-app/BespokeStyleSheet

## 编写主题

主题就是一个 TypeScript 模块，会导出一个默认对象，其中将[部件主题 key](/learn/styling/working-with-themes#widget-theme-keys) 映射到导入的类型化的 CSS 模块上。主题中的 CSS 模块与部件直接使用的常规模块相同。一旦应用程序应用了主题，则主题定义对象中的主题 key 标识的每一个部件的样式，都会被主题 key 对应的 CSS 模块中的样式覆盖。

以下是 `MyWidget` 部件完整主题中的一个简单示例（使用默认的 CSS 模块 `MyWidget.m.css`），位于 `my-app` 项目中：

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

此处，`MyWidget` 遵循命名规范，将[主样式类命名为 `root`](/learn/styling/theming-a-dojo-application#making-themeable-widgets)，这样 `myTheme` 就可以被 `src/themes/myTheme/styles/MyWidget.m.css` CSS 模块中的 `root` 类覆盖掉。

通过[主题 key `my-app/MyWidget`](/learn/styling/working-with-themes#widget-theme-keys)，主题将新的 `root` 样式类关联到 `MyWidget` 上。当应用 `myTheme` 主题后，`MyWidget` 会将其颜色设置为蓝色，且不会再接收其初始 CSS 模块的 `root` 类中定义的其他样式。

## 为第三方部件搭建主题

应用程序的主题可能需要包含第三方部件使用的样式，比如[Dojo 自带部件库](https://github.com/dojo/widgets)中提供的样式。

[`@dojo/cli-create-theme`](https://github.com/dojo/cli-create-theme) 中提供了一些工具，使用 `dojo create theme` CLI 命令，能为第三方部件快速生成主题脚手架。可通过以下方式在应用程序中安装：

```bash
npm install --save-dev @dojo/cli-create-theme
```

然后在项目根目录下按如下方式使用：

```bash
dojo create theme -n {myThemeName}
```

运行此命令，会在询问两个问题后开始创建 `myThemeName` 主题：

-   **What Package to do you want to theme?**
    -   答案应该是包含第三方部件的所有包，如 `@dojo/widgets`。本命令会继续询问更多的包，直到用户结束此操作。
-   **Which of the _{third-party-package}_ theme files would you like to scaffold?**
    -   在回答第一个问题时，会显示第三方包中所有可主题化的部件。然后用户在其中选择一部分兼容的部件包含到输出的主题中，通常只选择在当前应用程序中实际用到的部件，确保主题足够小。

命令成功执行后，会在当前项目中创建几个文件：

-   `src/themes/{myThemeName}/theme.ts`
-   `src/themes/{myThemeName}/{third-party-package}/path/to/{selectedWidget}.m.css`

为所有 `{selectedWidget}` 创建的主题 CSS 模块都提供了可主题化的 CSS 选择器，然后就可以为 `{myThemeName}` 填充合适的样式规则。

### 兼容的包

任何包含 `theme` 目录的第三方包都是兼容的，其中既包含部件的 CSS 模块文件（`*.m.css`），也包含对应的编译后的定义文件（[`*.m.css.js` - 详情参见分发主题](/learn/styling/working-with-themes#distributing-themes)）。

例如：

    node_modules
    └── {third-party-package}
        └── theme
            │   {widget}.m.css
            │   {widget}.m.css.js

## 分发主题

Dojo 的 [`cli-build-theme`](https://github.com/dojo/cli-build-theme) 提供了一个 CLI 命令，构建的主题可分发给多个应用程序使用。它会创建出[以各种不同方式使用主题所需的所有文件](/learn/styling/theming-a-dojo-application)。

注意，当使用 [`dojo create theme`](/learn/styling/working-with-themes#scaffolding-themes-for-third-party-widgets) 搭建新的主题时，并不需要使用 `dojo build theme`，因为所有相关文件都已就位。这主要用于使用 [`@dojo/cli-build-app`](https://github.com/dojo/cli-build-app) 或 [`@dojo/cli-build-widget`](https://github.com/dojo/cli-build-widget) 构建项目时来构建主题。

要使用此工具，在需要主题化的项目下安装 `@dojo/cli-build-theme`：

```bash
npm install --save-dev @dojo/cli-build-theme
```

然后构建主题，请运行命令，并指定一个主题名以及一个可选的发布版本号：

```bash
dojo build theme --name={myThemeName} --release={releaseVersion}
```

如果没有指定 `release`，则会使用 `package.json` 中的当前版本号。

运行该命令后，会在项目中创建一个 `dist/src/{myThemeName}` 文件夹，其中包含：

-   一个[主题的 `index.js` 文件](/learn/styling/working-with-themes#writing-a-theme)，会被导入并用于[主题化应用程序或兼容的部件](#theming-a-dojo-application)
-   主题中所有部件的 CSS 模块文件（`.m.css`）。这些文件可以通过[主题组合功能](/learn/styling/working-with-themes#composing-off-dojo-themes)直接引用，可用于基于新构建的主题来创建出自己主题的所有应用程序。
-   一个 `assets` 文件夹，包含主题文件夹中的所有字体和图片。
-   一个 `index.css` 文件，如果要使用整个主题，则需要将其[导入到应用程序的 `main.css` 中](#making-themeable-applications)。
-   支持[在自定义元素（custom elements）上使用主题](/learn/styling/working-with-themes#using-dojo-provided-themes)的其他文件：
    -   一个 `{name}-{release}.js` 文件，会使用全局的注册器注册主题（使用 `<script>` 标签添加）。
    -   一个 `{name}-{release}.css` 文件，使用 `<link rel="stylesheet">` 标签添加。

## 使用 Dojo 提供的主题

[`@dojo/themes`](https://github.com/dojo/themes) 包提供了一组立即可用的主题，涵盖了 Dojo [自带部件库](https://github.com/dojo/widgets)的所有部件。可以按原样使用主题库，或者[作为基础组合](/learn/styling/working-with-themes#composing-off-dojo-themes)出完整的应用程序主题。

1.  要使用主题，在项目中安装 `@dojo/themes`，比如使用 `npm i @dojo/themes` 命令。然后，对于常规的 Dojo 应用程序：

2.  在项目的 `main.css` 文件中导入主题的 CSS 文件：

    ```css
    @import '~@dojo/themes/dojo/index.css';
    ```

3.  导入主题的 TypeScript 模块，然后[使用](/learn/styling/theming-a-dojo-application#making-themeable-applications):

    ```ts
    import theme from '@dojo/themes/dojo';

    render() {
    	return w(Button, { theme }, [ 'Hello World' ]);
    }
    ```

如果尝试在 Custom elements 中使用它，则安装完 `@dojo/themes` 之后：

1.  在 `index.html` 中添加 Custom elements 专用的主题 CSS 文件：

    ```html
    <link rel="stylesheet" href="node_modules/@dojo/themes/dojo/dojo-{version}.css" />
    ```

2.  在 `index.html` 中添加 Custom elements 专用的主题 JS 文件：

    ```html
    <script src="node_modules/@dojo/themes/dojo/dojo-{version}.js"></script>
    ```
