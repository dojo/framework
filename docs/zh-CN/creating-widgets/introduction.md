# 介绍

<!--
https://github.com/dojo/framework/blob/master/docs/en/creating-widgets/introduction.md
commit 8071636e1a942caacc8349bd6bc211678bd33f06
-->

Dojo 鼓励编写简单的、模块化组件，并称之为**部件**，它仅实现应用程序大量需求中的单一职责。部件被设计成可在各种场景中组合和复用，能以响应的方式连接在一起，以满足更复杂的 web 应用程序需求。

部件使用渲染函数返回的虚拟节点描述其预期的结构。然后，在应用程序运行时，Dojo 的渲染系统会持续地将部件每一层渲染的内容转换为对应的、高效的 DOM 更新。

| 功能           | 描述                                                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **响应式设计** | Dojo 部件是围绕响应式的核心原则设计的，这样在应用程序中传播变化的状态时，就可以确保可预见的、一致的行为。                   |
| **封装部件**   | 创建独立、封装的部件，这些部件可通过各种配置组合在一起，从而创建出复杂且漂亮的用户界面。                                    |
| **DOM 抽象**   | 框架提供了恰当的抽象，这意味着 Dojo 应用程序不需要直接与命令式 DOM 打交道。                                                 |
| **高效渲染**   | Dojo 的渲染系统可以检测出部件层次结构中特定子节点的状态变化，这样当更新发生时，只需要高效的重新渲染应用程序中受影响的部分。 |
| **企业级**     | 跨领域的应用程序需求，如国际化、本地化和样式主题，可以轻松地添加到用户创建的部件中。                                        |

## 基本用法

### 定义部件

-   使用 [内置的 `create()`](/learn/creating-widgets/部件的基本原理#基本的部件结构) 将部件定义为一个渲染函数 factory
-   返回定义了部件结构的 [虚拟 DOM 节点](/learn/creating-widgets/渲染部件/#使用-vdom)，这里使用 [TSX 语法](/learn/creating-widgets/渲染部件#支持-tsx)

> src/widgets/MyWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';

const factory = create();

export default factory(function MyWidget() {
	return <div>Hello from a Dojo widget!</div>;
});
```

### 设置部件属性

-   为了使部件能更好的复用，需要使用[类型化的属性接口](/learn/creating-widgets/状态管理#中级传入部件属性)来抽象出 [state](/learn/creating-widgets/状态管理), 配置和[事件处理函数](/learn/creating-widgets/支持交互)
-   使用 `create` 工厂为部件提供[中间件](/learn/middleware/introduction)
-   通过为节点指定 [`key` 属性](/learn/creating-widgets/通过属性配置部件#vdom-节点的-key)，来区分同一类型的兄弟元素，此示例中是两个 `div` 元素。这样当应用程序中的状态发生变化，需要更新 DOM 节点时，框架就可以高效、准确地定位到相关元素

> src/widgets/Greeter.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import icache from '@dojo/framework/core/middleware/icache';

const factory = create({ icache }).properties<{
	name: string;
	onNameChange?(newName: string): void;
}>();

export default factory(function Greeter({ middleware: { icache }, properties }) {
	const { name, onNameChange } = properties();
	let newName = icache.get<string>('new-name') || '';
	return (
		<div>
			<div key="appBanner">Welcome to a Dojo application!</div>
			{name && <div key="nameBanner">Hello, {name}!</div>}
			<label for="nameEntry">What's your name?</label>
			<input
				id="nameEntry"
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
				Set my name
			</button>
		</div>
	);
});
```

### 组合部件

-   通过将部件组合在一起形成多层结构，以满足更复杂的应用程序需求
-   为子部件提供 state 和事件处理函数等[属性(properties)](/learn/creating-widgets/通过属性配置部件)
-   使用 [`icache` 中间件](/learn/middleware/可用的中间件#icache)管理 state，并当状态变更时，失效或重新渲染受影响的部件

> src/widgets/NameHandler.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import icache from '@dojo/framework/core/middleware/icache';

import Greeter from './Greeter';

const factory = create({ icache });

export default factory(function NameHandler({ middleware: { icache } }) {
	let currentName = icache.get<string>('current-name') || '';
	return (
		<Greeter
			name={currentName}
			onNameChange={(newName) => {
				icache.set('current-name', newName);
			}}
		/>
	);
});
```

### 渲染到 DOM 中

-   使用框架中的 `renderer` 函数将部件挂载到 DOM 中
-   也可以对 Dojo 应用程序在页面中呈现的位置[做更多控制](/learn/creating-widgets/渲染部件#mountoptions-属性)，以便稳步地采用较小的子组件，甚至支持一个页面中存在多个应用程序或框架

> src/main.tsx

```tsx
import renderer, { tsx } from '@dojo/framework/core/vdom';

import NameHandler from './widgets/NameHandler';

const r = renderer(() => <NameHandler />);
r.mount();
```
