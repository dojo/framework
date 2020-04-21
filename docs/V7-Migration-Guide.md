# Version 7 Migration Guide

Dojo version 7 contains a few breaking changes to be aware of when migrating from version 6. As much as possible, these updates are automated by using the `@dojo/cli-upgrade-app` CLI command. When the upgrade command cannot automate the upgrade, helpful hints and information are provided in the output to guide you through the manual upgrade process for these changes.

To install the upgrade command, run the following from the project root:

```
npm install @dojo/cli-upgrade-app --no-save
```

To perform the migration, run the following command from the project root. The Dojo migration tool should automatically detect the necessary migration from your `package.json`.

```
dojo upgrade app
```

If you are upgrading from a version before 6.0.0, please first see the [previous migration guides](./V6-Migration-Guide) for more details.

-   The `@dojo/cli` should be updated to version 7.0.0, along with all the commands used by the project.
-   If your project is using `@dojo/widgets` and `@dojo/interop`, these packages also require upgrading to version 7.0.0 and see the [Dojo Widget migration guide](https://github.com/dojo/widgets/blob/master/docs/V7-Migration-Guide.md) for specific widget details.

**Note:** The migration tool may create line lengths that violate your project's linting rules; be sure to run your linter and manually fix any linting rule violations.

### Breaking Changes:

#### [The test `harness` modules have been moved](https://github.com/dojo/framework/pull/710)

The Dojo testing story has been re-worked as part of version 7, with a brand new test renderer. The test renderer is the recommended way to test Dojo widgets, however the existing `harness` and related modules are still supported but have been moved from `@dojo/framework/testing` to `@dojo/framework/testing/harness`.

The `@dojo/cli-upgrade-app` command should automatically migrate your project's imports. Please let us know if you encounter any issues.

#### [A routing configuration requires a unique `id` and `Outlet` has been renamed to `Route`](https://github.com/dojo/framework/pull/716)

Dojo 7 has renamed the existing `Outlet` component to `Route` and requires an `id` property for each route in an applications route configuration. For parity with Dojo 6 behavior this will match the existing `outlet` property value.

The `@dojo/cli-upgrade-app` command should automatically migrate your project's imports and add the `id` property if a `src/routes.ts(x)` module is detected. Please let us know if you encounter any issues.

#### [Deprecate `cache` in favour of `icache`](https://github.com/dojo/framework/pull/618)

The existing `icache` has been deprecated in favour of always using `icache`, the `cache` middleware now uses the `icache` which has different functionality when dealing with functions. If you are using `cache` please check that everything is still functioning as expected, if you are storing functions in the `cache` you will need to wrap them in an additional function call, e.g. from `cache.set('key', myFunc);` to `cache.set('key', () => myFunc)`.

For rare occasions when you need to set items in a cache but not invalidate an additional third parameter of `false` can be passed.

#### [Return cache value from `icache.set()`](https://github.com/dojo/framework/pull/741)

When calling `icache.set()` the value that is set is returned, in some scenarios this could cause a compilation error, for example when using `icache.set()` in an event handler.

```tsx
// will cause an error as the return type is no longer correct
<div onclick={() => icache.set('key', 'value')}/>

// Change the handler to no return the value from icache
<div onclick={() => {
    icache.set('key', 'value');
}}/>
```

#### [`.dojorc` configuration validation](https://github.com/dojo/cli-build-app/pull/324)

Validation has been added for the `.dojorc`, this will report errors to the console if there is pre-existing unsupported / invalid value in an application's configuration.

#### [Remove `Projector` mixin](https://github.com/dojo/framework/pull/549)

The legacy `Projector` mixin has been removed, for more information on how mount a Dojo application please see the [Creating Widgets reference guide](https://dojo.io/learn/creating-widgets/introduction#rendering-to-the-dom)
