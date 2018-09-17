# Version 4.0.0 Migration Guide

Hot on the heals of the 3.0.0 release, 4.0.0 is here with some awesome new features but also some breaking changes that you're going to want to know about!

As with the previous release, we've updated `@dojo/cli-upgrade-app` CLI command to help you through the upgrade process and automate as much as possible. Where it is not possible to automate the upgrade, you should receive helpful information in the output that indicates what needs to be manually upgraded and in which module.

To install the command run the following from the project root:

```
npm install @dojo/cli-upgrade-app --no-save
```

To perform the migration, run the following command from the project root, the migrations tool should automatically detected from your package.json` the migration that you need.

```
dojo upgrade app
```

If you are upgrading from a version before 3.0.0, please see the [previous migration guide](./V3-Migration-Guide) for more details first.

* The `@dojo/cli` should be updated to version 4.0.0, along with all the commands used by the project.
* If your project is using @dojo/widgets and @dojo/interop, these require upgrading to version 4.0.0.

**Note:** The migration tool may create line lengths that violate your projects linting rules, be sure to run your linter and manually fix violations.

### Breaking Changes:

#### [Goodbye Projector Mixin]()

As part of the new vdom, we've removed the `ProjectorMixin`. The `ProjectorMixin` has been one of the more confusing aspects within dojo, especially due to the need to create an instance. This is fundamentally different to how widgets were used everywhere else in the framework.

The `renderer` function from `vdom.ts` is now imported directly, which accepts a render function that returns DNodes using `w()` and `v()`. This is a familiar pattern as it mirrors how widgets and nodes are returned from a widget.

```ts

```

#### [Core modules consolidation](https://github.com/dojo/framework/pull/53)

The most obvious change with 4.0.0 is that we've tried to streamline the functionality provided by core, which resulted in most of the modules being removed. The upgrade tool will identify any uses of a core module that has been removed, copy the modules into your project and update imports to the local versions.

This means that you won't need to make any significant effort during the upgrade trying to replace or rewrite areas that leveraged modules that have been removed.

// Example Output

#### [Routing Outlets](https://github.com/dojo/framework/pull/63)

`Outlet` has been changed from a higher order component, to a standard widget that has accepts a render property to define what output when the outlet has matched.

Previously:

```ts
// outlet module
export default Outlet(
	{
		index: MyIndexWidget,
		main: MyMainWidget
	},
	'outlet-id',
	{
		mapParams: (matchDetails) => {
			return { id: matchDetails.param.id };
		}
	}
);

// widget module
import MyOutlet from './MyOutlet';

class MyWidget extends WidgetBase {
	render() {
		return w(MyOutlet, {})
	}
}
```

Now:

```ts
class MyWidget extends WidgetBase {
	render() {
		return w(Outlet, { id: 'outlet-id', renderer: (matchDetails) => {
			if (matchDetails.isExact()) {
				return w(MyIndexWidget, { id: matchDetails.params.id });
			}
			return w(MyMainWidget, { id: matchDetails.params.id });
		}});
	}
}
```

We feel the using a standard widget with a render property provides the end user more flexibility to meet all an application's needs!

### [Static Routing Configuration](https://github.com/dojo/framework/pull/98)

Along with the changes to `Outlet` we have removed the `onEnter` and `onExit` properties from the routing configuration.

The motivation behind this changes is to make the route configuration more static and discourage the use of any dynamic logic or side effects. Longer term this will allow dojo to static analyse a routes configuration and perform automatic code splitting based on the routes during an application build.

Registering an action when an outlet is entered or exited is still possible, to do so you need to listen to an `outlet` event on the router instance.

```ts
router.on('outlet', (context, action) => {
	if (context.id === 'my-outlet' && action === 'enter') {
		// do something when `my-outlet` is entered.
	}
});
```

### [A new way to build your test bundles](https://dojo.io/comingsoon.html)

To ensure that unit and functional test bundles are correctly created, we have had to split the single `test` mode into separate `unit` and `functional` modes. The existing `test` mode still exists but will only build the `unit` bundle from now on, but it is recommended to move to the explicit build modes as `test` will be removed in the next major release.

##### Building the unit test bundle

```shell
dojo build app --mode unit
```

##### Building the functional test bundle

```shell
dojo build app --mode functional
```




