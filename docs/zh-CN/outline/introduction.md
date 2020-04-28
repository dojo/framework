# 介绍

<!--
https://github.com/dojo/framework/blob/master/docs/en/outline/introduction.md
commit 3064b7ce80fa19569f8975e9aa5d06718ca8decb
-->

Dojo 提供了一套设计现代 web 应用程序的完整解决方案，项目需要时也可以逐步的模块化。Dojo 框架可以随着应用程序的复杂性而扩展，可构建的内容从简单的预渲染站点一直到企业级的单页面 web 应用，包括跨多种设备的、接近本地 app 体验的渐进式 web 应用程序。

Dojo 提供了各种各样的框架组件、工具以及构建管道，它们协助解决许多端到端 web 应用程序的开发问题。

## 管理复杂的应用程序

-   开发[称为 **Widget** 的简单且模块化的组件](/learn/creating-widgets/部件的基本原理#基本的部件结构)，这些组件可通过多种方式组装，以实现日益复杂的需求。
-   使用[响应式的状态管理和数据流](/learn/creating-widgets/状态管理)来连接部件，当应用程序的状态更改时，Dojo 框架就可以高效地渲染更新。
-   使用[集中的、面向命令的数据存储](/learn/stores/introduction)来管理高级的应用程序状态。
-   允许用户使用[声明式路由](/learn/routing/route-configuration)在单页面应用程序（SPA）内导航，并支持跟踪历史记录。
-   通过功能切换检测来禁用处于开发阶段的功能——甚至在构建时删除未使用的模块，缩减应用程序的交付大小。编写适合在浏览器或服务器上运行的程序。

## 创建高效的应用程序

-   通过[虚拟化 DOM（VDOM）](/learn/creating-widgets/渲染部件#使用-vdom)声明部件结构，避免高昂的 DOM 操作和布局抖动。
-   简化[资源分层和绑定](/learn/building/创建包)，缩减用户实际需要的应用程序交互时间（Time-to-Interactive）。当模块及其依赖跨多个绑定时，Dojo 框架能自动将 import 转换为延迟加载。

## 创建全面的应用程序

-   开发[支持主题的部件和应用程序](/learn/styling/introduction)，从而将页面外观和页面功能隔离，并通过一种极其简单的方式在整个应用程序中实现外观一致。
-   使用一套支持国际化（i18n）、可访问性（a11y）以及现成主题的 [UI 部件](https://github.com/dojo/widgets/blob/master/README.md)
-   使用[国际化（i18n）框架](/learn/i18n/introduction)支持多套区域设置，包括通过 [Unicode CLDR](/learn/i18n/advanced-formatting) 实现高级的消息格式化。

## 创建可适配的应用程序

-   开发[渐进式 web 应用程序（PWA）](/learn/building/渐进式-web-应用程序)，支持与本地设备 APP 类似的功能，如离线使用、后台数据同步和推送通知。
-   使用[构建时渲染（BTR）](/learn/building/构建时渲染)，提供可以与服务器端渲染（SSR）的应用程序媲美的预渲染功能，并且不需要托管到动态的 web 服务器上。创建完全不使用 JavaScript 的、真正的静态站点；或者借助 BTR 让应用程序实现更好的首次加载体验。
-   利用先进的 web 技术，如 [Web Animations](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)、[Intersection Observers](/learn/middleware/可用的中间件#intersection) 和 [Resize Observers](/learn/middleware/可用的中间件#resize)。Dojo 框架为用户在多种运行环境上使用最新功能提供了一致的应用程序体验。
-   如果需要的话，需要定制的应用程序可以[脱离 Dojo 的构建管道](/learn/building/脱离-dojo-构建管道)，转而使用自己的解决方案，并只使用框架提供的部分功能。

## 加快开发

-   使用简单的[命令行界面（CLI）](https://github.com/dojo/cli/blob/master/README.md)启动新项目，并持续的构建和验证。支持行业最佳实践且类型安全和稳健的构建管道，能立即提升开发人员的工作效率。
-   快速构建与 Dojo 自带的部件库具有相同功能的自定义部件，包括[自定义主题](/learn/styling/working-with-themes#scaffolding-themes-for-third-party-widgets)。
