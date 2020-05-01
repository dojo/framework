# 中间件基本原理

<!--
https://github.com/dojo/framework/blob/master/docs/en/middleware/supplemental.md
commit ebef92b9e1d10e0a22e957a508cd71d07e649646
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
import { create, defer } from '@dojo/framework/core/vdom';
import icache from '@dojo/framework/core/middleware/icache';

const factory = create({ defer, icache });

export const ValueCachingMiddleware = factory(({ middleware: { defer, icache }}) => {
	get(key: string) {
		const cachedValue = icache.get(key);
		if (cachedValue) {
			return cachedValue;
		}
		// Cache miss: fetch the value somehow through a promise
		const promise = fetchExternalValue(value);
		// Pause further widget rendering
		defer.pause();
		promise.then((result) => {
			// Cache the value for subsequent renderings
			icache.set(key, result);
			// Resume widget rendering once the value is available
			defer.resume();
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

## `icache`

该中间件在 [`invalidator`](/learn/middleware/核心渲染中间件#invalidator) 中间件功能的基础上提供了缓存功能，支持值的延迟解析，并在值可用时自动让部件失效。默认情况下，往缓存中设置一个值时，缓存就会失效；但是使用 set API 上的第三个可选参数，在需要时可让缓存不失效。

**API:**

```ts
import icache from '@dojo/framework/core/middleware/icache';
```

-   `icache.getOrSet<T = any>(key: any, value: any, invalidate: boolean = true): T | undefined`
    -   如果存在的话，则返回根据 `key` 获取的值，否则就将 `key` 值设置为 `value`。在这两种情况下，如果缓存值尚未解析，则返回 `undefined`。
-   `icache.get<T = any>(key: any): T | undefined`
    -   根据 `key` 获取缓存值，如果未设置值或者该值处在挂起状态，则返回 `undefined`。
-   `icache.set(key: any, value: any, invalidate: boolean = true): any`
    -   将提供的 `value` 设置给指定的 `key`。如果 `value` 是一个函数，则将调用它以获取要缓存的实际值。如果函数返回的是 promise，则会先缓存一个“pending”值，直到解析出最终的值。在所有场景中，一旦一个值可用并存储到缓存中，该部件将被标记为无效，这样就可以使用最终的值重新渲染。
-   `icache.has(key: any): boolean`
    -   根据 key 是否已在缓存中设置，来返回 `true` 或 `false`。
-   `icache.delete(key: any, invalidate: boolean = true): void`
    -   从缓存中移除对应的项。
-   `clear(invalidate: boolean = true)`
    -   清除当前在部件本地缓存中存储的所有值。

当将函数传给 `icache.set` 时，可在函数中访问当前的缓存值，下面的示例演示如何递增当前值。

```tsx
icache.set('key', (current) => {
	if (current) {
		return current + 1;
	}
	return 1;
});
```

可以使用两种方式为 `icache` 设置类型。一种方式是使用泛型来在调用的地方指定返回类型，对于 `getOrSet`，可以根据值类型推断出返回的类型，如果 `getOrSet` 的 `value` 是一个函数，则使用函数返回的类型推断出值类型。

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import icache from '@dojo/framework/core/middleware/icache';

const factory = create({ icache });

interface FetchResult {
	foo: string;
}

const MyIcacheWidget = factory(function MyIcacheWidget({ middleware: { icache } }) {
	// `results` will infer the type of the resolved promise, `FetchResult | undefined`
	const results = icache.getOrSet('key', async () => {
		const response = await fetch('url');
		const body: FetchResult = await response.json();
		return body;
	});

	return <div>{results}</div>;
});
```

但是，这种方式没有为缓存的 key 提供任何类型信息。为 `icache` 设置类型的首选方式是使用 `createICacheMiddleware` 创建一个预先设置了类型的中间件。这样就允许传入一个接口来创建一个明确指定了类型的 `icache` 中间件，并为缓存的 key 提供了类型安全。

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { createICacheMiddleware } from '@dojo/framework/core/middleware/icache';

interface FetchResult {
	foo: string;
}

interface MyIcacheWidgetState {
	key: FetchResult;
}

const icache = createICacheMiddleware<MyIcacheWidgetState>();
const factory = create({ icache });

const MyIcacheWidget = factory(function MyIcacheWidget({ middleware: { icache } }) {
	// `results` will be typed to `FetchResult | undefined` based on the `MyIcacheWidgetState`
	const results = icache.getOrSet('key', async () => {
		const response = await fetch('url');
		const body: FetchResult = await response.json();
		return body;
	});

	return <div>{results}</div>;
});
```

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

与 [`resize`](/learn/middleware/可用的中间件#resize) 中间件组合使用，以获取元素的宽度，并在调整宽度时自动让部件失效。

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

## `inert`

支持通过 `key` 为节点设置 [`inert`](https://html.spec.whatwg.org/multipage/interaction.html#inert) 属性。这将确保相关节点不会响应聚焦、鼠标事件等操作。对于一些场景，如隶属于 `document.body` 的对话框，`inert` 会被倒转设置到 `key` 节点的所有兄弟节点上。

**API:**

```ts
import inert from '@dojo/framework/core/middleware/inert';
```

-   `inert.set(key: string | number, enable: boolean, invert: boolean = false): void;`
    -   为节点设置 inert 值。如果传入 `invert`，则会将值设置给节点的所有兄弟节点。

> src/widgets/Dialog.tsx

```tsx
import { tsx, create } from '@dojo/framework/core/vdom';
import inert from '@dojo/framework/core/middleware/inert';
import icache from '@dojo/framework/core/middleware/icache';

import * as css from './App.m.css';

const dialogFactory = create({ inert, icache }).properties<{
	open: boolean;
	onRequestClose: () => void;
}>();

const Dialog = dialogFactory(function Dialog({ children, properties, middleware: { inert } }) {
	const { open } = properties();

	inert.set('dialog', open, true);

	if (!open) {
		return null;
	}

	return (
		<body>
			<div
				key="dialog"
				styles={{
					background: 'red',
					width: '400px',
					height: '400px',
					marginLeft: '-200px',
					marginTop: '-200px',
					position: 'absolute',
					left: '50%',
					top: '50%'
				}}
			>
				<button
					onclick={() => {
						properties().onRequestClose();
					}}
				>
					Close
				</button>
				{children()}
			</div>
		</body>
	);
});

const factory = create({ icache });

export default factory(function App({ middleware: { icache } }) {
	return (
		<div classes={[css.root]}>
			<input />
			<button
				onclick={() => {
					icache.set('open', true);
				}}
			>
				Open
			</button>
			<Dialog
				open={icache.getOrSet('open', false)}
				onRequestClose={() => {
					icache.set('open', false);
				}}
			>
				<div>
					<input />
					<input />
					<button>button</button>
					Content
				</div>
			</Dialog>
		</div>
	);
});
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

组合使用 [VDOM focus 原生方法](/learn/creating-widgets/支持交互#处理-focus) ，允许部件检查和控制输出的 DOM 间的焦点。

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

## `validity`

专用于获取节点的 [有效性状态（validity state）](https://developer.mozilla.org/en-US/docs/Web/API/ValidityState) 信息，当使用浏览器内置的方法来校验表单输入和提供本地的错误信息时，这将非常有用。

**API:**

```ts
import validity from '@dojo/framework/core/middleware/validity';
```

-   `validity.get(key: string, value: string)` - 返回由节点的 `key` 属性确定的 DOM 元素的有效性状态。如果当前部件中不存在指定的 DOM 元素，则返回 `{ valid: undefined, message: '' }`；否则返回一个 `ValidityState` 对象。

`ValidityState` 对象包含以下属性：

| 属性                | 类型      | 描述                                                               |
| ------------------- | --------- | ------------------------------------------------------------------ |
| `valid`             | `boolean` | 节点的 `validity.valid` 属性值，说明节点的值是否满足所有验证约束。 |
| `validationMessage` | `string`  | 节点的 `validationMessage` 属性值，节点值违反约束时的本地化消息。  |

## `injector`

允许从 Dojo 注册表中获取注入器（injector），然后将其分配给失效的回调函数。

**注意：** 注入器和注册表是高阶概念，在编写 Dojo 应用程序时通常用不到。它们主要由框架使用，以实现更高级的面向用户的功能，如 [Dojo store](/learn/stores/introduction)。

**API:**

```ts
import injector from '@dojo/framework/core/middleware/injector';
```

-   `injector.subscribe(label: RegistryLabel, callback: Function = invalidator)`
    -   为注册表 `label` 指定的注入器（如果存在的话）订阅给定的 `callback` 失效函数。如果未指定 `callback`，则默认使用 [`invalidator`](/learn/middleware/核心渲染中间件#invalidator) 中间件，以便当注入器使其数据可用时，将当前部件标记为失效并重新渲染。
-   `injector.get<T>(label: RegistryLabel): T | null`
    -   获取当前与给定的注册表 `label` 关联的注册器，如果注册器不存在则返回 `null`。

## `block`

在构建时，允许部件在 Node.js 中执行称为 **blocks** 的模块。通常用于构建时渲染。

在[构建(build)参考指南](/learn/building/构建时渲染)中有详细说明。

**API:**

```ts
import block from '@dojo/framework/core/middleware/block';
```

-   `block<T extends (...args: any[]) => any>(module: T)`
    -   执行指定的 block 模块，并返回执行结果

# 核心渲染中间件

`@dojo/framework/core/vdom` 模块中包含基础中间件，大多数 Dojo 应用程序都会用到。这些主要用于构建其他自定义中间件（框架提供的[附加中间件](/learn/middleware/可用的中间件)就是由他们构成的），但在一般的部件开发中也偶尔会用到。

## `invalidator`

这是最重要的中间件，在部件的失效生命周期中设置了一个钩子。调用了 `invaludator()` 后，会将要渲染的部件排列到下一次的渲染计划中。

**API:**

```ts
import { invalidator } from '@dojo/framework/core/vdom';
```

-   `invalidator()`
    -   将使用的部件标记为无效，需要重新渲染。

## `node`

支持通过节点的 `key`，访问部件底层的 DOM 节点。当被请求的 DOM 节点是有效的，但还不可用时，Dojo 就立刻重新渲染部件，直到 DOM 节点变为可用。

**API:**

```ts
import { node } from '@dojo/framework/core/vdom';
```

-   `node.get(key: string | number): HTMLElement | null`
    -   根据节点的 `key` 属性，返回部件中指定的 DOM 元素。如果当前部件中不存在指定的 DOM 元素，则返回 `null`。

## `diffProperty`

通过为指定的属性注册自己的 diff 函数，以允许部件对差异检测进行细粒度控制。当尝试重新渲染部件时，框架将调用该函数，以确定是否发生了变化，从而需要进行完全的重新渲染。如果在部件的属性集里没有检测到差异，将跳过更新，并且现有的所有 DOM 节点都保持原样。

编写自定义的 diff 函数时，通常需要与 [`invalidator`](/learn/middleware/核心渲染中间件#invalidator) 中间件组合使用，以便需要更新部件的 DOM 节点时，将当前部件标记为无效。

`diffProperty` 的另一种用法是，将返回一个可供部件属性使用的值。从 `callback` 返回的值会替换掉对应的部件属性值。

**注意：** 在组合部件或中间件的生命周期中，只能为指定的属性注册一个 diff 函数，后续的调用将被忽略。渲染引擎有一套默认算法，该算法对对象和数组进行 shallow 对比，忽略函数，而对其他所有属性进行相等检查。为属性设置了自定义的 diff 函数后，将会覆盖 Dojo 默认的差异检测策略。

**API:**

```ts
import { diffProperty } from '@dojo/framework/core/vdom';
```

-   `diffProperty(propertyName: string, properties: () => WidgetProperties, diff: (current: WidgetProperties, next: WidgetProperties) => void | WidgetProperties[propertyName])`
    -   注册指定的 `diff` 函数，该函数用于确定部件的 `propertyName` 属性的 `current` 和 `next` 值之间是否存在差异。函数使用 `properties` 函数来确定可用的属性和回调的类型信息，包括参数和返回值。

**示例：**

> src/customMiddleware.tsx

```tsx
import { create, diffProperty } from '@dojo/framework/core/vdom';

const factory = create({ diffProperty }).properties<{ foo?: string }>;

export const customMiddleware = factory(({ properties, middleware: { diffProperty } }) => {
	diffProperty('foo', properties, (current, next) => {
		if (!next.foo) {
			return 'default foo';
		}
	});
	// The rest of the custom middleware that defines the API
});
```

## `destroy`

指定一个在部件销毁时调用的函数，可以销毁占用的任何资源。

**注意：** 每一个组合的部件或中间件只能调用一次 `destroy()`，之后再调用会被忽略。对于需要在移除部件时有条件地添加执行句柄的高级方案，应该注册一个可以跟踪并迭代地销毁所有必要资源的销毁函数。

**API:**

```ts
import { destroy } from '@dojo/framework/core/vdom';
```

-   `destroy(destroyFunction: () => void)`
    -   设置当前部件销毁时调用的 `destroyFunction`。设置的函数将覆盖之前为部件设置的任一销毁函数。

## `getRegistry`

通过处理器接口(handler interface)，支持访问部件自身的 `Registry` 实例，如果需要的话，也可以访问应用程序一级的 `Registry`。

**注意：** Registry 是一个高阶概念，在编写 Dojo 应用程序时通常用不到。它主要在框架内部使用，以实现更高阶的面向用户的功能，如 [Dojo store](/learn/stores/introduction)。

**API:**

```ts
import { getRegistry } from '@dojo/framework/core/vdom';
```

-   `getRegistry(): RegistryHandler | null`
    -   返回当前部件的 `RegistryHandler`，如果部件未完全初始化，则返回 `null`。

## `defer`

允许部件暂定和恢复渲染逻辑；在特定条件满足之前短路部件的渲染时也很有用。

**API:**

```ts
import { defer } from '@dojo/framework/core/vdom';
```

-   `defer.pause()`
    -   暂停当前部件的进一步渲染，直到标记为恢复。
-   `defer.resume()`
    -   恢复部件的渲染。
