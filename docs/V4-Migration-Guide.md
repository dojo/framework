# Version 4.0.0 Migration Guide

Hot on the heels of the 3.0.0 release, 4.0.0 is here with some impressive new features but also some breaking changes of which you should be aware!

As with the previous release, we've updated `@dojo/cli-upgrade-app` CLI command to help you through the upgrade process and automate as much as possible. Where it is not possible to automate the upgrade, you should receive helpful information in the output that indicates what needs to get manually upgraded and in which module.

To install the upgrade command, run the following from the project root:

```
npm install @dojo/cli-upgrade-app --no-save
```

To perform the migration, run the following command from the project root. The migrations tool should automatically detect the necessary migration from your `package.json`.

```
dojo upgrade app
```

If you are upgrading from a version before 3.0.0, please see the [previous migration guide](./V3-Migration-Guide) for more details first.

-   The `@dojo/cli` should be updated to version 4.0.0, along with all the commands used by the project.
-   If your project is using @dojo/widgets and @dojo/interop, these packages also require upgrading to version 4.0.0.

**Note:** The migration tool may create line lengths that violate your projects linting rules, be sure to run your linter and manually fix any linting rule violations.

### Breaking Changes:

#### [Goodbye `ProjectorMixin()`](https://github.com/dojo/framework/pull/58)

As part of the new virtual dom implementation, we've removed the `ProjectorMixin`. The `ProjectorMixin` has been one of the more confusing aspects within dojo, especially due to the need to create an instance. The previous use of ProjectorMixin was fundamentally different to how widgets were used everywhere else in the framework. The new approach using the vdom `renderer` with the `w()` pragma is now more straightforward and consistent.

**v3.0.0**

```ts
import ProjectorMixin from '@dojo/framework/widget-core/mixins/Projector';

import MyApp from './MyApp';

const Projector = ProjectorMixin(MyApp);
const projector = new Projector();

projector.setProperties({ foo: 'foo' });

projector.append();
```

**v4.0.0**

```ts
import renderer from '@dojo/framework/widget-core/vdom';
import { w } from '@dojo/framework/widget-core/d';

import MyApp from './MyApp';

const r = renderer(() => w(MyApp, { foo: 'foo' }));
r.mount();
```

#### [Core modules consolidation](https://github.com/dojo/framework/pull/53)

The most obvious change with 4.0.0 is that we've tried to streamline the functionality provided by core, which resulted in most of the modules being removed. The upgrade tool will identify any uses of a core module that has been removed, copy the modules into your project and update imports to the local versions.

The local copying of modules means that you won't need to make any significant effort during the upgrade trying to replace or rewrite areas that leveraged defunct modules. These modules are copied into a `dojo` directory inside your project's `src` directory.

```shell
ℹ Running transform: Move deleted core dependencies into codebase


✔  transform complete.
0 Errors 1 OK 0 Skipped 7 Unchanged
```

#### [A new home for `has`](https://github.com/dojo/framework/pull/53)

The `has` module from `@dojo/framework/core/has` has been moved to `@dojo/framework/has/preset`.

**v3.x**

```ts
import has from '@dojo/framework/core/has';
```

**v4.x**

```ts
import has from '@dojo/framework/has/preset';
```

#### [Routing Outlets](https://github.com/dojo/framework/pull/63)

`Outlet` has been changed from a higher order component to a standard widget that accepts a render property to define what output when the outlet has matched.

**v3.x**

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
		return w(MyOutlet, {});
	}
}
```

**v4.x**

```ts
class MyWidget extends WidgetBase {
	render() {
		return w(Outlet, {
			id: 'outlet-id',
			renderer: (matchDetails) => {
				if (matchDetails.isExact()) {
					return w(MyIndexWidget, { id: matchDetails.params.id });
				}
				return w(MyMainWidget, { id: matchDetails.params.id });
			}
		});
	}
}
```

We feel that using a standard widget with a render property provides the end user with more flexibility to meet all of an application's outlet routing needs!

#### [Static Routing Configuration](https://github.com/dojo/framework/pull/98)

Along with the changes to `Outlet`, 4.0.0 removes the `onEnter` and `onExit` properties from the routing configuration.

The motivation behind this change is to make the route configuration more static and discourage the use of dynamic logic or introduction of side effects. In the long term, this will allow Dojo to statically analyze route configuration and perform automatic code-splitting based on the routes during an application build.

Registering an action when an outlet is entered or exited is still possible by listening to an `outlet` event on the router instance.

```ts
router.on('outlet', (context, action) => {
	if (context.id === 'my-outlet' && action === 'enter') {
		// do something when `my-outlet` is entered.
	}
});
```

#### [A new way to build your test bundles](https://github.com/dojo/cli-build-app/pull/166)

To ensure that unit and functional test bundles get created correctly, we have split the single test mode into separate unit and functional modes. The existing test mode still exists but will only build the unit bundle as of 4.0.0. We recommend moving to the explicit build modes as test will get removed in the next major release.

##### Building the unit test bundle

```shell
dojo build app --mode unit
```

##### Building the functional test bundle

```shell
dojo build app --mode functional
```
