# Dojo test harness

<!--
https://github.com/dojo/framework/blob/master/docs/en/testing/supplemental.md
commit 028b93451e93ef2a4f4ff4c3b0dde8b58e7a5b1d
-->

当使用 `@dojo/framework/testing` 时，`harness()` 是最重要的 API，主要用于设置每一个测试并提供一个执行虚拟 DOM 断言和交互的上下文。目的在于当更新 `properties` 或 `children`，以及部件失效时，镜像部件的核心行为，并且不需要任何特殊或自定义逻辑。

## Harness API

```ts
interface HarnessOptions {
	customComparators?: CustomComparator[];
	middleware?: [MiddlewareResultFactory<any, any, any>, MiddlewareResultFactory<any, any, any>][];
}

harness(renderFunction: () => WNode, customComparators?: CustomComparator[]): Harness;
harness(renderFunction: () => WNode, options?: HarnessOptions): Harness;
```

-   `renderFunction`: 返回被测部件 WNode 的函数
-   [`customComparators`](/learn/testing/dojo-test-harness#custom-comparators): 一组自定义的比较器描述符。每个描述符提供一个比较器函数，用于比较通过 `selector` 和 `property` 定位到的 `properties`
-   `options`: harness 的扩展选项，包括 `customComparators` 和一组 middleware/mocks 元组。

harness 函数返回一个 `Harness` 对象，该对象提供了几个与被测部件交互的 API：

`Harness`

-   [`expect`](/learn/testing/dojo-test-harness#harnessexpect): 对被测部件完整的渲染结果执行断言
-   [`expectPartial`](/learn/testing/dojo-test-harness#harnessexpectpartial): 对被测部件部分渲染结果执行断言
-   [`trigger`](/learn/testing/dojo-test-harness#harnesstrigger): 用于在被测部件的节点上触发函数
-   [`getRender`](/learn/testing/dojo-test-harness#harnessgetRender): 根据提供的索引，从 harness 中返回对应的渲染器

使用 `@dojo/framework/core` 中的 `w()` 函数生成一个用于测试的部件是非常简单的：

```ts
const { describe, it } = intern.getInterface('bdd');
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import harness from '@dojo/framework/testing/harness';
import { w, v } from '@dojo/framework/widget-core/d';

class MyWidget extends WidgetBase<{ foo: string }> {
	protected render() {
		const { foo } = this.properties;
		return v('div', { foo }, this.children);
	}
}

const h = harness(() => w(MyWidget, { foo: 'bar' }, ['child']));
```

如下所示，harness 函数也支持 `tsx`。

```ts
const h = harness(() => <MyWidget foo="bar">child</MyWidget>);
```

`renderFunction` 是延迟执行的，所以可在断言之间包含额外的逻辑来操作部件的 `properties` 和 `children`。

```ts
describe('MyWidget', () => {
  it('renders with foo correctly', () => {
		let foo = 'bar';

		const h = harness(() => {
			return w(MyWidget, { foo }, [ 'child' ]));
		};

		h.expect(/** 断言包含 bar **/);
		// 更新传入部件的属性值
		foo = 'foo';
		h.expect(/** 断言包含 foo **/)
  });
});
```

## Mocking 中间件

当初始化 harness 时，可将 mock 中间件指定为 `HarnessOptions` 值的一部分。Mock 中间件被定义为由原始的中间件和 mock 中间件的实现组成的元组。Mock 中间件的创建方式与其他中间件相同。

```ts
import myMiddleware from './myMiddleware';
import myMockMiddleware from './myMockMiddleware';
import harness from '@dojo/framework/testing/harness';

import MyWidget from './MyWidget';

describe('MyWidget', () => {
	it('renders', () => {
		const h = harness(() => <MyWidget />, { middleware: [[myMiddleware, myMockMiddleware]] });
		h.expect(/** 断言执行的是 mock 的中间件而不是实际的中间件 **/);
	});
});
```

Harness 会自动 mock 很多核心中间件，并注入到任何需要他们的中间件中：

-   invalidator
-   setProperty
-   destroy

### Dojo mock 中间件

当测试使用了 Dojo 中间件的部件时，有很多 mock 中间件可以使用。Mock 会导出一个 factory，该 factory 会创建一个受限作用域的 mock 中间件，会在每个测试中使用。

#### Mock `node` 中间件

使用 `@dojo/framework/testing/mocks/middleware/node` 中的 `createNodeMock` 可 mock 一个 node 中间件。要设置从 node mock 中返回的期望值，需要调用创建的 mock node 中间件，并传入 `key` 和期望的 DOM node。

```ts
import createNodeMock from '@dojo/framework/testing/mocks/middleware/node';

// 创建一个 mock node 的中间件
const mockNode = createNodeMock();

// mock 一个 DOM 节点
const domNode = {};

// 调用 mock 中间件，并传入 key 和将返回的 DOM
mockNode('key', domNode);
```

#### Mock `intersection` 中间件

使用 `@dojo/framework/testing/mocks/middleware/intersection` 中的 `createIntersectionMock` 可 mock 一个 intersection 中间件。要设置从 intersection mock 中返回的期望值，需要调用创建的 mock intersection 中间件，并传入 `key` 和期望的 intersection 详情。

考虑以下部件：

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import intersection from '@dojo/framework/core/middleware/intersection';

const factory = create({ intersection });

const App = factory(({ middleware: { intersection } }) => {
	const details = intersection.get('root');
	return <div key="root">{JSON.stringify(details)}</div>;
});
```

使用 mock intersection 中间件：

```tsx
import { tsx } from '@dojo/framework/core/vdom';
import createIntersectionMock from '@dojo/framework/testing/mocks/middleware/intersection';
import intersection from '@dojo/framework/core/middleware/intersection';
import harness from '@dojo/framework/testing/harness';

import MyWidget from './MyWidget';

describe('MyWidget', () => {
	it('test', () => {
		// 创建一个 mock intersection 的中间件
		const intersectionMock = createIntersectionMock();
		// 将 intersection mock 中间件传给 harness，
		// 这样 harness 就知道替换掉原来的中间件
		const h = harness(() => <App key="app" />, { middleware: [[intersection, intersectionMock]] });

		// 像平常一样调用 harness.expect 来断言默认的响应
		h.expect(() => <div key="root">{`{"intersectionRatio":0,"isIntersecting":false}`}</div>);

		// 使用 mock 的 intersection 中间件，通过指定 key 值，
		// 设置期望 intersection 中间件返回的结果
		intersectionMock('root', { isIntersecting: true });

		// 用更新后的期望值再断言一次
		h.expect(() => <div key="root">{`{"isIntersecting": true }`}</div>);
	});
});
```

#### Mock `resize` 中间件

使用 `@dojo/framework/testing/mocks/middleware/resize` 中的 `createResizeMock` 可 mock 一个 resize 中间件。要设置从 resize mock 中返回的期望值，需要调用创建的 mock resize 中间件，并传入 `key` 和期望的容纳内容的矩形区域。

```ts
const mockResize = createResizeMock();
mockResize('key', { width: 100 });
```

考虑以下部件：

```tsx
import { create, tsx } from '@dojo/framework/core/vdom'
import resize from '@dojo/framework/core/middleware/resize'

const factory = create({ resize });

export const MyWidget = factory(function MyWidget({ middleware }) => {
	const  { resize } = middleware;
	const contentRects = resize.get('root');
	return <div key="root">{JSON.stringify(contentRects)}</div>;
});
```

使用 mock resize 中间件：

```tsx
import { tsx } from '@dojo/framework/core/vdom';
import createResizeMock from '@dojo/framework/testing/mocks/middleware/resize';
import resize from '@dojo/framework/core/middleware/resize';
import harness from '@dojo/framework/testing/harness';

import MyWidget from './MyWidget';

describe('MyWidget', () => {
	it('test', () => {
		// 创建一个 mock resize 的中间件
		const resizeMock = createResizeMock();
		// 将 resize mock 中间件传给 harness，
		// 这样 harness 就知道替换掉原来的中间件
		const h = harness(() => <App key="app" />, { middleware: [[resize, resizeMock]] });

		// 像平常一样调用 harness.expect
		h.expect(() => <div key="root">null</div>);

		// 使用 mock 的 resize 中间件，通过指定 key 值，
		// 设置期望 resize 中间件返回的结果
		resizeMock('root', { width: 100 });

		// 用更新后的期望值再断言一次
		h.expect(() => <div key="root">{`{"width":100}`}</div>);
	});
});
```

#### Mock `Store` 中间件

使用 `@dojo/framework/testing/mocks/middleware/store` 中的 `createMockStoreMiddleware` 可 mock 一个强类型的 store 中间件，也支持 mock process。为了 mock 一个 store 的 process，可传入一个由原始 store process 和 stub process 组成的元组。中间件会改为调用 stub，而不是调用原始的 process。如果没有传入 stub，中间件将停止调用所有的 process。

要修改 mock store 中的值，需要调用 `mockStore`，并传入一个返回一组 store 操作的函数。这将注入 store 的 `path` 函数，以创建指向需要修改的状态的指针。

```tsx
mockStore((path) => [replace(path('details', { id: 'id' })]);
```

考虑以下部件：

> src/MyWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom'
import { myProcess } from './processes';
import MyState from './interfaces';
// 应用程序的 store 中间件通过 state 接口来指定类型
// 示例：`const store = createStoreMiddleware<MyState>();`
import store from './store';

const factory = create({ store }).properties<{ id: string }>();

export default factory(function MyWidget({ properties, middleware: store }) {
	const { id } = properties();
    const { path, get, executor } = store;
    const details = get(path('details');
    let isLoading = get(path('isLoading'));

    if ((!details || details.id !== id) && !isLoading) {
        executor(myProcess)({ id });
        isLoading = true;
    }

    if (isLoading) {
        return <Loading />;
    }

    return <ShowDetails {...details} />;
});
```

使用 mock store 中间件：

> tests/unit/MyWidget.tsx

```tsx
import { tsx } from '@dojo/framework/core/vdom'
import createMockStoreMiddleware from '@dojo/framework/testing/mocks/middleware/store';
import harness from '@dojo/framework/testing/harness';

import { myProcess } from './processes';
import MyWidget from './MyWidget';
import MyState from './interfaces';
import store from './store';

// 导入 stub/mock 库，可以不是 sinon
import { stub } from 'sinon';

describe('MyWidget', () => {
     it('test', () => {
          const properties = {
               id: 'id'
          };
         const myProcessStub = stub();
		 // 类型安全的 mock store 中间件
		 // 为 mock 的 process 传入一组 `[originalProcess, stub]` 元组
		 // 将忽略未传入 stub/mock 的 process
         const mockStore = createMockStoreMiddleware<MyState>([[myProcess, myProcessStub]]);
         const h = harness(() => <MyWidget {...properties} />, {
             middleware: [[store, mockStore]]
         });
         h.expect(/* 断言 `Loading` 的断言模板 */);

		 // 重新断言 stubbed process
         expect(myProcessStub.calledWith({ id: 'id' })).toBeTruthy();

         mockStore((path) => [replace(path('isLoading', true)]);
         h.expect(/* 断言 `Loading` 的断言模板 */);
         expect(myProcessStub.calledOnce()).toBeTruthy();

		 // 使用 mock 的 store 来在 store 上应用操作
         mockStore((path) => [replace(path('details', { id: 'id' })]);
         mockStore((path) => [replace(path('isLoading', true)]);

         h.expect(/* 断言 `ShowDetails` 的断言模板 */);

         properties.id = 'other';
         h.expect(/* 断言 `Loading` 的断言模板 */);
         expect(myProcessStub.calledTwice()).toBeTruthy();
         expect(myProcessStub.secondCall.calledWith({ id: 'other' })).toBeTruthy();
         mockStore((path) => [replace(path('details', { id: 'other' })]);
         h.expect(/* 断言 `ShowDetails` 的断言模板 */);
     });
});
```

## 自定义比较

在某些情况下，我们在测试期间无法得知属性的确切值，所以需要使用自定义比较描述符(custom compare descriptor)。

描述符中有一个用于定位要检查的虚拟节点的 [`selector`](/learn/testing/dojo-test-harness#selectors)，一个应用自定义比较的属性名和一个接收实际值并返回一个 boolean 类型断言结果的比较器函数。

```ts
const compareId = {
	selector: '*', // 所有节点
	property: 'id',
	comparator: (value: any) => typeof value === 'string' // 检查属性值是 string 类型
};

const h = harness(() => w(MyWidget, {}), [compareId]);
```

对于所有的断言，返回的 `harness` API 将只对 `id` 属性使用 `comparator` 进行测试，而不是标准的相等测试。

## Selectors

`harness` API 支持 CSS style 选择器概念，来定位要断言和操作的虚拟 DOM 中的节点。查看[支持的选择器的完整列表](https://github.com/fb55/css-select#supported-selectors)以了解更多信息。

除了标准 API 之外还提供：

-   支持将定位节点 `key` 属性简写为 `@` 符号
-   当使用标准的 `.` 来定位样式类时，使用 `classes` 属性而不是 `class` 属性

## `harness.expect`

测试中最常见的需求是断言部件的 `render` 函数的输出结构。`expect` 接收一个返回被测部件期望的渲染结果的函数作为参数。

```ts
expect(expectedRenderFunction: () => DNode | DNode[], actualRenderFunction?: () => DNode | DNode[]);
```

-   `expectedRenderFunction`: 返回查询节点期望的 `DNode` 结构的函数
-   `actualRenderFunction`: 一个可选函数，返回被断言的实际 `DNode` 结构

```ts
h.expect(() =>
	v('div', { key: 'foo' }, [w(Widget, { key: 'child-widget' }), 'text node', v('span', { classes: ['class'] })])
);
```

`expect` 也可以接收第二个可选参数，返回要断言的渲染结果的函数。

```ts
h.expect(() => v('div', { key: 'foo' }), () => v('div', { key: 'foo' }));
```

如果实际的渲染输出和期望的渲染输出不同，就会抛出一个异常，并使用结构化的可视方法，用 `(A)` （实际值）和 `(E)` （期望值）指出所有不同点。

出错后的断言输出示例：

```ts
v('div', {
	'classes': [
		'root',
(A)		'other'
(E)		'another'
	],
	'onclick': 'function'
}, [
	v('span', {
		'classes': 'span',
		'id': 'random-id',
		'key': 'label',
		'onclick': 'function',
		'style': 'width: 100px'
	}, [
		'hello 0'
	])
	w(ChildWidget, {
		'id': 'random-id',
		'key': 'widget'
	})
	w('registry-item', {
		'id': true,
		'key': 'registry'
	})
])
```

## `harness.trigger`

`harness.trigger()` 在 `selector` 定位的节点上调用 `name` 指定的函数。

```ts
interface FunctionalSelector {
	(node: VNode | WNode): undefined | Function;
}

trigger(selector: string, functionSelector: string | FunctionalSelector, ...args: any[]): any;
```

-   `selector`: 用于查找目标节点的选择器
-   `functionSelector`: 要么是从节点的属性中找到的被调用的函数名，或者是从节点的属性中返回一个函数的函数选择器
-   `args`: 为定位到的函数传入的参数

如果有返回结果，则返回的是被触发函数的结果。

用法示例：

```ts
// 在第一个 key 值为 `foo` 的节点上调用 `onclick` 函数
h.trigger('@foo', 'onclick');
```

```ts
// 在第一个 key 值为 `bar` 的节点上调用 `customFunction` 函数，并为其传入值为 `100` 的参数
// 然后接收被触发函数返回的结果
const result = h.trigger('@bar', 'customFunction', 100);
```

`functionalSelector` 返回部件属性中的函数。函数也会被触发，与使用普通字符串 `functionSelector` 的方式相同。

### Trigger 示例

假定有如下 VDOM 树结构：

```ts
v(Toolbar, {
	key: 'toolbar',
	buttons: [
		{
			icon: 'save',
			onClick: () => this._onSave()
		},
		{
			icon: 'cancel',
			onClick: () => this._onCancel()
		}
	]
});
```

通过以下代码触发 save 按钮的 `onClick` 函数：

```typescript
h.trigger('@buttons', (renderResult: DNode<Toolbar>) => {
	return renderResult.properties.buttons[0].onClick;
});
```

**注意：** 如果没能找到指定的选择器，则 `trigger` 会抛出一个错误。

## `harness.getRender`

`harness.getRender()` 返回索引指定的渲染器，如果没有提供索引则返回最后一个渲染器。

```ts
getRender(index?: number);
```

-   `index`: 要返回的渲染器的索引

用法示例:

```ts
// 返回最后一个渲染器的结果
const render = h.getRender();
```

```ts
// 返回传入的索引对应渲染器的结果
h.getRender(1);
```

# 断言模板

断言模板（assertion template）提供一个可复用的基本模板来断言部件的整个输出内容，但在执行每个测试前可按需修改部分内容。这意味着在多次测试中都不会改变的公共元素可被抽象并定义一次，然后多处使用。

要使用断言模板，首先导入模块：

```ts
import assertionTemplate from '@dojo/framework/testing/assertionTemplate';
```

可创建一个基本断言，它定义了部件的默认渲染状态。假定有以下部件：

> src/widgets/Profile.ts

```ts
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import { v } from '@dojo/framework/widget-core/d';

import * as css from './styles/Profile.m.css';

export interface ProfileProperties {
	username?: string;
}

export default class Profile extends WidgetBase<ProfileProperties> {
	protected render() {
		const { username } = this.properties;
		return v('h1', { classes: [css.root] }, [`Welcome ${username || 'Stranger'}!`]);
	}
}
```

基本断言如下所示：

> tests/unit/widgets/Profile.ts

```ts
const { describe, it } = intern.getInterface('bdd');
import harness from '@dojo/framework/testing/harness';
import assertionTemplate from '@dojo/framework/testing/assertionTemplate';
import { w, v } from '@dojo/framework/widget-core/d';

import Profile from '../../../src/widgets/Profile';
import * as css from '../../../src/widgets/styles/Profile.m.css';

const profileAssertion = assertionTemplate(() =>
	v('h1', { classes: [css.root], '~key': 'welcome' }, ['Welcome Stranger!'])
);
```

在测试中这样写：

> tests/unit/widgets/Profile.ts

```ts
const profileAssertion = assertionTemplate(() =>
	v('h1', { classes: [css.root], '~key': 'welcome' }, ['Welcome Stranger!'])
);

describe('Profile', () => {
	it('default renders correctly', () => {
		const h = harness(() => w(Profile, {}));
		h.expect(profileAssertion);
	});
});
```

要测试为 `Profile` 传入 `username` 属性的场景，可以按如下方式为断言模板调参：

> tests/unit/widgets/Profile.ts

```ts
describe('Profile', () => {
	...

  it('renders given username correctly', () => {
	// 使用给定的用户名更新期望的结果
    const namedAssertion = profileAssertion.setChildren('~welcome', [
      'Welcome Kel Varnsen!'
    ]);
    const h = harness(() => w(Profile, { username: 'Kel Varnsen' }));
    h.expect(namedAssertion);
  });
});
```

这里使用 baseAssertion 的 `setChildren()` api，然后使用特定的 `~` 选择器来定位 key 值为 `~welcome` 的节点。`~key` 属性（使用 tsx 的模板中是 `assertion-key`）是断言模板的一个特殊属性，在断言时会被删除，因此在匹配渲染结构时不会显示出来。此功能能让断言模板简单的选择节点，而不需要扩展实际的部件渲染函数。一旦找到 `welcome` 节点，它的子节点将被设置为新值 `Welcome Kel Varnsen!`，然后在 `h.expect` 中使用生成的模板。需要注意的是，断言模板在设置值时总是返回一个新的断言模板，这可以确保现有模板不会被意外地修改，若被修改可能导致其他测试失败，并允许基于新模板，增量逐层构建出新的模板。

断言模板具有以下 API：

```
insertBefore(selector: string, children: () => DNode[]): AssertionTemplateResult;
insertAfter(selector: string, children: () => DNode[]): AssertionTemplateResult;
insertSiblings(selector: string, children: () => DNode[], type?: 'before' | 'after'): AssertionTemplateResult;
append(selector: string, children: () => DNode[]): AssertionTemplateResult;
prepend(selector: string, children: () => DNode[]): AssertionTemplateResult;
replaceChildren(selector: string, children: () => DNode[]): AssertionTemplateResult;
setChildren(selector: string, children: () => DNode[], type?: 'prepend' | 'replace' | 'append'): AssertionTemplateResult;
setProperty(selector: string, property: string, value: any): AssertionTemplateResult;
setProperties(selector: string, value: any | PropertiesComparatorFunction): AssertionTemplateResult;
getChildren(selector: string): DNode[];
getProperty(selector: string, property: string): any;
getProperties(selector: string): any;
replace(selector: string, node: DNode): AssertionTemplateResult;
remove(selector: string): AssertionTemplateResult;
```

# Mocking

一种常见的测试类型是验证部件的用户界面是否按预期渲染，而不必关心部件的底层业务逻辑。但这些测试可能希望断言一些场景，如单击按钮以调用部件的属性方法，并不关心属性方法的实现逻辑，只是希望按预期调用了接口。在这种情况下，可借助类似 [Sinon] 的 mock 库。

> src/widgets/Action.ts

```ts
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import { v, w } from '@dojo/framework/widget-core/d';
import Button from '@dojo/widgets/button';

import * as css from './styles/Action.m.css';

export default class Action extends WidgetBase<{ fetchItems: () => void }> {
	protected render() {
		return v('div', { classes: [css.root] }, [w(Button, { onClick: this.handleClick, key: 'button' }, ['Fetch'])]);
	}
	private handleClick() {
		this.properties.fetchItems();
	}
}
```

测试当单击按钮后，会调用 `this.properties.fetchItems` 方法。

> tests/unit/widgets/Action.ts

```ts
const { describe, it } = intern.getInterface('bdd');
import harness from '@dojo/framework/testing/harness';
import { w, v } from '@dojo/framework/widget-core/d';

import { stub } from 'sinon';

describe('Action', () => {
	const fetchItems = stub();
	it('can fetch data on button click', () => {
		const h = harness(() => w(Action, { fetchItems }));
		h.expect(() => v('div', { classes: [css.root] }, [w(Button, { onClick: () => {}, key: 'button' }, ['Fetch'])]));
		h.trigger('@button', 'onClick');
		assert.isTrue(fetchItems.calledOnce);
	});
});
```

在这种情况下，mock 一个 Action 部件的 `fetchItems` 方法，该方法用于获取数据项。然后使用 `@button` 定位到按钮，并触发按钮的 `onClick` 事件，然后校验 `fetchItems` 方法仅被调用过一次。

要了解更多 mocking 信息，请阅读 [Sinon] 文档。

# 功能测试

与单元测试加载和执行代码的流程不同，功能测试在浏览器中加载一个页面并测试应用程序的交互功能。

当要校验某个路由对应的应用程序输出内容，需要为对应的路由链接添加 `id` 属性，以便快速定位链接。

> src/widgets/Menu.ts

```ts
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import { w } from '@dojo/framework/widget-core/d';
import Link from '@dojo/framework/routing/ActiveLink';
import Toolbar from '@dojo/widgets/toolbar';

import * as css from './styles/Menu.m.css';

export default class Menu extends WidgetBase {
	protected render() {
		return w(Toolbar, { heading: 'My Dojo App!', collapseWidth: 600 }, [
			w(
				Link,
				{
					id: 'home', // 添加 id 属性
					to: 'home',
					classes: [css.link],
					activeClasses: [css.selected]
				},
				['Home']
			),
			w(
				Link,
				{
					id: 'about', // 添加 id 属性
					to: 'about',
					classes: [css.link],
					activeClasses: [css.selected]
				},
				['About']
			),
			w(
				Link,
				{
					id: 'profile', // 添加 id 属性
					to: 'profile',
					classes: [css.link],
					activeClasses: [css.selected]
				},
				['Profile']
			)
		]);
	}
}
```

在使用应用程序时，用户会单击 `profile` 链接，然后被导航到欢迎用户页面。可编写一个功能测试来验证此行为。

> tests/functional/main.ts

```ts
const { describe, it } = intern.getInterface('bdd');
const { assert } = intern.getPlugin('chai');

describe('routing', () => {
	it('profile page correctly loads', ({ remote }) => {
		return (
			remote
				// 在本地的 node 服务器中加载 HTML 文件
				.get('../../output/dev/index.html')
				// 根据 id 找到超链接标签
				.findById('profile')
				// 单击链接
				.click()
				// 结束此操作
				.end()
				// 找到 h1 标签
				.findByTagName('h1')
				// 获取 h1 标签中的文本
				.getVisibleText()
				.then((text) => {
					// 核实 profile 页面中 h1 标签中的内容
					assert.equal(text, 'Welcome Dojo User!');
				})
		);
	});
});
```

当运行功能测试时，Dojo 会提供一个 `remote` 对象，它用于与页面交互。因为加载页面和与页面交互是异步操作，所以必须在测试中返回 `remote` 交互对象。

在命令行中执行功能测试：

```bash
npm run test:functional
```

这将会在构建机器中，将 HTML 页面加载到 Chrome 的 remote 实例中，，以测试交互功能。

功能测试是非常有用的，它能确保应用程序代码能在浏览器中按预期工作。

您可以阅读更多关于 [Intern 功能测试](https://theintern.io/docs.html#Intern/4/docs/docs%2Fwriting_tests.md/functional-tests) 的内容。

# 使用远程测试服务

Intern 支持在 [BrowserStack]、[SauceLabs] 和 [TestingBot] 等服务上远程运行测试。可通过注册一个帐号并将凭据提供给 cli-test-intern 来使用这些服务。默认情况下，所有测试服务会在 IE11、Firefox 和 Chrome 等浏览器上运行测试。

## BrowserStack

使用 [BrowserStack] 服务，需提供 access key 和用户名。Access key 和用户名可在命令行中指定或设置为环境变量，详见 [Intern 文档](https://theintern.io/docs.html#Intern/4/docs/docs%2Frunning.md/cloud-service)。

```bash
dojo test -a -c browserstack -k <accesskey> --userName <username>
```

或使用环境变量

```bash
BROWSERSTACK_USERNAME=<username> BROWSERSTACK_ACCESS_KEY=<key> dojo test -a -c browserstack
```

## SauceLabs

使用 [SauceLabs] 服务，需提供 access key 和用户名。Access key 和用户名可在命令行中指定或设置为环境变量，详见 [Intern 文档](https://theintern.io/docs.html#Intern/4/docs/docs%2Frunning.md/cloud-service)。

```bash
dojo test -a -c saucelabs -k <accesskey> --userName <username>
```

或使用环境变量

```bash
SAUCE_USERNAME=<username> SAUCE_ACCESS_KEY=<key> dojo test -a -c saucelabs
```

## TestingBot

使用 [TestingBot] 服务，需提供 key 和 secret。Key 和 secret 可在命令行中指定或设置为环境变量，详见 [Intern 文档](https://theintern.io/docs.html#Intern/4/docs/docs%2Frunning.md/cloud-service)。

```bash
dojo test -a -c testingbot -k <key> -s <secret>
```

或使用环境变量

```bash
TESTINGBOT_SECRET=<secret> TESTINGBOT_KEY=<key> dojo test -a -c saucelabs
```

[browserstack]: https://www.browserstack.com/
[dojo cli]: https://github.com/dojo/cli
[intern]: https://theintern.io/
[saucelabs]: https://saucelabs.com/
[selenium]: http://www.seleniumhq.org/
[sinon]: https://sinonjs.org/
[testingbot]: https://testingbot.com/
