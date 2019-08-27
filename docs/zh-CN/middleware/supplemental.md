# 中间件基本原理

<!--
https://github.com/dojo/framework/blob/master/docs/en/middleware/supplemental.md
commit 64c125b997a939fbfa82b4210239a3121f7aeda8
-->

Dojo 提供了渲染中间件的概念，以帮助衔接响应式、函数部件与底层的命令式 DOM 结构。

如果部件能够访问 DOM 信息，某些 web 应用程序需求就更容易实现。常见的例子有：

-   响应式 UI 不与特定的设备类型绑定，而是根据可用的页面区域改变元素的大小。
-   仅当某些元素在用户可视区域可见时，才延迟加载需要的数据——例如无限滚动列表。
-   引导元素获取焦点，并在用户变更焦点后进行响应。

但是，中间件并非必须与 DOM 绑定；这个概念还适合部件的渲染生命周期等更常用的情况。此类需求的常见示例如下：

-   如果获取数据的开销大，则在渲染间缓存数据
-   根据特定条件暂停和恢复部件的渲染；在所需信息不可用时，避免无用的渲染
-   将函数部件标记为无效，以便 Dojo 可以重新渲染部件

一个中间件组件一般公开的某些功能与部件渲染的 DOM 元素有关；大多是部件的根节点。中间件系统为部件在浏览器中的展示和交互提供了更高级的控制，并且允许部件以一致的方式使用几个新兴的 Web 标准。

如果部件在其底层的 DOM 元素存在之前访问中间件的某些属性，则返回合理的默认值。还有一些中间件可以暂停部件的渲染，直到满足某些条件。使用这些中间件，部件能避免不必要的渲染，直到所需的信息可用为止，然后 Dojo 将在数据可用时获取中间件的正确属性值，自动重新渲染受影响的部件。

## 创建中间件

中间件是使用 `@dojo/framework/core/vdom` 中的 `create()` 工厂方法定义的。这与创建函数部件的过程类似，但是中间件工厂返回的并不是 VDOM 节点，而是允许访问中间件功能集的 API。简单的中间件只需要一个函数调用来实现它们的需求，也可以直接返回一个函数，而不需要将中间件包装在一个对象中。

下面介绍一个中间件组件，它有一个简单的 `get()` 和 `set()` API：

> src/middleware/myMiddleware.ts

```ts
import { create } from '@dojo/framework/core/vdom';

const factory = create();

export const myMiddleware = factory(() => {
	return {
		get() {},
		set() {}
	};
});

export default myMiddleware;
```

## 使用中间件

中间件主要用在函数部件中，但也可以通过组合形成其他中间件，以实现更复杂的需求。这两种情况下，任何用到的中间件都会作为属性传给 `create()` 方法，然后通过部件或中间件工厂实现函数中的 `middleware` 参数使用这些中间件。

例如，在部件中使用上面的 `myMiddleware` 中间件：

> src/widgets/MiddlewareConsumerWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import myMiddleware from '../middleware/myMiddleware';

const render = create({ myMiddleware });
export const MiddlewareConsumerWidget = render(({ middleware: { myMiddleware } }) => {
	myMiddleware.set();
	return <div>{`Middleware value: ${myMiddleware.get()}`}</div>;
});

export default MiddlewareConsumerWidget;
```

## 组合中间件

以下示例演示了用中间件组合出新的中间件，以实现更有用的需求：

-   在本地缓存中取一个值
-   如果缓存未命中，则从外部获取值
-   在等待外部的值返回时，暂停使用该中间件的部件的进一步渲染
-   一旦外部的值可以通过本地缓存访问，就恢复渲染并让使用的部件失效，以重新渲染这些部件

> src/middleware/ValueCachingMiddleware.ts

```ts
import { create, defer, invalidator } from '@dojo/framework/core/vdom';
import { cache } from '@dojo/framework/core/middleware/cache';

const factory = create({ defer, cache });

export const ValueCachingMiddleware = factory(({ middleware: { defer, cache, invalidator }}) => {
	get(key: string) {
		const cachedValue = cache.get(key);
		if (cachedValue) {
			return cachedValue;
		}
		// Cache miss: fetch the value somehow through a promise
		const promise = fetchExternalValue(value);
		// Pause further widget rendering
		defer.pause();
		promise.then((result) => {
			// Cache the value for subsequent renderings
			cache.set(key, result);
			// Resume widget rendering once the value is available
			defer.resume();
			// Invalidate the widget for a re-render
			invalidator();
		});
		return null;
	}
});

