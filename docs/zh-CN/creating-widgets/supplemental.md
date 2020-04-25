# 部件的基本原理

<!--
https://github.com/dojo/framework/blob/master/docs/en/creating-widgets/supplemental.md
commit ce5482414e154b60c7eb261a32ee1f845df1542b
-->

部件是所有 Dojo 应用程序的基本构建要素。部件是主要的封装单元，它能表示从用户界面的单个元素，到更高级别的容器元素（如 Form 表单、段落、页面甚至是完整的应用程序）等所有内容。

## 前言： 降低复杂度

单个部件通常表示应用程序中的单个职责。细微的职责自然会转化为单独的部件，而复杂的职责就需要拆分为几个相互依赖的部分。然后，每部分就可以实现为一个部件，其中一个或多个父容器部件会协调所有拆开部件的交互。在这种层级结构中，可以看出根部件在整体上实现了更大的责任，但实际上它是通过组合很多简单的部件实现的。

对一个完整的应用程序的来讲，它的所有需求集就是一个单一的、复杂的责任。使用 Dojo 实现这个完整的需求集，会产生具有层级结构的部件，通常从根节点的“Application”部件开始，然后根据每层功能分支出层层部件，最终到达表示 HTML 页面中单个元素的叶节点。

### 简单的好处

让部件尽可能简单的原因有：对单个部件而言，降低复杂度意味着更大的职责隔离（缩小范围）；更容易做全面测试；减少出错的机会；更有针对性的修复错误；以及更广泛的组件复用潜力。

从整个应用程序的层面看，简单的部件使得我们更容易理解每个组件，以及它们是如何组合在一起的。

这些好处会简化日常维护，并最终降低了构建和运行应用程序的总开销。

## 基本的部件结构

部件的核心只是一个渲染函数，该函数返回虚拟 DOM 节点，正是通过虚拟 DOM 节点描述部件在网页中的结构。但是，应用程序通常需要处理更多逻辑，不仅仅是简单的罗列 HTML 元素，因此有意义的部件通常不仅仅由简单的渲染函数组成。

部件通常位于它们各自的、单独命名的 TypeScript 模块中，且每个模块默认导出定义的部件。

表示部件最简单的方法是基于普通函数，从渲染函数的工厂定义开始。Dojo 的 `@dojo/framework/core/vdom` 模块中提供了一个 `create()` 函数，允许作者定义他们自己的部件渲染函数工厂。可优先使用命名的渲染函数，因为这样有助于调试；但并非必须如此；部件也可以使用一个被导出的变量标识，该变量保存了部件的工厂定义。

对于更喜欢使用类的结构而不是函数的应用程序，Dojo 也提供了基于类的部件。此部件继承 `@dojo/framework/core/WidgetBase` 模块中提供的 `WidgetBase`，并必须要实现一个 `render()` 方法。

以下示例展示了一个 Dojo 应用程序的部件，虽然没有实际用途，但功能完整：

> src/widgets/MyWidget.ts

**基于函数的 Dojo 部件：**

```ts
import { create } from '@dojo/framework/core/vdom';

const factory = create();

export default factory(function MyWidget() {
	return [];
});
```

**基于类的 Dojo 部件：**

```ts
import WidgetBase from '@dojo/framework/core/WidgetBase';

export default class MyWidget extends WidgetBase {
	protected render() {
		return [];
	}
}
```

