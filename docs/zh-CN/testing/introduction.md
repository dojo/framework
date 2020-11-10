# 介绍

<!--
https://github.com/dojo/framework/blob/master/docs/en/testing/introduction.md
commit f154baaf15a0e1eb69721ec7651fdf507a398475
-->

Dojo 的 `@dojo/cli-test-intern` 提供了一个健壮的测试框架。它能高效地测试小部件的输出并确认是否如你所愿。

| 功能         | 描述                                                                       |
| ------------ | -------------------------------------------------------------------------- |
| **极简 API** | 用于测试和断言 Dojo 部件预期的虚拟 DOM 和行为的精简 API。                  |
| **单元测试** | 单元测试是指运行在 node 和浏览器上的测试，用于测试独立的代码块。           |
| **功能测试** | 功能测试通过 Selenium 运行在浏览器中，模拟用户与软件的交互来测试整体功能。 |
| **断言**     | 断言能构建期望的渲染函数，以验证部件的输出。                               |

## 基本用法

### 测试 Dojo 应用程序

-   运行项目的测试套件

```shell
dojo test
```

Dojo 使用 `@dojo/cli-test-intern` 运行 `tests` 文件夹下的单元测试和功能测试。

### 运行特定的测试套件

Dojo 支持两种类型的测试方法：单元测试和功能测试。单元测试是运行在 node 和本地 [Selenium] 通道上的测试，用于测试独立的代码块。功能测试通过 Selenium 运行在浏览器中，模拟用户与软件的交互来测试整体功能。在 Selenium 上运行单元测试和功能测试时，必须先使用 `@dojo/cli-build-app` 进行适当的构建。

-   运行项目的单元测试套件

> 命令行

```shell
dojo test --unit --config local
```

-   使用 [Selenium] 在本地的 headless Chrome 实例中运行功能测试。

```shell
dojo test --functional --config local
```

### 编写单元测试

-   使用 Dojo 的 [test `renderer` API](/learn/testing/test-renderer) API 为部件编写单元测试。

> src/widgets/Home.tsx

```ts
import { create, tsx } from '@dojo/framework/core/vdom';
import * as css from './Home.m.css';

const factory = create();

const Home = factory(function Home() {
	return <h1 classes={[css.root]}>Home Page</h1>;
});

export default Home;
```

> tests/unit/widgets/Home.tsx

```ts
const { describe, it } = intern.getInterface('bdd');
import { tsx } from '@dojo/framework/core/vdom';
import renderer, { assertion } from '@dojo/framework/testing/renderer';

import Home from '../../../src/widgets/Home';
import * as css from '../../../src/widgets/Home.m.css';

const baseAssertion = assertion(() => <h1 classes={[css.root]}>Home Page</h1>);

describe('Home', () => {
	it('default renders correctly', () => {
		const r = renderer(() => <Home />);
		r.expect(baseAssertion);
	});
});
```

`renderer` API 能让你核实渲染部件的输出是否如你所愿。

-   它是否按预期渲染?
-   事件处理器是否按预期工作?

### 编写功能测试

功能测试允许你在真正的浏览器上加载一个 UI 页面并执行其中的代码，以更好的测试部件的行为。

编写功能测试就是详细描述用户在页面中的交互，如点击元素，然后验证生成的页面内容。

> tests/functional/main.ts

```ts
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

### 使用断言

断言提供了一种创建基本断言的方法，该方法允许你在每个测试间修改期望输出中的部分内容。

-   一个部件可根据属性值的不同渲染不同的内容:

> src/widgets/Profile.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';

import * as css from './Profile.m.css';

export interface ProfileProperties {
	username?: string;
}

const factory = create().properties<ProfileProperties>();

const Profile = factory(function Profile({ properties }) {
	const { username } = properties();
	return <h1 classes={[css.root]}>{`Welcome ${username || 'Stranger'}!`}</h1>;
});

export default Profile;
```

-   使用 `@dojo/framework/testing/renderer#assertion` 创建一个断言

> tests/unit/widgets/Profile.tsx

```tsx
const { describe, it } = intern.getInterface('bdd');
import { tsx } from '@dojo/framework/core/vdom';
import renderer, { assertion } from '@dojo/framework/testing/renderer';

import Profile from '../../../src/widgets/Profile';
import * as css from '../../../src/widgets/Profile.m.css';

// 创建一个断言
const profileAssertion = assertion(() => <h1 classes={[css.root]}>Welcome Stranger!</h1>);

describe('Profile', () => {
	it('default renders correctly', () => {
		const r = renderer(() => <Profile />);
		// 基于基本断言测试
		r.expect(profileAssertion);
	});
});
```

包装后的测试节点，是使用 `@dojo/framework/testing/renderer#wrap` 创建的，然后将其传给断言方法，作为期望输出，以代替与断言 API 交互的标准部件。注意：当在 `v()` 中使用包装的 `VNode` 时，需要使用包装节点的 `.tag` 属性，如 `v(WrappedDiv.tag, {} [])`。

> tests/unit/widgets/Profile.tsx

```tsx
const { describe, it } = intern.getInterface('bdd');
import { tsx } from '@dojo/framework/core/vdom';
import renderer { wrap, assertion } from '@dojo/framework/testing/renderer';

import Profile from '../../../src/widgets/Profile';
import * as css from '../../../src/widgets/Profile.m.css';

// Create a wrapped test node
const WrappedHeader = wrap('h1');

// Create an assertion
const profileAssertion = assertion(() => (
	// Use the wrapped node in place of the normal node
	<WrappedHeader classes={[css.root]}>Welcome Stranger!</WrappedHeader>
));

describe('Profile', () => {
	it('default renders correctly', () => {
		const r = renderer(() => <Profile />);
		// Test against my base assertion
		r.expect(profileAssertion);
	});

	it('renders given username correctly', () => {
		// update the expected result with a given username
		const namedAssertion = profileAssertion.setChildren(WrappedHeader, () => ['Welcome Kel Varnsen!']);
		const r = renderer(() => <Profile username="Kel Varnsen" />);
		r.expect(namedAssertion);
	});
});
```

使用断言的 `setChildren` 方法，传入包装的测试节点，此示例中为 `WrappedHeader`，将返回一个更新了虚拟 DOM 结构的断言（assertion）对象。就可以使用返回的断言测试部件的输出。

[dojo cli]: https://github.com/dojo/cli
[intern]: https://theintern.io/
[selenium]: http://www.seleniumhq.org/
