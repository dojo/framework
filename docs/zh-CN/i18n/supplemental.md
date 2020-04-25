# 使用消息包

<!--
https://github.com/dojo/framework/blob/master/docs/en/i18n/supplemental.md
commit 3064b7ce80fa19569f8975e9aa5d06718ca8decb
-->

Dojo 的消息包概念是一个 Map 对象，其中存储用 key 标识的文本消息，每个 key 标识的消息内容可以用一到多种语言表示。

当需要向最终用户显示消息时，Dojo 应用程序使用 key 来引用该消息。这就避免了在代码中硬编码某一种语言的文本，而是提供了一门或多门语言的外部消息集，这些消息集能独立于应用程序的代码单独维护。

在渲染时，根据部件中引用消息 key 时的当前区域设置，Dojo 的 i18n 框架使用指定语言的文本内容替换掉消息 key。

Dojo 应用程序可以选择在整个应用程序中只使用一个消息包；也可以将消息进一步拆分的更细，接近于一个部件对应一个消息包，最终得到一个包含多个消息包的应用程序。

## 包的默认语言

每个消息包中都会包含多门语言的翻译。其中一门语言需要作为其余语言包的默认模块。这个默认的语言模块用于导入（或引用）包，主要实现两个需求：

-   提供一组完整的消息 key 及对应的内容（使用默认语言），如果包中的其他语言没有覆写某一个 key，则回退使用这些 key 和内容
-   列出包中支持的其他语言，以及每一个支持的语言模块消息集的加载机制

## TypeScript 结构

包中的每一种语言都是一个 TypeScript 模块，该模块必须要默认导出一个 Map 对象，该对象用于描述指定语言中的 key 和对应的翻译文本。

例如，包中的法语模块：

> nls/fr/main.ts

```ts
export default {
	hello: 'Bonjour',
	goodbye: 'Au revoir'
};
```

### 默认的语言模块

选定作为包的默认语言模块的格式与其他语言模块略有不同。默认模块需要导出具有以下属性的对象

-   `messages`
    -   包含消息 key 和默认语言文本的 Map 对象，其结构与包中其他语言的导出对象相同。这里描述的是包支持的、规范化的消息 key。<br>应用程序的区域设置为默认值时，解析消息 key 时就会从这些 `messages` 中查找。当设置的区域不是默认语言时，则包中的其他语言模块没有包含的 key 时，都会回退使用这些 `messages`。
-   `locales`
    -   一个可选属性，是包含区域标识符和对应函数的 Map，这个函数用于加载包支持的每种语言（或区域）的消息集。

例如，将英语作为默认语言的包也支持法语、阿拉伯语和日语：

> nls/main.ts

```ts
export default {
	locales: {
		fr: () => import('./fr/main'),
		ar: () => import('./ar/main'),
		ja: () => import('./ja/main')
	},
	messages: {
		hello: 'Hello',
		goodbye: 'Goodbye'
	}
};
```

## 导入和使用包

当部件需要使用包含在包中的消息集时，可按照与导入其他 TypeScript 模块相同的方式导入包默认语言模块。

例如，假定存在以下默认包：

> nls/en/MyI18nWidget.ts

```ts
export default {
	messages: {
		hello: 'Hello',
		welcome: 'Welcome to your application'
	}
};
```

可在部件中按如下方式导入或引用此模块：

> widgets/MyI18nWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import i18n from '@dojo/framework/core/middleware/i18n';

import myWidgetMessageBundle from '../nls/en/MyI18nWidget';

const factory = create({ i18n });

export default factory(function MyI18nWidget({ middleware: { i18n } }) {
	const { messages } = i18n.localize(myWidgetMessageBundle);

	return <div title={messages.hello}>{messages.welcome}</div>;
});
```

由于此示例使用 `i18n` 中间件的 [`.localize`](/learn/i18n/internationalizing-a-dojo-application#i18n-localize-method) 方法加载消息，所以当在包的默认语言模块 `nls/en/MyI18nWidget.ts` 中引入新的语言时，依然能正常工作。如果当前配置的语言可用，则用户会看到 `MyI18nWidget` 实例使用本地化消息。

应用程序要覆盖用户的默认语言，并允许在应用程序中更改区域设置，则需要额外设置，在[国际化 Dojo 应用程序](/learn/i18n/internationalizing-a-dojo-application)一节有详细介绍。

## 延迟加载与静态加载

推荐在默认语言的 `locales` 中使用函数来加载其他语言的翻译模块，因为这样可以延迟加载本地化的消息包（如果需要的话）。

但有些应用程序可能希望与包的默认语言模块一起静态加载某一种语言，并能通过直接返回兼容的对象结构来实现。

一个包中包含两种加载类型的示例：

```ts
import fr from './fr/main';

