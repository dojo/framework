# 应用程序的根路径

<!--
https://github.com/dojo/framework/blob/master/docs/en/building/supplemental.md
commit e19c12a6d4b6867e4d653e35218f936d5da6eace
-->

应用程序中的超链接、图片和资源都是从应用程序的根路径向外提供的。根路径默认为 `/`，但可以在 `.dojorc` 中添加 `base` 选项来配置根路径。

> .dojorc

```json
{
	"build-app": {
		"base": "./some-directory/"
	}
}
```

## 不是从根路径开始托管

如果 Dojo 应用程序不是托管在 web 服务器的根路径下，则可能需要修改根路径。例如，一个应用是通过 ``http://example.com/incredible-app` 访问的，则需要将根路径设置为 `/incredible-app/`。

## 本地构建

根据环境的不同，如可能为开发环境构建时需要修改根路径，但是为生产环境构建时需要使用默认的根路径（或者使用其他根路径）。假如在开发服务器上，所有内容都放在 `/var/www/html` 目录下，但该目录下存在多个项目，因此每个项目都存放在不同的子目录下。因此在本地环境中，运行 `/var/www/html/incredible-app/output/dev` 下的应用是完全有可能的。

要实现此类配置，需创建一个开发环境专用的 `.dojorc` 文件。

> .dojorc.local

```json
{
	"build-app": {
		"base": "incredible-app/output/dev/"
	}
}
```

将这个专用于本地开发的配置文件放到合适的位置，然后在构建时使用该配置。

```shell
dojo build app --dojorc .dojorc.local -m dev
```

# 创建包

一个包就是一部分代码，它用于表示一部分功能。可以按需异步、并行加载包。与不使用任何代码拆分技术的应用程序相比，合理分包的应用程序可以显著提高响应速度，需要请求的字节数更少，加载的时间更短。在处理大型应用程序时，这一点尤其重要，因为这类应用程序的大部分表现层逻辑在初始化时是不需要加载的。

Dojo 尝试使用路由和 outlet 智能地做出选择，自动将代码拆分为更小的包。通常各个包内的代码都是紧密相关的。这是构建系统内置的功能，可直接使用。但是，对于有特殊分包需求的用户，Dojo 还允许在 `.dojorc` 配置文件中显示定义包。

