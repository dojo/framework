# Version 4.0.0 Migration Guide

Hot on the heals of the 3.0.0 release, 4.0.0 is here will some breaking changes that you're going to want to know about!

As with the previous release, we've updated `@dojo/cli-upgrade-app` CLI command to help you through the upgrade process and automate as much as possible. Where it is not possible to automate the upgrade, you should receive helpful information in the output that indicates what needs to be manually upgraded and in which module.

To install the command run the following from the project root:

```
npm install @dojo/cli-upgrade-app --no-save
```

To perform the migration, run the following command from the project root:

```
dojo upgrade app --from 3
```

If you are upgrading from a version before 3.0.0, you can use `--from 2` and the command will first upgrade to 3.0.0 before continuing with the upgrade for 4.0.0. See the [previous migration guide](./V3-Migration-Guide) for more details.

If the project is using @dojo/widgets and @dojo/interop, these require upgrading to version 4.0.0. These packages get upgraded by running `npm upgrade` in the project root.

It is also recommended to run `dojo version --outdated` to check for outdated cli commands.

**Note:** The migration tool may create line lengths that violate your projects linting rules, be sure to run your linter and manually fix violations.

### Breaking Changes:

#### [Core modules consolidation]()

The most obvious change with 4.0.0 is that we've tried to streamline the functionality provided by core, which resulted in most of the modules being removed. The upgrade tool will identify any uses of a core module that has been removed, copy the modules into your project and update imports to the local versions.

This means that you won't need to make any significant effort during the upgrade trying to replace or rewrite areas that leveraged modules that have been removed.

// Example Output

#### [Routing Outlets]()

`Outlet` has been changed from a higher order component, to a standard widget that has accepts a render property to define what output when the outlet has matched.

Previously:

```ts
// outlet module
export default Outlet({ index: MyIndexWidget, main: MyMainWidget }, 'outlet-id', { mapParams: (matchDetails) => {
	return {
		id: matchDetails.param.id
	};
} });

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

We feel the using a standard widget with a render property provides the end user more flexibility

### A new way to build your test bundles





