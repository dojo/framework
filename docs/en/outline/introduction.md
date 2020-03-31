# Introduction

Dojo provides a holistic approach to engineering modern web applications while remaining progressively modular in which aspects a project may utilize. The Dojo framework scales with the complexity of an application and allows building anything from simple pre-rendered websites all the way up to enterprise-scale single-page web applications, including options for progressive web apps that approach native app experiences across a variety of device types.

Dojo offers a variety of framework components, tooling and a build pipeline that together help address many end-to-end web application development concerns.

## Manage complex applications

-   Develop [simple, modular components known as **widgets**](/learn/creating-widgets/widget-fundamentals#basic-widget-structure) that can be assembled in a variety of ways to implement increasingly complex requirements.
-   Connect widgets using [reactive state management and data flows](/learn/creating-widgets/managing-state), allowing the Dojo framework to efficiently handle rendering updates when application state changes.
-   Make use of [centralized, command-oriented data stores](/learn/stores/introduction) for advanced application state management.
-   Allow user navigation within Single-Page Applications (SPA) via [declarative routing](/learn/routing/route-configuration), with history support.
-   Disable functionality that is still being developed through feature toggle detection - even elide unused modules at build time to help minimize application delivery size. Write applications that adapt to running within a browser or on a server.

## Create efficient applications

-   Avoid costly DOM operations and layout thrashing by declaring widget structure through a [Virtualized Document Object Model (VDOM)](/learn/creating-widgets/rendering-widgets#working-with-the-vdom).
-   Simplify [resource layering and bundling](/learn/building/creating-bundles) to minimize Time-to-Interactive (TTI) for the subset of an application a user actually needs. The Dojo framework can automatically convert imports to be lazily loaded when modules and their dependencies cross bundle boundaries.

## Create global applications

-   Develop [themeable widgets and applications](/learn/styling/introduction) to help isolate presentational and functional concerns, and allow for an easy way to achieve consistent presentation across a full application.
-   Make use of a suite of [user interface (UI) widgets](https://github.com/dojo/widgets/blob/master/README.md) that support internationalization (i18n), accessibility (a11y) and theming out-of-the-box.
-   Use an [internationalization (i18n) framework](/learn/i18n/introduction) to support multiple locales, including optional advanced message formatting through [Unicode CLDR](/learn/i18n/advanced-formatting).

## Create adaptable applications

-   Develop [progressive web applications (PWA)](/learn/building/progressive-web-applications) that support features similar to native device apps such as offline usage, background data syncing and push notifications.
-   Use [build-time rendering (BTR)](/learn/building/buildtime-rendering) to provide certain pre-rendering benefits of Server-Side Rendered (SSR) apps without the need for hosting on a dynamic web application server. Create truly static websites that work without JavaScript, or use BTR with progressive hydration for an even better application first-load experience.
    Make use of cutting-edge web technologies such as [Web Animations](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API), [Intersection Observers](/learn/middleware/available-middleware#intersection) and [Resize Observers](/learn/middleware/available-middleware#resize). The Dojo framework provides a consistent application experience for modern features across a variety of user runtime environments.
-   If required, projects with bespoke needs can [opt-out of Dojo’s build pipeline](/learn/building/ejecting) in favor of their own solution, and instead only use pieces of the framework that are needed.

## Speed up development

-   Bootstrap new projects and perform ongoing builds and validation using a simple [command-line interface (CLI)](https://github.com/dojo/cli/blob/master/README.md), getting developers immediately productive within a type-safe, opinionated build pipeline that favors industry best practices.
-   Quickly scaffold custom widgets that support the same range of features as the core widget suite, including [custom themes](/learn/styling/working-with-themes#scaffolding-themes-for-third-party-widgets).
