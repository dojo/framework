# Application Base Path

All of an application's links, images, and resources are served from an applications base path. By default, the base path is `/`, but the base path can be configured by adding the `base` option to the `.dojorc`.

> .dojorc

```json
{
	"build-app": {
		"base": "./some-directory/"
	}
}
```

## Not Hosted from Root

If a Dojo app is not served from the root of the web server, it may be necessary to change the base path. For example, if an app is served from `http://example.com/incredible-app`, update the base path to be `/incredible-app/`.

## Local Builds

Depending on the environment, it may be necessary to change the base path during a development build, but keep the default base path (or a different, custom, one) for production builds. Let's say that the development machine serves all content under `/var/www/html` , but several projects exist under that directory -so each project is served from a different subdirectory. It may make sense to serve an app from `/var/www/html/incredible-app/output/dev` when run locally.

To achieve this configuration, create a `.dojorc` file only for development.

> .dojorc.local

```json
{
	"build-app": {
		"base": "incredible-app/output/dev/"
	}
}
```

With this local development configuration in place, build the app using this configuration.

```shell
dojo build app --dojorc .dojorc.local -m dev
```

# Creating bundles

A bundle is a portion of code that represents a slice of functionality. Bundles can be loaded asynchronously on demand and in parallel. An application that is appropriately bundled can be significantly more responsive and require fewer kilobytes and less load time than an application that does not use any kind of code splitting. This is especially important when working with large applications where much of the presentation logic isn't needed on the initial load.

Dojo tries to make intelligent choices by using routes and outlets to automatically split code into smaller bundles. In general these bundles should all have code that is related and relevant. This comes for free as part of the build system and doesn't require any additional thought to use. However, for those with specific bundling needs Dojo also allows for bundles to be explicitly defined in the `.dojorc` configuration file.