export default ValueCachingMiddleware;
```

## 传入中间件属性

由于中间件是通过 `create()` 工具函数定义的，因此为中间件指定属性接口的方式，与为函数部件指定属性接口的方式相同。主要的区别是中间件属性会被添加到所有消费者部件的属性接口中。这意味着属性值是在实例化部件时设置的，而不是在部件使用中间件时。在整个组合层次结构中，属性被看作是只读的，因此中间件不能修改属性值。

下面是具有属性接口的中间件示例：

> src/middleware/middlewareWithProperties.tsx

```ts
import { create } from '@dojo/framework/core/vdom';

const factory = create().properties<{ conditional?: boolean }>();

export const middlewareWithProperties = factory(({ properties }) => {
	return {
		getConditionalState() {
			return properties().conditional ? 'Conditional is true' : 'Conditional is false';
		}
	};
});

export default middlewareWithProperties;
```

在部件中使用中间件及其属性：

> src/widgets/MiddlewarePropertiesWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import middlewareWithProperties from '../middleware/middlewareWithProperties';

const render = create({ middlewareWithProperties });
export const MiddlewarePropertiesWidget = render(({ properties, middleware: { middlewareWithProperties } }) => {
	return (
		<virtual>
			<div>{`Middleware property value: ${properties().conditional}`}</div>
			<div>{`Middleware property usage: ${middlewareWithProperties.getConditionalState()}`}</div>
		</virtual>
	);
});

export default MiddlewarePropertiesWidget;
```

然后，当创建 `MiddlewarePropertiesWidget` 实例时，指定中间件的 `conditional` 属性值，例如：

> src/main.tsx

```tsx
import renderer, { tsx } from '@dojo/framework/core/vdom';
import MiddlewarePropertiesWidget from './widgets/MiddlewarePropertiesWidget';

const r = renderer(() => <MiddlewarePropertiesWidget conditional={true} />);
r.mount();
```

# 可用的中间件

Dojo 提供了多种可选的中间件，当部件需要实现特定需求时，可以包含这些中间件。

## `cache`

提供了一个简单的、部件内的缓存，可以在部件的多次渲染间保留少量数据。

**API:**

```ts
import cache from '@dojo/framework/core/middleware/cache';
```

-   `cache.get<T = any>(key: any): T | null`
    -   根据指定的 `key` 获取当前缓存值，如果缓存未命中则返回 `null`。
-   `cache.set<T = any>(key: any, value: T)`
    -   将提供的 `value` 存储在缓存中，并与指定的 `key` 关联。
-   `cache.clear()`
    -   清除当前在部件本地缓存中存储的所有值。

## `icache`

