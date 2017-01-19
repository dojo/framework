# load

## Module Exports

### isPlugin - tests a value to determine whether is a plugin (an object with a `load` method)

```ts
import { isPlugin } from 'src/load';

// true
isPlugin({
	load() {}
	normalize() {}
});

isPlugin(1); // false
isPlugin([]); // false
isPlugin([]); // false
// false
isPlugin({
	observer() {}
});

```

### load - dynamically loads a module or other resource

```ts
import load, { useDefault } from 'src/load';

// Load a single module
load('mymodule').then(([ myModule ]: [ any ]) => {
	// ...
});

// Load multiple modules
load('namespace/first', 'namespace/second').then(([ first, second ]: [ any, any ]) => {
	// ...
});

// Load modules with relative ids as relative to the current module
load(require, './first', './second').then(([ first, second ]: [ any, any ]) => {
	// ...
});

// Automatically map modules to their default export
load('namespace/first').then(useDefault).then(([ first ]: [ any ]) => {
	// ...
});

// Load a custom resource via a plugin
load(require, 'plugin!./template.html').then(([ html ]: [ string ]) => {
	// ...
});

```

#### Using Plugins

AMD-style plugins can be used with `load` by passing in module ids with the format `{pluginId}!{resourceId}`. First, the plugin will be loaded, and then the resource id (the string that follows the `!` in the mid passed to `core/load`) will be normalized and passed to the plugin's `load` method. If the plugin module does not actually have a `load` method, then the resource id is ignored, and the module is returned as-is. Plugins can also expose an optional `normalize` method that is passed the resource id and a resolver method (which will be either `require.toUrl`, `require.resolve`, or an identity function, depending on the environment). Note that if no `normalize` method is provided, then the provided resource id will be resolved using `require.toUrl` or `require.resolve`, depending on the environment. Again, if the plugin module has a default export, the `normalize` method MUST exist on that object.

Note: the plugins that can be used with `load` loosely follow the [amdjs plugin API](https://github.com/amdjs/amdjs-api/blob/master/LoaderPlugins.md), with the following exceptions:

1. The plugin's `load` method does not receive a contextual `require` or a configuration object.
2. Rather than execute a callback when the resource has loaded, the plugin's `load` method instead must return a promise that resolves to that resource.

```ts
// Plugin that does not use the default export.
import { Load } from 'src/load';

export function normalize(resourceId: string, resolver: (id: string) => string): string {
	return resolver(resourceId);
}

export function load(resourceId: string, load: Load) {
	// This plugin does nothing more than load the resource id with `core/load`.
	return load(resourceId);
}

```

```ts
// The same plugin, but using the default export
import { Load } from 'src/load';

const plugin = {
	normalize(resourceId: string, resolver: (id: string) => string): string {
		return resolver(resourceId);
	},

	load(resourceId: string, load: Load) {
		// This plugin does nothing more than load the resource id with `core/load`.
		return load(resourceId);
	}
};
export default plugin;

```

```ts
import load from 'src/load';

// 1. The module with the id `plugin` is loaded.
// 2. If `plugin` is not actually a plugin, then `plugin` itself is returned.
// 3. If the plugin has a normalize method, then "some/resource/id" is passed to it,
//    and the return value is used as the resource id.
// 4. The resource id is passed to the plugin's `load` method.
// 5. The loaded resource is used to resolve the `load` promise.
load('plugin!some/resource/id').then(([ resource ]: [ any ]) => {
	// ...
});

```
