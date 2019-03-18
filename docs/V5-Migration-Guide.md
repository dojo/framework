# Version 5.0.0 Migration Guide

Dojo 5.0.0 includes a few breaking changes that will need to some changes in your applications code base. As with previous releases, we have updated the `@dojo/cli-upgrade-app` CLI command to help you through the upgrade process and automate as much as possible. Where it is not possible to automate the upgrade, you should receive helpful information in the output that indicates what needs to get manually upgraded and in which module.

To install the upgrade command, run the following from the project root:

```
npm install @dojo/cli-upgrade-app --no-save
```

To perform the migration, run the following command from the project root. The migrations tool should automatically detect the necessary migration from your `package.json`.

```
dojo upgrade app
```

If you are upgrading from a version before 4.0.0, please see the [previous migration guides](./) for more details first.

-   The `@dojo/cli` should be updated to version 5.0.0, along with all the commands used by the project.
-   If your project is using @dojo/widgets and @dojo/interop, these packages also require upgrading to version 5.0.0.

**Note:** The migration tool may create line lengths that violate your projects linting rules, be sure to run your linter and manually fix any linting rule violations.

### Breaking Changes:

#### [`has` module consolidation](https://github.com/dojo/framework/pull/182)

Building on the cleanup started with the 3.0 consolidation of packages into `@dojo/framework`, this release of Dojo moves all `has` related modules in a single `has` module, `@dojo/framework/has/has`. If you run the `dojo/cli-upgrade-app` command all references to removed `has` modules should be automatically updated.

#### [`classes` property with the `Themed` mixin](https://github.com/dojo/framework/pull/164)

A new API that supports passing classes keyed by a widgets theme key is now available for all widgets that use the `@dojo/framework/widget-core/meta/Themed` mixin.

This is not a traditional breaking change as it will only affect themed widgets that have a `classes` property specified on its API.

#### [Support for `before` middleware in stores](https://github.com/dojo/framework/pull/173)

Middleware in stores has always support running after a process completion or error, Dojo 5.0.0 introduces support for middleware that runs before a process is started. To support this the API has changed. More information can be found on the [stores readme](https://github.com/dojo/framework/blob/master/src/stores/README.md#middleware).

**v4.x**

```ts
// A single process middleware

const myProcess = createProcess('process', [myCommand], (error, result) => {
	// middleware logic
});

// Composite middleware

const myMiddlewareOne = createCallbackDecorator((error, result) => {
	// middleware logic
});

const myMiddlewareTwo = createCallbackDecorator((error, result) => {
	// middleware logic
});

const myProcess = createProcess('process', [myCommand], myMiddlewareOne(myMiddlewareTwo()));
```

**v5.x**

```ts
// A single process middleware

const myProcess = createProcess('process', [myCommand], () => ({
	after: (error, result) => {
		// middleware logic
	}
}));

// Composite middleware

const myMiddlewareOne = () => ({
	after: (error, result) => {
		// middleware logic
	}
});

const myMiddlewareTwo = () => ({
	after: (error, result) => {
		// middleware logic
	}
});

const myProcess = createProcess('process', [myCommand], [myMiddlewareOne, myMiddlewareTwo]);
```

**Note:** If your application is using the `createCallbackDecorator` factory from `@dojo/framework/stores/process` these processes will be forwards compatible as the factory has been re-purposed to convert the 4.0.0 API to the 5.0.0 API. However we recommend updating these as time permits and using the `createCallbackDecorator` factory will log out a warning to the console when running a dev build.

#### [A new base class for meta](https://github.com/dojo/framework/pull/203)

A new base interface is used by the `meta` method on `WidgetBase`. It is unlikely that this change will impact most application code bases.

However, when upgrading to Dojo 5, if you experience compilation errors related to `WidgetMetaBase` you will likely need to switch this interface with the new base, `MetaBase`, from `@dojo/framework/interfaces`.
