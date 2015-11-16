# has

## Detecting Features

The default export of `dojo-core/has` is a function which accepts a single parameter: the name of the feature to test for.
If the feature is available, a truthy value is returned, otherwise a falsy value is returned:

```ts
import has from 'dojo-core/has';

if (has('dom-addeventlistener')) {
    element.addEventListener('click', function () { /* ... */ });
}
```

## Adding Feature Detections

It's important to be able to add new feature tests that aren't provided out-of-the-box by `dojo-core/has`.
This can be done easily by using the `add` function exported by the `has` module. It accepts two parameters:
the name of the feature, and either an immediate value indicating its availability or a function that resolves to a
value.

When a function is passed, the feature will be lazily evaluated - i.e. the function is not executed until the feature is
actually requested. The return value is then cached for future calls for the same feature.

```ts
import { add as hasAdd } from 'dojo-core/has';
hasAdd('dom-queryselector', 'querySelector' in document && 'querySelectorAll' in document);

// Lazily executed; useful if a polyfill is loaded after page load
hasAdd('typedarray', function () {
    return 'ArrayBuffer' in window;
});
```

## Accessing the Feature Cache

`dojo-core/has` maintains object hashes containing keys that correspond to all features that have been both
registered _and_ requested. The value associated with each feature name key corresponds to that feature's availability
in the current environment. The object hash containing evaluated features is accessible via the `cache` export.
