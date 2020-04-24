# 配置路由

<!--
https://github.com/dojo/framework/blob/master/docs/en/routing/supplemental.md
commit c835aebb343dd3f168cc5941261942f3f53fb371
-->

路由配置是一个层级结构，用于描述整个应用程序，将 `id` 和 `outlet` 与路由路径关联起来。路由的路径中可以嵌套子路由，这样就可以构建出一个能精准反应应用程序需求的路由结构。

路由配置 API 由以下属性组成：

-   `id: string`: 路由的唯一标识。
-   `path: string`: 与 URL 匹配的路由路径片段。
-   `outlet: string`: 路由的 `outlet` 名称，`Outlet` 部件使用该值确定要渲染的内容。
-   `defaultRoute: boolean` （可选）: 将此 Outlet 标记为默认路由，当应用程序加载时，如果没有配置路由或未找到路由，则应用程序会自动跳转到此路由。
-   `defaultParams: { [index: string]: string }` （可选）: 相关的默认参数（`path` 和 `query`），如果默认路由有必填的参数，则此项必填。
-   `children: RouteConfig[]` （可选）: 嵌套的子路由配置。

> src/routes.ts

```ts
export default [
	{
		id: 'home',
		path: 'home',
		outlet: 'home',
		defaultRoute: true
	},
	{
		id: 'about',
		path: 'about',
		outlet: 'about-overview',
		children: [
			{
				id: 'about-services',
				path: '{services}',
				outlet: 'about'
			},
			{
				id: 'about-company',
				path: 'company',
				outlet: 'about'
			},
			{
				id: 'about-history',
				path: 'history',
				outlet: 'about'
			}
		]
	}
];
```

本示例将注册以下路径和路由标识：

| URL Path          | Route            |
| ----------------- | ---------------- |
| `/home`           | `home`           |
| `/about`          | `about-overview` |
| `/about/company`  | `about-company`  |
| `/about/history`  | `about-history`  |
| `/about/knitting` | `about-services` |
| `/about/sewing`   | `about-services` |

`about-services` 路由被注册为与 `/about` 后跟的任何路径匹配，这与注册的 `about-company` 和 `about-history` 有冲突，但是 Dojo 路由能确保在这些情况下也能匹配出正确的路由。

# Outlet

An outlet represents a visual location of an application that renderers different content depending on which route has been matched. Using outlets reduces boilerplate required compared to using routes, multiple routes can be associated to the same outlet to more naturally and accurately structure the application output.

Consider a typical application layout which includes a left side menu and a main content view that depending on the route has a right hand side bar:

```
-------------------------------------------------------------------
|        |                                            |           |
|        |                                            |           |
|        |                                            |           |
|        |                                            |           |
|        |                                            |           |
|  menu  |                   main                     | side-menu |
|        |                                            |           |
|        |                                            |           |
|        |                                            |           |
|        |                                            |           |
|        |                                            |           |
-------------------------------------------------------------------
```

The route configuration below specifies all the main pages to the main content outlet, but the `widget` to a `side-menu` outlet. This enables building an application that constantly renders the main content depending on route, but also include a right hand side menu for all children routes of the `widget` route.

```tsx
const routes = [
	{
		id: 'landing',
		path: '/',
		outlet: 'main',
		defaultRoute: true
	},
	{
		id: 'widget',
		path: 'widget/{widget}',
		outlet: 'side-menu',
		children: [
			{
				id: 'tests',
				path: 'tests',
				outlet: 'main'
			},
			{
				id: 'overview',
				path: 'overview',
				outlet: 'main'
			},
			{
				id: 'example'
				path: 'example/{example}',
				outlet: 'main'
			}
		]
	}
];
```

In the routing configuration above, there are two outlets defined, `main` and `side-menu`, and a simplified application layout using outlets is shown below. By default the `Outlet` will render any of the keys that equal a route id that has been matched for the outlet, in this case `main`. If a function is passed to the `Outlet` then it will render whenever _any_ route is matched for the outlet specified.

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import Outlet from '@dojo/framework/routing/Outlet';

import Menu from './Menu';
import SideMenu from './SideMenu';
import Landing from './Landing';
import Tests from './Tests';
import Example from './Example';

const factory = create();

