# Standalone API

## Accessing locale message bundles
Once a [default language bundle](./bundles.md#default-language-module) has been imported, any locale-specific messages are accessed by passing the message bundle to the `i18n` function.

For example:
```ts
import i18n, { Messages } from '@dojo/framework/i18n/i18n';
import bundle from 'nls/main';

i18n(bundle, 'fr').then(function(messages: Messages) {
	console.log(messages.hello); // "Bonjour"
	console.log(messages.goodbye); // "Au revoir"
});
```

If an unsupported locale is passed to `i18n`, then the default messages are returned. Further, any messages not provided by the locale-specific bundle will also fall back to their defaults. As such, the default bundle should contain _all_ message keys used by any of the locale-specific bundles.

Alternatively, locale messages can be manually loaded by passing them to `setLocaleMessages`. This is useful for pre-caching locale-specific messages so that an additional HTTP request is not sent to load them. Locale-specific messages are merged with the default messages, so partial message bundles are acceptable:

```ts
import i18n, { setLocaleMessages } from '@dojo/framework/i18n/i18n';
import bundle from 'nls/main';

const partialMessages = { hello: 'Ahoj' };
setLocaleMessages(bundle, partialMessages, 'cz');

i18n(bundle, 'cz').then((messages) => {
	console.log(messages.hello); // "Ahoj"
	console.log(messages.goodbye); // "Goodbye" (defaults are used when not overridden)
});
```

Once locale dictionaries for a bundle have been loaded, they are cached and can be accessed synchronously via `getCachedMessages`:

```ts
import { getCachedMessages } from '@dojo/framework/i18n/i18n';
import bundle from 'nls/main';

const messages = getCachedMessages(bundle, 'fr');
console.log(messages.hello); // "Bonjour"
console.log(messages.goodbye); // "Au revoir"
```

`getCachedMessages` will look up the bundle's supported `locales` to determine whether the default messages should be returned. Locales are also normalized to their most specific messages. For example, if the 'fr' locale is supported, but 'fr-CA' is not, `getCachedMessages` will return the messages for the 'fr' locale:

```ts
import { getCachedMessages } from '@dojo/framework/i18n/i18n';
import bundle from 'nls/main';

const frenchMessages = getCachedMessages(bundle, 'fr-CA');
console.log(frenchMessages.hello); // "Bonjour"
console.log(frenchMessages.goodbye); // "Au revoir"

const madeUpLocaleMessages = getCachedMessages(bundle, 'made-up-locale');
console.log(madeUpLocaleMessages.hello); // "Hello"
console.log(madeUpLocaleMessages.goodbye); // "Goodbye"
```

If need be, bundle caches can be cleared with `invalidate`. If called with a bundle, only the messages for that particular bundle are removed from the cache. Otherwise, all messages are cleared:

```ts
import i18n, { getCachedMessages, invalidate } from '@dojo/framework/i18n/main';
import bundle from 'nls/main';

i18n(bundle, 'ar').then(() => {
	invalidate(bundle);
	console.log(getCachedMessages(bundle, 'ar')); // undefined
});
```

## Determining the Current Locale

The current locale can be accessed via the read-only property `i18n.locale`, which will always be either the locale set via [`switchLocale` (see below)](#changing-the-root-locale-and-observing-locale-changes)
 or the `systemLocale`.

The `systemLocale` is also read-only, and its value is determined by the current execution environment in the following manner:

Environment | Locale
---: | ---
Browser | User's default language setting
Node.js | The Node.js process's `LANG` environment variable.
Fallback | `en`

## Changing the Root Locale and Observing Locale Changes

The `switchLocale` method changes the root locale and notifies all consumers registered with `observeLocale`, which accepts a function that receives the new locale string as its sole argument. For example, suppose the system locale is `en-GB`:

```ts
import i18n, { observeLocale, switchLocale, systemLocale } from '@dojo/framework/i18n/i18n';
import bundle from 'nls/bundle';

// Register an event listener
observeLocale((locale: string) => {
	// handle locale change...
});

// Change the locale to German. The registered observer's callback will be called
// with the new locale.
switchLocale('de');

// The locale is again switched to German, but since the current root locale is
// already German, registered observers will not be notified.
switchLocale('de');

console.log(i18n.locale); // 'de'
console.log(systemLocale); // 'en-GB' (the system locale does not change with the root locale)
```
