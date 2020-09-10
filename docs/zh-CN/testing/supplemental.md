# Test Renderer

<!--
https://github.com/dojo/framework/blob/master/docs/en/testing/supplemental.md
commit edbf841eb3b65c6862e3ed73ae9b6855e540281c
-->

Dojo 提供了一个简单且类型安全的测试渲染器(test renderer)，以便于浅断言部件期望的输出结构和行为。测试渲染器的 API 在设计之初就鼓励将单元测试作为最佳实践，以确保 Dojo 应用程序的高度可靠性。

[断言](/learn/testing/test-renderer#assertion)和测试渲染器是结合断言结构中定义的[包装的测试节点](/learn/testing/test-renderer#wrapped-test-nodes)来使用的，确保在测试的整个生命周期类型安全。

使用 assertion 定义部件的期望结构，然后将其传给测试渲染器的 `.expect()` 函数，测试渲染器就可执行断言。

> src/MyWidget.spec.tsx

```tsx
import { tsx } from '@dojo/framework/core/vdom';
import renderer, { assertion } from '@dojo/framework/testing/renderer';

import MyWidget from './MyWidget';

const baseAssertion = assertion(() => (
	<div>
		<h1>Heading</h1>
		<h2>Sub Heading</h2>
		<div>Content</div>
	</div>
));

const r = renderer(() => <MyWidget />);

r.expect(baseAssertion);
```

## 包装的测试节点

为了让测试渲染器和断言能在期望和实际的节点结构中标识节点，需要使用指定的包装节点。在期望的断言结构中，可使用包装的节点代替实际节点，从而保持所有正确的属性和子类型。

使用 `@dojo/framework/testing/renderer` 中的 `wrap` 函数来创建一个包装的测试节点：

> src/MyWidget.spec.tsx

```tsx
import { wrap } from '@dojo/framework/testing/renderer';

import MyWidget from './MyWidget';

// Create a wrapped node for a widget
const WrappedMyWidget = wrap(MyWidget);

// Create a wrapped node for a vnode
const WrappedDiv = wrap('div');
```

测试渲染器使用测试节点在预期树结构中的位置，尝试对被测部件的实际输出上执行任意请求操作（`r.property()` 或 `r.child`）。如果包装的测试节点与实际输出数结构上对应的节点不匹配，则不会执行任何操作，并且断言会报错。

**注意：** 包装的测试节点只能在断言中使用一次，如果在一次断言中多次检测到同一个测试节点，则会抛出错误，并导致测试失败。

## 断言

断言（assertion）用于构建预期的部件输出结构，以便在 `renderer.expect()` 中使用。断言公开了一系列 API，允许在不同的测试间调整期望的输出。

假定有一个部件，它根据属性值渲染不同的内容：

> src/Profile.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';

import * as css from './Profile.m.css';

export interface ProfileProperties {
	username?: string;
}

const factory = create().properties<ProfileProperties>();

const Profile = factory(function Profile({ properties }) {
	const { username = 'Stranger' } = properties();
	return <h1 classes={[css.root]}>{`Welcome ${username}!`}</h1>;
});

export default Profile;
```

使用 `@dojo/framework/testing/renderer#assertion` 创建一个断言：

> src/Profile.spec.tsx

```tsx
const { describe, it } = intern.getInterface('bdd');
import { tsx } from '@dojo/framework/core/vdom';
import renderer, { assertion, wrap } from '@dojo/framework/testing/renderer';

import Profile from '../../../src/widgets/Profile';
import * as css from '../../../src/widgets/Profile.m.css';

// Create a wrapped node
const WrappedHeader = wrap('h1');

// Create an assertion using the `WrappedHeader` in place of the `h1`
const baseAssertion = assertion(() => <WrappedHeader classes={[css.root]}>Welcome Stranger!</WrappedHeader>);

describe('Profile', () => {
	it('Should render using the default username', () => {
		const r = renderer(() => <Profile />);

		// Test against the base assertion
		r.expect(baseAssertion);
	});
});
```

为了测试将 `username` 属性传给 `Profile` 部件，我们创建一个新的断言，将其更新为期望的用户名。但是，随着部件功能的增加，为每个场景重新创建整个断言将变得冗长且难以维护，因为对部件结构中的任何更改都需要调整所有断言。

为了避免维护开销并减少重复，断言提供了一套详尽的 API 来基于基础断言创建出变体。断言 API 使用包装的测试节点来标识要更新的期望结构中的节点。

> src/Profile.spec.tsx

```tsx
const { describe, it } = intern.getInterface('bdd');
import { tsx } from '@dojo/framework/core/vdom';
import renderer, { assertion, wrap } from '@dojo/framework/testing/renderer';

import Profile from '../../../src/widgets/Profile';
import * as css from '../../../src/widgets/Profile.m.css';

// Create a wrapped node
const WrappedHeader = wrap('h1');

// Create an assertion using the `WrappedHeader` in place of the `h1`
const baseAssertion = assertion(() => <WrappedHeader classes={[css.root]}>Welcome Stranger!</WrappedHeader>);

describe('Profile', () => {
	it('Should render using the default username', () => {
		const r = renderer(() => <Profile />);

		// Test against the base assertion
		r.expect(baseAssertion);
	});

	it('Should render using the passed username', () => {
		const r = renderer(() => <Profile username="Dojo" />);

		// Create a variation of the base assertion
		const usernameAssertion = baseAssertion.setChildren(WrappedHeader, () => ['Dojo']);

		// Test against the username assertion
		r.expect(usernameAssertion);
	});
});
```

在基础断言之上创建新断言意味着，如果对默认的部件输出进行了更改，则只需修改基础断言，就可更新部件的所有测试。

### 断言 API

#### `assertion.setChildren()`

返回一个新断言，根据传入的 `type` 值将新的子节点放在已存子节点之前，或者之后，或者替换掉子节点。

```tsx
.setChildren(
  wrapped: Wrapped,
  children: () => RenderResult,
  type: 'prepend' | 'replace' | 'append' = 'replace'
): AssertionResult;
```

#### `assertion.append()`

返回一个新断言，将新的子节点追加在已存在子节点之后。

```tsx
.append(wrapped: Wrapped, children: () => RenderResult): AssertionResult;
```

#### `assertion.prepend()`

返回一个新断言，将新的子节点放在已存在子节点之前。

```tsx
.prepend(wrapped: Wrapped, children: () => RenderResult): AssertionResult;
```

#### `assertion.replaceChildren()`

返回一个新断言，使用新的子节点替换掉已存在的子节点。

```tsx
.append(wrapped: Wrapped, children: () => RenderResult): AssertionResult;
```

#### `assertion.insertSiblings()`

返回一个新节点，根据传入的 `type` 值，将传入的子节点插入到 `before` 或 `after` 位置。

```tsx
.insertSiblings(
  wrapped: Wrapped,
  children: () => RenderResult,
  type: 'before' | 'after' = 'before'
): AssertionResult;
```

#### `assertion.insertBefore()`

返回一个新节点，将传入的子节点插入到已存在子节点之前。

```tsx
.insertBefore(wrapped: Wrapped, children: () => RenderResult): AssertionResult;
```

#### `assertion.insertAfter()`

R 返回一个新节点，将传入的子节点插入到已存在子节点之后。

```tsx
.insertAfter(wrapped: Wrapped, children: () => RenderResult): AssertionResult;
```

#### `assertion.replace()`

返回一个新断言，使用传入的节点替换掉已存在的节点。注意，如果你需要在断言或测试渲染器中与传入的新节点交互，则应传入包装的测试节点。

```tsx
.replace(wrapped: Wrapped, node: DNode): AssertionResult;
```

#### `assertion.remove()`

返回一个新断言，其中完全删除指定的包装节点。

```tsx
.remove(wrapped: Wrapped): AssertionResult;
```

#### `assertion.setProperty()`

返回一个新断言，为指定的包装节点设置新属性。

```tsx
.setProperty<T, K extends keyof T['properties']>(
  wrapped: Wrapped<T>,
  property: K,
  value: T['properties'][K]
): AssertionResult;
```

#### `assertion.setProperties()`

返回一个新断言，为指定的节点设置多个新属性。

```tsx
.setProperties<T>(
  wrapped: Wrapped<T>,
  value: T['properties'] | PropertiesComparatorFunction<T['properties']>
): AssertionResult;
```

可以设置一个函数来代替属性对象，以根据实际属性返回期望的属性。

## 触发属性

除了断言部件的输出结构外，还可以使用 `renderer.property()` 函数测试部件行为。`property()` 函数接收一个[包装的测试节点]()和一个在下一次调用 `expect()` 之前会被调用的属性 key。

> src/MyWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import icache from '@dojo/framework/core/middleware/icache';
import { RenderResult } from '@dojo/framework/core/interfaces';

import MyWidgetWithChildren from './MyWidgetWithChildren';

const factory = create({ icache }).properties<{ onClick: () => void }>();

export const MyWidget = factory(function MyWidget({ properties, middleware: { icache } }) {
	const count = icache.getOrSet('count', 0);
	return (
		<div>
			<h1>Header</h1>
			<span>{`${count}`}</span>
			<button
				onclick={() => {
					icache.set('count', icache.getOrSet('count', 0) + 1);
					properties().onClick();
				}}
			>
				Increase Counter!
			</button>
		</div>
	);
});
```

> src/MyWidget.spec.tsx

```tsx
const { describe, it } = intern.getInterface('bdd');
import { tsx } from '@dojo/framework/core/vdom';
import renderer, { assertion, wrap } from '@dojo/framework/testing/renderer';
import * as sinon from 'sinon';

import MyWidget from './MyWidget';

// Create a wrapped node for the button
const WrappedButton = wrap('button');

const WrappedSpan = wrap('span');

const baseAssertion = assertion(() => (
	<div>
		<h1>Header</h1>
		<WrappedSpan>0</WrappedSpan>
		<WrappedButton
			onclick={() => {
				icache.set('count', icache.getOrSet('count', 0) + 1);
				properties().onClick();
			}}
		>
			Increase Counter!
		</WrappedButton>
	</div>
));

describe('MyWidget', () => {
	it('render', () => {
		const onClickStub = sinon.stub();
		const r = renderer(() => <MyWidget onClick={onClickStub} />);

		// assert against the base assertion
		r.expect(baseAssertion);

		// register a call to the button's onclick property
		r.property(WrappedButton, 'onclick');

		// create a new assertion with the updated count
		const counterAssertion = baseAssertion.setChildren(WrappedSpan, () => ['1']);

		// expect against the new assertion, the property will be called before the test render
		r.expect(counterAssertion);

		// once the assertion is complete, check that the stub property was called
		assert.isTrue(onClickStub.calledOnce);
	});
});
```

可在函数名之后传入函数的参数，如 `r.property(WrappedButton, 'onclick', { target: { value: 'value' }})`。当函数有多个参数时，逐个传入即可 `r.property(WrappedButton, 'onclick', 'first-arg', 'second-arg', 'third-arg')`。

## 断言函数型的子节点

要断言函数型子节点的输出内容，测试渲染器需要理解如何解析子节点的渲染函数。包括传入任意期望的注入值。

测试渲染器的 `renderer.child()` 函数能够解析子节点，以便将解析结果包含到断言中。使用 `.child()` 函数时，需要包装使用了函数型子节点的部件，以在断言中使用，然后将包装的节点传给 `.child` 函数。

> src/MyWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import { RenderResult } from '@dojo/framework/core/interfaces';

import MyWidgetWithChildren from './MyWidgetWithChildren';

const factory = create().children<(value: string) => RenderResult>();

export const MyWidget = factory(function MyWidget() {
	return (
		<div>
			<h1>Header</h1>
			<MyWidgetWithChildren>{(value) => <div>{value}</div>}</MyWidgetWithChildren>
		</div>
	);
});
```

> src/MyWidget.spec.tsx

```tsx
const { describe, it } = intern.getInterface('bdd');
import { tsx } from '@dojo/framework/core/vdom';
import renderer, { assertion, wrap } from '@dojo/framework/testing/renderer';

import MyWidgetWithChildren from './MyWidgetWithChildren';
import MyWidget from './MyWidget';

// Create a wrapped node for the widget with functional children
const WrappedMyWidgetWithChildren = wrap(MyWidgetWithChildren);

const baseAssertion = assertion(() => (
    <div>
      <h1>Header</h1>
      <WrappedMyWidgetWithChildren>{() => <div>Hello!</div>}</MyWidgetWithChildren>
    </div>
));

describe('MyWidget', () => {
    it('render', () => {
        const r = renderer(() => <MyWidget />);

        // instruct the test renderer to resolve the children
        // with the provided params
        r.child(WrappedMyWidgetWithChildren, ['Hello!']);

        r.expect(baseAssertion);
    });
});
```

## 自定义属性比较器

在某些情况下，测试期间无法得知属性的确切值，所以需要使用自定义比较器。自定义比较器用于包装的部件，结合 `@dojo/framework/testing/renderer#compare` 函数可替换部件或节点属性。

```tsx
compare(comparator: (actual) => boolean)
```

```tsx
import { assertion, wrap, compare } from '@dojo/framework/testing/renderer';

// create a wrapped node the `h1`
const WrappedHeader = wrap('h1');

const baseAssertion = assertion(() => (
	<div>
		<WrappedHeader id={compare((actual) => typeof actual === 'string')}>Header!</WrappedHeader>
	</div>
));
```

## 断言时忽略节点

当处理渲染多个项的部件时，例如一个列表，可能需要让测试渲染器忽略输出中的一些内容。比如只断言第一个和最后一项是有效的，然后忽略这两项中间的所有项的详细信息，只是简单断言期望的类型。要让测试渲染器做到这一点，需使用 `ignore` 函数让测试渲染器忽略节点，只检查节点类型是否相同即可，即匹配标签名或部件的工厂或构造器。

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import renderer, { assertion, ignore } from '@dojo/framework/testing/renderer';

const factory = create().properties<{ items: string[] }>();

const ListWidget = create(function ListWidget({ properties }) {
	const { items } = properties();
	return (
		<div>
			<ul>{items.map((item) => <li>{item}</li>)}</ul>
		</div>
	);
});

const r = renderer(() => <ListWidget items={['a', 'b', 'c', 'd']} />);
const IgnoredItem = ignore('li');
const listAssertion = assertion(() => (
	<div>
		<ul>
			<li>a</li>
			<IgnoredItem />
			<IgnoredItem />
			<li>d</li>
		</ul>
	</div>
));
r.expect(listAssertion);
```

## Mocking 中间件

当初始化测试渲染器时，可将 mock 中间件指定为 `RendererOptions` 值的一部分。Mock 中间件被定义为由原始的中间件和 mock 中间件实现组成的元组。Mock 中间件的创建方式与其他中间件相同。

```tsx
import myMiddleware from './myMiddleware';
import myMockMiddleware from './myMockMiddleware';
import renderer from '@dojo/framework/testing/renderer';

import MyWidget from './MyWidget';

describe('MyWidget', () => {
	it('renders', () => {
		const r = renderer(() => <MyWidget />, { middleware: [[myMiddleware, myMockMiddleware]] });

		h
			.expect
			/** 断言执行的是 mock 的中间件而不是实际的中间件 **/
			();
	});
});
```

测试渲染器会自动 mock 很多核心中间件，并注入到任何需要他们的中间件中：

-   `invalidator`
-   `setProperty`
-   `destroy`

此外，当测试使用了 Dojo 中间件的部件时，还可以使用很多对应的 mock 中间件。有关已提供的 mock 中间件的更多信息，请查看 [mocking](/learn/testing/mocking#provided-middleware-mocks)。

# Mocking

一种常见的测试类型是验证部件的用户界面是否按预期渲染，而不必关心部件的底层业务逻辑。但这些测试可能希望断言一些场景，如单击按钮以调用部件的属性方法，并不关心属性方法的实现逻辑，只是希望按预期调用了接口。在这种情况下，可借助类似 [Sinon] 的 mock 库。

> src/widgets/Action.tsx

```ts
import { create, tsx } from '@dojo/framework/core/vdom';
import Button from '@dojo/widgets/button';

import * as css from './Action.m.css';

const factory = create().properties<{ fetchItems: () => void }>();

const Action = factory(function Action({ properties }) {
	return (
		<div classes={[css.root]}>
			<Button key="button" onClick={() => properties().fetchItems()}>
				Fetch
			</Button>
		</div>
	);
});

export default Action;
```

测试当单击按钮后，会调用 `properties().fetchItems` 方法。

> tests/unit/widgets/Action.tsx

```tsx
const { describe, it } = intern.getInterface('bdd');
import { tsx } from '@dojo/framework/core/vdom';
import renderer, { assertion, wrap } from '@dojo/framework/testing/renderer';

import Action from '../../../src/widgets/Action';
import * as css from '../../../src/widgets/Action.m.css';

import Button from '@dojo/widgets/button';

import { stub } from 'sinon';
import { assert } from 'chai';

describe('Action', () => {
	const fetchItems = stub();
	it('can fetch data on button click', () => {
		const WrappedButton = wrap(Button);
		const baseAssertion = assertion(() => (
			<div classes={[css.root]}>
				<WrappedButton key="button" onClick={() => {}}>
					Fetch
				</WrappedButton>
			</div>
		));
		const r = renderer(() => <Action fetchItems={fetchItems} />);
		r.expect(baseAssertion);
		r.property(WrappedButton, 'onClick');
		r.expect(baseAssertion);
		assert.isTrue(fetchItems.calledOnce);
	});
});
```

在这种情况下，为 Action 部件的 `fetchItems` 方法提供一个 mock 实现，该方法用于获取数据项。然后使用 `WrappedButton` 定位到按钮，并触发按钮的 `onClick` 事件，然后校验 `fetchItems` 方法仅被调用过一次。

要了解更多 mocking 信息，请阅读 [Sinon] 文档。

## 内置的 mock 中间件

有很多 mock 的中间件支持测试使用了相关 Dojo 中间件的部件。Mock 会导出一个 factory，该 factory 创建一个受限作用域的 mock 中间件，会在每个测试中使用。

### Mock `breakpoint` 中间件

使用 `@dojo/framework/testing/mocks/middleware/breakpoint` 中的 `createBreakpointMock` 可手动控制 resize 事件来触发断点测试。

考虑下面的部件，当激活 `LG` 断点时，它会显示附加 `h2`：

> src/Breakpoint.tsx

```tsx
import { tsx, create } from '@dojo/framework/core/vdom';
import breakpoint from '@dojo/framework/core/middleware/breakpoint';

const factory = create({ breakpoint });

export default factory(function Breakpoint({ middleware: { breakpoint } }) {
	const bp = breakpoint.get('root');
	const isLarge = bp && bp.breakpoint === 'LG';

	return (
		<div key="root">
			<h1>Header</h1>
			{isLarge && <h2>Subtitle</h2>}
			<div>Longer description</div>
		</div>
	);
});
```

使用 mock 的 `breakpoint` 中间件上的 `mockBreakpoint(key: string, contentRect: Partial<DOMRectReadOnly>)` 方法，测试可以显式触发一个 resize 事件：

> tests/unit/Breakpoint.tsx

```tsx
const { describe, it } = intern.getInterface('bdd');
import { tsx } from '@dojo/framework/core/vdom';
import renderer, { assertion, wrap } from '@dojo/framework/testing/renderer';
import breakpoint from '@dojo/framework/core/middleware/breakpoint';
import createBreakpointMock from '@dojo/framework/testing/mocks/middleware/breakpoint';
import Breakpoint from '../../src/Breakpoint';

describe('Breakpoint', () => {
	it('resizes correctly', () => {
		const WrappedHeader = wrap('h1');
		const mockBreakpoint = createBreakpointMock();
		const baseAssertion = assertion(() => (
			<div key="root">
				<WrappedHeader>Header</WrappedHeader>
				<div>Longer description</div>
			</div>
		));
		const r = renderer(() => <Breakpoint />, {
			middleware: [[breakpoint, mockBreakpoint]]
		});
		r.expect(baseAssertion);

		mockBreakpoint('root', { breakpoint: 'LG', contentRect: { width: 800 } });

		r.expect(baseAssertion.insertAfter(WrappedHeader, () => [<h2>Subtitle</h2>]);
	});
});
```

### Mock `focus` 中间件

使用 `@dojo/framework/testing/middleware/focus` 中的 `createFocusMock` 可手动控制 `focus` 中间件何时报告指定 key 的节点获取了焦点。

考虑下面的部件：

> src/FormWidget.tsx

```tsx
import { tsx, create } from '@dojo/framework/core/vdom';
import focus, { FocusProperties } from '@dojo/framework/core/middleware/focus';
import * as css from './FormWidget.m.css';

export interface FormWidgetProperties extends FocusProperties {}

const factory = create({ focus }).properties<FormWidgetProperties>();

export const FormWidget = factory(function FormWidget({ middleware: { focus } }) {
	return (
		<div key="wrapper" classes={[css.root, focus.isFocused('text') ? css.focused : null]}>
			<input type="text" key="text" value="focus me" />
		</div>
	);
});
```

通过调用 `focusMock(key: string | number, value: boolean)`，就可以在测试时控制 `focus` 中间件中 `isFocused` 方法的返回值。

> tests/unit/FormWidget.tsx

```tsx
const { describe, it } = intern.getInterface('bdd');
import { tsx } from '@dojo/framework/core/vdom';
import renderer, { assertion, wrap } from '@dojo/framework/testing/renderer';
import focus from '@dojo/framework/core/middleware/focus';
import createFocusMock from '@dojo/framework/testing/mocks/middleware/focus';
import * as css from './FormWidget.m.css';

describe('Focus', () => {
	it('adds a "focused" class to the wrapper when the input is focused', () => {
		const focusMock = createFocusMock();
		const WrappedRoot = wrap('div');
		const baseAssertion = assertion(() => (
			<WrappedRoot key="wrapper" classes={[css.root, null]}>
				<input type="text" key="text" value="focus me" />
			</WrappedRoot>
		));
		const r = renderer(() => <FormWidget />, {
			middleware: [[focus, focusMock]]
		});

		r.expect(baseAssertion);

		focusMock('text', true);

		r.expect(baseAssertion.setProperty(WrappedRoot, 'classes', [css.root, css.focused]));
	});
});
```

### Mock `iCache` 中间件

使用 `@dojo/framework/testing/mocks/middleware/icache` 中的 `createICacheMiddleware`，能让测试代码直接访问缓存中的项，而此 mock 为被测的小部件提供了足够的 icache 功能。当使用 `icache` 异步获取数据时特别有用。直接访问缓存让测试可以 `await` 部件，就如 `await` promise 一样。

考虑以下部件，从一个 API 获取数据：

> src/MyWidget.tsx

```tsx
import { tsx, create } from '@dojo/framework/core/vdom';
import { icache } from '@dojo/framework/core/middleware/icache';
import fetch from '@dojo/framework/shim/fetch';

const factory = create({ icache });

export default factory(function MyWidget({ middleware: { icache } }) {
	const value = icache.getOrSet('users', async () => {
		const response = await fetch('url');
		return await response.json();
	});

	return value ? <div>{value}</div> : <div>Loading</div>;
});
```

使用 mock 的 `icache` 中间件测试异步结果很简单：

> tests/unit/MyWidget.tsx

```tsx
const { describe, it, afterEach } = intern.getInterface('bdd');
import renderer, { assertion, wrap } from '@dojo/framework/testing/renderer';
import { tsx } from '@dojo/framework/core/vdom';
import * as sinon from 'sinon';
import global from '@dojo/framework/shim/global';
import icache from '@dojo/framework/core/middleware/icache';
import createICacheMock from '@dojo/framework/testing/mocks/middleware/icache';
import MyWidget from '../../src/MyWidget';

describe('MyWidget', () => {
	afterEach(() => {
		sinon.restore();
	});

	it('test', async () => {
		// stub the fetch call to return a known value
		global.fetch = sinon.stub().returns(Promise.resolve({ json: () => Promise.resolve('api data') }));

		const WrappedRoot = wrap('div');
		const baseAssertion = assertion(() => <WrappedRoot>Loading</WrappedRoot>);
		const mockICache = createICacheMock();
		const r = renderer(() => <Home />, { middleware: [[icache, mockICache]] });
		r.expect(baseAssertion);

		// await the async method passed to the mock cache
		await mockICache('users');
		r.expect(baseAssertion.setChildren(WrappedRoot, () => ['api data']));
	});
});
```

### Mock `intersection` 中间件

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

使用 mock 的 `intersection` 中间件：

```tsx
import { tsx } from '@dojo/framework/core/vdom';
import createIntersectionMock from '@dojo/framework/testing/mocks/middleware/intersection';
import intersection from '@dojo/framework/core/middleware/intersection';
import renderer, { assertion, wrap } from '@dojo/framework/testing/renderer';

import MyWidget from './MyWidget';

describe('MyWidget', () => {
	it('test', () => {
		// create the intersection mock
		const intersectionMock = createIntersectionMock();
		// pass the intersection mock to the renderer so it knows to
		// replace the original middleware
		const r = renderer(() => <App key="app" />, { middleware: [[intersection, intersectionMock]] });
		const WrappedRoot = wrap('div');
		const assertion = assertion(() => (
			<WrappedRoot key="root">{`{"intersectionRatio":0,"isIntersecting":false}`}</WrappedRoot>
		));
		// call renderer.expect as usual, asserting the default response
		r.expect(assertion);

		// use the intersection mock to set the expected return
		// of the intersection middleware by key
		intersectionMock('root', { isIntersecting: true });

		// assert again with the updated expectation
		r.expect(assertion.setChildren(WrappedRoot, () => [`{"isIntersecting": true }`]));
	});
});
```

### Mock `node` 中间件

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

### Mock `resize` 中间件

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

使用 mock 的 `resize` 中间件：

```tsx
import { tsx } from '@dojo/framework/core/vdom';
import createResizeMock from '@dojo/framework/testing/mocks/middleware/resize';
import resize from '@dojo/framework/core/middleware/resize';
import renderer, { assertion, wrap } from '@dojo/framework/testing/renderer';

import MyWidget from './MyWidget';

describe('MyWidget', () => {
	it('test', () => {
		// 创建一个 mock resize 的中间件
		const resizeMock = createResizeMock();
		// 将 resize mock 中间件传给测试渲染器，
		// 这样测试渲染器就知道要替换掉原来的中间件
		const r = renderer(() => <App key="app" />, { middleware: [[resize, resizeMock]] });

		const WrappedRoot = wrap('div');
		const baseAssertion = assertion(() => <div key="root">null</div>);

		// 像平常一样调用 renderer.expect
		r.expect(baseAssertion);

		// 使用 mock 的 resize 中间件，通过指定 key 值，
		// 设置期望 resize 中间件返回的结果
		resizeMock('root', { width: 100 });

		// 用更新后的期望值再断言一次
		r.expect(baseAssertion.setChildren(WrappedRoot, () [`{"width":100}`]);)
	});
});
```

### Mock `Store` 中间件

使用 `@dojo/framework/testing/mocks/middleware/store` 中的 `createMockStoreMiddleware` 可 mock 一个强类型的 store 中间件，也支持 mock process。为了 mock 一个 store 的 process，可传入一个由原始 store process 和 stub process 组成的元组。中间件会改为调用 stub，而不是调用原始的 process。如果没有传入 stub，中间件将不会调用所有的 process。

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

使用 mock 的 `store` 中间件：

> tests/unit/MyWidget.tsx

```tsx
import { tsx } from '@dojo/framework/core/vdom'
import createMockStoreMiddleware from '@dojo/framework/testing/mocks/middleware/store';
import renderer from '@dojo/framework/testing/renderer';

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
         const r = renderer(() => <MyWidget {...properties} />, {
             middleware: [[store, mockStore]]
         });
         r.expect(/* 断言 `Loading`*/);

		 // 重新断言 stubbed process
         expect(myProcessStub.calledWith({ id: 'id' })).toBeTruthy();

         mockStore((path) => [replace(path('isLoading', true)]);
         r.expect(/* 断言 `Loading`*/);
         expect(myProcessStub.calledOnce()).toBeTruthy();

		 // 使用 mock 的 store 来在 store 上应用操作
         mockStore((path) => [replace(path('details', { id: 'id' })]);
         mockStore((path) => [replace(path('isLoading', true)]);

         r.expect(/* 断言 `ShowDetails` */);

         properties.id = 'other';
         r.expect(/* 断言 `Loading`*/);
         expect(myProcessStub.calledTwice()).toBeTruthy();
         expect(myProcessStub.secondCall.calledWith({ id: 'other' })).toBeTruthy();
         mockStore((path) => [replace(path('details', { id: 'other' })]);
         r.expect(/* 断言 `ShowDetails`*/);
     });
});
```

### Mock `validity` 中间件

使用 `@dojo/framework/testing/mocks/middleware/validity` 中的 `createValidityMock` 可 mock 一个 validity 中间件，可以在测试用控制 `get` 方法的返回值。

考虑以下示例：

> src/FormWidget.tsx

```tsx
import { tsx, create } from '@dojo/framework/core/vdom';
import validity from '@dojo/framework/core/middleware/validity';
import icache from '@dojo/framework/core/middleware/icache';
import * as css from './FormWidget.m.css';

const factory = create({ validity, icache });

export const FormWidget = factory(function FormWidget({ middleware: { validity, icache } }) {
	const value = icache.getOrSet('value', '');
	const { valid, message } = validity.get('input', value);

	return (
		<div key="root" classes={[css.root, valid === false ? css.invalid : null]}>
			<input type="email" key="input" value={value} onchange={(value) => icache.set('value', value)} />
			{message ? <p key="validityMessage">{message}</p> : null}
		</div>
	);
});
```

使用 `validityMock(key: string, value: { valid?: boolean, message?: string; })`，可以在测试中控制 `validity` mock 中 `get` 方法的返回值。

> tests/unit/FormWidget.tsx

```tsx
const { describe, it } = intern.getInterface('bdd');
import { tsx } from '@dojo/framework/core/vdom';
import renderer, { assertion } from '@dojo/framework/testing/renderer';
import validity from '@dojo/framework/core/middleware/validity';
import createValidityMock from '@dojo/framework/testing/mocks/middleware/validity';
import * as css from './FormWidget.m.css';

describe('Validity', () => {
	it('adds the "invalid" class to the wrapper when the input is invalid and displays a message', () => {
		const validityMock = createValidityMock();

		const r = renderer(() => <FormWidget />, {
			middleware: [[validity, validityMock]]
		});

		const WrappedRoot = wrap('div');
		const baseAssertion = assertion(() => (
			<WrappedRoot key="root" classes={[css.root, null]}>
				<input type="email" key="input" value="" onchange={() => {}} />
			</WrappedRoot>
		));

		r.expect(baseAssertion);

		validityMock('input', { valid: false, message: 'invalid message' });

		const invalidAssertion = baseAssertion
			.append(WrappedRoot, () => [<p key="validityMessage">invalid message</p>])
			.setProperty(WrappedRoot, 'classes', [css.root, css.invalid]);

		r.expect(invalidAssertion);
	});
});
```

### 自定义 Mock 中间件

已提供的 mock 中间件并未覆盖所有的测试场景。也可以创建自定义的 mock 中间件。模拟中间件应该提供一个可重载的接口。无参的重载应该返回中间件的实现，它将被注入到被测的部件中。根据需要创建其他重载，以便为测试提供接口。

例如，参考框架中的 `icache` mock。这个 mock 提供了以下重载：

```ts
function mockCache(): MiddlewareResult<any, any, any>;
function mockCache(key: string): Promise<any>;
function mockCache(key?: string): Promise<any> | MiddlewareResult<any, any, any>;
```

接收 `key` 的重载让测试可以直接访问缓存中的项。这个简短的示例演示了模拟如何同时包含中间件实现和测试接口；这使得 mock 可以在部件和测试之间的搭起桥梁。

```ts
export function createMockMiddleware() {
	const sharedData = new Map<string, any>();

	const mockFactory = factory(() => {
		// 实际的中间件实现；使用 `sharedData` 来搭起桥梁
		return {
			get(id: string): any {},
			set(id: string, value: any): void {}
		};
	});

	function mockMiddleware(): MiddlewareResult<any, any, any>;
	function mockMiddleware(id: string): any;
	function mockMiddleware(id?: string): any | Middleware<any, any, any> {
		if (id) {
			// 直接访问 `sharedData`
			return sharedData.get(id);
		} else {
			// 向部件提供中间件的实现
			return mockFactory();
		}
	}
}
```

在 [`framework/src/testing/mocks/middleware`](https://github.com/dojo/framework/tree/master/src/testing/mocks/middleware) 中有很多完整的模拟示例可供参考。

# 功能测试

与单元测试加载和执行代码的流程不同，功能测试在浏览器中加载一个页面并测试应用程序的交互功能。

当要校验某个路由对应的应用程序输出内容，需要为对应的路由链接添加 `id` 属性，以便快速定位链接。

> src/widgets/Menu.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import Link from '@dojo/framework/routing/ActiveLink';
import Toolbar from '@dojo/widgets/toolbar';

import * as css from './Menu.m.css';

const factory = create();

const Menu = factory(function Menu() {
	return (
		<Toolbar heading="My Dojo App!" collapseWidth={600}>
			<Link id="home" to="home" classes={[css.link]} activeClasses={[css.selected]}>
				Home
			</Link>
			<Link id="about" to="about" classes={[css.link]} activeClasses={[css.selected]}>
				About
			</Link>
			<Link id="profile" to="profile" classes={[css.link]} activeClasses={[css.selected]}>
				Profile
			</Link>
		</Toolbar>
	);
});

export default Menu;
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
dojo test --functional
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