const App = factory(function App() {
	return (
		<div>
			<Menu />
			<main>
				<div>
					<Outlet id="main">
						{{
							landing: <Landing />,
							tests: <Tests />,
							example: ({ params: { example }}) => <Example example={example}/>,
							overview: <Example example="overview"/>
						}}
					</Outlet>
				</div>
				<div>
					<Outlet id="side-menu">
						{({ params: { widget }}) => <SideMenu widget={widget}>}
					</Outlet>
				</div>
			</main>
		</div>
	);
});
```

The node structure of the `App` looks good and succinctly represents the actual visual output for the user with minimal duplication, there still is a need to duplicate the usage of the `Example` widget across to different routes. This can be solved by using the `matcher` property to override the default route matching rules. The `matcher` receives the `defaultMatches` and a `matchDetailsMap` in order to make custom matching decisions. In the final example below the usage of `Example` has been combined into a new `key`, `details` that does not exist as a route. This will never match for the outlet unless we override the default matches to set it to true when either the `example` or `overview` route has matched. Finally in the `details` renderer the example property has been defaulted to `overview` to maintain the same behavior as before.

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import Outlet from '@dojo/framework/routing/Outlet';

import Menu from './Menu';
import SideMenu from './SideMenu';
import Landing from './Landing';
import Tests from './Tests';
import Example from './Example';

const factory = create();

const App = factory(function App() {
	return (
		<div>
			<Menu />
			<main>
				<div>
					<Outlet id="main" matcher={(defaultMatches, matchDetailsMap) => {
						defaultMatches.details = matchDetailsMap.has('example') || matchDetailsMap.has('overview');
						return defaultMatches;
					}}>
						{{
							landing: <Landing />,
							tests: <Tests />,
							details: ({ params: { example = "overview" }}) => <Example example={example}/>,
						}}
					</Outlet>
				</div>
				<div>
					<Outlet id="side-menu">
						{({ params: { widget }}) => <SideMenu widget={widget}>}
					</Outlet>
				</div>
			</main>
		</div>
	);
});
```

# 路由 API

Dojo 路由公开了一个 API，用于生成链接并导航到链接，获取当前路由的参数，并校验路由 id 是否能匹配上。

-   `link(route: string, params: Params = {}): string | undefined`: 基于路由 id 和可选的参数生成一个链接。如果没有传入参数，将尝试使用当前路由的参数，然后再尝试使用路由配置中提供的默认参数。如果无法生成一个链接，则返回 `undefined`。
-   `setPath(path: string): void`: S 设置路由中的路径。
-   `get currentParams(): { [string: index]: string }`: 返回当前路由的参数。
-   `getRoute(id: string): RouteContext | undefined`: 如果根据路由 id 能够匹配到路由，则返回 `RouteContext`。如果匹配不到，则返回 `undefined`。

## 为路由生成链接

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
		outlet: 'about-overview',
		children: [
			{
				id: 'about-services',
				path: '{services}',
				outlet: 'about',
				defaultParams: {
					services: 'sewing'
				}
			},
			{
				id: 'about-company',
				path: 'company',
				outlet: 'about'
			},
			{
				id: 'about-history',
				path: 'history',
				outlet: 'about'
			}
		]
	}
];
```

> src/main.ts

```ts
import Router from '@dojo/framework/routing/Router';

import routes from './routes';

const router = new Router(routes);

// returns `#home`
console.log(router.link('home'));

// returns `#about`
console.log(router.link('about-overview'));

// returns `#about/company`
console.log(router.link('about-company'));

// returns `#about/history`
console.log(router.link('about-history'));

// returns `#about/knitting`
console.log(router.link('about-services'), { services: 'knitting' });

// Uses the current URL then default params to returns `#about/knitting`
// when the current route is `#about/cooking` returns `#about/cooking`
// when the current route does not contain the params returns `#about/sewing`
console.log(router.link('about-services'));

// returns `undefined` for an unknown route
console.log(router.link('unknown'));
```

## 更改路由

```ts
import Router from '@dojo/framework/routing/Router';

import routes from './routes';

const router = new Router(routes);

// goto `#home` route
router.setPath('#home');
```

## 获取当前参数

```ts
import Router from '@dojo/framework/routing/Router';

import routes from './routes';

const router = new Router(routes);

// returns the current params for the route
const params = router.currentParams;
```

## 获取匹配到的路由

如果根据路由 id 能够匹配到路由，则 `getRoute` 返回匹配到 `RouteContext`；如果匹配不到，则返回 `undefined`。

`RouteContext`:

-   `id: string`: 路由 id
-   `outlet: string`: outlet id
-   `queryParams: { [index: string]: string }`: 匹配到路由的查询参数。
-   `params: { [index: string]: string }`: 匹配到路由的路径参数。
-   `isExact(): boolean`: 一个函数，指明路由是否与路径完全匹配。
-   `isError(): boolean`: 一个函数，指明路由是否与路径匹配错误。
-   `type: 'index' | 'partial' | 'error'`: 路由的匹配类型，值为 `index`、`partial` 或 `error`。

```ts
import Router from '@dojo/framework/routing/Router';