By default a Dojo application only creates a single application bundle. However, there are a number of configuration options provided by [@dojo/cli-build-app](https://github.com/dojo/cli-build-app) that will help break down an application into smaller portions that can be progressively loaded.

## Automatic bundling using routes

By default Dojo will create bundles based on an application's routes. In order to do this several rules must be followed.

1.  `src/routes.ts` must have a default export containing the routing configuration
2.  Widgets must be the default export of their module
3.  `Outlet`s `render` function must use inline functions

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

```tsx
export default class App extends WidgetBase {
	protected render() {
		return (
			<div classes={[css.root]}>
				<Menu />
				<div>
					<Outlet key="home" id="home" renderer={() => <Home />} />
					<Outlet key="about" id="about" renderer={() => <About />} />
					<Outlet key="profile" id="profile" renderer={() => <Profile username="Dojo User" />} />
				</div>
				w(Menu, {}),
			</div>
		);
	}
}
```

The output will result in a separate bundle for each of the application's top level routes. In this example, there will be a main application bundle and bundles for `src/Home`, `src/About`, and `src/Profile`.

To see automatic bundling in action create a new application using [@dojo/cli-create-app](https://github.com/dojo/cli-create-app/) and run `npm run build`. Dojo will automatically create bundles along the various routes in the sample application.

## Manually specifying bundles

Bundles can be manually specified in the `.dojorc` configuration file, providing a mechanism for declarative code splitting within an application. This can be useful for breaking down an application into smaller bundles when automatic route bundling isn't sufficient.

The `bundles` feature is part of the build app command. The configuration is comprised of a map of bundle names followed by a list of files or globs to match.

For example, this configuration will bundle `About` and `Profile` together in a bundle named `additional.[hash].js`. Widget modules defined used with `w()` will be automatically converted to a lazily imported, local registry item in the parent widget.

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

In this case Dojo will create bundles named `fr.[hash].js` and `de.[hash].js`. For more information see [Working with message bundles](/learn/i18n/working-with-message-bundles) from the Internationalization reference guide.

## Bundling considerations

<!-- TODO I am not confident in what I am saying here. Under what conditions will duplication of common/shared resources occur? How do we avoid this? Can we define a bundle for common widgets? Should I talk about the [bundle analyzer](https://github.com/dojo/cli-build-app/blob/master/README.md#bundle-analyzer) -->

Sometimes decisions made by the build tool or manually defined in `.dojorc` can create duplication of common resources shared by multiple bundles. Some of this is unavoidable. A good general rule of thumb for avoid duplication is to try to ensure that common code is at the outermost edges of an application's dependency tree. In other words, minimize dependencies as much as possible among shared code. If a significant amount of code may be shared among bundles (e.g. common widgets) consider bundling these assets together.

# Static assets

Many assets like CSS and images will be imported by modules and inlined automatically by the build process. However, sometimes it is necessary to serve static assets like the favicon or video files.

Static assets can be added to an `assets/` directory at the project root. At build time, these assets are copied to an `assets/` directory along-side the built application.

The build also parses `src/index.html` for CSS, JavaScript, and image assets, hashes them and includes them in the output directory. A favicon can be added to `src` and referenced by `src/index.html`. The build will then hash the file and copy it to the output directory with a file name of `favicon.[hash].ico`.

# Progressive web applications

Progressive web apps (PWAs) are made up of a collection of technologies and patterns that improve the user experience and help create a more reliable and usable application. Mobile users in particular will see the application as more integrated into their device similar to an installed app.

The core of a progressive web app is made up of two technologies: Service workers and a manifest. Dojo's build command supports both of these through `.dojorc` with the `pwa` object.

## Manifest

The [manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest) describes an application in a JSON file and provides details so it may be installed on a device's homescreen directly from the web.

> .dojorc

```json
{
	"build-app": {
		"pwa": {
			"manifest": {
				"name": "Todo MVC",
				"description": "A simple to-do application created with Dojo",
				"icons": [
					{ "src": "./favicon-16x16.png", "sizes": "16x16", "type": "image/png" },
					{ "src": "./favicon-32x32.png", "sizes": "32x32", "type": "image/png" },
					{ "src": "./favicon-48x48.png", "sizes": "48x48", "type": "image/png" },
					{ "src": "./favicon-256x256.png", "sizes": "256x256", "type": "image/png" }
				]
			}
		}
	}
}
```

When a manifest is provided `dojo build` will inject the necessary `<meta>` tags in the applications `index.html`.

-   `mobile-web-app-capable="yes"`: indicates to Chrome on Android that the application can be added to the user's homescreen.
-   `apple-mobile-web-app-capable="yes"`: indicates to iOS devices that the application can be added to the user's homescreen.
-   `apple-mobile-web-app-status-bar-style="default"`: indicates to iOS devices that the status bar should use the default appearance.
-   `apple-touch-icon="{{icon}}"`: the equivalent of the manifests' icons since iOS does not currently read icons from the manifest. A separate meta tag is injected for each entry in the icons array.

## Service worker

A service worker is a type of web worker that is able to intercept network requests, cache, and provide resources. Dojo's build command can automatically build fully-functional service worker that is activated on startup and complete with precaching and custom route handling from a configuration file.

For instance, we could write a configuration to create a simple service worker that cached all of the application bundles except the admin bundle and cached recent application images and articles.

> .dojorc

```json
{
	"build-app": {
		"pwa": {
			"serviceWorker": {
				"cachePrefix": "my-app",
				"excludeBundles": ["admin"],
				"routes": [
					{
						"urlPattern": ".*\\.(png|jpg|gif|svg)",
						"strategy": "cacheFirst",
						"cacheName": "my-app-images",
						"expiration": { "maxEntries": 10, "maxAgeSeconds": 604800 }
					},
					{
						"urlPattern": "http://my-app-url.com/api/articles",
						"strategy": "cacheFirst",
						"expiration": { "maxEntries": 25, "maxAgeSeconds": 86400 }
					}
				]
			}
		}
	}
}
```

### ServiceWorker configuration

Under the hood, the `ServicerWorkerPlugin` from `@dojo/webpack-contrib` is used to generate the service worker, and all of its options are valid `pwa.serviceWorker` properties.

| Property       | Type       | Optional | Description                                                                                     |
| -------------- | ---------- | -------- | ----------------------------------------------------------------------------------------------- |
| bundles        | `string[]` | Yes      | An array of bundles to include in the precache. Defaults to all bundles.                        |
| cachePrefix    | `string`   | Yes      | The prefix to use for the runtime precache cache.                                               |
| clientsClaim   | `boolean`  | Yes      | Whether the service worker should start controlling clients on activation. Defaults to `false`. |
| excludeBundles | `string[]` | Yes      | An array of bundles to include in the precache. Defaults to `[]`.                               |
| importScripts  | `string[]` | Yes      | An array of script paths that should be loaded within the service worker                        |
| precache       | `object`   | Yes      | An object of precache configuration options (see below)                                         |
| routes         | `object[]` | Yes      | An array of runtime caching config objects (see below)                                          |
| skipWaiting    | `boolean`  | Yes      | Whether the service worker should skip the waiting lifecycle                                    |

#### Precaching

The `precache` option can take the following options to control precaching behavior:

| Property     | Type                   | Optional | Description                                                                                                                                                    |
| ------------ | ---------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| baseDir      | `string`               | Yes      | The base directory to match `include` against.                                                                                                                 |
| ignore       | `string[]`             | Yes      | An array of glob pattern string matching files that should be ignored when generating the precache. Defaults to `[ 'node_modules/**/*' ]`.                     |
| include      | `string` or `string[]` | Yes      | A glob pattern string or an array of glob pattern strings matching files that should be included in the precache. Defaults to all files in the build pipeline. |
| index        | `string`               | Yes      | The index filename that should be checked if a request fails for a URL ending in `/`. Defaults to `'index.html'`.                                              |
| maxCacheSize | `number`               | Yes      | The maximum size in bytes a file must not exceed to be added to the precache. Defaults to `2097152` (2 MB).                                                    |
| strict       | `boolean`              | Yes      | If `true`, then the build will fail if an `include` pattern matches a non-existent directory. Defaults to `true`.                                              |
| symlinks     | `boolean`              | Yes      | Whether to follow symlinks when generating the precache. Defaults to `true`.                                                                                   |

#### Runtime caching

In addition to precaching, strategies can be provided for specific routes to determine whether and how they can be cached. This `routes` option is an array of objects with the following properties:

| Property              | Type     | Optional | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------- | -------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| urlPattern            | `string` | No       | A pattern string (which will be converted a regular expression) that matches a specific route.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| strategy              | `string` | No       | The caching strategy (see below).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| options               | `object` | Yes      | An object of additional options, each detailed below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| cacheName             | `string` | Yes      | The name of the cache to use for the route. Note that the `cachePrefix` is _not_ prepended to the cache name. Defaults to the main runtime cache (`${cachePrefix}-runtime-${domain}`).                                                                                                                                                                                                                                                                                                                                                                            |
| cacheableResponse     | `object` | Yes      | Uses HTTP status codes and or headers to determine whether a response can be cached. This object has two optional properties: `statuses` and `headers`. `statuses` is an array of HTTP status codes that should be considered valid for the cache. `headers` is an object of HTTP header and value pairs; at least one header must match for the response to be considered valid. Defaults to `{ statuses: [ 200 ] }` when the `strategy` is `'cacheFirst'`, and `{ statuses: [0, 200] }` when the `strategy` is either `networkFirst` or `staleWhileRevalidate`. |
| expiration            | `object` | Yes      | Controls how the cache is invalidated. This object has two optional properties. `maxEntries` is the number of responses that can be cached at any given time. Once this max is exceeded, the oldest entry is removed. `maxAgeSeconds` is the oldest a cached response can be in seconds before it gets removed.                                                                                                                                                                                                                                                   |
| networkTimeoutSeconds | `number` | Yes      | Used with the `networkFirst` strategy to specify how long in seconds to wait for a resource to load before falling back on the cache.                                                                                                                                                                                                                                                                                                                                                                                                                             |

Four routing strategies are currently supported:

-   `networkFirst` attempts to load a resource over the network, falling back on the cache if the request fails or times out. This is a useful strategy for assets that either change frequently or may change frequently (i.e., are not versioned).
-   `cacheFirst` loads a resource from the cache unless it does not exist, in which case it is fetched over the network. This is best for resources that change infrequently or can be cached for a long time (e.g., versioned assets).
-   `networkOnly` forces the resource to always be retrieved over the network, and is useful for requests that have no offline equivalent.
-   `staleWhileRevalidate` requests resources from both the cache and the network simulaneously. The cache is updated with each successful network response. This strategy is best for resources that do not need to be continuously up-to-date, like user avatars. However, when fetching third-party resources that do not send CORS headers, it is not possible to read the contents of the response or verify the status code. As such, it is possible that a bad response could be cached. In such cases, the `networkFirst` strategy may be a better fit.

# Build-time rendering

Build-time rendering (BTR) renders a route to HTML during the build process and in-lines critical CSS and assets needed to display the initial view. This allows Dojo to pre-render the initial HTML used by a route and inject it directly into the page immediately, resulting in many of the same benefits of server side rendering (SSR) such as performance gains and search engine optimization without the complexities of SSR.

## Using BTR

First make sure `index.html` includes a DOM node with an `id` attribute. This node will be used by Dojo's virtual DOM to compare and render the application's HTML. BTR requires this setup so it can render the HTML generated at build time. This creates a very fast and responsive initial rendering of the route.

> index.html

```html
<!DOCTYPE html>
<html lang="en-us">
	<head>
		<title>sample-app</title>
		<meta name="theme-color" content="#222127" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
	</head>
	<body>
		<div id="app"></div>
	</body>
</html>
```

The application should then be mounted to the specified DOM node:

> main.ts

```ts
const r = renderer(() => w(App, {}));
const domNode = document.getElementById('app') as HTMLElement;
r.mount({ registry, domNode });
```

The project's `.dojorc` configuration file should then be updated with the `id` of the root DOM node and routes to render at build time.

> .dojorc

```json
{
	"build-app": {
		"build-time-render": {
			"root": "app",
			"paths": [
				"#home",
				{
					"path": "#comments/9999",
					"match": ["#comments/.*"]
				}
			]
		}
	}
}
```

This configuration describes two routes. A `home` route and a more complex `comments` route. The `comments` route is a more complex route with parameter data. A `match` is used to make sure that the build-time HTML created for this route is applied to any route that matches the regular expression.

BTR generates a screenshot for each of the paths rendered during build in the `./output/info/screenshots` project directory.

### History manager

Build time rendering supports applications that use either the `@dojo/framework/routing/history/HashHistory` or `@dojo/framework/routing/history/StateHistory` history managers. When using `HashHistory`, ensure that all paths are prefixed with a `#` character.

## `build-time-render` feature flag

Build time rendering exposes a `build-time-render` feature flag that can be used to skip functionality that cannot be executed at build time. This can be used to avoid making `fetch` calls to external systems and instead provide static data that can be used to create an initial render.

```ts
if (has('build-time-render')) {
	const response = await fetch(/* remote JSON */);
	return response.json();
} else {
	return Promise.resolve({
		/* predefined Object */
	});
}
```

## Dojo Blocks

Dojo provides a blocks system which can execute code in Node.js as part of the build time rendering process. The results from the execution are written to a cache that can then be transparently used in the same way at runtime in the browser. This opens up new opportunities to use operations that might be not possible or perform poorly in a browser.

For example, a Dojo Block module could read a group of markdown files, transform them into VNodes, and make them available to render in the application, all at build time. The result of this Dojo Block module is then cached into the application bundle for use at runtime in the browser.

A Dojo Block module gets used like any middleware or meta in a Dojo widget. For the Dojo build system to be able to identify and run a block module there are three requirements that must be met:

1.  The module must have a `.block` suffix, for example `src/readFile.block.ts`.
1.  The Block must only have a single default export
1.  Return values from blocks (from a promise resolution or as an immediate return) must be serializable to json

Other than these requirements there is no configuration or alternative authoring pattern required.

For example, a block module could read a text file and return the content to the application.

> src/readFile.block.ts

```ts
import * as fs from 'fs';
import { resolve } from 'path';

export default (path: string) => {
	path = resolve(__dirname, path);
	return fs.readFileSync(path, 'utf8');
};
```

> src/widgets/MyBlockWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import block from '@dojo/framework/core/middleware/block';

import readFile from '../readFile.block';

const factory = create({ block });

export default factory(function MyBlockWidget({ middleware: { block } }) {
	const message = block(readFile)('../content/hello-dojo-blocks.txt');
	return <div>{message}</div>;
});
```

This widget runs the `src/readFile.block.ts` module at build time to read the contents of the given file to be used in the widget's render output.

# Conditional code

The build tool's static code analyzer is capable of removing dead code branches from the bundles it creates. Named conditional blocks are defined using Dojo framework's `has` module and can be statically set to true or false through `.dojorc` and removed at build time.

> main.ts

```ts
import has from '@dojo/framework/has';

if (has('production')) {
	console.log('Starting in production');
} else {
	console.log('Starting in dev mode');
}

export const mode = has('production') ? 'dist' : 'dev';
```

> .dojorc

```json
{
	"build-app": {
		"features": {
			"production": true
		}
	}
}
```

The above `production` feature will be set `true` for **production builds** (`dist` mode). The build system uses `@dojo/framework/has` to identify code as unreachable and remove those dead code branches from the build.

For example, the above code would be rewritten as:

> static-build-loader output

```js
import has from '@dojo/framework/has';

if (true) {
	console.log('Starting in production');
} else {
	console.log('Starting in dev mode');
}

export const mode = true ? 'dist' : 'dev';
```

The build tool's dead branch removal would then remove the unreachable code.

> Uglify output

```js
console.log('Starting in production');
export const mode = 'dist';
```

Any features which are not statically asserted, are not re-written. This allows the code to determine at run-time if the feature is present.

## Provided features

These features are provided by the build system to help identify a specific environment or mode of operation.

| Feature Flag        | Description                                                                                                                                                                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `debug`             | Provides a way to create a code path for code that is only usable when debugging or providing enhanced diagnostics that are not desired in a _production_ build. Defaults to `true` but should be configured statically as `false` in production builds. |
| `host-browser`      | Determines if the current environment contains a `window` and `document` object in the global context, therefore it is generally safe to assume the code is running in a browser environment.                                                            |
| `host-node`         | Attempts to detect if the environment appears to be a node environment.                                                                                                                                                                                  |
| `build-time-render` | Statically defined by the build-time rendering system during build-time rendering.                                                                                                                                                                       |

# Externals

Non-modular libraries or standalone applications that cannot be bundled normally can be included in a Dojo application by providing an implementation of `require` or `define` when needed, and some configuration in the project's `.dojorc` file.

Configuration for external dependencies can be provided under the `externals` property of the `build-app` config. `externals` is an object with two allowed properties:

-   `outputPath`: An optional property specifying an output path to which files should be copied.
-   `dependencies`: A required array that defines which modules should be loaded via the external loader, and what files should be included in the build. Each entry can be one of two types:
    -   A string that indicates that this path, and any children of this path, should be loaded via the external loader.
    -   An object that provides additional configuration for dependencies that need to be copied into the built application. This object has the following properties:

| Property | Type                                                    | Optional | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------- | ------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `from`   | `string`                                                | No       | A path relative to the root of the project specifying the location of the files or folders to copy into the build application.                                                                                                                                                                                                                                                                                                                                                                                                          |
| `to`     | `string`                                                | Yes      | A path that replaces `from` as the location to copy this dependency to. By default, dependencies will be copied to `${externalsOutputPath}/${to}` or `${externalsOutputPath}/${from}` if `to` is not specified. If there are any `.` characters in the path and it is a directory, it needs to end with a forward slash.                                                                                                                                                                                                                |
| `name`   | `string`                                                | Yes      | Either the module id or the name of the global variable referenced in the application source.                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `inject` | `string, string[], or boolean`                          | Yes      | This property indicates that this dependency defines, or includes, scripts or stylesheets that should be loaded on the page. If `inject` is set to `true`, then the file at the location specified by `to` or `from` will be loaded on the page. If this dependency is a folder, then `inject` can be set to a string or array of strings to define one or more files to inject. Each path in `inject` should be relative to `${externalsOutputPath}/${to}` or `${externalsOutputPath}/${from}` depending on whether `to` was provided. |
| `type`   | `'root' or 'umd' or 'amd' or 'commonjs' or 'commonjs2'` | Yes      | Force this module to a specific method of resolution. For AMD style require use `umd` or `amd`. For node style require use `commonjs`, and to access the object as a global use `root`                                                                                                                                                                                                                                                                                                                                                  |

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

Because these files are external to the main build, no versioning or hashing will be performed on files in a production build, with the exception of the links to any `inject`ed assets. The `to` property can be used to specify a versioned directory to copy dependencies to in order to avoid different versions of files being cached.

# Ejecting

<!-- TODO do we want to add any information from here: https://github.com/dojo/cli-build-app/blob/master/README.md#eject -->

The Dojo build pipeline provides an end-to-end tool chain for projects, however, in rare circumstances a custom toolchain may be required. Dojo allows this to happen by ejecting a project from the build pipeline.

Ejecting is a non-reversible, one-way process that exports the underlying configuration files used by Webpack, Intern, and other projects used by `dojo` commands. If the provided build tools fail to provide a needed feature or functionality the recommended approach is to fork the specific build command and add the additional functionality to the tool. The Dojo CLI was specifically designed to be modular in nature with this use case in mind.

To eject a project, use the `dojo eject` command - it will prompt to ensure acknowledgement that the process in non-reversible. The export process puts all of the exported configuration information from all of the installed dojo commands into a new `config` directory. The process will also install some additional dependencies that the project now requires.

The project is now configured to be managed as a webpack project. Changes can be made to the build configuration by altering `config/build-app/base.config.js`.

A build can then be triggered by running webpack's build command and providing the configuration. Further, the modes are specified using webpack's env flag (e.g., --env.mode=dev), defaulting to dist.

```bash
./node_modules/.bin/webpack --config=config/build-app/ejected.config.js --env.mode=[mode]
```
