# 介绍

<!--
https://github.com/dojo/framework/blob/master/docs/en/testing/introduction.md
commit b2107a9753902978938b3093ee67a9de95e9aef8
-->

Dojo 的 `@dojo/cli-test-intern` 提供了一个健壮的测试框架。它能高效地测试小部件的输出并确认是否如你所愿。

| 功能         | 描述                                                                       |
| ------------ | -------------------------------------------------------------------------- |
| **极简 API** | 用于测试和断言 Dojo 部件预期的虚拟 DOM 和行为的精简 API。                  |
| **单元测试** | 单元测试是指运行在 node 和浏览器上的测试，用于测试独立的代码块。           |
| **功能测试** | 功能测试通过 Selenium 运行在浏览器中，模拟用户与软件的交互来测试整体功能。 |
| **断言模板** | 断言模板能构建期望的渲染函数，以验证部件的输出。                           |

# 基本用法

## 测试 Dojo 应用程序

-   运行项目的测试套件

```shell
dojo test
```

Dojo 使用 `@dojo/cli-test-intern` 运行 `tests` 文件夹下的单元测试和功能测试。

## 运行特定的测试套件

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

## 编写单元测试

-   使用 Dojo 的 [`harness`](https://github.com/dojo/framework/tree/master/src/testing) API 为部件编写单元测试。

> src/tests/unit/widgets/Home.ts

```ts
const { describe, it } = intern.getInterface('bdd');
import harness from '@dojo/framework/testing/harness';
import assertionTemplate from '@dojo/framework/testing/assertionTemplate';
import { w, v } from '@dojo/framework/widget-core/d';

import Home from '../../../src/widgets/Home';
import * as css from '../../../src/widgets/styles/Home.m.css';

const baseTemplate = assertionTemplate(() => v('h1', { classes: [css.root] }, ['Home Page']));

describe('Home', () => {
	it('default renders correctly', () => {
		const h = harness(() => w(Home, {}));
		h.expect(baseTemplate);
	});
});
```

`harness` API 能让你核实渲染部件的输出是否如你所愿。

-   它是否按预期渲染?
-   事件处理器是否按预期工作?

## 编写功能测试

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
				// 根据 id 找到超链接标签的
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

## 使用断言模板

断言模板提供了一种创建基本断言的方法，该方法允许你在每个测试间修改期望输出中的部分内容。

-   一个部件可根据属性值的不同渲染不同的内容:

> src/widgets/Profile.ts

```tsx
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

-   使用 `@dojo/framework/testing/assertionTemplate` 创建一个断言模板

> tests/unit/widgets/Profile.ts

```ts
// 创建一个断言
const profileAssertion = assertionTemplate(() =>
	v('h1', { classes: [css.root], '~key': 'welcome' }, ['Welcome Stranger!'])
);

describe('Profile', () => {
	it('default renders correctly', () => {
		const h = harness(() => w(Profile, {}));
		// 基于基本断言测试
		h.expect(profileAssertion);
	});
});
```

使用在断言模板中定义的 `~key` 属性，可为任何要测试的虚拟 DOM 提供一个值。在 `.tsx` 中对应的是 `assertion-key` 属性。

> tests/unit/widgets/Profile.ts

```ts
describe('Profile', () => {
	it('default renders correctly', () => {
		const h = harness(() => w(Profile, {}));
		h.expect(profileAssertion);
	});

	it('renders given username correctly', () => {
		// 使用给定的用户名更新期望的结果
		const namedAssertion = profileAssertion.setChildren('~welcome', () => ['Welcome Kel Varnsen!']);
		const h = harness(() => w(Profile, { username: 'Kel Varnsen' }));
		h.expect(namedAssertion);
	});
});
```

Using the `setChildren` method of an assertion template with the assigned `~key` value will return a assertion template with the updated virtual DOM structure. This resulting assertion template can then be used to test widget output.

使用断言模板的 `setChildren` 方法，传入指定的 `~key` 来定位一个虚拟 DOM，并修改该虚拟 DOM 的结构，然后返回更新的断言模板。就可以使用返回的断言模板测试部件的输出。

[dojo cli]: https://github.com/dojo/cli
[intern]: https://theintern.io/
[selenium]: http://www.seleniumhq.org/