import routes from './routes';

const router = new Router(routes);

// returns the route context if the `home` route is matched, otherwise `undefined`
const routeContext = router.getRoute('home');
```

# 使用 MatchDetails

对于路由变更后匹配到的每个 `route`，都会将 `MatchDetails` 注入给 `Route` 和 `Outlet` 部件。`MatchDetails` 对象中包含匹配路由的详细信息。

注意：所有示例都假设正在使用默认的 [HashHistory](#hashhistory) 历史管理器。

## `queryParams`

-   `queryParams: { [index: string]: string }`: 获取匹配路由的查询参数。

> src/routes.ts

```ts
export default [
	{
		id: 'home',
		path: 'home',
		outlet: 'home'
	}
];
```

-   如果 URL 路径为 `/#home?foo=bar&baz=42`，那么 `queryParams` 对象将如下所示：

```js
{
	foo: 'bar',
	baz: '42'
}
```

## `params`

-   `params: { [index: string]: string }`: 匹配路由的路径参数

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

-   如果 URL 路径为 `/#home/about`，`params` 对象将如下所示：

```js
{
	page: 'about';
}
```

## `isExact()`

-   `isExact(): boolean`: 一个函数，用于指出路由是否与路径完全匹配。这可用于按条件渲染不同的部件或节点。

> src/routes.ts

```ts
export default [
	{
		id: 'home',
		path: 'home',
		outlet: 'home',
		children: [
			{
				id: 'about',
				path: 'about',
				outlet: 'about'
			}
		]
	}
];
```

-   根据上述的路由定义，如果 URL 路径设置为 `/#home/about`，那么对于 id 为“home”的 `Route`，`isExact()` 的值将为 `false`；如果是 home `Route` 的子 `Route`，且 id 为“about”时，`isExact()` 的值将为 `true`，如以下所示：

> src/App.tsx

```ts
import { create, tsx } from '@dojo/framework/core/vdom';
import Route from '@dojo/framework/routing/Route';

const factory = create();

export default factory(function App() {
	return (
		<div>
			<Route
				id="home"
				renderer={(homeMatchDetails) => {
					console.log('home', homeMatchDetails.isExact()); // home false
					return (
						<Route
							id="about"
							renderer={(aboutMatchDetails) => {
								console.log('about', aboutMatchDetails.isExact()); // about true
								return [];
							}}
						/>
					);
				}}
			/>
		</div>
	);
});
```

## `isError()`

-   `isError(): boolean`: 一个函数，用于指出路由是否与路径匹配错误。表示经过匹配后，没有找到匹配项。

> src/routes.ts

```ts
export default [
	{
		id: 'home',
		path: 'home',
		outlet: 'home',
		children: [
			id: 'about',
			path: 'about',
			outlet: 'about'
		]]
	}
];
```

-   根据上述的路由定义，如果 URL 路径设置为 `/#home/foo`，则无法匹配到路由，所以 home `Route` 的 `matchDetails` 对象的 `isError()` 将返回 `true`。导航到 `/#home` 或 `/#home/about` 将返回 `false`，因为这两个路由已定义过。

## `type`

-   `type: 'index' | 'partial' | 'error'`: 路由的匹配类型，值为 `index`、`partial` 或 `error`。不要直接使用 `type`，而是组合使用 `isExact` 和 `isError`。

```ts
export default [
	{
		id: 'home',
		path: 'home',
		outlet: 'home',
		children: [
			id: 'about',
			path: 'about',
			outlet: 'about'
		]
	}
];
```

-   根据上述的路由定义，每个 outlet 对应的 `type` 值应为：

| URL path       | Home route | About route |
| -------------- | :--------: | :---------: |
| `/#home`       |  'index'   |     N/A     |
| `/#home/about` | 'partial'  |   'index'   |
| `/#home/foo`   |  'error'   |     N/A     |

## `router`

-   `router: RouterInterface`: 路由实例，用于创建链接和触发路由变更。更多信息参考路由 API。

> src/routes.ts