组合了 [`cache`](/learn/middleware/available-middleware#cache) 和 [`invalidator`](/learn/middleware/core-render-middleware#invalidator) 中间件功能，以提供一个缓存，支持延迟值的解析，并在值可用时自动让部件失效。

**API:**

```ts
import icache from '@dojo/framework/core/middleware/icache';
```

-   `icache.getOrSet<T = any>(key: any, value: any): T | undefined`
    -   如果存在的话，则返回根据 `key` 获取的值，否则就将 `key` 值设置为 `value`。在这两种情况下，如果缓存值尚未解析，则返回 `undefined`。
-   `icache.get<T = any>(key: any): T | undefined`
    -   根据 `key` 获取缓存值，如果未设置值或者该值处在挂起状态，则返回 `undefined`。
-   `icache.set(key: any, value: any)`
    -   将提供的 `value` 设置给指定的 `key`。如果 `value` 是一个函数，则将调用它以获取要缓存的实际值。如果函数返回的是 promise，则会先缓存一个“pending”值，直到解析出最终的值。在所有场景中，一旦一个值可用并存储到缓存中，该部件将被标记为无效，这样就可以使用最终的值重新渲染。
-   `clear()`
    -   清除当前在部件本地缓存中存储的所有值。

## `theme`

允许部件渲染时为 CSS 样式类设置主题，并且允许为应用程序设置主题以及确定当前设置的主题，如果有设置的话。

在 [Dojo 的样式和主题参考指南](/learn/styling/theming-a-dojo-application#making-themeable-widgets)中有详细说明。

**API:**

```ts
import theme from '@dojo/framework/core/middleware/theme';
```

-   `theme.classes<T extends ClassNames>(css: T): T`
    -   为部件传入一个或多个 CSS 类名，然后接收根据当前设置的主题而修改后的名字，以便在返回部件的虚拟节点时使用。
-   `theme.set(css: Theme)`
    -   允许应用程序设置指定的主题。
-   `theme.get(): Theme | undefined`
    -   返回当前设置的主题，如果没有设置主题则返回 `undefined`。通常在应用程序的根部件中使用。

## `i18n`

允许在渲染部件时，将消息文本本地化，也允许应用程序进行区域设置，以及获取当前设置的区域，如果有设置的话。

在 [Dojo 的国际化参考指南](/learn/i18n/internationalizing-a-dojo-application)中有详细说明。

**API:**

```ts
import i18n from '@dojo/framework/core/middleware/i18n';
```

-   `i18n.localize<T extends Messages>(bundle: Bundle<T>, useDefaults = false): LocalizedMessages<T>`
    -   从指定的 `bundle` 中返回根据当前设置的区域而本地化的一组消息。`useDefaults` 用于控制当前区域对应的值不可用时，是否返回来自默认语言的消息。默认值为 `false`，在这种情况下返回的是空值，而不是默认语言的消息。
-   `i18n.set(localeData?: LocaleData)`
    -   允许应用程序设置指定的区域。
-   `i18n.get()`
    -   返回当前设置的区域，如果没有设置区域则返回 `undefined`。通常在应用程序的根部件中使用。

## `dimensions`

提供部件底层节点的各种大小和位置信息。

**API:**

```ts
import dimensions from '@dojo/framework/core/middleware/dimensions';
```

-   `dimensions.get(key: string | number): Readonly<DimensionResults>`
    -   返回部件中由节点的 `key` 属性标识的 DOM 元素的尺寸信息。如果当前部件中不存在此节点（尚未渲染或指定的 key 无效），则返回的值都是 `0`。

返回的 `DimensionResults` 包含以下属性，这些属性映射到指定 DOM 元素的相关属性：

| Property          | Source                                |
| ----------------- | ------------------------------------- |
| `client.left`     | `node.clientLeft`                     |
| `client.top`      | `node.clientTop`                      |
| `client.width`    | `node.clientWidth`                    |
| `client.height`   | `node.clientHeight`                   |
| `position.bottom` | `node.getBoundingClientRect().bottom` |
| `position.left`   | `node.getBoundingClientRect().left`   |
| `position.right`  | `node.getBoundingClientRect().right`  |
| `position.top`    | `node.getBoundingClientRect().top`    |
| `size.width`      | `node.getBoundingClientRect().width`  |
| `size.height`     | `node.getBoundingClientRect().height` |
| `scroll.left`     | `node.scrollLeft`                     |
| `scroll.top`      | `node.scrollTop`                      |
| `scroll.height`   | `node.scrollHeight`                   |
| `scroll.width`    | `node.scrollWidth`                    |
| `offset.left`     | `node.offsetLeft`                     |
| `offset.top`      | `node.offsetTop`                      |
| `offset.width`    | `node.offsetWidth`                    |
| `offset.height`   | `node.offsetHeight`                   |

## `intersection`

使用 [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API) 提供关于节点在特定可视区域是否可见等信息。

因为 Intersection Observer API 是一个新兴的 Web 标准，因此在不支持此 API 的浏览器中运行应用程序时，框架会自动确保底层的 API 可用。注意，Dojo 6 版本不支持 [Intersection Observer API v2](https://w3c.github.io/IntersectionObserver/v2/)

**API:**

```ts
import intersection from '@dojo/framework/core/middleware/intersection';
```

-   `intersection.get(key: string | number, options: IntersectionGetOptions = {}): IntersectionResult`
    -   返回部件中由节点的 `key` 属性标识的 DOM 元素的交叉(intersection)信息。如果当前部件中不存在此节点（尚未渲染或指定的 key 无效），会返回一个结果，表示无交叉。

`option` 参数允许对如何计算交叉做更多控制。可用字段与 [intersection observer API options](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API#Intersection_observer_options) 相同。

`IntersectionResult` 属性:

| 属性                | 类型      | 说明                                                                                                                                      |
| ------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `intersectionRatio` | `number`  | 与根元素的可视区域相交的元素边界框的比率，从 `0.0` 到 `1.0`，默认的根元素是浏览器的可视区域，除非通过 `options.root` 元素指定了一个元素。 |
| `isIntersecting`    | `boolean` | 值为 `true` 时表示目标元素与根元素的可视区域交叉（表示过渡到了交叉状态）。值为 `false` 时表示从交叉过渡到了不交叉。                       |

## `resize`

允许部件使用 [`ResizeObserver`](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) 响应 DOM 节点的 resize 事件，并且在调整大小时提供节点新大小的更新信息。使用这个中间件是创建适配各种视窗大小的响应式应用程序的有效方法。

因为 Resize Observer 是一个新兴的 Web 标准，因此在不支持此 API 的浏览器中运行应用程序时，框架会自动确保底层的 API 可用。

**API:**

```ts
import resize from '@dojo/framework/core/middleware/resize';
```

-   `resize.get(key: string | number): DOMRectReadOnly | null`
    -   返回部件中由节点的 `key` 属性标识的 DOM 元素的尺寸信息。如果当前部件中不存在此节点（尚未渲染或指定的 key 无效），则返回 `null`。返回的对象是一个标准的 [`DOMRectReadOnly`](https://developer.mozilla.org/en-US/docs/Web/API/DOMRectReadOnly) 结构。

## `breakpoint`

允许部件确定一个指定的宽度断点，该断点与其中一个虚拟节点的当前宽度匹配。此中间件在创建能够适配各种显示宽度的部件时非常有用，比如在移动端和桌面分辨率下同时使用的部件。

与 [`resize`](/learn/middleware/available-middleware#resize) 中间件组合使用，以获取元素的宽度，并在调整宽度时自动让部件失效。

**注意：** 如果没有设置自定义的宽度断点，Dojo 将默认使用以下集合：

-   `SM`: 0
-   `MD`: 576
-   `LG`: 768
-   `XL`: 960

**API:**

```ts
import breakpoint from '@dojo/framework/core/middleware/breakpoint';
```

```ts
interface Breakpoints {
	[index: string]: number;
}
```

-   `breakpoint.get(key: string | number, breakpoints: Breakpoints = defaultBreakpoints)`
    -   依据节点的当前宽度，返回与部件中指定的输出节点（由 `key` 标识）匹配的断点。可以通过 `breakpoints` 参数设置自定义的断点。返回的值是一个包含 `breakpoint` 属性的对象，它标识出了匹配的断点名称，以及一个 `contentRect` 属性，它包含的值与 `resize.get(key)` 返回的值相同。

当要在很多位置使用同一个断点集时，该集合只需定义一次，而不必在每一次调用 `breakpoint.get()` 时传入此集合。应用程序可以通过以下方式使用适当的默认值定义自己的自定义断点中间件：

> src/middleware/myCustomBreakpoint.ts

```ts
import { createBreakpointMiddleware } from '@dojo/framework/core/middleware/breakpoint';

const myCustomBreakpoint = createBreakpointMiddleware({ Narrow: 0, Wide: 500 });

export default myCustomBreakpoint;
```

## `store`

当使用 Dojo store 组件时，部件能访问外部的状态。

在 [Dojo Store 参考指南](/learn/stores/introduction)中有详细说明。

**API:**

```ts
import store from '@dojo/framework/core/middleware/store';
```

-   `store.get<U = any>(path: Path<S, U>): U`
    -   根据指定的 `path` 从 store 中获取值。当关联的值更改后，组合部件也会失效并重新渲染。
-   `store.path(path: any, ...segments: any): StatePaths<S>`
    -   返回从指定的根路径开始，并附加了多个片段之后的 store 路径。
-   `store.at<U = any>(path: Path<S, U[]>, index: number)`
    -   当访问存储的数组值时，返回数字索引指向的值的 store 路径
-   `store.executor<T extends Process<any, any>>(process: T): ReturnType<T>`
    -   在组合部件的 store 中执行给定的 `process` 并返回结果。

## `focus`

组合使用 [VDOM focus 原生方法](/learn/creating-widgets/enabling-interactivity#handling-focus) ，允许部件检查和控制输出的 DOM 间的焦点。

**API:**

```ts
import focus from '@dojo/framework/core/middleware/focus';
```

-   `focus.shouldFocus(): boolean`
    -   如果应在当前渲染周期中指定焦点，则返回 `true`。将只返回一次 `true`，后续调用将返回 `false`，直到再次调用 `focus.focus()`。这个函数通常作为 `focus` 属性值传给指定的 VDOM 节点，允许部件指出焦点应该应用到哪里。
-   `focus.focus()`
    -   能够被调用，以指示部件或者一个子部件在下一次渲染周期时获取焦点。这个函数通常传给输出的 VDOM 节点的 `onfocus` 事件处理函数，允许部件响应用户驱动的焦点变更事件。
-   `focus.isFocused(key: string | number): boolean`
    -   如果部件中，指定的 `key` 标识的 VDOM 节点当前获取焦点，则返回 `true`。如果相关的 VDOM 节点没有焦点或者部件中不存在此 VDOM 节点，则返回 `false`。

### Focus 委托示例

下面展示一个例子，在部件层次结构内和输出的 VNode 之间委托和控制焦点：

> src/widgets/FocusableWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import focus from '@dojo/framework/core/middleware/focus';
import icache from '@dojo/framework/core/middleware/icache';

/*
	The input's `onfocus()` event handler is assigned to a method passed in
	from a parent widget, via the child's create().properties<MyPropertiesInterface>
	API, allowing user-driven focus changes to propagate back into the application.
*/
const childFactory = create({ focus }).properties<{ onfocus: () => void }>();

const FocusInputChild = childFactory(function FocusInputChild({ middleware: { focus }, properties }) {
	const { onfocus } = properties();
	return <input onfocus={onfocus} focus={focus.shouldFocus} />;
});

const factory = create({ focus, icache });

export default factory(function FocusableWidget({ middleware: { focus, icache } }) {
	const keyWithFocus = icache.get('key-with-focus') || 0;

	const childCount = 5;
	function focusPreviousChild() {
		let newKeyToFocus = (icache.get('key-with-focus') || 0) - 1;
		if (newKeyToFocus < 0) {
			newKeyToFocus = childCount - 1;
		}
		icache.set('key-with-focus', newKeyToFocus);
		focus.focus();
	}
	function focusNextChild() {
		let newKeyToFocus = (icache.get('key-with-focus') || 0) + 1;
		if (newKeyToFocus >= childCount) {
			newKeyToFocus = 0;
		}
		icache.set('key-with-focus', newKeyToFocus);
		focus.focus();
	}
	function focusChild(key: number) {
		icache.set('key-with-focus', key);
		focus.focus();
	}

	return (
		<div>
			<button onclick={focusPreviousChild}>Previous</button>
			<button onclick={focusNextChild}>Next</button>
			<FocusInputChild
				key="0"
				onfocus={() => focusChild(0)}
				focus={keyWithFocus == 0 ? focus.shouldFocus : undefined}
			/>
			<FocusInputChild
				key="1"
				onfocus={() => focusChild(1)}
				focus={keyWithFocus == 1 ? focus.shouldFocus : undefined}
			/>
			<FocusInputChild
				key="2"
				onfocus={() => focusChild(2)}
				focus={keyWithFocus == 2 ? focus.shouldFocus : undefined}
			/>
			<FocusInputChild
				key="3"
				onfocus={() => focusChild(3)}
				focus={keyWithFocus == 3 ? focus.shouldFocus : undefined}
			/>
			<FocusInputChild
				key="4"
				onfocus={() => focusChild(4)}
				focus={keyWithFocus == 4 ? focus.shouldFocus : undefined}
			/>
		</div>
	);
});
```

## `injector`

允许从 Dojo 注册表中获取注入器（injector），然后将其分配给失效的回调函数。

**注意：** 注入器和注册表是高阶概念，在编写 Dojo 应用程序时通常用不到。它们主要由框架使用，以实现更高级的面向用户的功能，如 [Dojo store](/learn/stores/introduction)。

**API:**

```ts
import injector from '@dojo/framework/core/middleware/injector';
```

-   `injector.subscribe(label: RegistryLabel, callback: Function = invalidator)`
    -   为注册表 `label` 指定的注入器（如果存在的话）订阅给定的 `callback` 失效函数。如果未指定 `callback`，则默认使用 [`invalidator`](/learn/middleware/core-render-middleware#invalidator) 中间件，以便当注入器使其数据可用时，将当前部件标记为失效并重新渲染。
-   `injector.get<T>(label: RegistryLabel): T | null`
    -   获取当前与给定的注册表 `label` 关联的注册器，如果注册器不存在则返回 `null`。

## `block`

在构建时，允许部件在 Node.js 中执行称为 **blocks** 的模块。通常用于构建时渲染。

在[构建(build)参考指南](/learn/building/buildtime-rendering)中有详细说明。

**API:**

```ts
import block from '@dojo/framework/core/middleware/block';
```

-   `block<T extends (...args: any[]) => any>(module: T)`
    -   执行指定的 block 模块，并返回执行结果

# 核心渲染中间件

`@dojo/framework/core/vdom` 模块中包含基础中间件，大多数 Dojo 应用程序都会用到。这些主要用于构建其他自定义中间件（框架提供的[附加中间件](/learn/middleware/available-middleware)就是由他们构成的），但在一般的部件开发中也偶尔会用到。

## `invalidator`

这是最重要的中间件，在部件的失效生命周期中设置了一个钩子。调用了 `invaludator()` 后，会将要渲染的部件排列到下一次的渲染计划中。

**API:**

```ts
import invalidator from '@dojo/framework/core/vdom';
```

-   `invalidator()`
    -   将使用的部件标记为无效，需要重新渲染。

## `node`

支持通过节点的 `key`，访问部件底层的 DOM 节点。当被请求的 DOM 节点是有效的，但还不可用时，Dojo 就立刻重新渲染部件，直到 DOM 节点变为可用。

**API:**

```ts
import node from '@dojo/framework/core/vdom';
```

-   `node.get(key: string | number): HTMLElement | null`
    -   根据节点的 `key` 属性，返回部件中指定的 DOM 元素。如果当前部件中不存在指定的 DOM 元素，则返回 `null`。

## `diffProperty`

通过为指定的属性注册自己的 diff 函数，以允许部件对差异检测进行细粒度控制。当尝试重新渲染部件时，框架将调用该函数，以确定是否发生了变化，从而需要进行完全的重新渲染。如果在部件的属性集中没有检测到差异，将跳过更新，并且现有的所有 DOM 节点都保持原样。

编写自定义的 diff 函数时，通常需要与 [`invalidator`](/learn/middleware/core-render-middleware#invalidator) 中间件组合使用，以便需要更新部件的 DOM 节点时，将当前部件标记为无效。

**注意：** 在组合部件或中间件的生命周期中，只能为指定的属性注册一个 diff 函数，后续的调用将被忽略。渲染引擎有一套默认算法，该算法对对象和数组进行 shallow 对比，忽略函数，而对其他所有属性进行相等检查。为属性设置了自定义的 diff 函数后，将会覆盖 Dojo 默认的差异检测策略。

**API:**

```ts
import diffProperty from '@dojo/framework/core/vdom';
```

-   `diffProperty(propertyName: string, diff: (current: any, next: any) => void)`
    -   注册指定的 `diff` 函数，该函数用于确定部件的 `propertyName` 属性的 `current` 和 `next` 值之间是否存在差异。

## `destroy`

指定一个在部件销毁时调用的函数，可以销毁占用的任何资源。

**注意：** 每一个组合的部件或中间件只能调用一次 `destroy()`，之后再调用会被忽略。对于需要在移除部件时有条件地添加执行句柄的高级方案，应该注册一个可以跟踪并迭代地销毁所有必要资源的销毁函数。

**API:**

```ts
import destroy from '@dojo/framework/core/vdom';
```

-   `destroy(destroyFunction: () => void)`
    -   设置当前部件销毁时调用的 `destroyFunction`。设置的函数将覆盖之前为部件设置的任一销毁函数。

## `getRegistry`

通过处理器接口(handler interface)，支持访问部件自身的 `Registry` 实例，如果需要的话，也可以访问应用程序一级的 `Registry`。

**注意：** Registry 是一个高阶概念，在编写 Dojo 应用程序时通常用不到。它主要在框架内部使用，以实现更高阶的面向用户的功能，如 [Dojo store](/learn/stores/introduction)。

**API:**

```ts
import getRegistry from '@dojo/framework/core/vdom';
```

-   `getRegistry(): RegistryHandler | null`
    -   返回当前部件的 `RegistryHandler`，如果部件未完全初始化，则返回 `null`。

## `defer`

允许部件暂定和恢复渲染逻辑；在特定条件满足之前短路部件的渲染时也很有用。

**API:**

```ts
import defer from '@dojo/framework/core/vdom';
```

-   `defer.pause()`
    -   暂停当前部件的进一步渲染，直到标记为恢复。
-   `defer.resume()`
    -   恢复部件的渲染。
