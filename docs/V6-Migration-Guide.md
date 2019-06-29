# Version 6.0.0 Migration Guide

Dojo 6 has landed and contains some major ergonomic changes along with a few breaking changes that you should be aware of when migrating from version 5. As much as possible these updates should be automated by using the `@dojo/cli-upgrade-app` CLI command. When the command cannot automate the upgrade, there should be helpful hints and information in the output to guide you through the manual process.

To install the upgrade command, run the following from the project root:

```
npm install @dojo/cli-upgrade-app --no-save
```

To perform the migration, run the following command from the project root. The migrations tool should automatically detect the necessary migration from your `package.json`.

```
dojo upgrade app
```

If you are upgrading from a version before 5.0.0, please see the [previous migration guides](./V5-Migration-Guide) for more details first.

-   The `@dojo/cli` should be updated to version 6.0.0, along with all the commands used by the project.
-   If your project is using `@dojo/widgets` and `@dojo/interop`, these packages also require upgrading to version 6.0.0.

**Note:** The migration tool may create line lengths that violate your projects linting rules, be sure to run your linter and manually fix any linting rule violations.

### Breaking Changes:

#### [Update to the minimum support TypeScript version](https://github.com/dojo/framework/pull/331)

As part of the enhancements made for Dojo 6, the minimum supported has changed to `3.4.5`. This is was to support the typings required by the new functional widgets and middleware.

Dojo 6 should be fully compatible with `3.4.5` onwards and updating the projects dependency should satisfy Dojo, however you may find changes are required in your project code.

In addition to upgrading TypeScript, the complimentary library `tslib` should be upgraded to `~1.9.1`.

#### [`has`](https://github.com/dojo/framework/pull/361) and [`widget-core`](https://github.com/dojo/framework/pull/306) merged with `core`

As part of Dojo 6 we have continued to re-organize `@dojo/framework`'s module structure, as a result `@dojo/framework/widget-core` and `@dojo/framework/has` have been merged with `@dojo/framework/core`.

The `@dojo/cli-upgrade-app` command should automatically migrate your projects imports, please let us know if you have any issues.

#### [`@dojo/framework/widget-core/d` and `@dojo/framework/widget-core/tsx` moved to `@dojo/framework/core/vdom`](https://github.com/dojo/framework/pull/360)

In addition to merging `widget-core` with `core`, the `d` and `tsx` exports have been moved into `vdom`.

**Note:** There is one exception, `decorate` has been moved from `d` to `util`.

The `@dojo/cli-upgrade-app` command should automatically migrate your projects imports, please let us know if you have any issues.

As part of Dojo 6 we have continued to re-organize `@dojo/framework`'s module structure, as a result `@dojo/framework/widget-core` and `@dojo/framework/has` have been merged with `@dojo/framework/core`.

The `@dojo/cli-upgrade-app` command should automatically migrate your projects imports, please let us know if you have any issues.

#### [`WNode` are no longer decorated with `bind`](https://github.com/dojo/framework/pull/290)

In previous versions of Dojo virtual Dom nodes created by widgets have been decorated with additional meta data, such as `bind`. These extra properties were never meant to be exposed to the end user, however as they are added by mutating the `DNodes` it exposed these the properties inadvertently. As of Dojo 6 we no longer mutate `DNodes` to ensure that this implementation detail of the framework is exposed to the end user.

We don't envisage this change affecting many projects, however if it does please raise an issue with your use case so we can investigate an officially supported mechanism.

#### [AssertionTemplate `replace` renamed to `replaceChildren`](https://github.com/dojo/framework/pull/412)

The `replace` has been renamed to `replaceChildren` with the introduction of a new API for `replace` that will replace a single node of an assertion template not target just the children.

Additionally we have deprecated passing an array of `DNode` to APIs that replace/modify children in favour of a factory function to ensure that they are immutable. The existing API is still supported but you will receive a warning and we recommend changing to use a function as the array API is likely to be removed in a future release.

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

The transition strategy for the vdom renderer is no longer implicitly imported in `vdom`, to use `VNode` transitions that leverage `exitAnimation` or `enterAnimation` the strategy will need to be explicitly imported and passed to the applications `.mount` call.

```ts
import renderer, { w } from '@dojo/framework/core/vdom';
import transition from '@dojo/framework/core/animations/cssTransitions';

const r = renderer(() => w(App, {}));
r.mount({ transition });
```
