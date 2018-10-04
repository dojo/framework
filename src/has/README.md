# has

Provides an API for expressing feature detection to allow developers to branch code based upon the
detected features. The features can also be asserted statically, thereby allowing integration into a build
optimization tool that can be used to create "dead" code branches which can be elided during a build
step. The `has` module is also capable of allowing conditional loading of modules with certain loaders.

-   [Features](#features)
    -   [Feature Branching](#feature-branching)
    -   [Included Features](#included-features)
    -   [Adding a Feature Test/Feature Detection](#adding-a-feature-testfeature-detection)
    -   [Conditional Module Loading](#conditional-module-loading)
    -   [Static Features](#static-features)

## Features

### Feature Branching

The most common use case is branching in code based upon a feature flag. `has()` essentially manages feature
flags. It returns the current value of a named feature that has been added to `has()` via `add()`.

-   If the value is a function, it will be evaluated (via `call(null)`) and the resulting value is returned.
-   If the value is a thenable (an object with a `then` method, like a Promise), `false` is returned until
    the thenable is resolved and a proper value can be returned.
-   If the feature flag has not been added to `has()`, a `TypeError` is thrown.

The `has()` module is the default export of the main module of the package.

For example:

```typescript
import has from '@dojo/framework/has';

if (has('host-browser')) {
	/* Browser Related Code */
} else {
	/* Non-Browser Related Code */
}
```

`has()` can be used in any conditional expression, like a ternary operator:

```typescript
function getArrayOrString(): number[] | string {
	return has('some-feature') ? [1, 2, 3] : '[ 1, 2, 3 ]';
}
```

### Included Features

Other Dojo packages leverage the `has()` package to express features that are then used within the package. Because
of this, there are very few features expressed in this foundational package. The intention is that this package is
used to enable a developer to express other features. The flags though that are included in this package are:

| Feature Flag   | Description                                                                                                                                                                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `debug`        | Provides a way to create a code path for code that is only usable when debugging or providing enhanced diagnostics that are not desired in a _production_ build. Defaults to `true` but should be configured statically as `false` in production builds. |
| `host-browser` | Determines if the current environment contains a `window` and `document` object in the global context, therefore it is generally safe to assume the code is running in a browser environment.                                                            |
| `host-node`    | Attempts to detect if the environment appears to be a node environment.                                                                                                                                                                                  |

### Adding a Feature Test/Feature Detection

The main module of the package exports a function named `add()` which allows the addition of features flags. The feature
tests can be expressed as a static value, a function which will be lazily evaluated when the feature flag is first
requested from `has()`, or a thenable. Once evaluated, the value is cached.

An example of adding a feature:

```typescript
import { add } from '@dojo/framework/has';

add('my-feature', true);
add('my-lazy-feature', () => {
	/* will not be called yet */
	return true;
});
add(
	'my-promise',
	new Promise((resolve) => {
		// start some asynchronous task
		resolve(true);
	})
);

if (has('my-lazy-feature')) {
	/* feature function called here */
	/* do something */
}
```

If a feature flag is already added, the value can be overridden by supplying `true` as the 3rd argument of the `add()`
function:

```typescript
add('my-feature', false, true);
```

The module also has an `exists()` function which returns `true` if the feature flag has been added to `has()`:

```typescript
import { exists, add } from '@dojo/framework/has';

if (!exists('my-feature')) {
	add('my-feature', false);
}
```

Note that if a thenable is passed to `add`, `exists` and `has` will return `false` until the thenable is resolved and a
proper value can be returned.

### Conditional Module Loading

When using an AMD loader that supports loader plugins (such as [`@dojo/loader`](https://github.com/dojo/loader)) then
`@dojo/framework/has` can be used to conditionally load modules or substitute one module for another. The module ID is specified
using the plugin syntax followed by the feature flag and a ternary operator of what to do if the feature is _truthy_
or _falsey_:

```typescript
import foo from '@dojo/framework/has!host-browser?foo/browser:foo/node';

/* foo is now the default export from either `foo/browser` or `foo/node` */
```

The module IDs supplied in the ternary operator can be specified as absolute MIDs or relative MIDs based on the loading
module, just as if you were directly importing the module.

When using TypeScript, TypeScript will not be able to automatically resolve the module shape, therefore you will often
have to make a global declaration of the module that is in the scope of the project where the module name matches the
full MID you will be importing:

```typescript
declare module '@dojo/framework/has!host-browser?foo/browser:foo/node' {
	export * from 'foo/browser'; /* Assumes that foo/browser and foo/node have the same shape */
}
```

### Static Features

Features can also be defined statically, before the module is loaded, in the global scope. The main use case is when
it is not desirable to detect these features from the environment (because they may not be accurate, for example when using
a build tool). The features can only be specified before the module is loaded for the first time and cannot be
changed once the module is loaded. The values specified in the static features will _always_ be returned from `has()`
irrespective of how those features are subsequently defined using `add()`, even if an `override` is specified. In addition,
if a value is being added via `add()` that is already defined as a static feature, it will still complete and not throw.
If specified as a function, the function will never be invoked.

To specify the features, the global variable `DojoHasEnvironment` needs to be specified with a property of `staticFeatures`
which is a simple map of the features:

```typescript
window.DojoHasEnvironment = {
	staticFeatures: {
		'host-node': true,
		'host-browser': false,
		'my-feature': 2
	}
};
```

`staticFeatures` can also be specified as a function, which returns a map of the features:

```typescript
window.DojoHasEnvironment = {
	staticFeatures: function() {
		return { 'host-node': true, 'host-browser': false, 'my-feature': 2 };
	}
};
```

This function will be run once when the module is loaded and the values returned from the function will be used as the
static features.

<!-- doc-viewer-config
{
	"api": "docs/has/api.json"
}