```ts
export default [
	{
		id: 'home',
		path: 'home',
		outlet: 'home',
		children: [
			{
				id: 'home-details',
				path: 'details',
				outlet: 'home-details'
			}
		]
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
					const { params, queryParams, isExact, isError, router } = matchDetails;

					const gotoHome = () => {
						const link = router.link('home');
						if (link) {
							router.setPath(link);
						}
					};

					if (isExact()) {
						// The path `home` was matched
						return <div>Home Page</div>;
					}
					if (isError()) {
						// The `home` segment of the path was matched but the
						// next segment was not matched for example, `home/other`
						return (
							<div>
								<button onclick={gotoHome}>Goto Home</button>
								<div>Unknown Page</div>
							</div>
						);
					}
					// The `home` segment of the path was matched and the next
					// segment was also matched for example, `home/details`
					return <div>Partial Match for Home</div>;
				}}
			/>
		</div>
	);
});
```

# 历史管理器

Dojo 路由自带三个历史管理器，用于管理应用程序的导航状态，分别是 `HashHistory`、`StateHistory` 和 `MemoryHistory`。默认使用 `HashHistory`，但是可在创建 `Router` 或者使用 `registerRouterInjector` 时传入不同的 `HistoryManager` 以覆盖默认的历史管理器。

> src/main.ts

```ts
import Router from '@dojo/framework/routing/Router';
import StateHistory from '@dojo/framework/routing/history/StateHistory';

import routes from './routes';

// creates a router using the default history manager, `HashHistory`
const router = new Router(routes);

// creates a router using the `StateHistory`
const routerWithHistoryOverride = new Router(routes, { HistoryManager: StateHistory });
```

或者使用 `registerRouterInjector` 帮助函数：

> src/main.ts

```ts
import Registry from '@dojo/framework/core/Registry';
import { registerRouterInjector } from '@dojo/framework/routing/RouterInjector';
import StateHistory from '@dojo/framework/routing/history/StateHistory';

import routes from './routes';

const registry = new Registry();

// creates and registers a router using the default history manager, `HashHistory`
registerRouterInjector(routes, registry);

// creates and registers a router using the `StateHistory`
registerRouterInjector(routes, registry, { HistoryManager: StateHistory });
```

## `HashHistory`

`HashHistory` 使用片段标识符（fragment identifier）来处理路由变更，比如 `https://foo.com/#home` 中的 `home` 就是路由的路径。因为 `HashHistory` 是默认管理器，因此不需要导入模块。

```ts
import { Router } from '@dojo/framework/routing/Router';

const router = new Router(config);
```

## `StateHistory`

`StateHistory` 使用浏览器的 [history API](https://developer.mozilla.org/en-US/docs/Web/API/History) 管理应用程序的路由变更。

`StateHistory` 管理器需要在服务器端支持应用程序的路由刷新机制，例如：

1.  重写 `index.html` 请求，以从应用程序根目录加载。
2.  重写加载静态资源（`.js`、`.css`等）的请求，以从应用程序根目录加载。

**注意：** 当使用 `@dojo/cli-build-app` 的 `--serve` 选项时，本机制已经包含在其中（仅用于开发环境）。

```ts
import { Router } from '@dojo/framework/routing/Router';
import { StateHistory } from '@dojo/framework/routing/history/StateHistory';

const router = new Router(config, { HistoryManager: StateHistory });
```

## `MemoryHistory`

`MemoryHistory` 不依赖任何浏览器 API，而是自己保存内部的路径状态。不要在生产应用程序中使用它，但在测试路由时却很有用。

```ts
import { Router } from '@dojo/framework/routing/Router';
import { MemoryHistory } from '@dojo/framework/routing/history/MemoryHistory';

const router = new Router(config, { HistoryManager: MemoryHistory });
```

> src/main.tsx

```tsx
import renderer from '@dojo/framework/core/vdom';
import { tsx } from '@dojo/framework/core/vdom';
import { registerRouterInjector } from '@dojo/framework/routing/RouterInjector';

import routes from './routes';
import App from './App';

const registry = new Registry();
// creates a router with the routes and registers the router with the registry
registerRouterInjector(routes, registry);

const r = renderer(() => <App />);
r.mount({ registry });
```

这些历史管理器的实现原理与适配器类似，这意味着可以通过实现历史管理器接口来实现自定义的历史管理器。

# Error 路由

当路由跟路由配置中的每个路由都匹配不上（`exact` 或 `partial`）时，会注册一个特殊的 `route`，称为 `errorRoute`。可以使用这个 `route` 来渲染一个部件来告知用户该路由不存在。

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import Route from '@dojo/framework/routing/Route';

const factory = create();

export default factory(function App() {
	return (
		<div>
			<Route
				id="errorRoute"
				renderer={() => {
					return <div>Unknown Page</div>;
				}}
			/>
		</div>
	);
});
```

如果已注册了默认路由，则在应用程序的初始加载时默认路由的优先级要高于 error 路由。
