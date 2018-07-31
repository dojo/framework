# Version 3.0.0 Migration Guide

As part of version 3.0.0 eight packages (dojo/has, dojo/shim, dojo/core, dojo/i18n, dojo/widget-core, dojo/routing, dojo/stores and dojo/test-extras) have been consolidated into a new package called @dojo/framework.

To facilitate a friction free upgrade process there as a migration command `@dojo/cli-upgrade-app` that should automatically update all import paths to point to the new framework package.

To install the command run the following from the project root:

```
npm install @dojo/cli-upgrade-app --no-save
```

To perform the migration, run the following command from the project root:

```
dojo upgrade app
```

You will be prompted to make sure that you want to continue as the changes are irreversible, once executed. The output from the migration tool should return the files scanned and changed

```
Processing 49 files...
Spawning 7 workers...
Sending 7 files to free worker...
Sending 7 files to free worker...
Sending 7 files to free worker...
Sending 7 files to free worker...
Sending 7 files to free worker...
Sending 7 files to free worker...
Sending 7 files to free worker...
All done.
Results:
0 errors
27 unmodified
0 skipped
22 ok
Time elapsed: 0.677seconds
```

At this point the project is ready to have the old @dojo dependencies removed and the new @dojo/framework installed. The commands for doing this is included in the migration tools output.

```
Upgrade complete, you can now add the new dojo/framework dependency and safely remove deprecated dependencies with the following:

install the dojo framework package:
    npm install @dojo/framework
remove legacy packages:
    npm uninstall -S -D @dojo/core @dojo/has @dojo/i18n @dojo/widget-core @dojo/routing @dojo/stores @dojo/shim @dojo/test-extras
```

**Note:** Dependencies on `@dojo/widgets` and `@dojo/interop` also need to be upgraded to version `3.0.0`, this can be done by running `npm upgrade` in the project root.

### Other notable changes:

#### Evergreen builds by default

The default value of the `legacy` flag in `@dojo/cli-build-app` has been changed from `true` to `false`. If the project needs to support IE11 then the legacy flag will need to be passed on the command line or saved in the projects `.dojorc` file.

To run the build in `legacy` mode use the `--legacy true` on the command line.

If you do not have a `.dojorc` file run `dojo init` from the root of your projects directory and then edit the file with the following contents

```json
{
	"build-app": {
		"legacy": true
	}
}
```

