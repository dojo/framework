# Advanced formatting: CLDR

## Loading CLDR data

Given the very large size of the [Unicode CLDR data](http://cldr.unicode.org), it is not included as a dependency of `@dojo/framework/i18n`. Relevant portions of CLDR data must be explicitly loaded when applications require features such as [ICU-formatted messages](http://userguide.icu-project.org/formatparse/messages) or others provided by `@dojo/framework/i18n` such as date or number formatters.

**Note**: Internationalized applications that require simple, unformatted locale-specific messages do not need to concern themselves with loading CLDR data. These applications only need to be configured as per [an internationalized Dojo application](#internationalizing-a-dojo-application).

### Dojo build system

CLDR data can be loaded from an application's `.dojorc` build configuration file via the `cldrPaths` list within the `build-app` section.

- `cldrPaths`: string[]
    - An array of paths to [CLDR JSON](https://github.com/dojo/i18n#loading-cldr-data) files to load. Can be used in conjunction with the [locale and supportedLocales](#configuring-supported-application-locales) options - if a path contains the string `{locale}`, that file will be loaded for each locale listed in the `locale` and `supportedLocales` properties. 

For example, with the following configuration, the `numbers.json` CLDR file will be loaded for all three supported `en`, `es`, and `fr` locales:

>.dojorc
```json
{
	"build-app": {
		"locale": "en",
		"supportedLocales": [ "es", "fr" ],
		"cldrPaths": [
			"cldr-data/main/{locale}/numbers.json"
		]
	}
}
```

### Standalone
CLDR data can be loaded via the `loadCldrData` method exported by `@dojo/framework/i18n/cldr/load`. `loadCldrData` accepts an object of CLDR data. All CLDR data MUST match the format used by the [Unicode CLDR JSON](https://github.com/unicode-cldr/cldr-json) files. Supplemental data MUST be nested within a top-level `supplemental` object, and locale-specific data MUST be nested under locale objects within a top-level `main` object:

```ts
import loadCldrData from '@dojo/framework/i18n/cldr/load';

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

## Required CLDR data per feature
Dojo's `i18n` module requires the following CLDR data for each particular formatting feature:

For [ICU message formatting](#icu-message-formatting):

-   `supplemental/likelySubtags`
-   `supplemental/plurals`

For [date/time formatting](#date-and-number-formatting):

-   `main/{locale}/ca-gregorian`
-   `main/{locale}/dateFields`
-   `main/{locale}/numbers`
-   `main/{locale}/timeZoneNames`
-   `supplemental/likelySubtags`
-   `supplemental/numberingSystems`
-   `supplemental/ordinals`
-   `supplemental/plurals`
-   `supplemental/timeData`
-   `supplemental/weekData`

For [number/currency formatting](#date-and-number-formatting):

-   `main/{locale}/currencies`
-   `main/{locale}/numbers`
-   `supplemental/currencyData`
-   `supplemental/likelySubtags`
-   `supplemental/numberingSystems`
-   `supplemental/ordinals`
-   `supplemental/plurals`

For [unit formatting](#date-and-number-formatting):

-   `main/{locale}/numbers`
-   `main/{locale}/units`
-   `supplemental/likelySubtags`
-   `supplemental/numberingSystems`
-   `supplemental/ordinals`
-   `supplemental/plurals`

## Message Formatting

### Basic token replacement

The `i18n` module exposes two methods that handle message formatting: 
- `formatMessage`, which directly returns a formatted message based on its inputs
- `getMessageFormatter`, which returns a method dedicated to formatting a single message.
  
Both of these methods operate on bundle objects, which must first be registered with the i18n ecosystem by passing them to the `i18n` function (see below).

`@dojo/framework/i18n` supports the [ICU message format](#icu-message-formatting), but that requires CLDR data and is not something that every application requires. As such, if the `supplemental/likeSubtags` and `supplemental/plurals` data are not loaded, then both `formatMessage` and `getMessageFormatter` will perform simple token replacement.

For example, given a `guestInfo` message:

>`{host} invites {guest} to the party.`

an object with `host` and `guest` properties can be provided to a formatter without the need to load CLDR data:

```ts
import i18n, { formatMessage, getMessageFormatter } from '@dojo/framework/i18n/i18n';
import bundle from 'nls/main';

i18n(bundle, 'en').then(() => {
	const formatter = getMessageFormatter(bundle, 'guestInfo', 'en');
	let message = formatter({
		host: 'Margaret Mead',
		guest: 'Laura Nader'
	});
	console.log(message); // "Margaret Mead invites Laura Nader to the party."

	// Note that `formatMessage` is essentially a convenience wrapper around `getMessageFormatter`.
	message = formatMessage(
		bundle,
		'guestInfo',
		{
			host: 'Marshall Sahlins',
			gender: 'male',
			guest: 'Bronisław Malinowski'
		},
		'en'
	);
	console.log(message); // "Marshall Sahlins invites Bronisław Malinowski to the party."
});
```

### ICU Message Formatting

**Note**: This feature requires appropriate [CLDR data](#loading-cldr-data) to have been loaded into the application.

`@dojo/framework/i18n` relies on [Globalize.js](https://github.com/jquery/globalize/blob/master/doc/api/message/message-formatter.md) for [ICU message formatting](http://userguide.icu-project.org/formatparse/messages), and as such all of the features offered by Globalize.js are available through `@dojo/framework/i18n`.

As an example, suppose there is a locale bundle with a `guestInfo` message:

```ts
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

Since the Globalize.js formatting methods use message paths rather than the message strings themselves, the `@dojo/framework/i18n` methods also require that the bundle itself be provided, so its unique identifier can be resolved to a message path within the Globalize.js ecosystem. If an optional locale is provided, then the corresponding locale-specific message will be used. Otherwise, the current locale is assumed.

```ts
import i18n, { formatMessage, getMessageFormatter } from '@dojo/framework/i18n/i18n';
import bundle from 'nls/main';

// 1. Load the messages for the locale.
i18n(bundle, 'en').then(() => {
	const message = formatMessage(
		bundle,
		'guestInfo',
		{
			host: 'Margaret Mead',
			gender: 'female',
			guest: 'Laura Nader',
			guestCount: 20
		},
		'en'
	);
	console.log(message); // "Margaret Mead invites Laura Nader and 19 other people to her party."

	const formatter = getMessageFormatter(bundle, 'guestInfo', 'en');
	console.log(
		formatter({
			host: 'Margaret Mead',
			gender: 'female',
			guest: 'Laura Nader',
			guestCount: 20
		})
	); // "Margaret Mead invites Laura Nader and 19 other people to her party."

	console.log(
		formatter({
			host: 'Marshall Sahlins',
			gender: 'male',
			guest: 'Bronisław Malinowski'
		})
	); // "Marshall Sahlins invites Bronisław Malinowski to his party."
});
```

## Date and number formatting.

**Note**: This feature requires appropriate [CLDR data](#loading-cldr-data) to have been loaded into the application.

As with the message formatting capabilities, `@dojo/framework/i18n` relies on Globalize.js to provide locale-specific formatting for dates, times, currencies, numbers, and units. The formatters themselves are essentially light wrappers around their Globalize.js counterparts, which helps maintain consistency with the Dojo ecosystem and prevents the need to work with the `Globalize` object directly. Unlike the message formatters, the date, number, and unit formatters are not cached, as they have a more complex set of options. As such, executing the various "get formatter" methods multiple times with the same inputs does not return the exact same function object.

`@dojo/framework/i18n` groups the various formatters accordingly: date and time formatters (`@dojo/framework/i18n/date`); number, currency, and pluralization formatters (`@dojo/framework/i18n/number`); and unit formatters (`@dojo/framework/i18n/unit`). Each method corresponds to a Globalize.js method (see below), and each method follows the same basic format: the last argument is an optional locale, and the penultimate argument is the method options. If specifying a locale but no options, pass `null` as the `options` argument. If no locale is provided, then the current (`i18n.locale`) is assumed.

```ts
import { formatDate, getDateFormatter, formatRelativeTime } from '@dojo/framework/i18n/date';
import { formatCurrency, getCurrencyFormatter } from '@dojo/framework/i18n/number';
import { formatUnit, getUnitFormatter } from '@dojo/framework/i18n/unit';

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

**`@dojo/framework/i18n/date` methods:**

-   `formatDate` => [`Globalize.formatDate`](https://github.com/globalizejs/globalize/blob/master/doc/api/date/date-formatter.md)
-   `formatRelativeTime` => [`Globalize.formatRelativeTime`](https://github.com/globalizejs/globalize/blob/master/doc/api/relative-time/relative-time-formatter.md)
-   `getDateFormatter` => [`Globalize.dateFormatter`](https://github.com/globalizejs/globalize/blob/master/doc/api/date/date-formatter.md)
-   `getDateParser` => [`Globalize.dateParser`](https://github.com/globalizejs/globalize/blob/master/doc/api/date/date-parser.md)
-   `getRelativeTimeFormatter` => [`Globalize.relativeTimeFormatter`](https://github.com/globalizejs/globalize/blob/master/doc/api/relative-time/relative-time-formatter.md)
-   `parseDate` => [`Globalize.parseDate`](https://github.com/globalizejs/globalize/blob/master/doc/api/date/date-parser.md)

**`@dojo/framework/i18n/number` methods:**

-   `formatCurrency` => [`Globalize.formatCurrency`](https://github.com/globalizejs/globalize/blob/master/doc/api/currency/currency-formatter.md)
-   `formatNumber` => [`Globalize.formatNumber`](https://github.com/globalizejs/globalize/blob/master/doc/api/number/number-formatter.md)
-   `getCurrencyFormatter` => [`Globalize.currencyFormatter`](https://github.com/globalizejs/globalize/blob/master/doc/api/currency/currency-formatter.md)
-   `getNumberFormatter` => [`Globalize.numberFormatter`](https://github.com/globalizejs/globalize/blob/master/doc/api/number/number-formatter.md)
-   `getNumberParser` => [`Globalize.numberParser`](https://github.com/globalizejs/globalize/blob/master/doc/api/number/number-parser.md)
-   `getPluralGenerator` => [`Globalize.pluralGenerator`](https://github.com/globalizejs/globalize/blob/master/doc/api/plural/plural-generator.md)
-   `parseNumber` => [`Globalize.parseNumber`](https://github.com/globalizejs/globalize/blob/master/doc/api/number/number-parser.md)
-   `pluralize` => [`Globalize.plural`](https://github.com/globalizejs/globalize/blob/master/doc/api/plural/plural-generator.md)

**`@dojo/framework/i18n/unit` methods:**

-   `formatUnit` => [`Globalize.formatUnit`](https://github.com/globalizejs/globalize/blob/master/doc/api/unit/unit-formatter.md)
-   `getUnitFormatter` => [`Globalize.unitFormatter`](https://github.com/globalizejs/globalize/blob/master/doc/api/unit/unit-formatter.md)

---

**Next:** [Standalone API](./40-standalone.md)

**Previous:** [Internationalizing a Dojo application](./20-i18n-dojo-apps.md)

**Up:** [Dojo i18n Index](./index.md)
