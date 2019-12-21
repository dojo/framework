# 介绍

<!--
https://github.com/dojo/framework/blob/master/docs/en/i18n/introduction.md
commit 02d2d858cd1809468deeeac6cbbd855e9c799e5c
-->

Dojo 的 **`i18n`** 包解决了 web 应用程序国际化方面的诸多常见需求和挑战。

它在 Dojo 应用程序中的应用效果最佳，可帮助渲染本地化的部件，包括高级消息、日期和数字格式化等；但如果需要的话，也可以单独使用该模块。

| 功能                             | 描述                                                                                                                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **本地化单个部件**               | 每个部件实例都可以有自己的本地化设置，能够在单个应用程序中显示多套本地化数据。如果没有指定，部件将回退使用当前的根区域设置（root locale）。                                                                  |
| **精细控制的消息包**             | 包可以被拆分并作用于单个部件，并且只有使用了某一个区域设置时才延迟加载。这样，消息包也可以充分利用应用程序其他资源使用的分层和按包交付技术。                                                                 |
| **本地化的消息、日期和数字格式** | 使用行业标准的 [Unicode CLDR 格式化](http://cldr.unicode.org/)规则。CLDR 格式化数据功能是可选的，仅当需要使用高级格式化时才会加载。如果应用程序只需基本的本地化消息替换，则使用 Dojo `i18n` 即可。           |
| **响应式的区域设置**             | 与 Dojo 应用程序其他响应式的状态更改类似，当改变区域设置后，会自动重载消息，并重新渲染受影响的部件。<br>如果单独使用 `i18n` 模块（如用在非 dojo 应用程序中），则可以通过监听器的回调函数来指定区域变更事件。 |
| **可回退的区域设置检测**         | 如果没有显式指定根区域，则必须确保设置了默认区域。<br>当运行在客户端时，默认为用户或系统的区域设置；当运行在服务器端时，默认为进程或主机的区域设置。                                                         |

# 基本用法

## 国际化部件

-   从单个默认语言开始（英语）。

> .dojorc

```ts
{
	"build-app": {
		"locale": "en"
	}
}
```

> src/widgets/MyI18nWidget.tsx

**基于函数的部件：**

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import i18n from '@dojo/framework/core/middleware/i18n';

import myWidgetMessageBundle from '../nls/en/MyI18nWidget.ts';

const factory = create({ i18n });

export default factory(function MyI18nWidget({ middleware: { i18n } }) {
	const { messages } = i18n.localize(myWidgetMessageBundle);

	return <div title={messages.title}>{messages.content}</div>;
});
```

**基于类的部件：**

```tsx
import { WidgetBase } from '@dojo/framework/core/WidgetBase';
import { tsx } from '@dojo/framework/core/vdom';

import I18nMixin from '@dojo/framework/core/mixins/I18n';
import myWidgetMessageBundle from '../nls/en/MyI18nWidget.ts';

export default class MyI18nWidget extends I18nMixin(WidgetBase) {
	protected render() {
		const { messages } = this.localizeBundle(myWidgetMessageBundle);

		return <div title={messages.title}>{messages.content}</div>;
	}
}
```

> src/nls/en/MyI18nWidget.ts

```ts
export default {
	messages: {
		title: 'Hello',
		content: 'This is an internationalized widget'
	}
};
```

## 添加部件的本地化语言包

-   支持两种语言 - 默认为英语，同时也支持法语翻译，任何将 `fr` 设置为主要语言的用户都会使用法语翻译。

> .dojorc

```ts
{
	"build-app": {
		"locale": "en",
		"supportedLocales": [ "fr" ]
	}
}
```

> src/nls/en/MyI18nWidget.ts

```ts
export default {
	locales: {
		fr: () => import('../fr/MyI18nWidget')
	},
	messages: {
		title: 'Hello',
		content: 'This is an internationalized widget'
	}
};
```

> src/nls/fr/MyI18nWidget.ts

```ts
export default {
	title: 'Bonjour',
	content: 'Ceci est un widget internationalisé'
};
```

## 在应用程序中指定根区域

在应用程序中只使用基于函数的部件和 `i18n` 中间件，则意味着无需在应用程序的 `main.ts` 或 `main.tsx` 入口点添加引导代码（bootstrapping code）。使用 `@dojo/framework/core/middleware/i18n` 中的 `i18n` 中间件，可以在顶层的 `App` 部件中设置默认区域。尚未定义区域时，可设置默认区域。

> src/App.tsx

```ts
import { create, tsx } from '@dojo/framework/core/vdom';

const factory = create({ i18n });

export default factory(function App({ middleware: { i18n } }) {
	if (!i18n.get()) {
		i18n.set({ locale: 'en-us', rtl: false });
	}
	return <div>{/* the application widgets */}</div>;
});
```

但是，如果应用程序使用了基于类的部件，例如来自 `@dojo/widgets` 套件中的部件，则需要在应用程序的注册表（registry）中定义默认区域。这需要使用 `@dojo/framework/core/mixins/I18n` 中的工具函数 `registryI18nInjector`。

> src/main.tsx

```ts
import renderer, { tsx } from '@dojo/framework/core/vdom';
import Registry from '@dojo/framework/core/Registry';
import { registerI18nInjector } from '@dojo/framework/core/mixins/I18n';

import App from './App';

const registry = new Registry();
registerI18nInjector({ locale: 'en-us', rtl: false }, registry);

const r = renderer(() => <App />);
r.mount({ registry });
```

## 更改应用程序中的区域设置

-   使用 [i18n 中间件](/learn/middleware/available-middleware#i18n)，用户可在支持的区域设置之间进行选择，然后使用中间件的 `.set` API 更改区域。

**提醒：** 当同时使用基于类的部件和基于函数的部件时，此中间件应该与 [registeri18nInjector](/learn/i18n/internationalizing-a-dojo-application/#providing-locale-data-to-i18n-aware-widgets) 一起使用，以便将区域设置的变更以响应的方式传播给所有支持 i18n 的部件。

> src/widgets/LocaleChanger.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import i18n from '@dojo/framework/core/middleware/i18n';

const factory = create({ i18n });

export default factory(function LocaleChanger({ middleware: { i18n } }) {
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
		</div>
	);
});
```
