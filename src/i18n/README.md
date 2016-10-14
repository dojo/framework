# dojo-i18n

An internationalization library that provides locale-specific message loading, and support for locale-specific message, date, and number formatting.

## Features

The examples below are provided in TypeScript syntax. The package does work under JavaScript, but for clarity, the examples will only include one syntax.

### Message Bundle Loading

`dojo-i18n` provides a means for loading locale-specific messages, and updating those messages when the locale changes. Each bundle has a default module that is `import`ed like any other TypeScript module. Locale-specific messages are then loaded via the `i18n` method. Every default bundle MUST provide a `bundlePath` that will be used to determine locale bundle locations, a `locales` array of supported locales, and a `messages` map of default messages. For example, suppose the module located at `nls/common.ts` contains the following contents:

```typescript
const bundlePath = 'nls/common';
const locales = [ 'fr', 'ar', 'ar-JO' ];
const messages = {
	hello: 'Hello',
	goodbye: 'Goodbye'
};

export default { bundlePath, locales, messages };
```

There are three things to note about the structure of default bundles. First, the `messages` object contains default messages for all keys used through the bundle. These messages are used as fallbacks for any messages not included in locale-specific bundles.

Second, the `locales` array indicates that the listed locales have corresponding directories underneath the parent directory. In the above example, the fact that "fr" (French) is supported indicates that the default bundle's parent directory also contains a `fr/common.ts` module (which would be represented by the module ID `nls/fr/common`). Alternatively, if the default messages were housed in the module ID `arbitrary/path/numbers.ts`, the corresponding "fr" messages would be expected at `arbitrary/path/fr/numbers.ts`.

Third, the `bundlePath` indicates where the bundle is located, using whichever module path format is understood by the underlying system loader (`global.require`, assumed to be the default `require` in Node, and the [Dojo 2 loader](https://github.com/dojo/loader/) in browser environments). The `bundlePath` is not only required, but also MUST be in the format `{basePath}{separator}{filename}` in order for the i18n system to correctly find locale-specific bundles.

Once the default bundle is in place, any locale-specific messages are loaded by passing the default bundle to the `i18n` function. The locale bundles expose their messages on their default exports:

```typescript
const messages = {
	hello: 'Bonjour',
	goodbye: 'Au revoir'
};
export default messages;
```

Using the previous example as the default bundle, any locale-specific messages are loaded as follows:

```typescript
import i18n, { Messages } from 'dojo-i18n/main';
import bundle from 'nls/common';

i18n(bundle, 'fr').then(function (messages: Messages) {
	console.log(messages.hello); // "Bonjour"
	console.log(messages.goodbye); // "Au revoir"
});
```

Alternatively, a context object with a `state` property can be used:


```typescript
import i18n, { LocaleContext, Messages } from 'dojo-i18n/main';
import bundle from 'nls/common';

const context = {
	state: { locale: 'fr' }
} as LocaleContext;

i18n(bundle, context).then(function (messages: Messages) {
	console.log(messages.hello); // "Bonjour"
	console.log(messages.goodbye); // "Au revoir"
});
```

If an unsupported locale is passed to `i18n`, then the default messages are returned. Further, any messages not provided by the locale-specific bundle will also fall back to their defaults. As such, the default bundle should contain _all_ message keys used by any of the locale-specific bundles.

### Determining the Current Locale

The current locale can be accessed via the read-only property `i18n.locale`, which will always be either the locale set via `switchLocale` (see below) or the `systemLocale`. `systemLocale` is always set to the user's default locale.

### Changing the Root Locale

The `switchLocale` method changes the root locale, and updates the state on all registered context objects that do not have a locale specified on their state. In the following example, two [Dojo 2 widgets](https://github.com/dojo/widgets) are registered, but only the second will be updated when the locale is switched since it does not have its own locale explicitly set.

```typescript
import i18n, { switchLocale } from 'dojo-i18n/i18n';
import createRenderMixin from 'dojo-widgets/mixins/createRenderMixin';
import bundle from 'nls/bundle';

const createCustomWidget = createRenderMixin
	.mixin({
		render() {
			return i18n(bundle, this).then(function (messages: Messages) {
				return messages.hello;
			});
		}
	});

// Rendered with "Bonjour".
const withLocale = createCustomWidget({
	state: { locale: 'fr' }
});
// Rendered with "Hello".
const withoutLocale = createCustomWidget();

// Change the locale to German. Since `withLocale` already has a specific locale,
// it will not be re-rendered. The second widget (`withoutLocale`), however, will be.
switchLocale('de');
```

### Custom message formatting (e.g., pluralization)

This is currently not provided, but will be added in the near future.

### Date and number formatting.

This is currently not provided, but will be added in the near future.

## How do I use this package?

TODO: Add appropriate usage and instruction guidelines

## How do I contribute?

We appreciate your interest!  Please see the [Guidelines Repository](https://github.com/dojo/guidelines#readme) for the
Contributing Guidelines and Style Guide.

## Testing

Test cases MUST be written using Intern using the Object test interface and Assert assertion interface.

90% branch coverage MUST be provided for all code submitted to this repository, as reported by istanbul’s combined coverage results for all supported platforms.

## Licensing information

* [Third-party lib one](https//github.com/foo/bar) ([New BSD](http://opensource.org/licenses/BSD-3-Clause))

© 2004–2015 Dojo Foundation & contributors. [New BSD](http://opensource.org/licenses/BSD-3-Clause) license.

