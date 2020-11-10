# 介绍

<!--
https://github.com/dojo/framework/blob/master/docs/en/middleware/introduction.md
commit b8e0228c4025cb803d1c56521b054f6d5e6dfdb2
-->

Dojo 的**中间件**系统能以响应式的方式管理异步或命令式 API，以及影响基于函数的组合部件或其他中间件的行为与属性 API。

框架已提供了几个核心中间件和可选中间件，应用程序开发人员也可以轻松编写自己的中间件。

| 功能                       | 描述                                                                                                                                                       |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **响应式 DOM 访问**        | 借助中间件，基于函数的部件可以处理和使用输出节点对应的 DOM 部分的具体信息和 API。                                                                          |
| **控制部件渲染的生命周期** | 对任何组合部件，中间件可以控制 Dojo 渲染管道的各个部分，如当需要更新渲染时让部件失效。也可以暂停和继续部件的渲染，在等待关键信息可以使用时，短路渲染结果。 |
| **框架提供了一些中间件**   | Dojo 提供了一些中间件，能让部件实现很多功能，如响应和控制焦点、简单的缓存值、响应元素的交叉事件和大小变化事件、CSS 主题、国际化和构建时渲染等。            |
| **易于组合和复用**         | 中间件的设计是与基于函数的部件紧密结合的，中间件能组合到部件的层次结构中，并且在开发自定义中间件时也可复用中间件                                           |

## 基本用法

### 创建中间件

-   定义基于函数部件的 `create()` 也可以用于定义中间件
-   定义一个属性接口（可选），以扩充使用了此中间件的部件的属性接口。当创建组合部件实例时传入这些属性值
-   返回一个简单的函数引用，该函数定义了中间件的 API，供其他组合部件或中间件使用

> src/middleware/myMiddleware.ts

```ts
import { create } from '@dojo/framework/core/vdom';

const factory = create().properties<{ middlewareProp?: boolean }>();

export const myMiddleware = factory(({ properties }) => {
	return () => {
		return properties().middlewareProp ? 'Conditional is true' : 'Conditional is false';
	};
});

export default myMiddleware;
```

### 组合中间件

-   组合中间件并返回一个对象以公开更复杂的 API
-   使用核心的 [`invalidator`](/learn/middleware/核心渲染中间件#invalidator) 中间件将组合部件标记为需要重新渲染

> src/middleware/myComposingMiddleware.ts

```ts
import { create, invalidator } from '@dojo/framework/core/vdom';
import myMiddleware from './myMiddleware';

const factory = create({ myMiddleware, invalidator });

export const myComposingMiddleware = factory(({ middleware: { myMiddleware, invalidator } }) => {
	return {
		get() {
			return myMiddleware();
		},
		set() {
			invalidator();
		}
	};
});

export default myComposingMiddleware;
```

### 部件内使用中间件

-   用中间件使用的附加属性来扩充部件的属性接口
-   使用中间件组合成的部件时，传入中间件的属性

> src/widgets/MyWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import myComposingMiddleware from '../middleware/myComposingMiddleware';

const factory = create({ myComposingMiddleware });

export default factory(function MyWidget({ properties, middleware: { myComposingMiddleware } }) {
	return (
		<virtual>
			<div>{`Middleware property value: ${properties.middlewareProp}`}</div>
			<div>{`Middleware usage: ${myComposingMiddleware.get()}`}</div>
		</virtual>
	);
});
```

> src/main.tsx

```tsx
import renderer, { tsx } from '@dojo/framework/core/vdom';
import MyWidget from './widgets/MyWidget';

const r = renderer(() => <MyWidget middlewareProp={true} />);
r.mount();
```
