# Version 6.0.0 Migration Guide

Dojo version 6 contains several major ergonomic changes along with a few breaking changes to be aware of when migrating from version 5. As much as possible, these updates are automated by using the `@dojo/cli-upgrade-app` CLI command. When the upgrade command cannot automate the upgrade, helpful hints and information are provided in the output to guide you through the manual upgrade process for these changes.

To install the upgrade command, run the following from the project root:

```
npm install @dojo/cli-upgrade-app --no-save
```

To perform the migration, run the following command from the project root. The Dojo migration tool should automatically detect the necessary migration from your `package.json`.

```
dojo upgrade app
```

If you are upgrading from a version before 5.0.0, please first see the [previous migration guides](./V5-Migration-Guide) for more details.

-   The `@dojo/cli` should be updated to version 6.0.0, along with all the commands used by the project.
-   If your project is using `@dojo/widgets` and `@dojo/interop`, these packages also require upgrading to version 6.0.0.

**Note:** The migration tool may create line lengths that violate your projects linting rules, be sure to run your linter and manually fix any linting rule violations.

### Breaking Changes:

#### [Update to the new minimum TypeScript version supported by Dojo version 6](https://github.com/dojo/framework/pull/331)

As part of the improvements made for Dojo version 6, the minimum version of TypeScript has changed to `3.4.5`. This change is necessary to support the typings required by the new functional widgets and middleware.

Dojo version 6 should be fully compatible with `3.4.5` and newer. Updating a project's dependency should satisfy Dojo, however you may find changes are required in your project code to meet TypeScript additional checking added in newer versions.

In addition to upgrading TypeScript, the complementary library `tslib` should be upgraded to `~1.9.1`.

#### [`has`](https://github.com/dojo/framework/pull/361) and [`widget-core`](https://github.com/dojo/framework/pull/306) merged with `core`

As part of Dojo version 6 we have continued to re-organize `@dojo/framework`'s module structure. As a result, `@dojo/framework/widget-core` and `@dojo/framework/has` have been merged with `@dojo/framework/core`.

The `@dojo/cli-upgrade-app` command should automatically migrate your project's imports. Please let us know if you encounter any issues.

#### [`@dojo/framework/widget-core/d` and `@dojo/framework/widget-core/tsx` moved to `@dojo/framework/core/vdom`](https://github.com/dojo/framework/pull/360)

In addition to merging `widget-core` with `core`, the `d` and `tsx` exports have been moved into `vdom`.

**Note:** There is one exception, `decorate` has been moved from `d` to `util`.

The `@dojo/cli-upgrade-app` command should automatically migrate your project's imports. please let us know if you encounter any issues.

As part of Dojo version 6 we have continued to re-organize `@dojo/framework`'s module structure. As a result, `@dojo/framework/widget-core` and `@dojo/framework/has` have merged into `@dojo/framework/core`.

The `@dojo/cli-upgrade-app` command should automatically migrate your project's imports. Please let us know if you encounter any issues.

#### [`WNode` are no longer decorated with `bind`](https://github.com/dojo/framework/pull/290)

In previous versions of Dojo virtual Dom nodes created by widgets have been decorated with additional meta data, such as `bind`. These extra properties were never meant to be exposed to the end user, however as they are added by mutating the `DNodes` it exposed these the properties inadvertently. As of Dojo 6 we no longer mutate `DNodes` to ensure that this implementation detail of the framework is exposed to the end user.

We don't envisage this change affecting many projects, however, if it does please raise an issue with your use case so we can investigate an officially supported mechanism.

#### [AssertionTemplate `replace` renamed to `replaceChildren`](https://github.com/dojo/framework/pull/412)

The `replace` method has been renamed to `replaceChildren` with the introduction of a new API for `replace` that will replace a single node of an assertion template and not target just the children.

Additionally we have deprecated passing an array of `DNode` to APIs that replace/modify children in favor of a factory function to ensure that the `DNode` are immutable. The existing API is still supported, but you will receive a warning and we recommend changing to use a function as the array API is likely to be removed in a future Dojo release.

```ts
const base = assertionTemplate(() => {
	return v('div', { key: 'div' }, [v('div')]);
});

// existing API
base.setChildren('@div', [v('span')]);

// recommended API
base.setChildren('@div', () => [v('span')]);
```

#### [Transition strategy not automatically imported](https://github.com/dojo/framework/pull/418)

The transition strategy for the virtual DOM renderer is no longer implicitly imported in `vdom`. To use `VNode` transitions that leverage `exitAnimation` or `enterAnimation`, the transition strategy needs to get explicitly imported and passed to the applications `.mount` call.

```ts
import renderer, { w } from '@dojo/framework/core/vdom';
import transition from '@dojo/framework/core/animations/cssTransitions';

const r = renderer(() => w(App, {}));
r.mount({ transition });
```