因为此部件的渲染函数返回的是空数组，所以在应用程序的输出中没有任何内容。部件通常[返回一到多个虚拟 DOM 节点](/learn/creating-widgets/渲染部件#虚拟节点示例)，以便在应用程序的 HTML 输出中包含有意义的结构。

将虚拟 DOM 节点转换为网页中的输出是由 [Dojo 的渲染系统](/learn/creating-widgets/渲染部件)处理的。

## 部件样式

部件的 DOM 输出的样式是由 CSS 处理的，相关的样式类存在 CSS 模块文件中，它与部件的 TypeScript 模块是对应的。基于函数的部件和基于类的部件使用相同的样式。该主题会在[样式和主题参考指南](/learn/styling/introduction)中详细介绍。

# 渲染部件

Dojo 是一个响应式框架，负责处理数据变更的传播和相关的后台更新渲染。Dojo 采用虚拟 DOM(VDOM) 的概念来描述输出的元素，VDOM 中的节点是简单的 JavaScript 对象，旨在提高开发人员效率，而不用与实际的 DOM 元素交互。

应用程序只需要关心，将它们的期望的输出结构声明为有层级的虚拟 DOM 节点即可，通常是作为[部件的渲染函数](/learn/creating-widgets/部件的基本原理#基本的部件结构)的返回值来完成的。然后，框架的 [`Renderer`](/learn/creating-widgets/渲染部件#渲染到-dom-中) 组件会将期望的输出同步为 DOM 中的具体元素。也可以通过给虚拟 DOM 节点传入属性，从而配置部件和元素，以及为部件和元素提供状态。

Dojo 支持树的部分子节点渲染，这意味着当状态发生变化时，框架能够定位到受变化影响的 VDOM 节点的对应子集。然后，只更新 DOM 树中受影响的子树，从而响应变化、提高渲染性能并改善用户的交互体验。

> **注意：** 部件渲染函数中返回的虚拟节点，是唯一影响应用程序渲染的因素。尝试使用任何其他实践，[在 Dojo 应用程序开发中是被视为反模式的](/learn/creating-widgets/最佳开发实践)，应当避免。

## 支持 TSX

Dojo 支持使用 `jsx` 语法扩展，在 [TypeScript 中被称为 `tsx`](https://www.TypeScriptlang.org/docs/handbook/jsx.html)。此语法能更方便的描述 VDOM 的输出，并且更接近于构建的应用程序中的 HTML。

### 允许使用 TSX 的应用程序

可以通过 [`dojo create app --tsx` CLI 命令](https://github.com/dojo/cli-create-app) 轻松搭建出允许使用 TSX 的项目。

对于不是通过这种方式搭建的 Dojo 项目，可以通过在项目的 TypeScript 配置中添加以下内容来启用 TSX：

> `./tsconfig.json`

```json
{
	"compilerOptions": {
		"jsx": "react",
		"jsxFactory": "tsx"
	},
	"include": ["./src/**/*.ts", "./src/**/*.tsx", "./tests/**/*.ts", "./tests/**/*.tsx"]
}
```

### TSX 部件示例

具有 `.tsx` 文件扩展名的部件，要在渲染函数中输出 TSX，只需要导入 `@dojo/framework/core/vdom` 模块中的 `tsx` 函数：

> src/widgets/MyTsxWidget.tsx

**基于函数的部件：**

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';

const factory = create();

export default factory(function MyTsxWidget() {
	return <div>Hello from a TSX widget!</div>;
});
```

**基于类的部件：**

```tsx
import WidgetBase from '@dojo/framework/core/WidgetBase';
import { tsx } from '@dojo/framework/core/vdom';

export default class MyTsxWidget extends WidgetBase {
	protected render() {
		return <div>Hello from a TSX widget!</div>;
	}
}
```

若部件需要返回多个顶级 TSX 节点，则可以将它们包裹在 `<virtual>` 容器元素中。这比返回节点数组更清晰明了，因为这样支持更自然的自动格式化 TSX 代码块。如下：

> src/widgets/MyTsxWidget.tsx

**基于函数的部件：**

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';

const factory = create();

export default factory(function MyTsxWidget() {
	return (
		<virtual>
			<div>First top-level widget element</div>
			<div>Second top-level widget element</div>
		</virtual>
	);
});
```

## 使用 VDOM

### VDOM 节点类型

Dojo 会在 VDOM 中识别出两类节点：

-   `VNode`，或称为 _Virtual Nodes_，是具体 DOM 元素的虚拟表示，作为所有 Dojo 应用程序最底层的渲染输出。
-   `WNode`，或称为 _Widget Nodes_，将 Dojo 部件关联到 VDOM 的层级结构上。

Dojo 的虚拟节点中，`VNode` 和 `WNode` 都可看作 `DNode` 的子类型，但应用程序通常不处理抽象层面的 `DNode`。推荐使用 [TSX 语法](/learn/creating-widgets/渲染部件#支持-tsx)，因为它能以统一的语法渲染两类虚拟节点。

### 实例化 VDOM 节点

如果不想使用 TSX，在部件中可以导入 `@dojo/framework/core/vdom` 模块中的 `v()` 或 `w()` 函数。它们分别创建 `VNode` 和 `WNode`，并可作为[部件渲染函数](/learn/creating-widgets/部件的基本原理#基本的部件结构)返回值的一部分。它们的签名，抽象地说，如下：

-   `v(tagName | VNode, properties?, children?)`:
-   `w(Widget | constructor, properties, children?)`

| 参数                   | 可选             | 描述                                                                                                                                                                                                                                                                                                                                   |
| ---------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tagName | VNode`      | 否               | 通常，会以字符串的形式传入 `tagName`，该字符串对应 `VNode` 将要渲染的相应 DOM 元素的标签名。如果传入的是 `VNode`，新创建的 `VNode` 将是原始 `VNode` 的副本。如果传入了 `properties` 参数，则会合并 `properties` 中重复的属性，并应用到副本 `VNode` 中。如果传入了 `children` 参数，将在新的副本中完全覆盖原始 `VNode` 中的所有子节点。 |
| `Widget | constructor` | 否               | 通常，会传入 `Widget`，它将导入部件当作泛型类型引用。还可以传入几种类型的 `constructor`，它允许 Dojo 以各种不同的方式实例化部件。它们支持延迟加载等高级功能。                                                                                                                                                                          |
| `properties`           | `v`: 是, `w`: 否 | [用于配置新创建的 VDOM 节点的属性集](/learn/creating-widgets/通过属性配置部件)。它们还允许框架检测节点是否已更新，从而重新渲染。                                                                                                                                                                                                       |
| `children`             | 是               | 一组节点，会渲染为新创建节点的子节点。如果需要，还可以使用字符串字面值表示任何文本节点。部件通常会封装自己的子节点，因此此参数更可能会与 `v()` 一起使用，而不是 `w()`。                                                                                                                                                                |

### 虚拟节点示例

以下示例部件包含一个更有代表性的渲染函数，它返回一个 `VNode`。它期望的结构描述为，一个简单的 `div` DOM 元素下包含一个文本节点：

> src/widgets/MyWidget.ts

**基于函数的部件：**

```ts
import { create, v } from '@dojo/framework/core/vdom';

const factory = create();

export default factory(function MyWidget() {
	return v('div', ['Hello, Dojo!']);
});
```

**基于类的部件：**

```ts
import WidgetBase from '@dojo/framework/core/WidgetBase';
import { v } from '@dojo/framework/core/vdom';

export default class MyWidget extends WidgetBase {
	protected render() {
		return v('div', ['Hello, Dojo!']);
	}
}
```

### 组合部件的示例

类似地，也可以使用 `w()` 方法组合部件，还可以混合使用两种类型的节点来输出多个节点，以形成更复杂的层级结构：

> src/widgets/MyComposingWidget.ts

**基于函数的部件：**

```ts
import { create, v, w } from '@dojo/framework/core/vdom';

const factory = create();

import MyWidget from './MyWidget';

export default factory(function MyComposingWidget() {
	return v('div', ['This widget outputs several virtual nodes in a hierarchy', w(MyWidget, {})]);
});
```

**基于类的部件：**

```ts
import WidgetBase from '@dojo/framework/core/WidgetBase';
import { v, w } from '@dojo/framework/core/vdom';

import MyWidget from './MyWidget';

export default class MyComposingWidget extends WidgetBase {
	protected render() {
		return v('div', ['This widget outputs several virtual nodes in a hierarchy', w(MyWidget, {})]);
	}
}
```

## 渲染到 DOM 中

Dojo 为应用程序提供了一个渲染工厂函数 `renderer()`，`@dojo/framework/core/vdom` 模块默认导出该函数。提供的工厂函数定义了应用程序的根节点，会在此处插入 VDOM 结构的输出结果。

应用程序通常在主入口点 (`main.tsx`/`main.ts`) 调用 `renderer()` 函数，然后将返回的 `Renderer` 对象挂载到应用程序的 HTML 页面中指定的 DOM 元素上。如果挂载应用程序时没有指定元素，则默认挂载到 `document.body` 下。

例如：

> src/main.tsx

```tsx
import renderer, { tsx } from '@dojo/framework/core/vdom';

import MyComposingWidget from './widgets/MyComposingWidget';

const r = renderer(() => <MyComposingWidget />);
r.mount();
```

### `MountOptions` 属性

`Renderer.mount()` 方法接收一个可选参数 `MountOptions`，该参数用于配置如何执行挂载操作。

| 属性       | 类型          | 可选 | 描述                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------- | ------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sync`     | `boolean`     | 是   | 默认为: `false`。 如果为 `true`，则渲染生命周期中相关的回调（特别是 `after` 和 `deferred` 渲染回调函数）是同步运行的。 如果为 `false`，则在 [`window.requestAnimationFrame()`](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame) 下一次重绘之前，回调函数被安排为异步运行。在极少数情况下，当特定节点需要存在于 DOM 中时，同步运行渲染回调函数可能很有用，但对于大多数应用程序，不建议使用此模式。 |
| `domNode`  | `HTMLElement` | 是   | 指定 DOM 元素，VDOM 的渲染结果会插入到该 DOM 节点中。如果没有指定，则默认为 `document.body`。                                                                                                                                                                                                                                                                                                                                   |
| `registry` | `Registry`    | 是   | 一个可选的 `Registry` 实例，可在挂载的 VDOM 间使用。                                                                                                                                                                                                                                                                                                                                                                            |

例如，将一个 Dojo 应用程序挂载到一个指定的 DOM 元素，而不是 `document.body` 下：

> src/index.html

```html
<!DOCTYPE html>
<html lang="en-us">
	<body>
		<div>This div is outside the mounted Dojo application.</div>
		<div id="my-dojo-app">This div contains the mounted Dojo application.</div>
	</body>
</html>
```

> src/main.tsx

```tsx
import renderer, { tsx } from '@dojo/framework/core/vdom';

import MyComposingWidget from './widgets/MyComposingWidget';

const dojoAppRootElement = document.getElementById('my-dojo-app') || undefined;
const r = renderer(() => <MyComposingWidget />);
r.mount({ domNode: dojoAppRootElement });
```

## 卸载应用程序

为了卸载（unmount）一个 Dojo 应用程序，`renderer` 提供了一个 `unmount` API，用于删除 DOM 节点，并对当前渲染的所有部件执行注册的所有销毁操作。

```tsx
const r = renderer(() => <App />);
r.mount();
// To unmount the dojo application
r.unmount();
```

## 向 VDOM 中加入外部的 DOM 节点

Dojo 可以包装外部的 DOM 元素，有效地将它们引入到应用程序的 VDOM 中，用作渲染输出的一部分。这是通过 `@dojo/framework/core/vdom` 模块中的 `dom()` 工具方法完成的。它的工作原理与 [`v()`](/learn/creating-widgets/渲染部件#实例化-vdom-节点) 类似，但它的主参数使用的是现有的 DOM 节点而不是元素标记字符串。在返回 `VNode` 时，它会引用传递给它的 DOM 节点，而不是使用 `v()` 新创建的元素。

一旦 `dom()` 返回的 `VNode` 添加到应用程序的 VDOM 中，Dojo 应用程序就实际获得了被包装 DOM 节点的所有权。请注意，此过程仅适用于 Dojo 应用程序的外部节点，如挂载应用程序元素的兄弟节点，或与主网页的 DOM 断开连接的新创建的节点。如果包装的节点是挂载了应用程序的元素的祖先或子孙节点，将无效。

### `dom()` API

-   `dom({ node, attrs = {}, props = {}, on = {}, diffType = 'none', onAttach })`

| 参数       | 可选 | 描述                                                                                                                                    |
| ---------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `node`     | 否   | 添加到 Dojo VDOM 中的外部 DOM 节点                                                                                                      |
| `attrs`    | 是   | 应用到外部 DOM 节点上的 HTML 属性(attributes)                                                                                           |
| `props`    | 是   | 附加到 DOM 节点上的属性(properties)                                                                                                     |
| `on`       | 是   | 应用到外部 DOM 节点上的事件集合                                                                                                         |
| `diffType` | 是   | 默认为: `none`。[更改检测策略](/learn/creating-widgets/渲染部件#检测外部-dom-节点的变化)，确定 Dojo 应用程序是否需要更新外部的 DOM 节点 |
| `onAttach` | 是   | 一个可选的回调函数，在节点追加到 DOM 后执行                                                                                             |

### 检测外部 DOM 节点的变化

通过 `dom()` 添加的外部节点是从常规的虚拟 DOM 节点中移除的，因为它们可能会在 Dojo 应用程序之外被处理。这意味着 Dojo 不能主要使用 `VNode` 的属性设置元素的状态，而是必须依赖 DOM 节点本身的 JavaScript 属性(properties)和 HTML 属性(attributes)。

`dom()` 接收 `diffType` 属性，允许用户为包装的节点指定属性变更检测策略。一个指定的策略，会指明如何使用包装的节点，以帮助 Dojo 来确定 JavaScript 属性和 HTML 属性是否已变化，然后将变化应用到包装的 DOM 节点上。默认的策略是 `none`，意味着 Dojo 只需在每个渲染周期将包装好的 DOM 元素添加到应用程序输出中。

**注意：** 所有的策略都使用前一次 `VNode` 中的事件，以确保它们会被正确的删除并应用到每个渲染中。

可用的 `dom()` 变化检测策略：

| `diffType` | 描述                                                                                                                                                             |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `none`     | 此模式会为包装的 `VNode` 的前一次 `attributes` 和 `properties` 传入空对象，意味着在每个渲染周期，都会将传给 `dom()` 的 `props` 和 `attrs` 重新应用于包装的节点。 |
| `dom`      | 此模式基于 DOM 节点中的 `attributes` 和 `properties` 与传入 `dom()` 的 `props` 和 `attrs` 进行比较计算，确定是否存在差异，然后应用这些差异。                     |
| `vdom`     | 此模式与前一次的 `VNODE` 做比较，这实际上是 Dojo 默认的 VDOM 差异对比策略。在变更检测和更新渲染时会忽略直接对包装的节点所做的任何修改。                          |

# 通过属性配置部件

传递给 VDOM 中节点的属性(properties)概念是 Dojo 的核心支柱。节点属性充当在应用程序中传播状态的主要管道，可将其从父部件传给子部件，也可以通过事件处理器逐层回传。它们也可以作为使用者与部件交互的重要 API，为父部件传入属性来配置其 DOM 结构（返回 `VNode`），也可以传给其管理的子部件（返回 `WNode`）。

`VNode` 接收 `VNodeProperties` 类型的属性，`WNode` 最低接收 `WidgetProperties`。部件的作者通常会定义自己的属性接口，然后需要调用者传入该接口。

## VDOM 节点的 `key`

`Widgetproperties` 非常简单，只包含一个可选属性 `key`，该属性也存在于 `VNodeProperties` 中。

当部件开始输出的多个元素，处在 VDOM 的同一个层级，并且类型相同，就必须指定 `key`。例如，一个列表部件管理了多个列表项，就需要为列表中的每一项指定一个 `key`。

当重新渲染 VDOM 中受影响部分时，Dojo 使用虚拟节点的 key 来唯一标识特定实例。如果没有使用 key 在 VDOM 中区分开同一层级中的相同类型的多个节点，则 Dojo 就无法准确地确定哪些子节点受到了失效更改(invalidating change)的影响。

> **注意：** 虚拟节点的 `key` 应在多次渲染函数的调用中保持一致。在每一次的渲染调用中，为相同的输出节点生成不同的 key，[在 Dojo 应用程序开发中被认为是反模式的](/learn/creating-widgets/最佳开发实践#虚拟-dom)，应当避免。

## 定义部件的 `key`

按惯例，Dojo 的渲染引擎在渲染时使用部件的 `key` 属性来唯一标识和跟踪部件。但是，为了确保 Dojo 渲染引擎在下一次渲染时重新创建部件，而不是重用之前的实例，更新 `key` 属性也是一种行之有效的方法。重新创建部件时，之前所有的状态都会被重置。当部件基于属性值来管理逻辑时，这种行为是非常有用的。

Dojo 为部件的开发者提供一种机制，通过使用 `create()` 工厂的链接方法 `.key()` 将部件的属性关联为部件的标识。

```tsx
import { create } from '@dojo/framework/core/vdom';

interface MyWidgetProperties {
	id: string;
}

const factory = create()
	.properties<MyWidgetProperties>()
	.key('id');
```

使用这个 factory 后，当 `id` 属性值改变时，Dojo 将重新创建部件实例。这个强大的特性让部件开发者能轻松做到，当定义的属性值变更后就重新创建部件，因此开发者不需要处理基于属性来刷新数据的复杂逻辑。

```tsx
import { create } from '@dojo/framework/core/vdom';
import icache from '@dojo/framework/core/middleware/icache';

interface MyWidgetProperties {
	id: string;
}

const factory = create({ icache })
	.properties<MyWidgetProperties>()
	.key('id');

const MyWidget = factory(function MyWidget({ properties, middleware: { icache } }) {
	const { id } = properties();
	const data = icache.getOrSet('data', async () => {
		const response = await fetch(`https://my-api/items/${id}`);
		const json = await response.json();
		return json.data;
	});

	if (!data) {
		return <div>Loading Data...</div>;
	}

	return (
		<div>
			<ul>{data.map((item) => <li>{item}</li>)}</ul>
		</div>
	);
});
```

本实例演示了基于 `id` 属性来获取数据。如果不使用 `.key('id')`，部件需要管理 `id` 属性变更逻辑。包括确定属性是否已真正修改，重新获取相关数据以及显示加载信息等。使用 `.key('id')` 能确保当 `id` 属性变化后，部件能重新创建，并重置所有状态，然后部件显示 “Loading Data...” 信息，并基于更新后的 `id` 获取数据（而不是使用 icache 缓存的数据）。

## 配置 `VNode`

`VNodeProperties` 包含很多字段，是与 DOM 中的元素交互的重要 API。其中很多属性镜像了 [`HTMLElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement) 中的可用属性，包括指定各种 `oneventname` 的事件处理器。

应用程序的这些属性是单向的，因为 Dojo 将给定的属性集应用到具体的 DOM 元素上，但不会将相应的 DOM 属性后续的任何更改同步到 `VNodeProperties`。任何此类更改都应该通过事件处理器回传给 Dojo 应用程序。当调用事件处理程序时，应用程序可以处理事件所需的任何状态更改，在输出 VDOM 结构进行渲染时，更新对应的 `VNodeProperties` 视图，然后 Dojo 的 [`Renderer` 会同步所有相关的 DOM 更新](/learn/creating-widgets/渲染部件#渲染到-dom-中)。

## 修改属性和差异检测

Dojo 使用虚拟节点的属性来确定给定节点是否已更新，从而是否需要重新渲染。具体来说，它使用差异检测策略来比较前一次和当前渲染帧的属性集。如果在节点接收的最新属性集中检测到差异，则该节点将失效，并在下一个绘制周期中重新渲染。

注意，在做属性差异检测时会忽略掉函数，因为常见模式是在每次渲染时都会实例化一个新的函数。考虑下面的示例，子部件 `ChildWidget` 会在每次渲染时接收一个新的 `onClick` 函数。

```tsx
export const ParentWidget(function ParentWidget() {
  return <ChildWidget onClick={() => {
      console.log('child widget clicked.');
  }} />
});
```

如果在差异检测期间对函数进行检测，这将导致每次渲染完 `ParentWidget` 后都重新渲染 `ChildWidget`。

> **注意：** 属性更改检测是由框架内部管理的，依赖于在部件的渲染函数中声明的 VDOM 输出结构。试图保留属性的引用，并在正常的部件渲染周期之外对其进行修改，[在 Dojo 应用程序开发中被视为反模式的](/learn/creating-widgets/最佳开发实践)，应当避免。

# 支持交互

## 事件监听器

在实例化节点时，为虚拟节点指定事件监听器的方法与指定[任何其他属性](/learn/creating-widgets/通过属性配置部件)的方法相同。当输出 `VNode` 时，`VNodeProperties` 上事件监听器的名字会镜像到 [`HTMLElement` 的等价事件上](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement)。虽然自定义部件的作者可以根据自己的选择命名事件，但通常也遵循类似的 `onEventName` 的命名约定。

函数属性（如事件处理程序）会自动绑定到实例化此虚拟节点的部件的 `this` 上下文。但是，如果将已绑定的函数传给属性值，将不会重复绑定给 `this`。

## 处理 focus

输出 `VNode` 时，部件可以使用 `VNodeProperties` 的 `focus` 属性来控制生成的 DOM 元素在渲染时是否获取焦点。这是一个特殊属性，它可接收一个 `boolean` 类型的对象或者是返回一个 `boolean` 类型的函数。

当直接传入 `true` 时，只有上一次的值不是 `true` 时，元素才会获取焦点（类似于[常规属性变更检测](/learn/creating-widgets/通过属性配置部件#修改属性和差异检测)）。而传入函数时，只要函数返回 `true`，元素就会获取焦点，而不管上一次返回值。

例如：

根据元素的顺序，下面的 “firstFocus” 输入框只会在初始化渲染时获取焦点，而 “subsequentFocus” 输入框在每次渲染时都会获取焦点，因为 `focus` 属性的值是函数。

> src/widgets/FocusExample.tsx

**基于函数的部件：**

```tsx
import { create, tsx, invalidator } from '@dojo/framework/core/vdom';

const factory = create({ invalidator });

export default factory(function FocusExample({ middleware: { invalidator } }) {
	return (
		<div>
			<input key="subsequentFocus" type="text" focus={() => true} />
			<input key="firstFocus" type="text" focus={true} />
			<button onclick={() => invalidator()}>Re-render</button>
		</div>
	);
});
```

**基于类的部件：**

```tsx
import WidgetBase from '@dojo/framework/core/WidgetBase';
import { tsx } from '@dojo/framework/core/vdom';

export default class FocusExample extends WidgetBase {
	protected render() {
		return (
			<div>
				<input key="subsequentFocus" type="text" focus={() => true} />
				<input key="firstFocus" type="text" focus={true} />
				<button onclick={() => this.invalidate()}>Re-render</button>
			</div>
		);
	}
}
```

### 委托 focus

基于函数的部件可使用 [`focus` 中间件](/learn/middleware/可用的中间件#focus)为其子部件设置焦点，或者接受来自父部件的焦点。基于类的部件可使用 `FocusMixin`(来自 `@dojo/framework/core/mixins/Focus`)以相同的方式委托 focus。

`FocusMixin` 会给部件的类中添加一个 `this.shouldFocus()` 方法，而基于函数的部件使用 `focus.shouldFocus()` 中间件方法实现相同的目的。此方法会检查部件是否处于执行了获取焦点的状态（译注：即调用了 `this.focus()`），并且仅对单个调用返回 `true`，直到再次调用部件的 `this.focus()` 方法（基于函数的部件使用等价的 `focus.focus()`）。

`FocusMixin` 或者 `focus` 中间件也会为部件的 API 添加一个 `focus` 函数属性。框架使用此属性的布尔结果来确定渲染时，部件（或其一个子部件）是否应获得焦点。通常，部件通过其 `focus` 属性将 `shouldFocus` 方法传递给特定的子部件或输出的节点上，从而允许父部件将焦点委托给其子部件。

基于函数的部件的示例，请参阅 Dojo 中间件参考指南中的 [`focus` 中间件委派示例](/learn/middleware/可用的中间件#focus-委托示例)

下面基于类的部件示例，显示了在部件层次结构内和输出的 VNode 之间委托和控制焦点：

> src/widgets/FocusableWidget.tsx

```tsx
import WidgetBase from '@dojo/framework/core/WidgetBase';
import { tsx } from '@dojo/framework/core/vdom';
import Focus from '@dojo/framework/core/mixins/Focus';

interface FocusInputChildProperties {
	onFocus: () => void;
}

class FocusInputChild extends Focus(WidgetBase)<FocusInputChildProperties> {
	protected render() {
		/*
			The child widget's `this.shouldFocus()` method is assigned directly to the
			input node's `focus` property, allowing focus to be delegated from a higher
			level containing parent widget.

			The input's `onfocus()` event handler is also assigned to a method passed
			in from a parent widget, allowing user-driven focus changes to propagate back
			into the application.
		*/
		return <input onfocus={this.properties.onFocus} focus={this.shouldFocus} />;
	}
}

export default class FocusableWidget extends Focus(WidgetBase) {
	private currentlyFocusedKey = 0;
	private childCount = 5;

	private onFocus(key: number) {
		this.currentlyFocusedKey = key;
		this.invalidate();
	}

	/*
		Calling `this.focus()` resets the widget so that `this.shouldFocus()` will return true when it is next invoked.
	*/
	private focusPreviousChild() {
		--this.currentlyFocusedKey;
		if (this.currentlyFocusedKey < 0) {
			this.currentlyFocusedKey = this.childCount - 1;
		}
		this.focus();
	}

	private focusNextChild() {
		++this.currentlyFocusedKey;
		if (this.currentlyFocusedKey === this.childCount) {
			this.currentlyFocusedKey = 0;
		}
		this.focus();
	}

	protected render() {
		/*
			The parent widget's `this.shouldFocus()` method is passed to the relevant child element
			that requires focus, based on the simple previous/next widget selection logic.

			This allows focus to be delegated to a specific child node based on higher-level logic in
			a container/parent widget.
		*/
		return (
			<div>
				<button onclick={this.focusPreviousChild}>Previous</button>
				<button onclick={this.focusNextChild}>Next</button>
				<FocusInputChild
					key={0}
					focus={this.currentlyFocusedKey === 0 ? this.shouldFocus : undefined}
					onFocus={() => this.onFocus(0)}
				/>
				<FocusInputChild
					key={1}
					focus={this.currentlyFocusedKey === 1 ? this.shouldFocus : undefined}
					onFocus={() => this.onFocus(1)}
				/>
				<FocusInputChild
					key={2}
					focus={this.currentlyFocusedKey === 2 ? this.shouldFocus : undefined}
					onFocus={() => this.onFocus(2)}
				/>
				<FocusInputChild
					key={3}
					focus={this.currentlyFocusedKey === 3 ? this.shouldFocus : undefined}
					onFocus={() => this.onFocus(3)}
				/>
				<FocusInputChild
					key={4}
					focus={this.currentlyFocusedKey === 4 ? this.shouldFocus : undefined}
					onFocus={() => this.onFocus(4)}
				/>
			</div>
		);
	}
}
```

# 状态管理

在数据不需要在多个组件之间流动的简单应用程序中，状态管理是非常简单的。可将部件需要的数据封装在部件内，这是 Dojo 应用程序中[状态管理的最基本形式](/learn/creating-widgets/状态管理#基础自封装的部件状态)。

随着应用程序变得越来越复杂，并且开始要求在多个部件之间共享和传输数据，就需要一种更健壮的状态管理形式。在这里，Dojo 开始展现出其响应式框架的价值，允许应用程序定义数据如何在组件之间流动，然后由框架管理变更检测和重新渲染。这是通过在部件的渲染函数中声明 VDOM 输出时[将部件和属性连接在一起](/learn/creating-widgets/状态管理#中级传入部件属性)而做到的。

对于大型应用程序，状态管理可能是最具挑战性的工作之一，需要开发人员在数据一致性、可用性和容错性之间进行平衡。虽然这种复杂性大多超出了 web 应用程序层的范围，但 Dojo 提供了更进一步的解决方案，以确保数据的一致性。[Dojo Store](/learn/stores/introduction) 组件提供了一个集中式的状态存储，它提供一致的 API，用于访问和管理应用程序中多个位置的数据。

## 基础：自封装的部件状态

部件可以通过多种方式维护其内部状态。基于函数的部件可以使用 [`icache`](/learn/middleware/可用的中间件#icache) 中间件来存储部件的本地状态，而基于类的部件可以使用内部的类字段。

内部状态数据可能直接影响部件的渲染输出，也可能作为属性传递给子部件，而它们继而又直接影响了子部件的渲染输出。部件还可能允许更改其内部状态，例如响应用户交互事件。

以下示例解释了这些模式：

> src/widgets/MyEncapsulatedStateWidget.tsx

**基于函数的部件：**

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import icache from '@dojo/framework/core/middleware/icache';

const factory = create({ icache });

export default factory(function MyEncapsulatedStateWidget({ middleware: { icache } }) {
	return (
		<div>
			Current widget state: {icache.get<string>('myState') || 'Hello from a stateful widget!'}
			<br />
			<button
				onclick={() => {
					let counter = icache.get<number>('counter') || 0;
					let myState = 'State change iteration #' + ++counter;
					icache.set('myState', myState);
					icache.set('counter', counter);
				}}
			>
				Change State
			</button>
		</div>
	);
});
```

**基于类的部件：**

```tsx
import WidgetBase from '@dojo/framework/core/WidgetBase';
import { tsx } from '@dojo/framework/core/vdom';

export default class MyEncapsulatedStateWidget extends WidgetBase {
	private myState = 'Hello from a stateful widget!';
	private counter = 0;

	protected render() {
		return (
			<div>
				Current widget state: {this.myState}
				<br />
				<button
					onclick={() => {
						this.myState = 'State change iteration #' + ++this.counter;
					}}
				>
					Change State
				</button>
			</div>
		);
	}
}
```

注意，这个示例是不完整的，在正在运行的应用程序中，单击“Change State”按钮不会对部件的渲染输出产生任何影响。这是因为状态完全封装在 `MyEncapsulatedStateWidget` 部件中，而 Dojo [无从得知对部件的任何更改](/learn/creating-widgets/最佳开发实践#部件属性)。框架只处理了部件的初始渲染。

要通知 Dojo 重新渲染，则需要封装渲染状态的部件自行失效。

### 让部件失效

基于函数的部件可以使用 [`icache` 中间件](/learn/middleware/可用的中间件#icache)处理本地的状态管理，当状态更新时会自动失效部件。`icache` 组合了 [`cache`](/learn/middleware/可用的中间件#cache) 和 [`invalidator`](/learn/middleware/可用的中间件#invalidator) 中间件，拥有 `cache` 的处理部件状态管理的功能，和 `invalidator` 的当状态变化时让部件失效的功能。如果需要，基于函数的部件也可以直接使用 `invalidator`。

基于类的部件，则有两种失效的方法：

1.  在状态被更改后的适当位置显式调用 `this.invalidate()`
    -   在 `MyEncapsulatedStateWidget` 示例中，可在“Change State”按钮的 `onclick` 处理函数中完成。
2.  使用 `@watch()` 装饰器（来自 `@dojo/framework/core/vdomercorators/watch` 模块）注释任何相关字段。当修改了 `@watch` 注释的字段后，将隐式调用 `this.invalidate()`，这对于状态字段很有用，这些字段在更新时总是需要重新渲染。

**注意：** 将一个部件标记为无效，并不会立刻重新渲染该部件，而是通知 Dojo，部件已处于 dirty 状态，应在下一个渲染周期中进行更新和重新渲染。这意味着在同一个渲染帧内多次失效同一个部件并不会对应用程序的性能产生负面影响，但应避免过多重复的失效以确保最佳性能。

以下是修改过的 `MyEncapsulatedStateWidget` 示例，当状态变化时会正确地更新输出。

**基于函数的部件：**

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import icache from '@dojo/framework/core/middleware/icache';

const factory = create({ icache });

export default factory(function MyEncapsulatedStateWidget({ middleware: { icache } }) {
	return (
		<div>
			Current widget state: {icache.getOrSet<string>('myState', 'Hello from a stateful widget!')}
			<br />
			<button
				onclick={() => {
					let counter = icache.get<number>('counter') || 0;
					let myState = 'State change iteration #' + ++counter;
					icache.set('myState', myState);
					icache.set('counter', counter);
				}}
			>
				Change State
			</button>
		</div>
	);
});
```

**基于类的部件：**

此处，`myState` 和 `counter` 都在应用程序逻辑操作的同一个地方进行了更新，因此可将 `@watch()` 添加到任一字段上或者同时添加到两个字段上，这些配置的实际结果和性能状况完全相同：

> src/widgets/MyEncapsulatedStateWidget.tsx

```tsx
import WidgetBase from '@dojo/framework/core/WidgetBase';
import watch from '@dojo/framework/core/decorators/watch';
import { tsx } from '@dojo/framework/core/vdom';

export default class MyEncapsulatedStateWidget extends WidgetBase {
	private myState: string = 'Hello from a stateful widget!';

	@watch() private counter: number = 0;

	protected render() {
		return (
			<div>
				Current widget state: {this.myState}
				<br />
				<button
					onclick={() => {
						this.myState = 'State change iteration #' + ++this.counter;
					}}
				>
					Change State
				</button>
			</div>
		);
	}
}
```

## 中级：传入部件属性

通过虚拟节点的 [`properties`](/learn/creating-widgets/通过属性配置部件) 将状态传入部件是 Dojo 应用程序中连接响应式数据流最有效的方法。

部件指定自己的属性[接口](https://www.typescriptlang.org/docs/handbook/interfaces.html)，该接口包含部件希望向使用者公开的任何字段，包括配置选项、表示注入状态的字段以及任何事件处理函数。

基于函数的部件是将其属性接口以泛型参数的形式传给 `create().properties<MyPropertiesInterface>()` 的。然后，本调用链返回的工厂函数通过渲染函数定义中的 `properties` 函数参数，让属性值可用。

基于类的部件可将其属性接口定义为类定义中 `WidgetBase` 的泛型参数，然后通过 `this.properties` 对象访问其属性。

例如，一个支持状态和事件处理器属性的部件：

> src/widgets/MyWidget.tsx

**基于函数的部件：**

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import icache from '@dojo/framework/core/middleware/icache';

const factory = create().properties<{
	name: string;
	onNameChange?(newName: string): void;
}>();

export default factory(function MyWidget({ middleware: { icache }, properties }) {
	const { name, onNameChange } = properties();
	let newName = icache.get<string>('new-name') || '';
	return (
		<div>
			<span>Hello, {name}! Not you? Set your name:</span>
			<input
				type="text"
				value={newName}
				oninput={(e: Event) => {
					icache.set('new-name', (e.target as HTMLInputElement).value);
				}}
			/>
			<button
				onclick={() => {
					icache.set('new-name', undefined);
					onNameChange && onNameChange(newName);
				}}
			>
				Set new name
			</button>
		</div>
	);
});
```

**基于类的部件：**

```tsx
import WidgetBase from '@dojo/framework/core/WidgetBase';
import { tsx } from '@dojo/framework/core/vdom';

export interface MyWidgetProperties {
	name: string;
	onNameChange?(newName: string): void;
}

export default class MyWidget extends WidgetBase<MyWidgetProperties> {
	private newName = '';
	protected render() {
		const { name, onNameChange } = this.properties;
		return (
			<div>
				<span>Hello, {name}! Not you? Set your name:</span>
				<input
					type="text"
					value={this.newName}
					oninput={(e: Event) => {
						this.newName = (e.target as HTMLInputElement).value;
						this.invalidate();
					}}
				/>
				<button
					onclick={() => {
						this.newName = '';
						onNameChange && onNameChange(newName);
					}}
				>
					Set new name
				</button>
			</div>
		);
	}
}
```

此示例部件的使用者可以通过传入适当的属性与之交互：

> src/widgets/NameHandler.tsx

**基于函数的部件：**

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import icache from '@dojo/framework/core/middleware/icache';

import MyWidget from './MyWidget';

const factory = create({ icache });

export default factory(function NameHandler({ middleware: { icache } }) {
	let currentName = icache.get<string>('current-name') || 'Alice';
	return (
		<MyWidget
			name={currentName}
			onNameChange={(newName) => {
				icache.set('current-name', newName);
			}}
		/>
	);
});
```

**基于类的部件：**

```tsx
import WidgetBase from '@dojo/framework/core/WidgetBase';
import { tsx } from '@dojo/framework/core/vdom';
import watch from '@dojo/framework/core/decorators/watch';
import MyWidget from './MyWidget';

export default class NameHandler extends WidgetBase {
	@watch() private currentName: string = 'Alice';

	protected render() {
		return (
			<MyWidget
				name={this.currentName}
				onNameChange={(newName) => {
					this.currentName = newName;
				}}
			/>
		);
	}
}
```

## 高级：提取和注入状态

实现复杂功能时，在部件内遵循状态封装模式可能会导致组件膨胀、难以管理。在大型应用程序中也可能出现另一个问题，数百个部件跨数十个层级组合在一起。通常是叶部件使用状态数据，并不是 VDOM 层次结构中的中间容器。让数据状态穿透这样一个层次结构复杂的部件需要增加脆弱、不必要的代码。

Dojo 提供的 [Store 组件](/learn/stores/introduction) 解决了这些问题，它将状态管理提取到专用上下文中，然后将应用程序中的相关状态注入到特定的部件中。

# 最佳开发实践

使用 Dojo 部件时，应谨记一些重要原则，以避免在应用程序代码中引入反模式。试图以不受支持的方式使用框架可能会导致意外的行为，并在应用程序中引入难以发现的错误。

## 部件属性

-   部件应只能读取传入其中的属性(properties)。
    -   如果修改了传入部件中的属性值，则不能回传给框架，以避免导致部件和框架之间出现差异。
-   部件应避免基于属性进一步派生渲染状态，而是完全依赖于向其提供的渲染状态。
    -   与修改接收到的属性一样，派生渲染状态也会导致部件与框架之间产生类似的歧义；框架无从得知派生出的状态，所以无法正确判断部件何时更新，从而需要让部件失效并重新渲染。
-   如果需要，内部或私有状态可以完全封装在部件内。
    -   实现“纯”部件是一个有效且通常是可取的模式，它不会产生副作用，并用属性接收它们的所有状态，但这不是开发 Dojo 部件的唯一模式。

## 使用基于类的部件

-   _`__render__`_, _`__setProperties__`_, and _`__setChildren__`_ 函数属于框架内部实现细节，绝不允许在应用程序中调用或覆写。
-   应用程序不应直接实例化部件——Dojo 完全接管部件实例的生命周期，包括实例化、缓存和销毁。

## 虚拟 DOM

-   虚拟节点的 [`key`](/learn/creating-widgets/通过属性配置部件#vdom-节点的-key) 应在多次渲染调用中保持一致。
    -   如果在每次渲染调用中都指定一个不同的 `key`，则 Dojo 无法有效地将前一次渲染和本次渲染中的相同节点关联上。Dojo 会将上一次渲染中没有看到的新 `key` 当作新元素，这会导致从 DOM 中删除之前的节点并重新添加一套，即使属性没有发生变化，不需要重新更新 DOM。
    -   一个常见的反模式是在部件的渲染函数中为节点的 `key` 分配一个随机生成的 ID（如 GUID 或 UUID）。除非生成策略是等幂的，否则不应在渲染函数中生成节点的 `key` 值。
-   应用程序不应存储虚拟节点的引用，以便从部件的渲染函数返回它们后，进行后续操作；也不应尝试通过使用单个实例跨多个渲染调用来优化内存分配。
    -   虚拟节点被设计成轻量级的，并且在每次部件渲染周期内实例化新版本的开销非常低。
    -   框架依赖于在两次部件渲染函数调用中有两个单独的虚拟节点实例来执行准确的更改检测。如果未检测到任何变化，则不会产生进一步的开销、渲染等。

## 渲染到 DOM 中

-   应用程序不应使用命令式的 DOM 操作调用。
    -   框架负责处理所有具体的渲染职责，并且为部件作者提供了替代机制，以更简单、类型安全和响应式的方式使用各种 DOM 功能。
