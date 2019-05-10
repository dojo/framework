# Creating Bundles

A bundle is a portion of code that represents a slice of functionality. Bundles can be loaded asynchronously on demand and in parallel. An application that is appropriately bundled can be significantly more responsive and require fewer kilobytes and less load time than an application that does not use any kind of code splitting. This is especially important when working with large applications where much of the presentation logic isn't needed on the initial load.

Dojo tries to make intelligent choices by using routes and outlets to automatically split code into smaller bundles. In general these bundles should all have code that is related and relevant. This comes for free as part of the build system and doesn't require any additional thought to use. However, for those with specific bundling needs Dojo also allows for bundles to be explicitly defined in the `.dojorc` configration file.

By default a Dojo application only creates a single application bundle. However, there are a number of configuration options provided by [@dojo/cli-build-app]() that will help break down an application into smaller portions that can be progressively loaded.

## Automatic bundling using routes

By default Dojo will create bundles based on the routes used by your application. In order to do this several rules must be followed.

1.  `src/routes.ts` must have a default export containing the routing configuration
1.  Widgets must be the default export of their module
1.  `Outlet`s `render` function must use inline functions

> src/routes.ts

```ts
export default [
	{
		path: 'home',
		outlet: 'home',
		defaultRoute: true
	},
	{
		path: 'about',
		outlet: 'about'
	},
	{
		path: 'profile',
		outlet: 'profile'
	}
];
```

> src/App.ts

```ts
export default class App extends WidgetBase {
	protected render() {
		return v('div', { classes: [css.root] }, [
			w(Menu, {}),
			v('div', [
				w(Outlet, { key: 'home', id: 'home', renderer: () => w(Home, {}) }),
				w(Outlet, { key: 'about', id: 'about', renderer: () => w(About, {}) }),
				w(Outlet, { key: 'profile', id: 'profile', renderer: () => w(Profile, { username: 'Dojo User' }) })
			])
		]);
	}
}
```

The output will result in a separate bundle for each of the application's top level routes. In this example, there will be a main application bundle and bundles for `src/Home`, `src/About`, and `src/Profile`.

To see automatic bundling in action create a new application using [@dojo/cli-create-app]() and run `npm run build`. Dojo will automatically create bundles along the various routes in the sample application.

## Manually specifying bundles

Bundles may be manually specified in the `.dojorc` configuration file. This can be useful for breaking down an application into smaller bundles when automatic route bundling isn't sufficient.

The `bundles` feature is part of the build app command. The configuration is comprised of a map of bundle names followed by a list of files or globs to match.

For example, this configuration will bundle `About` and `Profile` together in a bundle named `additional.[hash].js`. Widget modules defined used with `w()` will be automatically converted to a lazily imported, local registry item in the parent widget. This provides a mechanism for declarative code splitting in your application.

> .dojorc

```json
{
	"build-app": {
		"bundles": {
			"additional": ["src/widgets/About", "src/widgets/Profile"]
		}
	}
}
```

If we wanted to create nls internationalization modules by locale we could use globs to ensure all files under each language directory are included.

> .dojorc

```json
{
	"build-app": {
		"bundles": {
			"fr": ["src/**/nls/fr/**"],
			"de": ["src/**/nls/de/**"]
		}
	}
}
```

In this case Dojo will create bundles named `fr.[hash].js` and `de.[hash].js`. For more information see [Working with message bundles](/reference-guides/i18n/working-with-message-bundles) from the Internationalization reference guide.

## Bundling considerations

<!-- TODO I am not confident in what I am saying here. Under what conditions will duplication of common/shared resources occur? How do we avoid this? Can we define a bundle for common widgets? -->

Under the covers Dojo uses Webpack with a number of custom plugins to provide intelligent application bundling. However, sometimes decisions made by the build tool or manually defined in `.dojorc` can create duplication of common resources shared by multiple bundles. Some of this is unavoidable. A good general rule of thumb for avoid duplication is to try to ensure that common code is at the outermost edges of your dependency tree. In other words, minimize dependencies as much as possible among shared code. If a significant amount of code may be shared among bundles (e.g. common widgets) consider bundling these assets together.

# Assets and Externals

## Assets

Many assets like CSS and images will be imported by modules and inlined automatically by the build process. However, sometimes it is necessary to serve static assets like the favicon or video files.

Static assets can be added to an `assets/` directory at the project root. At build time, these assets are copied to an `assets/` directory along-side the built application.

The build also parses `src/index.html` for CSS, JavaScript, and image assets, hashes them and includes them in the output directory. A favicon can be added to `src` and referenced by `src/index.html`. The build will then hash the file and copy it to the output directory with a file name of `favicon.[hash].ico`.

## Externals

Non-modular libraries or standalone applications that cannot be bundled normally can be included in a Dojo application by providing an implementation of `require` or `define` when needed, and some configuration in the project's `.dojorc` file.

