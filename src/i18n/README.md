# @dojo/i18n

[![Build Status](https://travis-ci.org/dojo/i18n.svg?branch=master)](https://travis-ci.org/dojo/i18n)
[![codecov.io](http://codecov.io/github/dojo/i18n/coverage.svg?branch=master)](http://codecov.io/github/dojo/i18n?branch=master)
[![npm version](https://badge.fury.io/js/%40dojo%2Fi18n.svg)](https://badge.fury.io/js/%40dojo%2Fi18n)

An internationalization library that provides locale-specific message loading, and support for locale-specific message, date, and number formatting.

- [Usage](#usage)
- [Features](#features)
  - [Message Bundle Loading](#message-bundle-loading)
  - [Determining the Current Locale](#determining-the-current-locale)
  - [Changing the Root Locale and Observing Locale Changes](#changing-the-root-locale-and-observering-locale-changes)
  - [Loading CLDR data](#loading-cldr-data)
  - [ICU Message Formatting](#icu-message-formatting)
  - [Date and number formatting](#date-and-number-formatting)
- [How do I contribute?](#how-do-i-contribute)
  - [Installation](#installation)
  - [Testing](#testing)
- [Licensing information](#licensing-information)

## Usage

To use `@dojo/i18n`, install the package along with its required peer dependencies:

```bash
npm install @dojo/i18n

# peer dependencies
npm install @dojo/core
npm install @dojo/has
npm install @dojo/shim
```

With TypeScript or ES6 modules, you would generally want to just import the @dojo/i18n/i18n module:

```typescript
import i18n, { Messages } from '@dojo/i18n/i18n';
import messageBundle from 'path/to/bundle';

i18n(messageBundle, 'fr').then((messages: Messages) => {
	// locale-specific messages ready to use...
});
```

## Features

The examples below are provided in TypeScript syntax. The package does work under JavaScript, but for clarity, the examples will only include one syntax.

### Message Bundle Loading

`@dojo/i18n` provides a means for loading locale-specific messages and updating those messages when the locale changes. Each bundle has a default module that is `import`ed like any other TypeScript module. Locale-specific messages are then loaded via the `i18n` method. Every default bundle MUST provide a `messages` map containing default messages, and an optional `locales` object that maps supported locales to functions that load their respective translations. Further, each default bundle is assigned a unique `id` property that is used internally to manage caching and handle interoperability with Globalize.js (see below). While it is possible to include an `id` with your message bundles, doing so is neither necessary nor recommended.

```typescript
import fr from './fr/common';

export default {
	locales: {
		// Locale providers can load translations lazily...
		ar: () => import('./ar/main'),
		'ar-JO': () => import('./ar-JO/main'),

		// ... or locale providers can return translations directly.
		fr: () => fr
	},
	messages: {
		hello: 'Hello',
		goodbye: 'Goodbye'
	}
};
```

The `messages` object contains default messages for all keys used through the bundle. These messages are used as fallbacks for any messages not included in locale-specific bundles. Further, the `locales` map uses functions to load translations, providing an extra layer of flexibility in determining how translations are included.

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
import i18n, { Messages } from '@dojo/i18n/main';
import bundle from 'nls/common';

i18n(bundle, 'fr').then(function (messages: Messages) {
	console.log(messages.hello); // "Bonjour"
	console.log(messages.goodbye); // "Au revoir"
});
```

If an unsupported locale is passed to `i18n`, then the default messages are returned. Further, any messages not provided by the locale-specific bundle will also fall back to their defaults. As such, the default bundle should contain _all_ message keys used by any of the locale-specific bundles.

Alternatively, locale messages can be manually loaded by passing them to `setLocaleMessages`. This is useful for pre-caching locale-specific messages so that an additional HTTP request is not sent to load them. Locale-specific messages are merged with the default messages, so partial message bundles are acceptable:

```
const partialMessages = { hello: 'Ahoj' };
setLocaleMessages(bundle, partialMessages, 'cz');

i18n(bundle, 'cz').then((messages) => {
	console.log(messages.hello); // "Ahoj"
	console.log(messages.goodbye); // "Goodbye" (defaults are used when not overridden)
});
```

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

If need be, bundle caches can be cleared with `invalidate`. If called with a bundle, only the messages for that particular bundle are removed from the cache. Otherwise, all messages are cleared:

```
import i18n from '@dojo/i18n/main';
import bundle from 'nls/common';

i18n(bundle, 'ar').then(() => {
	invalidate(bundle);
	console.log(getCachedMessages(bundle, 'ar')); // undefined
});
```

### Determining the Current Locale

The current locale can be accessed via the read-only property `i18n.locale`, which will always be either the locale set via `switchLocale` (see below) or the `systemLocale`. `systemLocale` is always set to the user's default locale.

### Changing the Root Locale and Observing Locale Changes

The `switchLocale` method changes the root locale and notifies all consumers registered with `observeLocale`.

```typescript
import i18n, { observeLocale, switchLocale } from '@dojo/i18n/i18n';
import bundle from 'nls/bundle';

// Register an `Observable`
observeLocale((locale: string) => {
	// handle locale change...
});

// Change the locale to German. The registered observer's callback will be called
// with the new locale.
switchLocale('de');

// The locale is again switched to German, but since the current root locale is
// already German, registered observers will not be notified.
switchLocale('de');
```

### Loading CLDR data

Given the very large size of the [Unicode CLDR data](http://cldr.unicode.org), it is not included as a dependency of `@dojo/i18n`. For applications that use `@dojo/i18n` only for selecting unformatted, locale-specific messages, this is not a concern. However, if using the [ICU-formatted messages](http://userguide.icu-project.org/formatparse/messages) or any of the other formatters provided by `@dojo/i18n` (see below), applications must explicitly load any required CLDR data via the `loadCldrData` method exported by `@dojo/i18n/cldr/load`. `loadCldrData` accepts an object of CLDR data. All CLDR data MUST match the format used by the [Unicode CLDR JSON](https://github.com/unicode-cldr/cldr-json) files. Supplemental data MUST be nested within a top-level `supplemental` object, and locale-specific data MUST be nested under locale objects within a top-level `main` object:

```
import loadCldrData from '@dojo/i18n/cldr/load';

loadCldrData({
	"supplemental": {
		"likelySubtags": { ... }
	},
	"main": {
		"en": {
			"numbers": { ... }
		}
	}
});
```

`@dojo/i18n` requires the following CLDR data:

For ICU message formatting:

* `supplemental/likelySubtags`
* `supplemental/plurals`

For date/time formatting:

* `main/{locale}/ca-gregorian`
* `main/{locale}/dateFields`
* `main/{locale}/numbers`
* `main/{locale}/timeZoneNames`
* `supplemental/likelySubtags`
* `supplemental/numberingSystems`
* `supplemental/ordinals`
* `supplemental/plurals`
* `supplemental/timeData`
* `supplemental/weekData`

For number/currency formatting:

* `main/{locale}/currencies`
* `main/{locale}/numbers`
* `supplemental/currencyData`
* `supplemental/likelySubtags`
* `supplemental/numberingSystems`
* `supplemental/ordinals`
* `supplemental/plurals`

For unit formatting:

* `main/{locale}/numbers`
* `main/{locale}/units`
* `supplemental/likelySubtags`
* `supplemental/numberingSystems`
* `supplemental/ordinals`
* `supplemental/plurals`

### Message Formatting

The `i18n` module exposes two methods that handle message formatting: 1) `formatMessage`, which directly returns a formatted message based on its inputs, and 2) `getMessageFormatter`, which returns a method dedicated to formatting a single message.

`@dojo/i18n` supports the ICU message format (see below), but that requires CLDR data and is not something that every application requires. As such, if the `supplemental/likeSubtags` and `supplemental/plurals` data are not loaded, then both `formatMessage` and `getMessageFormatter` will perform simple token replacement. For example, given the `guestInfo` message `{host} invites {guest} to the party.`, an object with `host` and `guest` properties can be provided to a formatter without the need to load CLDR data:

```typescript
import i18n, { formatMessage, getMessageFormatter } from '@dojo/i18n/i18n';
import bundle from 'nls/main';

i18n(bundle, 'en').then(() => {
	const formatter = getMessageFormatter(bundle, 'guestInfo', 'en');
	let message = formatter({
		host: 'Margaret Mead',
		guest: 'Laura Nader'
	});
	console.log(message); // "Margaret Mead invites Laura Nader to the party."

	// Note that `formatMessage` is essentially a convenience wrapper around `getMessageFormatter`.
	message = formatMessage(bundle, 'guestInfo', {
		host: 'Marshall Sahlins',
		gender: 'male',
		guest: 'Bronisław Malinowski'
	}, 'en');
	console.log(message); // "Marshall Sahlins invites Bronisław Malinowski to the party."
});
```

#### ICU Message Formatting

**Note**: This feature requires CLDR data (see above).

`@dojo/i18n` relies on [Globalize.js](https://github.com/jquery/globalize/blob/master/doc/api/message/message-formatter.md) for [ICU message formatting](http://userguide.icu-project.org/formatparse/messages), and as such all of the features offered by Globalize.js are available through `@dojo/i18n`.

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

Since the Globalize.js formatting methods use message paths rather than the message strings themselves, the `@dojo/i18n` methods also require that the bundle itself be provided, so its unique identifier can be resolved to a message path within the Globalize.js ecosystem. If an optional locale is provided, then the corresponding locale-specific message will be used. Otherwise, the current locale is assumed.

```typescript
import i18n, { formatMessage, getMessageFormatter } from '@dojo/i18n/i18n';
import bundle from 'nls/main';

// 1. Load the messages for the locale.
i18n(bundle, 'en').then(() => {
	const message = formatMessage(bundle, 'guestInfo', {
		host: 'Margaret Mead',
		gender: 'female',
		guest: 'Laura Nader',
		guestCount: 20
	}, 'en');
	console.log(message); // "Margaret Mead invites Laura Nader and 19 other people to her party."

	const formatter = getMessageFormatter(bundle, 'guestInfo', 'en');
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

**Note**: This feature requires CLDR data (see above).

As with the message formatting capabilities, `@dojo/i18n` relies on Globalize.js to provide locale-specific formatting for dates, times, currencies, numbers, and units. The formatters themselves are essentially light wrappers around their Globalize.js counterparts, which helps maintain consistency with the Dojo 2 ecosystem and prevents the need to work with the `Globalize` object directly. Unlike the message formatters, the date, number, and unit formatters are not cached, as they have a more complex set of options. As such, executing the various "get formatter" methods multiple times with the same inputs does not return the exact same function object.

`@dojo/i18n` groups the various formatters accordingly: date and time formatters (`@dojo/i18n/date`); number, currency, and pluralization formatters (`@dojo/i18n/number`); and unit formatters (`@dojo/i18n/unit`). Each method corresponds to a Globalize.js method (see below), and each method follows the same basic format: the last argument is an optional locale, and the penultimate argument is the method options. If specifying a locale but no options, pass `null` as the `options` argument. If no locale is provided, then the current (`i18n.locale`) is assumed.

```typescript
import { formatDate, getDateFormatter, formatRelativeTime } from '@dojo/i18n/date';
import { formatCurrency, getCurrencyFormatter } from '@dojo/i18n/number';
import { formatUnit, getUnitFormatter } from '@dojo/i18n/unit';

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

**`@dojo/i18n/date` methods:**

- `formatDate` => [`Globalize.formatDate`](https://github.com/globalizejs/globalize/blob/master/doc/api/date/date-formatter.md)
- `formatRelativeTime` => [`Globalize.formatRelativeTime`](https://github.com/globalizejs/globalize/blob/master/doc/api/relative-time/relative-time-formatter.md)
- `getDateFormatter` => [`Globalize.dateFormatter`](https://github.com/globalizejs/globalize/blob/master/doc/api/date/date-formatter.md)
- `getDateParser` => [`Globalize.dateParser`](https://github.com/globalizejs/globalize/blob/master/doc/api/date/date-parser.md)
- `getRelativeTimeFormatter` => [`Globalize.relativeTimeFormatter`](https://github.com/globalizejs/globalize/blob/master/doc/api/relative-time/relative-time-formatter.md)
- `parseDate` => [`Globalize.parseDate`](https://github.com/globalizejs/globalize/blob/master/doc/api/date/date-parser.md)

**`@dojo/i18n/number` methods:**

- `formatCurrency` => [`Globalize.formatCurrency`](https://github.com/globalizejs/globalize/blob/master/doc/api/currency/currency-formatter.md)
- `formatNumber` => [`Globalize.formatNumber`](https://github.com/globalizejs/globalize/blob/master/doc/api/number/number-formatter.md)
- `getCurrencyFormatter` => [`Globalize.currencyFormatter`](https://github.com/globalizejs/globalize/blob/master/doc/api/currency/currency-formatter.md)
- `getNumberFormatter` => [`Globalize.numberFormatter`](https://github.com/globalizejs/globalize/blob/master/doc/api/number/number-formatter.md)
- `getNumberParser` => [`Globalize.numberParser`](https://github.com/globalizejs/globalize/blob/master/doc/api/number/number-parser.md)
- `getPluralGenerator` => [`Globalize.pluralGenerator`](https://github.com/globalizejs/globalize/blob/master/doc/api/plural/plural-generator.md)
- `parseNumber` => [`Globalize.parseNumber`](https://github.com/globalizejs/globalize/blob/master/doc/api/number/number-parser.md)
- `pluralize` => [`Globalize.plural`](https://github.com/globalizejs/globalize/blob/master/doc/api/plural/plural-generator.md)

**`@dojo/i18n/unit` methods:**

- `formatUnit` => [`Globalize.formatUnit`](https://github.com/globalizejs/globalize/blob/master/doc/api/unit/unit-formatter.md)
- `getUnitFormatter` => [`Globalize.unitFormatter`](https://github.com/globalizejs/globalize/blob/master/doc/api/unit/unit-formatter.md)

## How do I contribute?

We appreciate your interest!  Please see the [Guidelines Repository](https://github.com/dojo/guidelines#readme) for the Contributing Guidelines.

### Code Style

This repository uses [`prettier`](https://prettier.io/) for code styling rules and formatting. A pre-commit hook is installed automatically and configured to run `prettier` against all staged files as per the configuration in the project's `package.json`.

An additional npm script to run `prettier` (with write set to `true`) against all `src` and `test` project files is available by running:

```bash
npm run prettier
```

### Installation

To start working with this package, clone the repository and run `npm install`.

In order to build the project run `grunt dev` or `grunt dist`.

### Testing

Test cases MUST be written using Intern using the Object test interface and Assert assertion interface.

90% branch coverage MUST be provided for all code submitted to this repository, as reported by istanbul’s combined coverage results for all supported platforms.

## Licensing information

* [Globalize.js](https://github.com/globalizejs/globalize) ([MIT](http://spdx.org/licenses/MIT))

© 2018 [JS Foundation](https://js.foundation/). [New BSD](http://opensource.org/licenses/BSD-3-Clause) license.