默认情况下，Dojo 应用程序只创建一个应用程序包。但是 [@dojo/cli-build-app](https://github.com/dojo/cli-build-app) 提供了很多配置选项，这些选项可将应用程序拆分为较小的、可逐步加载的包。

## 使用路由自动分包

默认情况下，Dojo 会基于应用程序的路由自动创建包。要做到这一点需要遵循以下几条规则。

1.  `src/routes.ts` 必须默认导出路由配置信息
2.  部件所属的模块必须默认导出部件
3.  `Outlet` 的 `render` 函数必须使用内联函数

> src/routes.ts

```ts
export default [
	{
		path: 'home',
		outlet: 'home',
		defaultRoute: true
	},
	{
		path: 'about',
		outlet: 'about'
	},
	{
		path: 'profile',
		outlet: 'profile'
	}
];
```

> src/App.ts

```tsx
export default class App extends WidgetBase {
	protected render() {
		return (
			<div classes={[css.root]}>
				<Menu />
				<div>
					<Outlet key="home" id="home" renderer={() => <Home />} />
					<Outlet key="about" id="about" renderer={() => <About />} />
					<Outlet key="profile" id="profile" renderer={() => <Profile username="Dojo User" />} />
				</div>
			</div>
		);
	}
}
```

将会为应用程序的每个顶级路由生成单独的包。在本例中，会生成一个应用程序的主包以及 `src/Home`、`src/About` 和 `src/Profile` 三个包。

使用 [@dojo/cli-create-app](https://github.com/dojo/cli-create-app/) 新建一个应用程序，然后运行 `npm run build`，就可看到自动分包的实际效果。Dojo 将自动为示例应用程序中的所有路由创建包。

## 手动分包

可以在 `.dojorc` 配置文件中手动分包，这就为应用程序提供了一种声明式代码拆分的手段。当自动根据路由分包无法满足需求时，这对于将应用程序拆分为更小的包是极其有用的。

`bundles` 功能是 build app 命令的一部分。配置由由一组包名和紧随其后的文件列表或匹配符组成。

例如，以下配置将 `About` 和 `Profile` 合在一个包中，并命名为 `additional.[hash].js`。在 `w()` 中使用的部件模块将被自动转换为在父部件中延迟加载的本地注册项。

> .dojorc

```json
{
	"build-app": {
		"bundles": {
			"additional": ["src/widgets/About", "src/widgets/Profile"]
		}
	}
}
```

如果我们想分地区创建国际化模块，我们应该使用通配符以确保将每个语言目录下的所有文件都会包含在内。

> .dojorc

```json
{
	"build-app": {
		"bundles": {
			"fr": ["src/**/nls/fr/**"],
			"de": ["src/**/nls/de/**"]
		}
	}
}
```

在这种情况下，Dojo 将创建名为 `fr.[hash].js` 的包，和名为 `de.[hash].js` 的包。想了解更新信息，请参阅国际化参考指南中的[使用消息包](/learn/i18n/working-with-message-bundles)。

## 分包注意事项

<!-- TODO I am not confident in what I am saying here. Under what conditions will duplication of common/shared resources occur? How do we avoid this? Can we define a bundle for common widgets? Should I talk about the [bundle analyzer](https://github.com/dojo/cli-build-app/blob/master/README.md#bundle-analyzer) -->

有时，根据构建工具自动分包或者在 `.dojorc` 中手动定义的包中会重复包含被多个包共享的资源。有一些是无法避免的。一个避免重复的法则是尝试将共享代码移到应用程序依赖树的最外围。换句话说，就是尽可能减少共享代码之间的依赖。如果大量的代码在包之间共享（例如，公共的部件），请考虑将这些资源放在一个包中。

# 静态资源

很多静态资源，如在模块中导入的 CSS 和图片，在构建过程中会被自动内联。但是，有时还需要为网站图标（favicon）或视频文件等静态资源提供服务。

静态资源存放在项目根目录下的 `assets/` 文件夹中。在构建时，这些资源会被复制到应用程序构建版本的 `assets/` 文件夹中。

构建也会解析 `src/index.html` 中引用的 CSS、JavaScript 和图片资源等，对这些资源名进行哈希处理，并在输出文件夹中包含这些资源。可以将 favicon 存放在 `src` 文件夹中，然后在 `src/index.html` 中引用。构建会自动对 favicon 文件名进行哈希处理，并会将文件复制到输出文件夹中，然后重命名为 `favicon.[hash].ico`。

# 渐进式 web 应用程序

渐进式 web 应用程序（PWA）由一系列技术和模式组成，主要用于改善用户体验，帮助创建更可靠和可用的应用程序。尤其是移动用户，他们会发现应用程序能更好的集成到他们的设备中，就跟本地安装的应用程序一样。

渐进式 web 应用程序主要由两种技术组成：Service Worker 和 Manifest。Dojo 的构建命令通过 `.dojorc` 的 `pwa` 对象支持这两种技术。

## Manifest

[Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest) 在一个 JSON 文件中描述一个应用程序，并提供了一些详细信息，因此可以直接从万维网安装到设备的主屏幕上。

> .dojorc

```json
{
	"build-app": {
		"pwa": {
			"manifest": {
				"name": "Todo MVC",
				"description": "A simple to-do application created with Dojo",
				"icons": [
					{ "src": "./favicon-16x16.png", "sizes": "16x16", "type": "image/png" },
					{ "src": "./favicon-32x32.png", "sizes": "32x32", "type": "image/png" },
					{ "src": "./favicon-48x48.png", "sizes": "48x48", "type": "image/png" },
					{ "src": "./favicon-256x256.png", "sizes": "256x256", "type": "image/png" }
				]
			}
		}
	}
}
```

当提供了 manifest 信息时，`dojo build` 将在应用程序的 `index.html` 中注入必需的 `<meta>` 标签。

-   `mobile-web-app-capable="yes"`: 告知 Android 上的 Chrome 可以将此应用程序添加到用户的主界面上。
-   `apple-mobile-web-app-capable="yes"`: 告知 iOS 设备可以将此应用程序添加到用户的主界面上。
-   `apple-mobile-web-app-status-bar-style="default"`: 告知 iOS 设备，状态栏使用默认外观。
-   `apple-touch-icon="{{icon}}"`: 相当于 Manifest 中的 icons，因为 iOS 当前没有从 Manifest 中读取 icons，所以需要为 icons 数组中每张图片单独注入一个 meta 标签。

## Service worker

Service worder 是一种 web worker，能够拦截网络请求、缓存和提供资源。Dojo 的 build 命令能够自动构建功能全面的 service worker，它会在启动时激活，然后使用配置文件完成预缓存和自定义路由处理。

例如，我们编写一个配置文件来创建一个简单的 service worker，它会缓存除了 admin 包之外的所有应用程序包，也会缓存应用程序最近访问的图像和文章。

> .dojorc

```json
{
	"build-app": {
		"pwa": {
			"serviceWorker": {
				"cachePrefix": "my-app",
				"excludeBundles": ["admin"],
				"routes": [
					{
						"urlPattern": ".*\\.(png|jpg|gif|svg)",
						"strategy": "cacheFirst",
						"cacheName": "my-app-images",
						"expiration": { "maxEntries": 10, "maxAgeSeconds": 604800 }
					},
					{
						"urlPattern": "http://my-app-url.com/api/articles",
						"strategy": "cacheFirst",
						"expiration": { "maxEntries": 25, "maxAgeSeconds": 86400 }
					}
				]
			}
		}
	}
}
```

### ServiceWorker 配置

在底层，`@dojo/webpack-contrib` 中的 `ServicerWorkerPlugin` 用于生成 service worker，它的所有选项都是有效的 `pwa.serviceWorker` 属性。

| 属性           | 类型       | 可选 | 描述                                                          |
| -------------- | ---------- | ---- | ------------------------------------------------------------- |
| bundles        | `string[]` | 是   | 需要进行预缓存的一组包。默认是所有包。                        |
| cachePrefix    | `string`   | 是   | 在运行时进行预缓存使用的前缀。                                |
| clientsClaim   | `boolean`  | 是   | Service worker 是否要在开始激活时控制客户端。默认为 `false`。 |
| excludeBundles | `string[]` | 是   | 要从预缓存中排除的一组包。默认为 `[]`。                       |
| importScripts  | `string[]` | 是   | 需要在 service worker 中加载的一组脚本的路径。                |
| precache       | `object`   | 是   | 描述预缓存配置选项的对象（见下文）。                          |
| routes         | `object[]` | 是   | 一组描述要在运行时缓存的配置对象（见下文）。                  |
| skipWaiting    | `boolean`  | 是   | Service worker 是否要跳过“等待”生命周期。                     |

#### 预缓存

`precache` 选项使用以下选项控制预缓存行为：

| 属性         | 类型                   | 可选 | 描述                                                                                               |
| ------------ | ---------------------- | ---- | -------------------------------------------------------------------------------------------------- |
| baseDir      | `string`               | 是   | 匹配 `include` 时使用的根目录。                                                                    |
| ignore       | `string[]`             | 是   | 一组通配符模式的字符串，当生成预缓存项时用于匹配需要忽略的文件。默认为 `[ 'node_modules/**/*' ]`。 |
| include      | `string` or `string[]` | 是   | 一个或者一组通配符模式的字符串，用于匹配 precache 应该包含的文件。默认是构建管道中的所有文件。     |
| index        | `string`               | 是   | 如果请求以 `/` 结尾的 URL 失败，则应该查找的 index 文件名。默认为 `'index.html'`。                 |
| maxCacheSize | `number`               | 是   | 往预缓存中添加的每一个文件不应超过的最大字节数。默认为 `2097152` （2 MB）。                        |
| strict       | `boolean`              | 是   | 如果为 `true`，则 `include` 模式匹配到一个不存在的文件夹时，构建就会失败。默认为 `true`。          |
| symlinks     | `boolean`              | 是   | 当生成预缓存时是否允许软连接（symlinks）。默认为 `true`。                                          |

#### 运行时缓存

除了预缓存之外，还可以为特定路由提供缓存策略，以确定它们是否可以缓存以及如何缓存。`routes` 选项是一组包含以下属性的对象：

| 属性                  | 类型     | 可选 | 描述                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------- | -------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| urlPattern            | `string` | 否   | 用于匹配特定路由的模式字符串（会被转换为正则表达式）。                                                                                                                                                                                                                                                                                                                                                                         |
| strategy              | `string` | 否   | 缓存策略（见下文）。                                                                                                                                                                                                                                                                                                                                                                                                           |
| options               | `object` | 是   | 一个描述附加选项的对象。每个选项的详情如下。                                                                                                                                                                                                                                                                                                                                                                                   |
| cacheName             | `string` | 是   | 路由使用的缓存名称。注意 `cachePrefix` _不会_ 添加到缓存名前。默认为主运行时缓存（`${cachePrefix}-runtime-${domain}`）。                                                                                                                                                                                                                                                                                                       |
| cacheableResponse     | `object` | 是   | 使用 HTTP 状态码或者报头（Header）信息来决定是否可以缓存响应的内容。此对象有两个可选属性：`statuses` 和 `headers`。`statuses` 是一组对缓存生效的状态码。`headers` 是一组 HTTP 的 header 和 value 键值对；至少要与一个报头匹配，响应才会被视为有效。当 `strategy` 的值是 `'cacheFirst'` 时，默认为 `{ statuses: [ 200 ] }`；当 `strategy` 的值为 `networkFirst` 或者 `staleWhileRevalidate` 时，默认为 `{ statuses: [0, 200] }` |
| expiration            | `object` | 是   | 控制如何让缓存失效。此对象有两个可选属性。`maxEntries` 是任何时间可以缓存的响应个数。一旦超过此最大值，就会删除最旧的条目。`maxAgeSeconds` 是一个响应能缓存的最长时间（以秒为单位），超过此时长就会被删除。                                                                                                                                                                                                                    |
| networkTimeoutSeconds | `number` | 是   | 与 `networkFirst` 策略一起使用，指定当网络请求的响应多久没有返回时就从缓存中获取资源，单位为秒。                                                                                                                                                                                                                                                                                                                               |

目前支持四种路由策略：

-   `networkFirst` 尝试通过网络加载资源，如果请求失败或超时才从缓存中获取资源。对于频繁更改或者可能频繁更改（即没有版本控制）的资源，这是一个很有用的策略。
-   `cacheFirst` 优先从缓存中加载资源，如果缓存中不存在，则通过网络获取。这对于很少更改或者能缓存很长一段时间的资源（受版本控制的资源）来说是最好的策略。
-   `networkOnly` 强制始终通过网络获取资源，对于无需离线处理的资源是很有用的策略。
-   `staleWhileRevalidate` 同时从缓存和网络中请求资源。网络成功响应后都会更新缓存。此策略最适用于不需要持续更新的资源，比如用户信息。但是，当获取第三方资源时没有发送 CORS 报头，就无法读取响应的内容或验证状态码。因此，可能会缓存错误的响应。在这种情况下，`networkFirst` 策略可能更适合。

# 构建时渲染

构建时渲染（Build-time rendering，简称 BTR）在构建过程中将一个路由渲染为一个 HTML，并将在初始视图中显示的、关键的 CSS 和资源嵌入到页面中。Dojo 能预渲染路由使用的初始 HTML，并直接注入到页面中，这样会带来很多与服务器端渲染（SSR）相同的好处，如性能提升、搜索引擎优化且没有引入 SSR 的复杂性。

## 使用 BTR

首先确保 `index.html` 中包含一个拥有 `id` 属性的 DOM 节点。Dojo 的虚拟 DOM 会使用这个节点来比较和渲染应用程序的 HTML。BTR 需要此设置，这样它就能渲染在构建阶段生成的 HTML。这将会为路由创建一个响应非常快的初始渲染。

> index.html

```html
<!DOCTYPE html>
<html lang="en-us">
	<head>
		<title>sample-app</title>
		<meta name="theme-color" content="#222127" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
	</head>
	<body>
		<div id="app"></div>
	</body>
</html>
```

然后将应用程序挂载到指定的 DOM 节点上：

> main.ts

```ts
const r = renderer(() => w(App, {}));
const domNode = document.getElementById('app') as HTMLElement;
r.mount({ registry, domNode });
```

然后更新项目的 `.dojorc` 配置文件，设置根 DOM 节点的 `id` 和在构建时要渲染的路由。

> .dojorc

```json
{
	"build-app": {
		"build-time-render": {
			"root": "app",
			"paths": [
				"#home",
				{
					"path": "#comments/9999",
					"match": ["#comments/.*"]
				}
			]
		}
	}
}
```

此配置描述了两个路由。一个是 `home` 路由，一个是较复杂的 `comments` 路由。`comments` 是一个比较复杂的路由，需要传入参数。`match` 参数用于确保在构建时为此路由生成的 HTML 可以应用到与此正则表达式匹配的任何路由上。

BTR 在构建时为每个渲染路径（path）生成一份屏幕快照，存在 `./output/info/screenshots` 文件夹中。

### History 管理器

构建时渲染支持使用 `@dojo/framework/routing/history/HashHistory` 或 `@dojo/framework/routing/history/StateHistory` history 管理器的应用程序。当使用 `HashHistory` 时，确保所有的路径都是以 `#` 字符开头。

## `build-time-render` 功能标记

运行时渲染公开了一个 `build-time-render` 功能标记，可用于跳过在构建时不能执行的功能。这样在创建一个初始渲染时，就可以避免对外部系统调用 `fetch`，而是提供静态数据。

```ts
if (!has('build-time-render')) {
	const response = await fetch(/* remote JSON */);
	return response.json();
} else {
	return Promise.resolve({
		/* predefined Object */
	});
}
```

## Dojo Blocks

Dojo 提供了一个 block 系统，在构建阶段的渲染过程中会执行 Node.js 代码。执行的结果会被写入到缓存中，然后在浏览器运行阶段会以相同的方式、透明的使用这些缓存。这就为使用一些浏览器中无法实现或者性能不佳的操作开辟了新的机会。

例如，Dojo 的 block 模块可以读取一组 markdown 文件，将其转换为 VNode，并使它们可以在应用程序中渲染，所有这些都可在构建时执行。然后 Dojo block 模块的构建结果会缓存在应用程序的包中，以便在运行时在浏览器中使用。

Dojo block 模块的用法与在 Dojo 部件中使用中间件或 meta 类似。为了让 Dojo 构建系统能识别并运行 block 模块，必须满足以下三个条件：

1.  模块名必须使用 `.block` 后缀，如 `src/readFile.block.ts`
2.  Block 模块只能有一个默认导出
3.  Block 中返回的内容（不论是从 promise 中解析，还是直接返回）必须能被序列化为 json

除此之外，无需扩展配置或其他编写模式。

例如，block 模块读取一个文本文件，然后将内容返回给应用程序。

> src/readFile.block.ts

```ts
import * as fs from 'fs';
import { resolve } from 'path';

export default (path: string) => {
	path = resolve(__dirname, path);
	return fs.readFileSync(path, 'utf8');
};
```

> src/widgets/MyBlockWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import block from '@dojo/framework/core/middleware/block';

import readFile from '../readFile.block';

const factory = create({ block });
export default factory(function MyBlockWidget({ middleware: { block } }) {
	const message = block(readFile)('../content/hello-dojo-blocks.txt');
	return <div>{message}</div>;
});
```

这个部件会在构建阶段运行 `src/readFile.block.ts` 模块来读取指定文件的内容，然后在部件渲染时输出该内容。

# 按条件选取代码

构建工具的静态代码分析工具能够从它创建的包中移除无用的代码。命名的条件块是使用 dojo 框架的 `has` 模块定义的，并且可以在 `.dojorc` 中静态设置为 true 或 false，然后在构建阶段移除。

> main.ts

```ts
import has from '@dojo/framework/has';

if (has('production')) {
	console.log('Starting in production');
} else {
	console.log('Starting in dev mode');
}

export const mode = has('production') ? 'dist' : 'dev';
```

> .dojorc

```json
{
	"build-app": {
		"features": {
			"production": true
		}
	}
}
```

上述的 `production` 功能将**构建生产版本**（`dist` 模式）设置为 `true`。构建系统使用 `@dojo/framework/has` 将代码标记为无法访问，并在构建时移除这些无用的代码。

比如，上述代码将重写为：

> static-build-loader 输出

```js
import has from '@dojo/framework/has';

if (true) {
	console.log('Starting in production');
} else {
	console.log('Starting in dev mode');
}

export const mode = true ? 'dist' : 'dev';
```

然后，构建工具的无用分支移除工具将移除无用的代码。

> Uglify 输出

```js
console.log('Starting in production');
export const mode = 'dist';
```

任何没有被静态断言的功能都不会被重写。这就允许在运行时来确定是否存在这个功能。

## 已提供的功能

构建系统已提供以下功能（feature），用于帮助识别特定的环境或操作模式。

| 功能标记            | 描述                                                                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `debug`             | 提供了一种为代码创建代码路径的方法，该代码路径仅在调试或者提供更强的诊断时有用，在为 _生产_ 构建时是不需要的。默认为 `true`，但在构建生产版本时应该静态地配置为 `false`。 |
| `host-browser`      | 确定当前环境下 global 上下文中是否包含 `window` 和 `document` 对象，因此通常可以安全地假设代码运行在浏览器环境下。                                                        |
| `host-node`         | 尝试检测当前环境是不是 node 环境。                                                                                                                                        |
| `build-time-render` | 在构建期间渲染时由 BTR 系统静态定义。                                                                                                                                     |

# 外部依赖

通常不能被打包的非模块化库或者独立的应用程序，如果需要引入到 dojo 应用程序中，则可以通过提供一个 `require` 或 `define` 实现，并在项目的 `.dojorc` 文件中做一些配置。

要配置外部依赖项，则需要为 `build-app` 配置对象设置 `externals` 属性。`externals` 是一个对象，包含以下两个属性：

-   `outputPath`: 一个可选属性，指定一个将文件复制到何处的输出路径。
-   `dependencies`: 一个必填的数组，定义哪些模块应该通过外部加载器加载，以及在构建时应该包含哪些文件。每个记录可以是以下两种类型之一：
    -   一个字符串，表示应该使用外部加载器加载此路径及其所有子路径。
    -   一个对象，为需要复制到构建版应用程序的依赖提供附加配置项。此对象具有以下属性：

| 属性     | 类型                                                    | 可选 | 描述                                                                                                                                                                                                                                                                                                                                                                                         |
| -------- | ------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `from`   | `string`                                                | 否   | 相对于项目根目录的路径，指定位于何处的文件夹或目录要复制到已构建应用程序中。                                                                                                                                                                                                                                                                                                                 |
| `to`     | `string`                                                | 是   | 一个路径，表示将 `from` 路径下的依赖复制到何处的目标路径。默认情况下，依赖会被复制到 `${externalsOutputPath}/${to}`；如果没有设置 `to`，依赖会被复制到 `${externalsOutputPath}/${from}`。如果路径中包含 `.` 字符或者路径表示的是一个文件夹，则需要以正斜杠结尾。                                                                                                                             |
| `name`   | `string`                                                | 是   | 在应用程序代码中引用的模块 id 或者全局变量名。                                                                                                                                                                                                                                                                                                                                               |
| `inject` | `string, string[], or boolean`                          | 是   | 此属性表示这个依赖定义的（或者包含的），要在页面中加载的脚本或样式文件。如果 `inject` 的值为 `true`，那么就会在页面中加载 `to` 或 `from` 指定位置的文件。如果依赖的是文件夹，则 `inject` 可以被设置为一个或者一组字符串，来定义一个或多个要注入的文件。`inject` 中的每个路径都应该是相对于 `${externalsOutputPath}/${to}` 或 `${externalsOutputPath}/${from}`（具体取决于是否指定了 `to`）。 |
| `type`   | `'root' or 'umd' or 'amd' or 'commonjs' or 'commonjs2'` | 是   | 强制模块用指定的方法解析。如果是 AMD 风格，则必须使用 `umd` 或 `amd`。如果是 node 风格则必须使用 `commonjs`，并且值为 `root` 时以全局的方式访问对象。                                                                                                                                                                                                                                        |

例如，以下配置会将 `src/legacy/layer.js` 注入到应用程序页面中；注入定义了 `MyGlobal` 全局变量的文件；声明模块 `a` 和 `b` 为外部依赖，且要委托给外部层；然后复制 `node_modules/legacy-dep` 下的文件，并将其中的几个文件注入到页面中。所有文件都将被复制到 `externals` 文件夹中，也可以使用 `externals` 配置中的 `outputPath` 属性来重新指定文件夹。

```json
{
	"build-app": {
		"externals": {
			"dependencies": [
				"a",
				"b",
				{
					"from": "node_modules/GlobalLibrary.js",
					"to": "GlobalLibrary.js",
					"name": "MyGlobal",
					"inject": true
				},
				{ "from": "src/legacy/layer.js", "to": "legacy/layer.js", "inject": true },
				{
					"from": "node_modules/legacy-dep",
					"to": "legacy-dep/",
					"inject": ["moduleA/layer.js", "moduleA/layer.css", "moduleB/layer.js"]
				}
			]
		}
	}
}
```

`externals` 中包含的依赖项的类型会被安装到 `node_modules/@types` 中，这跟其它依赖项是一样的。

因为这些文件位于主构建（main build）之外，所以在生产构建中不会执行版本控制或哈希处理（在 `inject` 中指定资源的链接除外）。可以在 `to` 属性中指定版本号，将依赖复制到对应版本的文件夹下，这样就能避免缓存不同版本的文件。

# 脱离 Dojo 构建管道

<!-- TODO do we want to add any information from here: https://github.com/dojo/cli-build-app/blob/master/README.md#eject -->

Dojo 的构建管道为项目提供了一个端到端的工具链，但是，在极少数情况下，可能需要自定义工具链。只要将项目脱离 Dojo 的构建管道，就可以自定义工具链。

将项目脱离构建管道，是一个不可逆的、单向过程，它会导出 Webpack、Intern 以及 `dojo` 命令使用的其他项目的底层配置文件。如果提供的生成工具无法提供所需的功能或特性，推荐的方法是 fork 选定的构建命令，然后往工具中添加额外的功能。Dojo 的 CLI 本质上是专门按模块化设计的，考虑到了这个用例。

要将一个项目脱离出 dojo 构建管道，请使用 `dojo eject` 命令，它将提示你确实已明白过程是不可逆的。这个导出过程将所有已安装的 dojo 命令中导出的配置信息存到 `config` 文件夹中。这个过程也会安装一些项目需要的附加依赖。

现在项目已经是一个 webpack 项目。可以通过修改 `config/build-app/base.config.js` 来更改构建配置。

然后，可以通过运行 webpack 的构建命令并提供配置项来触发一个构建。此外，使用 webpack 的 env 标记（例如 --env.mode=dev）来指定模式，默认为 dist。

```bash
./node_modules/.bin/webpack --config=config/build-app/ejected.config.js --env.mode=[mode]
```