export default {
	locales: {
		// Locale providers can load translations lazily...
		ar: () => import('./ar/main'),
		'ar-JO': () => import('./ar-JO/main'),

		// ... or return references directly.
		fr
	},
	// Default/fallback messages
	messages: {
		hello: 'Hello',
		goodbye: 'Goodbye'
	}
};
```

# 国际化 Dojo 应用程序

## 配置应用程序支持的区域

一个国际化的应用程序，应该在它的构建配置文件 `.dojorc` 中指定支持的区域。应该将其中一个区域指定为应用程序的主（默认）区域，其余受支持的区域可作为辅助选项，可在需要时激活。这是通过 `build-app` 中的 `locale` 属性和 `supportedLocales` 列表实现的。

**注意**：因为大量的格式化和解析器都依赖于特定语言环境的 [CLDR](http://cldr.unicode.org) 数据，所以为了能正常运行，`@dojo/framework/i18n` 提供的大部分功能都要求在 `.dojorc` 中设置至少一个 `locale`。比如，如果没有指定默认的 `locale`，则只返回默认包中的消息，并且将禁用 [ICU 消息格式化](#icu-message-formatting)功能。

-   `locale`: string
    -   应用程序支持的主区域。即，如果没有指定覆盖的区域，将使用此作为默认语言。
-   `supportedLocales`: string[]
    -   应用程序支持的其他区域列表。这些区域激活后可覆盖默认的 `locale`，当运行在客户端时可通过应用程序中用户的语言设置来隐式激活，运行在服务器端时通过进程或主机的语言设置隐式激活，或者[在应用程序中显式激活](/learn/i18n/internationalizing-a-dojo-application#providing-locale-data-to-i18n-aware-widgets)。

例如，使用以下配置，应用程序的默认语言环境为英语（`en`），也支持西班牙语（`es`）和法语（`fr`）。

> .dojorc

```json
{
	"build-app": {
		"locale": "en",
		"supportedLocales": ["es", "fr"]
	}
}
```

## 创建支持 i18n 的部件

使用 `@dojo/framework/core/middleware/i18n` 中的 `i18n` 中间件，可国际化单个部件。使用中间件向部件的属性接口添加额外的 i18n 相关属性。`i18n` 中间件的 API 包含一个方法 `localize(bundle)`，用于获取消息包中的本地化消息文本；以及两外两个方法，用于获取和设置应用程序的区域详情。

### `i18n` 部件属性

-   `locale`?: string
    -   部件的区域设置。<br>如果没有指定，则使用[应用程序根设置](/learn/i18n/internationalizing-a-dojo-application#providing-locale-data-to-i18n-aware-widgets) 或[重写的区域](/learn/i18n/internationalizing-a-dojo-application#changing-locales)。<br>如果指定，则部件 DOM 节点的 `lang` 属性会被设置为该区域。
-   `rtl`?: boolean
    -   一个可选标记，指定部件的文本方向。如果值为 `true`，则部件底层 DOM 节点的 `dir` 属性设置为 `"rtl"`。如果值为 `false`，则 `dir` 属性设置为 `"ltr"`。否则，不设置该属性。
-   `i18nBundle`?: `Bundle<Messages>` | `Map<Bundle<Messages>, Bundle<Messages>>`
    -   一个可选的覆写，传给 `localizeBundle` 方法的[默认语言包](/learn/i18n/working-with-message-bundles#default-language-module)。如果覆写包含 `messages` 对象，那么它将完全替换部件使用的默认语言包。如果覆写仅包含一个 `locales` 对象，则将使用覆盖中指定的其他本地化加载器来加载新创建的包。

### `i18n` 的 `localize()` 方法

部件可以将[默认语言包](/learn/i18n/working-with-message-bundles#default-language-module)传给 `localize` 方法，以便根据部件的 `locale` 属性获取对应的本地化包。

如果包支持部件当前设置的区域，但尚未加载这些特定区域的消息，则会返回一个消息都为空字符串的包。或者，为 `localize` 方法传入第二个布尔类型的参数，当值为 `true` 时，则会返回默认的消息，而不返回空包。当特定语言的消息加载完成，部件会失效，然后使用本地化的消息内容重新渲染。

`localize` 返回的对象包含以下属性和方法：

-   `messages`
    -   一个对象，包含本地化消息的键值对。如果此消息尚未加载，则 `messages` 的值是空包或者默认的消息，这取决于调用 `localize` 的方式。
-   `isPlaceholder`
    -   一个布尔属性，指出返回的消息是实际的特定区域的消息（`false`），还是只是等待本地化消息完成加载时使用的占位符（`true`）。如果本地化消息尚未加载，则要避免渲染部件。
-   `format(key: string, replacements: { [key: string]: string })`
    -   一个方法，第一个参数是消息的 key，第二个参数是用于替换的值。例如，如果包中包含 `greeting: 'Hello, {name}!'`，则调用 `format('greeting', { name: 'World'})` 将返回 `'Hello, World!'`。

以下示例使用了 `localize` 返回值的所有功能：

> nls/en/MyI18nWidget.ts

```ts
export default {
	messages: {
		hello: 'Welcome to the shop',
		purchaseItems: 'Please confirm your purchase',
		itemCount: 'Purchase {count} items'
	}
};
```

> widgets/MyI18nWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import i18n from '@dojo/framework/core/middleware/i18n';
import Label from '@dojo/widgets/label';
import Button from '@dojo/widgets/button';

import greetingsBundle from '../nls/en/MyI18nWidget';

const factory = create({ i18n });

export default factory(function MyI18nWidget({ middleware: { i18n } }) {
	// Load the "greetings" messages for the current locale. If the locale-specific
	// messages have not been loaded yet, then the default messages are returned,
	// and the widget will be invalidated once the locale-specific messages have
	// loaded.
	const { format, isPlaceholder, messages } = i18n.localize(greetingsBundle);

	// In many cases it makes sense to postpone rendering until the locale-specific messages have loaded,
	// which can be accomplished by returning early if `isPlaceholder` is `true`.
	if (isPlaceholder) {
		return;
	}

	return v('div', { title: messages.hello }, [
		w(Label, {}, [
			// Passing a message string to a child widget.
			messages.purchaseItems
		]),
		w(Button, {}, [
			// Passing a formatted message string to a child widget.
			format('itemCount', { count: 2 })
		])
	]);
});
```

