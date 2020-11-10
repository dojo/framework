# 介绍

<!--
https://github.com/dojo/framework/blob/master/docs/en/styling/introduction.md
commit 3e723153b8504dd5284116eb80ec0a17e029bd9a
-->

Dojo 是基于 HTML 的技术，使用 CSS 为框架中的元素和用它开发的应用程序设置样式。

Dojo 鼓励将结构样式封装在各部件中，以便最大限度复用；同时将外观主题设置到应用程序所有部件上。用户为他们的应用程序设置样式和主题时，这种模式提供了固定的套路，即使混合使用 [Dojo 的 `@dojo/widgets` 库](https://github.com/dojo/widgets)中的部件、由第三方提供的部件或者为特定应用程序开发的内部使用的部件时也是如此。

| 功能                         | 描述                                                                                                                                                                                                                                                                         |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **为单个部件设置样式**       | [CSS Modules](https://github.com/css-modules/css-modules) 用于定义，在单个部件的作用域内有效的样式，避免潜在的交叉污染和样式冲突。通过类型化的 CSS 模块导入和 IDE 自动完成功能，部件可以精确的引用 CSS 类名。                                                                |
| **强大的主题支持**           | 可以轻松开发出支持主题的部件，这样的部件既能使用简化的、中心化的应用程序主题，也能调整或覆盖单个实例的目标样式（如果需要的话）。[CLI 工具](https://github.com/dojo/cli-build-theme)支持分发自定义主题。                                                                      |
| **响应式的主题变更**         | 与 Dojo 应用程序中的其他响应式状态变更类似，当一个部件或者整个应用程序的主题发生变化时，只有受影响的部件才会重新渲染。                                                                                                                                                       |
| **CSS 属性**                 | CSS 模块能使用 [CSS 自定义属性和 `var()`](https://www.w3.org/TR/css-variables/) 来设置主题变体的属性和颜色。                                                                                                                                                                 |
| **简化定义第三方部件的主题** | 应用程序可以轻松扩展主题以覆盖第三方部件，如 Dojo 内置[部件库](https://github.com/dojo/widgets)中的部件，Dojo 也提供了[开箱即用的主题](https://github.com/dojo/themes)，应用程序可直接使用。[CLI 工具](https://github.com/dojo/cli-create-theme)极大简化了主题的创建和组合。 |

## 基本用法

> **注意：** 以下示例是按顺序在前一个示例的基础上构建的。每个示例都尽量简短，只突出显示跟上一个示例相比发生变化的部分。

这些示例假定应用程序名为：

> package.json

```json
{
	"name": "my-app"
}
```

应用程序名与[部件主题的 key](/learn/styling/working-with-themes#widget-theme-keys) 有关。

### 为单个部件设置样式

-   为每个部件单独定义一个 [CSS 模块](/learn/styling/styling-and-theming-in-dojo#structural-widget-styling)
-   在部件的 TypeScript 代码中使用相应的类型化的样式类

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

### 让部件支持主题

-   注入 `theme` 中间件
-   使用 `theme.classes` 返回主题化的 css 类名，这样[部件的默认样式就会被主题覆盖](/learn/styling/theming-a-dojo-application#making-themeable-widgets)

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

### 在部件中应用主题变体

-   在部件的 `root` 上设置 `theme.variant` 样式。
-   将 css 属性应用到正确的 DOM 层级上，并且不能暴露出部件的 DOM。

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

### 创建主题

-   使用自定义的主题样式属性重写部件默认的 CSS 类
-   通过合适的[部件主题 key](/learn/styling/working-with-themes#widget-theme-keys) 将一个或多个重写后的样式链接到[主题结构中](/learn/styling/working-with-themes)

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

### 创建主题的变体

-   将主题变量作为 [CSS 自定义属性](/learn/styling/styling-and-theming-in-dojo#css-custom-properties)存放在 `variant` 模块中
-   通过 `var()` 引用自定义属性
-   不依赖于本地变量或者公共的 `variables.css` 文件

> src/themes/variants/default.m.css

```css
/* single root class */
:root {
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

### 指定默认的应用程序主题

`theme` 中间件可用于设置应用程序主题。要设置“默认的”或初始化主题，则使用 `theme.set` 函数，同时用 `theme.get` 函数确定是否需要设置主题。应该在应用程序的顶级部件中设置默认主题。

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

**注意：** 当同时使用基于函数的部件和基于类的部件时，应该使用应用程序注册器来注册主题。当使用基于类的部件时（如 `@dojo/widgets`） 也是如此。详情参考[基于类部件的主题]()。

### 设置主题变体

如果将主题与 `variants` 一起使用，则自动选用 `default` 变体。使用 `theme.set` 函数来设置不同的变体——传入的变体名必须是主题导出的 `variants` 的 key 值。

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

### 更改应用程序主题

-   使用 [`theme` 中间件](/learn/styling/theming-a-dojo-application#changing-the-currently-active-theme) 在可用的主题间切换

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
