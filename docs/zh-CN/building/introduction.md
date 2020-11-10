# 介绍

<!--
https://github.com/dojo/framework/blob/master/docs/en/building/introduction.md
commit 61abf42bce834d76e68b5c32e8d38c392f4858fd
-->

Dojo 提供了一套强大的命令行工具，让构建现代应用程序更加简单。

可以自动创建包（Bundle），可以使用 PWA 在本地缓存文件，可以在构建阶段渲染初始的 HTML 和 CSS，也可以使用 Dojo 的 CLI 工具和 `.dojorc` 配置文件按条件忽略一些代码。或者脱离（eject） Dojo 的构建工具，直接使用底层的构建工具以做到完全掌控。

| 功能               | 描述                                                                                                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dojo CLI**       | 模块化的命令行工具，用于快速启动新的应用程序、创建部件和运行测试等。                                                                                                                                 |
| **开发服务器**     | 开发时使用的本地 web 服务器，用于监听文件系统，当检测到变化时会自动重新构建。也支持 HTTPS 和设置代理。                                                                                               |
| **包(bundle)**     | 通过减少用户需要下载的内容和优化用户实际需要的应用程序交互时间（Time-to-Interactive）以提高用户体验。可以根据路由自动创建包，或者在配置文件中明确定义包。                                            |
| **按条件纳入代码** | 通过 `.dojorc` 配置文件可以静态方式关闭或打开使用 dojo/has 定义的功能。由于这些配置而无法访问到的代码分支会被自动忽略掉。这就很容易为特定目标（如 IE11 或 mobile）提供特定功能，而不会影响包的大小。 |
| **PWA 支持**       | 渐进式 Web 应用程序通过缓存内容甚至脱机工作，创建更快、更可靠的用户体验。通过配置文件或者在代码中定义，dojo 很容易创建一个 service work，并将其构建为应用程序的一部分。                              |
| **构建时渲染**     | 在构建时渲染路由以生成初始的 HTML 和 CSS。在构建时渲染，Dojo 可以节省出初始渲染的成本，创建出一个响应性更高的应用程序，且不会引入额外的复杂性。                                                      |

## 基本用法

Dojo 提供了一组 CLI 命令，辅助创建和构建应用程序。本指南假设已全局安装 `@dojo/cli`，且在项目中安装了 [@dojo/cli-build-app](https://github.com/dojo/cli-build-app) 和 [@dojo/cli-test-intern](https://github.com/dojo/cli-test-intern)。如果项目是使用 [@dojo/cli-create-app](https://github.com/dojo/cli-create-app) 初始化的，那么这些依赖应该已经存在。

### 构建

Dojo 的 CLI 工具支持多种构建目标或 `mode`。在 `dojo create app` 为 `package.json` 生成的几个脚本（scripts）中可看到所有模式。

运行以下命令，创建一个为生产环境优化过的构建。

```bash
> dojo build --mode dist
```

此次构建使用 `dist` 模式创建应用程序包，并将结果输出到 `output/dist` 目录中。

### 运行服务和监听变化

当在 `dev` 或 `dist` 模式下运行时，可以使用 `--serve` 标记启动一个 web 服务器。应用程序默认运行在 9999 端口上。可以使用 `--port` 标记修改端口。使用 `--watch` 标记，Dojo 的构建工具也可以监听应用程序的变化并自动重新构建。

生成的 `package.json` 文件中包含 `dev` 脚本，它使用这些标记运行应用程序的构建版本，并监听到磁盘上的文件发生变化后会自动重新构建。

```bash
> dojo build --mode dev --watch --serve
```

应用程序也会提供 source map。这样调试器就可以将构建的 JavaScript 代码映射回位于 `src/` 文件夹下原本的 TypeScript 代码上。

### 测试

Dojo 使用 [Intern](https://theintern.io/) 运行单元和功能测试。

T 运行 `tests/unit` 中单元测试的最快方式，是使用新建 Dojo 应用程序时创建的 NPM 脚本。

> 命令行

```bash
# execute unit tests
npm run test:unit
# execute functional tests locally using headless Chrome and Selenium
npm run test:functional
```

### 支持的浏览器

Dojo 是一个持续演变的框架。默认情况下，发布的 dojo 版本会支持最新浏览器的最近两个版本。Dojo 要跨浏览器实现标准功能，其所需的 polyfill 都是通过 `@dojo/framework/shim` 按需提供的。要支持 IE11，需要打开 `--legacy` 标记。

## Dojo 配置

可在 `.dojorc` 中添加其它配置选项。这些选项通常通过命令行扩展可用的设置，并支持更高级的功能，如国际化、代码拆分、PWA 清单和忽略代码等。

`.dojorc` 文件中包含一个 JSON 对象，可以为能在 dojo 命令行工具上运行的任何命令配置信息。在配置对象中为每个命令分配一个节点，可在其中存储配置信息。

```json
{
	"build-app": {
		"pwa": {
			"manifest": {
				"name": "My Application",
				"description": "My amazing application"
			}
		}
	},
	"test-intern": {},
	"create-widget": {
		"tests": "tests/unit"
	}
}
```

本示例中，[@dojo/cli-build-app](https://github.com/dojo/cli-build-app/)、[@dojo/cli-test-intern](https://github.com/dojo/cli-test-intern) 和 [@dojo/cli-create-widget](https://github.com/dojo/cli-create-widget) 三个 CLI 命令模块各对应一个节点。配置 _总是_ 分层的，按照 command => feature => configuration 的顺序排列。