Configuration for external dependencies can be provided under the `externals` property of the `build-app` config. `externals` is an object with two allowed properties:

-   `outputPath`: An optional property specifying an output path to which files should be copied.

-   `dependencies`: A required array that defines which modules should be loaded via the external loader, and what files should be included in the build. Each entry can be one of two types:
    _ A string that indicates that this path, and any children of this path, should be loaded via the external loader.
    _ An object that provides additional configuration for dependencies that need to be copied into the built application. This object has the following properties:

| Property | Type                                                    | optional | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------- | ------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `from`   | `string`                                                | false    | A path relative to the root of the project specifying the location of the files or folders to copy into the build application.                                                                                                                                                                                                                                                                                                                                                                                                          |
| `to`     | `string`                                                | true     | A path that replaces `from` as the location to copy this dependency to. By default, dependencies will be copied to `${externalsOutputPath}/${to}` or `${externalsOutputPath}/${from}` if `to` is not specified. If there are any `.` characters in the path and it is a directory, it needs to end with a forward slash.                                                                                                                                                                                                                |
| `name`   | `string`                                                | true     | Either the module id or the name of the global variable referenced in the application source.                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `inject` | `string, string[], or boolean`                          | true     | This property indicates that this dependency defines, or includes, scripts or stylesheets that should be loaded on the page. If `inject` is set to `true`, then the file at the location specified by `to` or `from` will be loaded on the page. If this dependency is a folder, then `inject` can be set to a string or array of strings to define one or more files to inject. Each path in `inject` should be relative to `${externalsOutputPath}/${to}` or `${externalsOutputPath}/${from}` depending on whether `to` was provided. |
| `type`   | `'root' or 'umd' or 'amd' or 'commonjs' or 'commonjs2'` | true     | Force this module to a specific method of resolution. For AMD style require use `umd` or `amd`. For node style require use `commonjs`, and to access the object as a global use `root`                                                                                                                                                                                                                                                                                                                                                  |

As an example the following configuration will inject `src/legacy/layer.js` into the application page, inject the file that defines the `MyGlobal` global variable, declare that modules `a` and `b` are external and should be delegated to the external layer, and then copy the folder `node_modules/legacy-dep`, from which several files are injected. All of these files will be copied into the `externals` folder, which could be overridden by specifying the `outputPath` property in the `externals` configuration.

```json
{
	"build-app": {
		"externals": {
			"dependencies": [
				"a",
				"b",
				{
					"from": "node_modules/GlobalLibrary.js",
					"to": "GlobalLibrary.js",
					"name": "MyGlobal",
					"inject": true
				},
				{ "from": "src/legacy/layer.js", "to": "legacy/layer.js", "inject": true },
				{
					"from": "node_modules/legacy-dep",
					"to": "legacy-dep/",
					"inject": ["moduleA/layer.js", "moduleA/layer.css", "moduleB/layer.js"]
				}
			]
		}
	}
}
```

Types for any dependencies included in `externals` can be installed in `node_modules/@types`, like any other dependency.

Because these files are external to the main build, no versioning or hashing will be performed on files in a production build, with the exception
of the links to any `inject`ed assets. The `to` property can be used to specify a versioned directory to copy dependencies to in order to avoid different
versions of files being cached.

# Progressive Web Apps

<!-- TODO
-   Overview
    _ Benefits
    _ Better TTL/user experience \* Parts of a PWA (what makes a PWA a PWA)
-   PWA via Configuration
-   Custom Service Worker
-->

# Conditional code

<!-- TODO
-   Overview
    _ dojo/has
    _ Possible usage (IE11/mobile/node)
-   Configuration
-   Example
-->

# Build-time Rendering

<!-- TODO
-   Overview
    _ Code rendered during build time
    _ Bundling \* has('build-time-render') for conditional code
-->

# Ejecting

Ejecting is a non-reversible, one-way process that exports the underlying configuration files used by Webpack, Intern, and other projects used by `dojo` commands. Rarely, **if ever**, should you need to separate a project from its build tools. If the provided build tools fail to provide a needed feature or functionality the recommended approach is to fork the specific build command and add the additional functionality to the tool. The Dojo CLI was specifically designed to be modular in nature with this use case in mind.

To eject a project, use the `dojo eject` command. You will be prompted to ensure that you understand that this is a non-reversible action. The export process puts all of the exported configuration information from all of the installed dojo commands into a new `config` directory. The process will also install some additional dependencies that the project now requires.

The project is now configured to be managed as a webpack project. Changes can be made to the build configuration by altering `config/build-app/base.config.js`.

A build can then be triggered by running webpack's build command and providing the configuration. Further, the modes are specified using webpack's env flag (e.g., --env.mode=dev), defaulting to dist. You can run a build using webpack with:

> Command line

```bash
./node_modules/.bin/webpack --config=config/build-app/ejected.config.js --env.mode=[mode]
```
