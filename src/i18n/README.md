# dojo-i18n

An internationalization library that provides locale-specific message loading, and support for locale-specific message, date, and number formatting. To support locale-specific formatters, `dojo-i18n` utilizes the most up-to-date [CLDR data](http://cldr.unicode.org) from [The Unicode Consortium](http://unicode.org).

**WARNING** This is _alpha_ software. It is not yet production ready, so you should use at your own risk.

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

If an unsupported locale is passed to `i18n`, then the default messages are returned. Further, any messages not provided by the locale-specific bundle will also fall back to their defaults. As such, the default bundle should contain _all_ message keys used by any of the locale-specific bundles.

Once locale dictionaries for a bundle have been loaded, they are cached and can be accessed synchronously via `getCachedMessages`:

```
const messages = getCachedMessages(bundle, 'fr');
console.log(messages.hello); // "Bonjour"
console.log(messages.goodbye); // "Au revoir"
```

`getCachedMessages` will look up the bundle's supported `locales` to determine whether the default messages should be returned. Locales are also normalized to their most specific messages. For example, if the 'fr' locale is supported, but 'fr-CA' is not, `getCachedMessages` will return the messages for the 'fr' locale:


```
const frenchMessages = getCachedMessages(bundle, 'fr-CA');
console.log(frenchMessages.hello); // "Bonjour"
console.log(frenchMessages.goodbye); // "Au revoir"

const madeUpLocaleMessages = getCachedMessages(bundle, 'made-up-locale');
console.log(madeUpLocaleMessages.hello); // "Hello"
console.log(madeUpLocaleMessages.goodbye); // "Goodbye"
```

If need be, bundle caches can be cleared with `invalidate`. If called with a bundle path, only the messages for that particular bundle are removed from the cache. Otherwise, all messages are cleared:

```
import i18n from 'dojo-i18n/main';
import bundle from 'nls/common';

i18n(bundle, 'ar').then(() => {
	invalidate(bundle.bundlePath);
	console.log(getCachedMessages(bundle, 'ar')); // undefined
});
```

### Determining the Current Locale

The current locale can be accessed via the read-only property `i18n.locale`, which will always be either the locale set via `switchLocale` (see below) or the `systemLocale`. `systemLocale` is always set to the user's default locale.

### Changing the Root Locale and Observing Locale Changes

The `switchLocale` method changes the root locale, and returns a promise that resolves when all CLDR data have loaded for the specified locale. All [`Observers`](https://github.com/dojo/shim) registered with `observeLocale` will be notified of locale changes, or notified of errors if the associated CLDR data could not be loaded (no `complete` method is currently used when switching locales).

```typescript
import i18n, { observeLocale, switchLocale } from 'dojo-i18n/i18n';
import bundle from 'nls/bundle';

// Register an `Observable`
observeLocale({
	next(locale: string) {
		// handle locale change...
	},

	error(error: Error) {
		// handle error...
	}
});

// Change the locale to German. If the CLDR are properly loaded, then the registered
// observer's `next` method will be called with the new locale. Otherwise, its `error`
// method will be called with an error object.
switchLocale('de').then(() => {
	// ...

	// The locale is again switched to German, but since the current root locale is
	// already German, registered observers will not be notified.
	return switchLocale('de');
});
```

### Loading CLDR data

Since `dojo-i18n` automatically loads all CLDR data for the root locale, the CLDR JSON files need to be loaded manually only for additional locales used in isolated components (e.g., widgets). To load additional files manually, use the `loadCldrData` method exported by `dojo-i18n/cldr/load`:

```
import loadCldrData, { CldrDataResponse } from 'dojo-i18n/cldr/load';

// Load data for a single locale:
loadCldrData('ar-IQ').then((data: CldrDataResponse) => {
	console.log(data['ar-IQ']);
});

// Load data for a single locale with a fallback in case the locale is unsupported.
// The fallback's data are stored on the original locale in the response.
loadCldrData('made-UP', 'en').then((data: CldrDataResponse) => {
	console.log(data['made-UP']);
});

// Load data for multiple locales (note that a fallback cannot be used in this scenario):
loadCldrData([ 'en', 'en-GB' ]).then((data: CldrDataResponse) => {
	console.log(data['en']);
	console.log(data['en-GB']);
});

// The underlying promise rejects with an unsupported locale and no valid fallback:
loadCldrData('made-UP').catch((error: Error) => {
	console.log(error.message); // "No CLDR data for locale: made-UP."
});
```

`switchLocale` handles loading data for new locales, but when first starting the i18n ecosystem, either `switchLocale(defaultLocale)` or the `ready` method can be used:

```typescript
import { ready } from 'dojo-i18n/i18n';

ready().then(() => {
	// All CLDR data have been loaded for the root locale.
});
```

### Custom message formatting (e.g., pluralization)

`dojo-i18n` relies on [Globalize.js](https://github.com/jquery/globalize/blob/master/doc/api/message/message-formatter.md) for [ICU message formatting](http://userguide.icu-project.org/formatparse/messages), and as such all of the features offered by Globalize.js are available through `dojo-i18n`. The `i18n` module exposes two methods that handle message formatting: 1) `formatMessage`, which directly returns a formatted message based on its inputs, and 2) `getMessageFormatter`, which returns a method dedicated to formatting a single message.

As an example, suppose there is a locale bundle with a `guestInfo` message:

```typescript
const messages = {
	guestInfo: `{gender, select,
		female {
			{guestCount, plural, offset:1
			=0 {{host} does not give a party.}
			=1 {{host} invites {guest} to her party.}
			=2 {{host} invites {guest} and one other person to her party.}
			other {{host} invites {guest} and # other people to her party.}}}
		male {
			{guestCount, plural, offset:1
			=0 {{host} does not give a party.}
			=1 {{host} invites {guest} to his party.}
			=2 {{host} invites {guest} and one other person to his party.}
			other {{host} invites {guest} and # other people to his party.}}}
		other {
			{guestCount, plural, offset:1
			=0 {{host} does not give a party.}
			=1 {{host} invites {guest} to their party.}
			=2 {{host} invites {guest} and one other person to their party.}
			other {{host} invites {guest} and # other people to their party.}}}}`
};
export default messages;
```

The above message can be converted directly with `formatMessage`, or `getMessageFormatter` can be used to generate a function that can be used over and over with different options. Note that the formatters created and used by both methods are cached, so there is no performance penalty from compiling the same message multiple times.

Since the Globalize.js formatting methods use message paths rather than the message strings themselves, the `dojo-i18n` methods also require both the bundle path and the message key, which will be resolved to a message path. If an optional locale is provided, then the corresponding locale-specific message will be used. Otherwise, the current locale is assumed.

```typescript
import i18n, { formatMessage, getMessageFormatter } from 'dojo-i18n/i18n';
import bundle from 'nls/main';

// 1. Load the messages for the locale.
i18n(bundle, 'en').then(() => {
	const message = formatMessage(bundle.bundlePath, 'guestInfo', {
		host: 'Margaret Mead',
		gender: 'female',
		guest: 'Laura Nader',
		guestCount: 20
	}, 'en');
	console.log(message); // "Margaret Mead invites Laura Nader and 19 other people to her party."

	const formatter = getMessageFormatter(bundle.bundlePath, 'guestInfo', 'en');
	console.log(formatter({
		host: 'Margaret Mead',
		gender: 'female',
		guest: 'Laura Nader',
		guestCount: 20
	})); // "Margaret Mead invites Laura Nader and 19 other people to her party."

	console.log(formatter({
		host: 'Marshall Sahlins',
		gender: 'male',
		guest: 'Bronisław Malinowski'
	})); // "Marshall Sahlins invites Bronisław Malinowski to his party."
});
```

### Date and number formatting.

As with the message formatting capabilities, `dojo-i18n` relies on Globalize.js to provide locale-specific formatting for dates, times, currencies, numbers, and units. The formatters themselves are essentially light wrappers around their Globalize.js counterparts, which helps maintain consistency with the Dojo 2 ecosystem and prevents the need to work with the `Globalize` object directly. Unlike the message formatters, the date, number, and unit formatters are not cached, as they have a more complex set of options. As such, executing the various "get formatter" methods multiple times with the same inputs does not return the exact same function object.

`dojo-i18n` groups the various formatters accordingly: date and time formatters (`dojo-i18n/date`); number, currency, and pluralization formatters (`dojo-i18n/number`); and unit formatters (`dojo-i18n/unit`). Each method corresponds to a Globalize.js method (see below), and each method follows the same basic format: the last argument is an optional locale, and the penultimate argument is the method options. If specifying a locale but no options, pass `null` as the `options` argument. If no locale is provided, then the current (`i18n.locale`) is assumed.

**Note**: for convenience, these methods are synchronous, but require that all CLDR data have been loaded (see above under "Loading CLDR data").

```typescript
import { formatDate, getDateFormatter, formatRelativeTime } from 'dojo-i18n/date';
import { formatCurrency, getCurrencyFormatter } from 'dojo-i18n/number';
import { formatUnit, getUnitFormatter } from 'dojo-i18n/unit';

const date = new Date(1815, 11, 10, 11, 27);

// Assume the current locale is "en"
const enDateFormatter = getDateFormatter({ datetime: 'medium' });
enDateFormatter(date); // Dec 10, 1815, 11:27:00 AM
formatDate(date, { date: 'short' }); // 12/10/15

const frDateFormatter = getDateFormatter({ datetime: 'medium' }, 'fr');
frDateFormatter(date); // 10 déc. 1815 à 11:27:00
formatDate(date, { date: 'short' }, 'fr'); // 10/12/1815

formatRelativeTime(-1, 'week'); // "last week"
formatRelativeTime(-1, 'week', { form: 'short' }); // "last wk."
formatRelativeTime(-3, 'week', null, 'fr'); // "il y a 3 semaines"
formatRelativeTime(-3, 'week', { form: 'short' }, 'fr'); // "il y a 3 sem."

const enCurrencyFormatter = getCurrencyFormatter('USD', { style: 'code' });
enCurrencyFormatter(1234.56); // "1,234.56 USD"
formatCurrency(12345.56, 'USD', { style: 'code' }); // "1,234.56 USD"

const frCurrencyFormatter = getCurrencyFormatter('EUR', { style: 'code' }, 'fr');
frCurrencyFormatter(1234.56); // "1 234,56 EUR"
formatCurrency(12345.56, 'EUR', { style: 'code' }, 'fr'); // "1 234,56 EUR"

const enUnitFormatter = getUnitFormatter('feet', { form: 'narrow' });
enUnitFormatter(5280); // 5,280′
formatUnit(5280, 'feet', { form: 'narrow' }); // 5,280′

const frUnitFormatter = getUnitFormatter('meter', null, 'fr');
frUnitFormatter(1000); // 1 000 mètres'
formatUnit(1000, 'meter', null, 'fr); // 1 000 mètres'
```

**`dojo-i18n/date` methods:**

- `formatDate` => [`Globalize.formatDate`](https://github.com/globalizejs/globalize/blob/master/doc/api/date/date-formatter.md)
- `formatRelativeTime` => [`Globalize.formatRelativeTime`](https://github.com/globalizejs/globalize/blob/master/doc/api/relative-time/relative-time-formatter.md)
- `getDateFormatter` => [`Globalize.dateFormatter`](https://github.com/globalizejs/globalize/blob/master/doc/api/date/date-formatter.md)
- `getDateParser` => [`Globalize.dateParser`](https://github.com/globalizejs/globalize/blob/master/doc/api/date/date-parser.md)
- `getRelativeTimeFormatter` => [`Globalize.relativeTimeFormatter`](https://github.com/globalizejs/globalize/blob/master/doc/api/relative-time/relative-time-formatter.md)
- `parseDate` => [`Globalize.parseDate`](https://github.com/globalizejs/globalize/blob/master/doc/api/date/date-parser.md)

**`dojo-i18n/number` methods:**

- `formatCurrency` => [`Globalize.formatCurrency`](https://github.com/globalizejs/globalize/blob/master/doc/api/currency/currency-formatter.md)
- `formatNumber` => [`Globalize.formatNumber`](https://github.com/globalizejs/globalize/blob/master/doc/api/number/number-formatter.md)
- `getCurrencyFormatter` => [`Globalize.currencyFormatter`](https://github.com/globalizejs/globalize/blob/master/doc/api/currency/currency-formatter.md)
- `getNumberFormatter` => [`Globalize.numberFormatter`](https://github.com/globalizejs/globalize/blob/master/doc/api/number/number-formatter.md)
- `getNumberParser` => [`Globalize.numberParser`](https://github.com/globalizejs/globalize/blob/master/doc/api/number/number-parser.md)
- `getPluralGenerator` => [`Globalize.pluralGenerator`](https://github.com/globalizejs/globalize/blob/master/doc/api/plural/plural-generator.md)
- `parseNumber` => [`Globalize.parseNumber`](https://github.com/globalizejs/globalize/blob/master/doc/api/number/number-parser.md)
- `pluralize` => [`Globalize.plural`](https://github.com/globalizejs/globalize/blob/master/doc/api/plural/plural-generator.md)

**`dojo-i18n/number` methods:**

- `formatUnit` => [`Globalize.formatUnit`](https://github.com/globalizejs/globalize/blob/master/doc/api/unit/unit-formatter.md)
- `getUnitFormatter` => [`Globalize.unitFormatter`](https://github.com/globalizejs/globalize/blob/master/doc/api/unit/unit-formatter.md)

## How do I use this package?

The easiest way to use this package is to install it via npm:

```
$ npm install dojo-i18n
```

In addition, you can clone this repository and use the Grunt build scripts to manage the package.

Using under TypeScript or ES6 modules, you would generally want to just import the dojo-i18n/i18n module:

```typescript
import i18n, { Messages } from 'dojo-i18n/i18n';
import messageBundle from 'path/to/bundle';

i18n(messageBundle, 'fr').then((messages: Messages) => {
	// locale-specific messages ready to use...
});
```

## How do I contribute?

We appreciate your interest!  Please see the [Guidelines Repository](https://github.com/dojo/guidelines#readme) for the
Contributing Guidelines and Style Guide.

## Testing

Test cases MUST be written using Intern using the Object test interface and Assert assertion interface.

90% branch coverage MUST be provided for all code submitted to this repository, as reported by istanbul’s combined coverage results for all supported platforms.

## Licensing information

* [Third-party lib one](https//github.com/foo/bar) ([New BSD](http://opensource.org/licenses/BSD-3-Clause))

© 2004–2015 Dojo Foundation & contributors. [New BSD](http://opensource.org/licenses/BSD-3-Clause) license.

