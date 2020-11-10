# 介绍

<!--
https://github.com/dojo/framework/blob/master/docs/en/routing/introduction.md
commit c835aebb343dd3f168cc5941261942f3f53fb371
-->

Dojo 的路由包为 web 应用程序提供了一流的声明式路由解决方案。部件是 Dojo 应用程序的基本概念，路由并不会影响部件的使用方式。Dojo 路由提供了一组部件，可直接在 Dojo 应用程序中使用，让应用程序的部件与路由关联，却不会影响其功能、可重用性和属性接口。

| 功能                   | 描述                                                            |
| ---------------------- | --------------------------------------------------------------- |
| **支持多个历史管理器** | 路由提供了一组历史选择器，可根据应用程序的实际需要选择          |
| **现成的路由部件**     | 有几个现成的路由部件，如 `Link` 和 `ActiveLink`                 |
| **自动化代码拆分**     | 与 `@dojo/cli-build-app` 结合使用，会自动按顶级路由进行代码拆分 |

## 基本用法

### 为应用程序添加路由

-   添加一个初始的路由配置，该配置定义一个 url 路径，然后映射到一个路由标识符和 `outlet` 上。

> src/routes.ts

```ts
export default [
	{
		id: 'home',
		path: 'home',
		outlet: 'main'
	},
	{
		id: 'about',
		path: 'about',
		outlet: 'main'
	},
	{
		id: 'profile',
		path: 'profile',
		outlet: 'main'
	}
];
```

-   使用应用程序注册器（registry）注册路由，让应用程序支持路由。

> src/main.tsx

```tsx
import renderer, { tsx } from '@dojo/framework/core/vdom';
import Registry from '@dojo/framework/core/Registry';
import { registerRouterInjector } from '@dojo/framework/routing/RouterInjector';

import routes from './routes';
import App from './App';

const registry = new Registry();
// creates a router with the routes and registers the router with the registry
registerRouterInjector(routes, registry);

const r = renderer(() => <App />);
r.mount({ registry });
```

-   添加一个 `Route` 部件，当访问 `home` 路由时显示文本“Home”。`Route` 也是部件，当路由标识与路径匹配时用于显示一些内容。`Route` 部件的 `id` 属性与应用程序 `src/routes.ts` 文件中的 id 属性要关联起来。

> src/App.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import Route from '@dojo/framework/routing/Route';

const factory = create();

export default factory(function App() {
	return (
		<div>
			<Route id="home" renderer={() => <div>Home</div>} />
			<Route id="about" renderer={() => <div>About</div>} />
			<Route id="profile" renderer={() => <div>Profile</div>} />
		</div>
	);
});
```

或者使用 `Outlet` 部件，查看 [`Outlet` 文档](/learn/routing/outlets)了解更多信息：

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import Outlet from '@dojo/framework/routing/Outlet';

const factory = create();

export default factory(function App() {
	return (
		<div>
			<Outlet id="main">
				{{
					home: <div>Home</div>,
					about: <div>About</div>,
					profile: <div>Profile</div>
				}}
			</Outlet>
		</div>
	);
});
```