注意，这种模式支持部件从多个包中获取消息。但是，简洁起见，推荐每个部件单独使用各自的消息包。

### 基于类的部件使用 `I18nMixin`

通过混入 `@dojo/framework/core/mixins/I18n` 中的 `I18nMixin`，可国际化单个基于类的部件。这个 Mixin 将与 `i18n` 中间件相同的 i18n 相关属性添加到部件属性中，并且提供了一个 `localizeBundle` 方法，将导入的消息包与部件当前设置的区域关联。

#### `localizeBundle()` 方法

部件可以将[默认语言包](/learn/i18n/working-with-message-bundles#default-language-module)传给 `localizeBundle` 方法，以便根据部件的 `locale` 属性获取对应的本地化包。

如果包支持部件当前设置的区域，但尚未加载这些特定区域的消息，则会返回一个消息都为空字符串的包。或者，为 `localizeBundle` 方法传入第二个布尔类型的参数，当值为 `true` 时，则会返回默认的消息，而不返回空包。当特定语言的消息加载完成，部件会失效，然后使用本地化的消息内容重新渲染。

`localizeBundle` 返回的对象包含以下属性和方法：

-   `messages`
    -   一个对象，包含本地化消息的键值对。如果此消息尚未加载，则 `messages` 的值是空包或者默认的消息，这取决于调用 `localizeBundle` 的方式。
-   `isPlaceholder`
    -   一个布尔属性，指出返回的消息是实际的特定区域的消息（`false`），或者只是等待本地化消息完成加载时使用的占位符（`true`）。如果本地化消息尚未加载，则要避免渲染部件。
-   `format(key: string, replacements: { [key: string]: string })`
    -   一个方法，第一个参数是消息的 key，第二个参数是用于替换的值。例如，如果包中包含 `greeting: 'Hello, {name}!'`，则调用 `format('greeting', { name: 'World'})` 将返回 `'Hello, World!'`。

以下示例使用了 `localizeBundle` 返回值的所有功能：

> nls/en/MyI18nWidget.ts

```ts
export default {
	messages: {
		hello: 'Welcome to the shop',
		purchaseItems: 'Please confirm your purchase',
		itemCount: 'Purchase {count} items'
	}
};
```

> widgets/MyI18nWidget.ts

```ts
import WidgetBase from '@dojo/framework/core/WidgetBase';
import { v, w } from '@dojo/framework/core/vdom';
import I18nMixin from '@dojo/framework/core/mixins/I18n';
import Label from '@dojo/widgets/label';
import Button from '@dojo/widgets/button';

import greetingsBundle from '../nls/en/MyI18nWidget';

export default class MyI18nWidget extends I18nMixin(WidgetBase) {
	render() {
		// Load the "greetings" messages for the current locale. If the locale-specific
		// messages have not been loaded yet, then the default messages are returned,
		// and the widget will be invalidated once the locale-specific messages have
		// loaded.
		const { format, isPlaceholder, messages } = this.localizeBundle(greetingsBundle);

		// In many cases it makes sense to postpone rendering until the locale-specific messages have loaded,
		// which can be accomplished by returning early if `isPlaceholder` is `true`.
		if (isPlaceholder) {
			return;
		}

		return v('div', { title: messages.hello }, [
			w(Label, {}, [
				// Passing a message string to a child widget.
				messages.purchaseItems
			]),
			w(Button, {}, [
				// Passing a formatted message string to a child widget.
				format('itemCount', { count: 2 })
			])
		]);
	}
}
```

## 为支持 i18n 的部件提供本地化数据

当应用程序使用支持 i18n 的基于类的部件时（专指使用 `I18nMixin` 的部件），还需要通过 Dojo 注册表管理区域设置的详情。这适用于应用程序内部包含此类部件，或者外部依赖中包含此类部件，包括 Dojo 的 `@dojo/widgets` 套件中的部件。通过部件的注册系统，将本地化数据注入到所有此类部件中；当应用程序的区域设置变化时，这些部件将会失效并使用更新后的本地化数据重新渲染。

这个机制是通过 `@dojo/framework/core/mixins/I18n` 提供的工具方法 `registerI18nInjector` 实现的。调用此方法会将 `i18n` 注入器注册到指定的 registry 实例中。通常这是在应用程序引导阶段完成的，而 i18n 注入器是通过将全局的 registry 传给 `renderer.mount()` 方法完成注册的。

> main.ts

```ts
import renderer from '@dojo/framework/core/vdom';
import { w } from '@dojo/framework/core/vdom';
import Registry from '@dojo/framework/core/Registry';
import { registerI18nInjector } from '@dojo/framework/core/mixins/I18n';

import App from './App';

const registry = new Registry();
registerI18nInjector({ locale: 'us', rtl: false }, registry);

const r = renderer(() => w(App, {}));
r.mount({ registry });
```

## 更改区域设置

`i18n` 中间件可用于更改应用程序的区域设置。调用 `i18n.set({ locale: string, rtl: boolean });` 方法会将新的区域设置广播给所有使用 `i18n` 中间件以及使用 `I18nMixin` 的部件（前提是先前已在应用程序中设置 [registerI18nInjector](#providing-locale-data-to-i18n-aware-widgets)）。

### 用法示例

下面的示例展示了一个支持 i18n 的部件，它会渲染两个按钮，用于在英语和法语之间切换应用程序的区域。

```ts
import { create, tsx } from '@dojo/framework/core/vdom';
import i18n from '@dojo/framework/core/middleware/i18n';

import nlsBundle from '../nls/main';

const factory = create({ i18n });

export default factory(function LocaleChanger({ middleware: { i18n } }) {
	const { messages } = localize(nlsBundle);
	return (
		<div>
			<button
				onclick={() => {
					i18n.set({ locale: 'en' });
				}}
			>
				English
			</button>
			<button
				onclick={() => {
					i18n.set({ locale: 'fr' });
				}}
			>
				French
			</button>
			<div>{messages.greetings}</div>
		</div>
	);
});
```

## 覆写每个部件的区域设置和包

使用 `i18n` 中间件或 `I18nMixin` 的部件都拥有 [i18n 部件属性](#i18nmixin-widget-properties)，可以在父部件中实例化时覆写。当需要在一个应用程序中渲染使用不同区域设置的多个部件时（即在一个应用程序中使用多个区域设置），以及覆写第三方部件正在使用的消息集以确保在应用程序上下文中保持一致时，这是非常有用的功能。

每个支持 i18n 的部件都可以通过设置部件的 `locale` 属性来拥有自身的区域设置。如果没有设置 `locale` 属性，则假定使用[默认的区域设置](#default-locale)。

也可以通过传入部件的 `i18nBundle` 属性来替换部件的默认包。Dojo 建议不要在同一个部件中使用多个包，但有时应用程序需要使用的第三方部件却使用多个包。因此，`i18nBundle` 也可以是一个 `Map` 对象，用于关联默认包与覆写包。

在子部件中覆写包的示例：

```ts
import { Bundle } from '@dojo/framework/i18n/i18n';

// A complete bundle to replace WidgetA's message bundle
import overrideBundleForWidgetA from './nls/widgetA';

// Bundles for WidgetB
import widgetB1 from 'third-party/nls/widgetB1';
import overrideBundleForWidgetB from './nls/widgetB';

// WidgetB uses multiple bundles, but only `thirdy-party/nls/widgetB1` needs to be overridden
const overrideMapForWidgetB = new Map<Bundle<any>, Bundle<any>>();
map.set(widgetB1, overrideBundleForWidgetB);

export class MyWidget extends WidgetBase {
	protected render() {
		return [
			w(WidgetA, {
				i18nBundle: overrideBundleForWidgetA
			}),
			w(WidgetB, {
				i18nBundle: overrideMapForWidgetB
			})
		];
	}
}
```

## 默认区域设置

[支持 i18n 部件](#creating-i18n-aware-widgets)的区域设置按照如下顺序确定，直到找到值为止，而这取决于应用程序使用的 i18n 功能：

| 顺序 | I18n 功能                                        | 区域设置                                                                                                                                                 |
| ---: | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    1 | **`I18nMixin` 或 `i18n` 中间件**                 | 使用[部件的 `locale` 属性](#overriding-locales-and-bundles-per-widget) 显式覆写的区域                                                                    |
|    2 | **`I18nMixin` 或 `i18n` 中间件以及 i18n 注入器** | 在[应用程序中选择或更改](#changing-locales)的区域                                                                                                        |
|    3 | **`I18nMixin` 或 `i18n` 中间件以及 i18n 注入器** | 初始注册 [i18n 注入器](#providing-locale-data-to-i18n-aware-widgets)时设置的默认区域                                                                     |
|    4 | **`.dojorc`**                                    | 用户当前的区域，例如浏览器中的语言设置，同时该区域也[存在于应用程序的 `build-app`.`supportedLocales` 列表中](#configuring-supported-application-locales) |
|    5 | **`.dojorc`**                                    | [在应用程序的 `build-app`.`locale` 中指定的默认区域](#configuring-supported-application-locales)                                                         |
|    6 | **`@dojo/framework/i18n`**                       | 通过 [Dojo i18n 中的 `switchLocale` 方法](#changing-the-root-locale-and-observing-locale-changes)显式设置的区域                                          |
|    7 | **`@dojo/framework/i18n`**                       | [为当前执行环境设置的 `systemLocale`](#determining-the-current-locale)。                                                                                 |

# 高级格式化

## 消息格式

### 基本的标记替换

Dojo 的 `i18n` 框架支持 [ICU 消息格式化](#icu-message-formatting)，也支持基本的标记替换。

接下来两个小节中的消息格式化示例会使用包含一个 `guestInfo` 消息的[消息包](#working-with-message-bundles)，如下所示：

> nls/main.ts

```ts
export default {
	messages: {
		guestInfo: '{host} invites {guest} to the party.'
	}
};
```

#### 在部件中替换标记

[支持 i18n 的部件](#creating-i18n-aware-widgets)可使用 [`i18n` 中间件的 `localize` 方法](#i18nmiddleware-localize-method)返回的 `format` 函数在其消息中执行简单的标记替换。

可直接使用 `format` 渲染 `guestInfo` 消息：

> widgets/MyI18nWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import i18n from '@dojo/framework/core/middleware/i18n';

import nlsBundle from '../nls/main';

const factory = create({ i18n });

export default factory(function MyI18nWidget({ middleware: { i18n } }) {
	const { format } = i18n.localize(nlsBundle);

	return (
		<div>
			{format('guestInfo', {
				host: 'Margaret Mead',
				guest: 'Laura Nader'
			})}
		</div>
		// Will render as 'Margaret Mead invites Laura Nader to the party.'
	);
});
```

#### 直接使用标记替换的格式化功能

`i18n` 模块的 [`localizeBundle` 函数](#accessing-locale-message-bundles)返回的对象中，有一个用于处理消息格式化的 `format` 方法：

```ts
import { localizeBundle } from '@dojo/framework/i18n/i18n';
import bundle from 'nls/main';

localizeBundle(bundle, { locale: 'en' }).then(({ format }) => {
	const message = format('guestInfo', {
		host: 'Margaret Mead',
		guest: 'Laura Nader'
	});
	console.log(message); // "Margaret Mead invites Laura Nader to the party."
});
```

### ICU 消息格式化

`@dojo/framework/i18n` 使用 [Globalize.js](https://github.com/jquery/globalize/blob/master/doc/api/message/message-formatter.md) 进行 [ICU 消息格式化](http://userguide.icu-project.org/formatparse/messages)，因此 Globalize.js 提供的所有功能都可以通过 `@dojo/framework/i18n` 访问。

接下来两个小节的消失格式化示例中将使用已更新了 `guestInfo` 消息的[消息包](#working-with-message-bundles)，如下所示：

> nls/main.ts

```ts
export default {
	messages: {
		guestInfo: `{gender, select,
			female {
				{guestCount, plural, offset:1
				=0 {{host} does not give a party.}
				=1 {{host} invites {guest} to her party.}
				=2 {{host} invites {guest} and one other person to her party.}
				other {{host} invites {guest} and # other people to her party.}}}
			male {
				{guestCount, plural, offset:1
				=0 {{host} does not give a party.}
				=1 {{host} invites {guest} to his party.}
				=2 {{host} invites {guest} and one other person to his party.}
				other {{host} invites {guest} and # other people to his party.}}}
			other {
				{guestCount, plural, offset:1
				=0 {{host} does not give a party.}
				=1 {{host} invites {guest} to their party.}
				=2 {{host} invites {guest} and one other person to their party.}
				other {{host} invites {guest} and # other people to their party.}}}}`
	}
};
```

#### 在部件中使用 ICU 消息格式化功能

[支持 i18n 的部件](#creating-i18n-aware-widgets)可使用 [`localizeBundle` 方法](#i18nmixin-localizebundle-method)返回的 `format` 函数来执行 ICU 消息格式化，这与上述的[简单标记替换](#replacing-tokens-in-widgets)相同。

ICU 格式的 `guestInfo` 消息会被渲染为：

> widgets/MyI18nWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import i18n from '@dojo/framework/core/middleware/i18n';

import nlsBundle from '../nls/main';

const factory = create({ i18n });

export default factory(function MyI18nWidget({ middleware: { i18n } }) {
	const { format } = i18n.localize(nlsBundle);

	return (
		<div>
			{
			format('guestInfo', {
				host: 'Margaret Mead',
				gender: 'female',
				guest: 'Laura Nader',
				guestCount: 20
			})
			}
		</div>
		]); // Will render as 'Margaret Mead invites Laura Nader and 19 other people to her party.'
	);
});
```

#### 直接使用 ICU 消息格式化功能

可以使用 [`localizeBundle`](#accessing-locale-message-bundles) 返回的 `format` 方法直接转换 ICU 格式的 `guestInfo` 消息。

```ts
import { localizeBundle } from '@dojo/framework/i18n/i18n';
import bundle from 'nls/main';

// 1. Load the messages for the locale.
localizeBundle(bundle, { locale: 'en' }).then(({ format }) => {
	const message = format('guestInfo', {
		host: 'Margaret Mead',
		gender: 'female',
		guest: 'Laura Nader',
		guestCount: 20
	});
	console.log(message); // "Margaret Mead invites Laura Nader and 19 other people to her party."

	console.log(
		format('guestInfo', {
			host: 'Marshall Sahlins',
			gender: 'male',
			guest: 'Bronisław Malinowski'
		})
	); // "Marshall Sahlins invites Bronisław Malinowski to his party."
});
```

## 格式化日期和数字

跟文本消息格式化功能一样，`@dojo/framework/i18n` 使用 Globalize.js 为日期、时间、货币、数字和单位提供特定区域的格式化。格式化工具本身是对 Globalize.js 相应函数的轻量级封装，这有助于确保 Dojo 生态系统的一致性，并避免直接使用 `Globalize` 对象。与文本消息的格式化不同，日期、数字和单位格式化不会缓存，因为它们有一组更加复杂的选项。因此，多次使用相同的输入执行各种“获取格式化函数”的方法不会返回完全相同的函数对象。

`@dojo/framework/i18n` 对各种格式化函数进行分组：日期和时间格式化（`@dojo/framework/i18n/date`）；数字、货币和多元化的格式化（`@dojo/framework/i18n/number`）；单位格式化（`@dojo/framework/i18n/unit`）。每个方法都与 Globalize.js 中的方法一一对应（见下文），每个方法都遵循相同的基本格式：最后一个参数是可选的区域，倒数第二个参数是一个方法选项。如果指定了区域，但没有方法选项，则为 `options` 参数传入 `null`。如果没有提供区域设置，则假定使用当前区域（`i18n.locale`）。

```ts
import { formatDate, getDateFormatter, formatRelativeTime } from '@dojo/framework/i18n/date';
import { formatCurrency, getCurrencyFormatter } from '@dojo/framework/i18n/number';
import { formatUnit, getUnitFormatter } from '@dojo/framework/i18n/unit';

const date = new Date(1815, 11, 10, 11, 27);

// Assume the current locale is "en"
const enDateFormatter = getDateFormatter({ datetime: 'medium' });
enDateFormatter(date); // Dec 10, 1815, 11:27:00 AM
formatDate(date, { date: 'short' }); // 12/10/15

const frDateFormatter = getDateFormatter({ datetime: 'medium' }, 'fr');
frDateFormatter(date); // 10 déc. 1815 à 11:27:00
formatDate(date, { date: 'short' }, 'fr'); // 10/12/1815

formatRelativeTime(-1, 'week'); // "last week"
formatRelativeTime(-1, 'week', { form: 'short' }); // "last wk."
formatRelativeTime(-3, 'week', null, 'fr'); // "il y a 3 semaines"
formatRelativeTime(-3, 'week', { form: 'short' }, 'fr'); // "il y a 3 sem."

const enCurrencyFormatter = getCurrencyFormatter('USD', { style: 'code' });
enCurrencyFormatter(1234.56); // "1,234.56 USD"
formatCurrency(12345.56, 'USD', { style: 'code' }); // "1,234.56 USD"

const frCurrencyFormatter = getCurrencyFormatter('EUR', { style: 'code' }, 'fr');
frCurrencyFormatter(1234.56); // "1 234,56 EUR"
formatCurrency(12345.56, 'EUR', { style: 'code' }, 'fr'); // "1 234,56 EUR"

const enUnitFormatter = getUnitFormatter('feet', { form: 'narrow' });
enUnitFormatter(5280); // 5,280′
formatUnit(5280, 'feet', { form: 'narrow' }); // 5,280′

const frUnitFormatter = getUnitFormatter('meter', null, 'fr');
frUnitFormatter(1000); // 1 000 mètres'
formatUnit(1000, 'meter', null, 'fr); // 1 000 mètres'
```

**`@dojo/framework/i18n/date` 方法：**

-   `formatDate` => [`Globalize.formatDate`](https://github.com/globalizejs/globalize/blob/master/doc/api/date/date-formatter.md)
-   `formatRelativeTime` => [`Globalize.formatRelativeTime`](https://github.com/globalizejs/globalize/blob/master/doc/api/relative-time/relative-time-formatter.md)
-   `getDateFormatter` => [`Globalize.dateFormatter`](https://github.com/globalizejs/globalize/blob/master/doc/api/date/date-formatter.md)
-   `getDateParser` => [`Globalize.dateParser`](https://github.com/globalizejs/globalize/blob/master/doc/api/date/date-parser.md)
-   `getRelativeTimeFormatter` => [`Globalize.relativeTimeFormatter`](https://github.com/globalizejs/globalize/blob/master/doc/api/relative-time/relative-time-formatter.md)
-   `parseDate` => [`Globalize.parseDate`](https://github.com/globalizejs/globalize/blob/master/doc/api/date/date-parser.md)

**`@dojo/framework/i18n/number` 方法：**

-   `formatCurrency` => [`Globalize.formatCurrency`](https://github.com/globalizejs/globalize/blob/master/doc/api/currency/currency-formatter.md)
-   `formatNumber` => [`Globalize.formatNumber`](https://github.com/globalizejs/globalize/blob/master/doc/api/number/number-formatter.md)
-   `getCurrencyFormatter` => [`Globalize.currencyFormatter`](https://github.com/globalizejs/globalize/blob/master/doc/api/currency/currency-formatter.md)
-   `getNumberFormatter` => [`Globalize.numberFormatter`](https://github.com/globalizejs/globalize/blob/master/doc/api/number/number-formatter.md)
-   `getNumberParser` => [`Globalize.numberParser`](https://github.com/globalizejs/globalize/blob/master/doc/api/number/number-parser.md)
-   `getPluralGenerator` => [`Globalize.pluralGenerator`](https://github.com/globalizejs/globalize/blob/master/doc/api/plural/plural-generator.md)
-   `parseNumber` => [`Globalize.parseNumber`](https://github.com/globalizejs/globalize/blob/master/doc/api/number/number-parser.md)
-   `pluralize` => [`Globalize.plural`](https://github.com/globalizejs/globalize/blob/master/doc/api/plural/plural-generator.md)

**`@dojo/framework/i18n/unit` 方法：**

-   `formatUnit` => [`Globalize.formatUnit`](https://github.com/globalizejs/globalize/blob/master/doc/api/unit/unit-formatter.md)
-   `getUnitFormatter` => [`Globalize.unitFormatter`](https://github.com/globalizejs/globalize/blob/master/doc/api/unit/unit-formatter.md)

# 独立使用的 API

## 访问本地化的消息包

导入[默认语言包](/learn/i18n/working-with-message-bundles#default-language-module)后，将消息包传给 `i18n` 函数就可访问所有特定区域的消息。

例如：

```ts
import { localizeBundle } from '@dojo/framework/i18n/i18n';
import bundle from 'nls/main';

localizeBundle(bundle, { locale: 'fr' }).then(({ messages }) => {
	console.log(messages.hello); // "Bonjour"
	console.log(messages.goodbye); // "Au revoir"
});
```

如果将不支持的区域传给 `i18n`，则返回默认的消息。此外，如果特定区域的消息包中没有提供某些消息，也会返回默认值。因此，默认包应该包含所有特定区域包中使用的 _所有_ 消息 key。

## 确定当前区域

`@dojo/framework/i18n/i18n` 公开了两个确定当前区域的方法：

-   `getCurrentLocale`， 用于获取应用程序当前使用的顶层区域设置。
-   `getComputedLocale`， 支持的区域中包含用户的系统区域，则返回用户的系统区域设置；如果不支持用户的系统区域，则返回 `.dojorc` 中指定的默认区域。