-   路由的 URL 是由路由配置中的 `path` 元素决定的。在本例中，`path` 的值为 `home`，所以使用 URL 路径 `/#home` 可以访问此路由。
    -   默认情况下，路由使用 [HashHistory](/learn/routing/history-managers#hashhistory) 作为历史管理器，该管理器要求在路由路径前加上 `#`。其他[历史管理器](/learn/routing/history-managers)可用于支持其他历史管理器的应用场景。

### 路径和查询参数

路由参数是路由配置中的占位符，可为该段匹配任意值。参数是由大括号定义的，例如：`{param}`。

> src/routes.ts

```ts
export default [
	{
		id: 'home',
		path: 'home/{page}',
		outlet: 'home'
	}
];
```

参数值会被注入到匹配的 `Route` 的 `renderer` 属性中。

> src/App.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import Route from '@dojo/framework/routing/Route';

const factory = create();

export default factory(function App() {
	return (
		<div>
			<Route id="home" renderer={(matchDetails) => <div>{`Home ${matchDetails.params.page}`}</div>} />
		</div>
	);
});
```

查询参数也可以添加到路由的 URL 中。与普通的查询参数一样，第一个参数的前缀必须是 `?`，参数间使用 `&` 字符分隔。注意，当使用查询参数时，路由配置无需调整。

> src/routes.ts

```ts
export default [
	{
		id: 'home',
		path: 'home/{page}?{queryOne}&{queryTwo}',
		outlet: 'home'
	}
];
```

> src/App.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import Route from '@dojo/framework/routing/Route';

const factory = create();

export default factory(function App() {
	return (
		<div>
			<Route
				id="home"
				renderer={(matchDetails) => {
					const { queryParams } = matchDetails;
					return <div>{`Home ${queryParams.queryOne}-${queryParams.queryTwo}`}</div>;
				}}
			/>
		</div>
	);
});
```

如果浏览器指向的 URL 路径为 `/home/page?queryOne=modern&queryTwo=dojo`，那么查询字符串就会被注入到匹配的 `Route` 的 `renderer` 方法，该注入的对象属于 `MatchDetails` 类型，可通过此对象的 `queryParams` 属性访问。使用此 URL，页面将显示“Hello modern-dojo”。如果没有提供查询参数，那么它的值将被设置为 `undefined`。

### 默认的路由和参数

-   更新路由配置，为首选路由添加 `defaultRoute: true` 以指定为默认路由。如果没有提供路由或者请求的路由未注册，则应用程序初始化时会跳转到默认路由。

> src/routes.ts

```ts
export default [
	{
		id: 'home',
		path: 'home',
		outlet: 'home',
		defaultRoute: true
	}
];
```

如果默认路由中有路径参数或查询参数，则需要指定默认值。

> src/routes.ts

```ts
export default [
	{
		id: 'home',
		path: 'home/{page}',
		outlet: 'home',
		defaultRoute: true,
		defaultParams: {
			page: 'about'
		}
	}
];
```

### 使用 Link 部件

`Link` 部件是对 anchor 标签的封装，让用户创建一个指向路由 `id` 的超链接。如果生成的超链接需要指定路径参数或查询参数，则可以通过 `params` 参数传入。

Link 属性：

-   `to: string`：对应 `route` 的 id。
-   `params: { [index: string]: string }`：为路由生成超链接时传入的参数。
-   `onClick: (event: MouseEvent) => void` （可选）：单击 `Link` 部件时调用的函数。

除了 `Link` 专有属性外，在创建 anchor 标签时，所有标准的 `VNodeProperties` 也都可设置给 `Link` 部件。

> src/App.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { Link } from '@dojo/framework/routing/Link';

const factory = create();

export default factory(function App() {
	return (
		<div>
			<Link to="home" params={{ foo: 'bar' }}>
				Link Text
			</Link>
		</div>
	);
});
```

`ActiveLink` 部件是对 `Link` 部件的封装，如果链接处于激活状态，则会设置 `a` 节点上的样式类：

ActiveLink 属性:

-   `activeClasses: string[]`：一组样式类，当 `Link` 的路由匹配时会应用这些样式。

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { ActiveLink } from '@dojo/framework/routing/ActiveLink';

const factory = create();

export default factory(function App() {
	return (
		<div>
			<ActiveLink to="home" params={{ foo: 'bar' }} activeClasses={['link-active']}>
				Link Text
			</ActiveLink>
		</div>
	);
});
```

### 按路由拆分代码

当使用 `@dojo/cli-build-app` 时，Dojo 默认支持为所有顶层路由进行自动化代码拆分。这意味着 `Route` 的 `renderer` 中引用的所有部件都会包含在该路由专有包中，当用户访问此路由时会延迟加载。

要使用代码拆分功能，需遵循以下 4 条规则：

1.  路由配置必须是从 `src/routes.ts` 模块中默认导出。
2.  部件必须是其所属模块的默认导出。
3.  `renderer` 属性必须是内联定义的。
4.  路由配置中的 `id` 和 `outlet` 必须是静态的，并且是内联定义的。

> src/routes.ts

```ts
export default [
	{
		id: 'home',
		path: 'home',
		outlet: 'home'
	},
	{
		id: 'about',
		path: 'about',
		outlet: 'about',
		children: [
			{
				id: 'company',
				path: 'company',
				outlet: 'about-company'
			}
		]
	},
	{
		id: 'profile',
		path: 'profile',
		outlet: 'profile'
	},
	{
		id: 'settings',
		path: 'settings',
		outlet: 'settings'
	}
];
```

使用上面的路由配置，以下示例将为 `Route` 的渲染函数返回的部件生成 4 个单独的包，这 4 个部件分别是 `Home`、`About`、`Profile` 和 `Settings`。

> src/App.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import Route from '@dojo/framework/routing/Route';

import Home from './Home';
import About from './About';
import Profile from './Profile';
import Settings from './Settings';

const factory = create();

export default factory(function App() {
	return (
		<div>
			<Route id="home" renderer={() => <Home />} />
			<Route id="about" renderer={() => <About />} />
			<Route id="profile" renderer={() => <Profile />} />
			<Route id="settings" renderer={() => <Settings />} />
		</div>
	);
});
```
