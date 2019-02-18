- [Introduction](#introduction)
- [Basic Usage](#basic-usage)
  - [Internationalizing a widget](#internationalizing-a-widget)
  - [Adding a widget language localization bundle](#adding-a-widget-language-localization-bundle)
  - [Specifying a root locale](#specifying-a-root-locale)
  - [Changing the locale within an application](#changing-the-locale-within-an-application)
  - [Using as a standalone module](#using-as-a-standalone-module)
- [Working with message bundles](#working-with-message-bundles)
  - [Overview](#overview)
  - [TypeScript stucture](#typescript-stucture)
  - [Lazy vs. static loading](#lazy-vs-static-loading)
- [Internationalizing a Dojo application](#internationalizing-a-dojo-application)
  - [Widgets](#widgets)
  - [Managing I18n throughout an Application](#managing-i18n-throughout-an-application)
    - [`registerI18nInjector`](#registeri18ninjector)
    - [Changing LocaleData](#changing-localedata)
      - [Properties](#properties)
      - [Example Usage](#example-usage)
- [Advanced formatting: CLDR](#advanced-formatting-cldr)
  - [Loading CLDR data](#loading-cldr-data)
    - [Dojo applications](#dojo-applications)
      - [API](#api)
    - [Standalone](#standalone)
  - [Required CLDR data per feature](#required-cldr-data-per-feature)
  - [Message Formatting](#message-formatting)
    - [ICU Message Formatting](#icu-message-formatting)
  - [Date and number formatting.](#date-and-number-formatting)
- [Standalone API](#standalone-api)
  - [Accessing locale message bundles](#accessing-locale-message-bundles)
  - [Determining the Current Locale](#determining-the-current-locale)
  - [Changing the Root Locale and Observing Locale Changes](#changing-the-root-locale-and-observing-locale-changes)

# Introduction

Dojo's `i18n` package solves a variety of common requirements and challenges around web application internationalization.

It is best used in Dojo applications to help render localized `Widget`s, including advanced messsage, date and number formatting, but can also be used as a standalone module if required.

Feature | Description
--- | ---
Per-widget localization | Each widget instance can have its own locale specified, allowing data from multiple locales to be displayed within a single application. If not specified, widgets fall back to the current root locale.
Fine-grained message bundling | Bundles can be decomposed and scoped locally to individual widgets, and can be lazily-loaded only if a given locale is in use. **(is this true?:)** This allows message bundles to benefit from the same layer separation & bundled delivery as all other resources within an application.
Locale-specific message, date, and number formatting | Uses industry-standard [Unicode CLDR formatting](http://cldr.unicode.org/) rules. CLDR formatting data is optional and only needs to be loaded if advanced formatting is required. Applications that only require basic locale-based message substitution can simply use Dojo `i18n`.
Reactive locale change response | Similar to other reactive state changes within a Dojo application, messages can be automatically reloaded and affected widgets re-rendered when changing locales.<br>If using `i18n` as a standalone module, locale change events can be acted on via listener callbacks.
Fallback locale detection | Ensures a default locale is available if a root override has not been explicitly set.<br>When running client-side, this defaults to the user or system locale, and when running server-side, this defaults to the process or host locale.


# Basic Usage

## Internationalizing a widget

>.dojorc
```ts
{
	"build-app": {
		"locale": "en"
	}
}
```

>src/widgets/MyI18nWidget.ts
```ts
import { WidgetBase } from '@dojo/framework/widget-core/WidgetBase';
import { v } from '@dojo/framework/widget-core/d';

import I18nMixin from "@dojo/framework/widget-core/mixins/I18n";
import myWidgetMessageBundle from '../nls/MyI18nWidget.en.ts';

export default class MyI18nWidget extends I18nMixin(WidgetBase) {
	protected render() {
		const { messages } = this.localizeBundle(myWidgetMessageBundle);

		return v('div', { title: messages.title }, [ messages.content ]);
	}
}
```

>src/nls/MyI18nWidget.en.ts
```ts
export default {
	messages: {
		title: 'Hello',
		content: 'This is an internationalized widget'
	}
}
```

## Adding a widget language localization bundle

>.dojorc
```ts
{
	"build-app": {
		"locale": "en",
		"supportedLocales": [ "fr" ]
	}
}
```

>src/nls/MyI18nWidget.en.ts
```ts
export default {
	locales: {
		fr: () => require('./fr/MyI18nWidget.fr')
	},
	messages: {
		title: 'Hello',
		content: 'This is an internationalized widget'
	}
}
```

>src/nls/fr/MyI18nWidget.fr.ts
```ts
export default {
	title: 'Bonjour',
	content: 'Ceci est un widget internationalisé'
};
```

## Specifying a root locale

>src/main.ts
```ts
import renderer from '@dojo/framework/widget-core/vdom';
import { w } from '@dojo/framework/widget-core/d';
import Registry from '@dojo/framework/widget-core/Registry';
import { registerI18nInjector } from '@dojo/framework/widget-core/mixins/I18n';

import App from './App';

const registry = new Registry();
registerI18nInjector({ locale: 'us', rtl: false }, registry);

const r = renderer(() => w(App, {}));
r.mount({ registry });
```

## Changing the locale within an application

>src/widgets/LocaleChanger.ts
```ts
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import { LocaleSwitcher, UpdateLocale } from '@dojo/framework/widget-core/mixins/I18n';

class LocaleChanger extends WidgetBase {
	protected render() {
		return v('div', [
			w(LocaleSwitcher, {
				renderer: (updateLocale: UpdateLocale) => {
					return this._renderLocaleChoices(updateLocale);
				}
			})
		]);
	}
	
	private _renderLocaleChoices(updateLocale: UpdateLocale) {
		return v('div', [
			this._renderLocaleChoice('en', 'English', updateLocale),
			this._renderLocaleChoice('fr', 'French', updateLocale)
		]);
	}

	private _renderLocaleChoice(localeKey: string, localeDescription: string, updateLocale: UpdateLocale) {
		return v('button', {
				onclick: () => {
					updateLocale({ locale: localeKey });
				}
			},
			[localeDescription]
		);
	}

}
```
## Using as a standalone module

```ts
import i18n, { Messages } from '@dojo/framework/i18n/i18n';
import messageBundle from 'path/to/message/bundle';

i18n(messageBundle, 'fr').then((messages: Messages) => {
	// locale-specific messages ready to use...
});
```

# Working with message bundles

TODO: clarify what a 'bundle' is & apply consistently:
* set of messages for a single language?
* set of language files for a widget/app?

## Overview

Dojo applications can choose to use a single message set across the entire application, or they can decompose messages to be more fine-grained and scoped more closely to the widget(s) they are referenced from.

For each set of language bundles, whether for a single widget or a complete application, one language within the set is required to act as the default import. The default language bundle:
* provides a comprehensive set of message keys and their values that are used as a fallback if other languages do not provide overrides
* lists other supported languages, as well as the mechanism to load each supported language's message bundle

## TypeScript stucture
Every language bundle is a TypeScript module, and is required to export a default object containing a `messages` property. This property should be a map of message keys to their translated values within the particular language.

For example:

```ts
export default {
	messages: {
		hello: 'Hello',
		goodbye: 'Goodbye'
	}
};
```

The bundle designated as the default language should also provide a `locales` property on its exported object. This property is a map of supported locale identifiers to functions that can load the message bundle for each particular locale.

For example, an application supporting French, Arabic and Japanese (with English as a default):

```ts
export default {
	locales: {
		fr: () => import('./fr/main'),
		ar: () => import('./ar/main'),
		ja: () => import('./ja/main')
	},
	messages: {
		hello: 'Hello',
		goodbye: 'Goodbye'
	}
};
```

The `messages` object within the default bundle contains a comprehensive set of all message keys and their descriptions for a particular section of an application. When the application locale is set to the default value, the default bundle acts as a regular message lookup. When a non-default locale is in use, the default bundle's `messages` are used as fallbacks for any keys not included in locale-specific bundles.

The default language bundle is then `import`ed like any other TypeScript module into each widget that requires use of the set of messages contained within the bundle.

**(TODO: remove?)** Each default bundle is assigned a unique `id` property that is used internally to manage caching and handle interoperability with Globalize.js (see below). While it is possible to include an `id` with your message bundles, doing so is neither necessary nor recommended.

## Lazy vs. static loading

It is prefereable to use functions in the default language's `locales` map, as this allows locale message bundles to be lazily loaded, only if required. **TODO:** *is there a risk of rendering default fallbacks & re-rendering updated values on load completion when lazy loading?*

Some applications may prefer certain languages to be statically loaded along with the default bundle, and can do so by returning a compatible object structure directly.

An example of both types of bundle loading:
```ts
import fr from './fr/main';

export default {
	locales: {
		// Locale providers can load translations lazily...
		ar: () => import('./ar/main'),
		'ar-JO': () => import('./ar-JO/main'),

		// ... or return translations directly.
		fr: () => fr
	},
	// Default/fallback messages
	messages: {
		hello: 'Hello',
		goodbye: 'Goodbye'
	}
};
```

# Internationalizing a Dojo application

## Widgets
Individual widgets can be internationalized by adding the `I18nMixin` mixin from `@dojo/framework/widget-core/mixins/I18n`. This mixin provides a `localizeBundle` function which is used to localise an imported message bundle.

Note that with this pattern it is possible for a widget to obtain its messages from multiple bundles; however, we strongly recommend limiting widgets to a single bundle whenever possible.

If the bundle supports the widget's current locale, but those locale-specific messages have not yet been loaded, then a bundle of blank message values is returned. Alternatively, the `localizeBundle` method accepts a second boolean argument, which, when `true`, causes the default messages to be returned instead of the blank bundle. The widget will be invalidated once the locale-specific messages have been loaded, triggering a re-render with the localized message content.

The object returned by `localizeBundle` contains the following properties and methods:

-   `messages`: An object containing the localized message key-value pairs. If the messages have not yet loaded, then `messages` will be either a blank bundle or the default messages, depending upon how `localizeBundle` was called.
-   `isPlaceholder`: a boolean property indicating whether the returned messages are the actual locale-specific messages (`false`) or just the placeholders used while waiting for the localized messages to finish loading (`true`). This is useful to prevent the widget from rendering at all if localized messages have not yet loaded.
-   `format(key: string, replacements: { [key: string]: string })`: a method that accepts a message key as its first argument and an object of replacement values as its second. For example, if the bundle contains `greeting: 'Hello, {name}!'`, then calling `format('greeting', { name: 'World' })` would return `'Hello, World!'`.

Each widget can have its own locale by passing a property - `properties.locale`. If no locale is set, then the default locale, as set by [`@dojo/framework/i18n`](./../i18n/README.md), is assumed.

```ts
const MyWidgetBase = I18nMixin(WidgetBase);

class I18nWidget extends MyWidgetBase<I18nWidgetProperties> {
	render() {
		// Load the "greetings" messages for the current locale. If the locale-specific
		// messages have not been loaded yet, then the default messages are returned,
		// and the widget will be invalidated once the locale-specific messages have
		// loaded.
		const { format, isPlaceholder, messages } = this.localizeBundle(greetingsBundle);

		// In many cases it makes sense to postpone rendering until the locale-specific messages have loaded,
		// which can be accomplished by returning early if `isPlaceholder` is `true`.
		if (isPlaceholder) {
			return;
		}

		return v('div', { title: messages.hello }, [
			w(Label, {
				// Passing a message string to a child widget.
				label: messages.purchaseItems
			}),
			w(Button, {
				// Passing a formatted message string to a child widget.
				label: format('itemCount', { count: 2 })
			})
		]);
	}
}
```

Once `I18nMixin` has been added to a widget, the default bundle can be replaced with the `i18nBundle` property. Further, while we recommend against using multiple bundles in the same widget, there may be times when you need to consume a third-party widget that does so. As such, `i18nBundle` can also be a `Map` of default bundles to override bundles.

```ts
import { Bundle } from '@dojo/framework/i18n/i18n';

// A complete bundle to replace WidgetA's message bundle
import overrideBundleForWidgetA from './nls/widgetA';

// Bundles for WidgetB
import widgetB1 from 'third-party/nls/widgetB1';
import overrideBundleForWidgetB from './nls/widgetB';

// WidgetB uses multiple bundles, but only `thirdy-party/nls/widgetB1` needs to be overridden
const overrideMapForWidgetB = new Map<Bundle<any>, Bundle<any>>();
map.set(widgetB1, overrideBundleForWidgetB);

export class MyWidget extends WidgetBase {
	protected render() {
		return [
			w(WidgetA, {
				i18nBundle: overrideBundleForWidgetA
			}),
			w(WidgetB, {
				i18nBundle: overrideMapForWidgetB
			})
		];
	}
}
```

## Managing I18n throughout an Application

### `registerI18nInjector`
To manage the i18n locale data throughout an application, the `I18nMixin` leverages the [Injectors, Providers & Containers](#injectors-providers--containers) to set an application's locale and inject the locale data into all widgets using the `I18nMixin`. When the locale is updated in the i18n `Injector` all i18n widgets will be invalidated and re-rendered with the updated locale.

`@dojo/framework/widget-core/mixins/I18n` exposes a convenience method, `registerI18nInjector` for registering the `i18n` injector with a registry.

```ts
import renderer from '@dojo/framework/widget-core/vdom';
import { w } from '@dojo/framework/widget-core/d';
import Registry from '@dojo/framework/widget-core/Registry';
import { registerI18nInjector } from '@dojo/framework/widget-core/mixins/I18n';

import App from './App';

const registry = new Registry();
registerI18nInjector({ locale: 'us', rtl: false }, registry);

const r = renderer(() => w(App, {}));
r.mount({ registry });
```

### Changing LocaleData

When using the `Registry` to inject i18n properties to widgets using the `I18nMixin`, `@dojo/framework/widget-core/mixins/I18n` provides a widget, `LocaleSwitcher` that can be used to inject a function for changing the applications locale. The widget has a `renderer` property that injects an `updateLocale` function and returns `DNode | DNode[]` to render.

#### Properties

-   `renderer`: (updateLocale(localeData: LocaleData) => void): DNode | DNode[]
    -   The `renderer` that is called with the `updateLocale` function and returns `DNode | DNode[]` that will be rendered
-   `registryLabel`(optional): string
    -   The registry label used to register the i18n injector. When using the `registerI18nInjector` this does not need to be set.

#### Example Usage

```ts
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import I18ndMixin, { LocaleSwitcher, UpdateLocale } from '@dojo/framework/widget-core/mixins/I18n';

import nlsBundle from '../nls/main';

class MyApp extends I18ndMixin(WidgetBase) {
	protected render() {
		const { messages } = this.localizeBundle(nlsBundle);

		return v('div', [
			w(LocaleSwitcher, {
				renderer: (updateLocale: UpdateLocale) => {
					return v('div', [
						v(
							'button',
							{
								onclick: () => {
									updateLocale({ locale: 'gb' });
								}
							},
							['English']
						),
						v(
							'button',
							{
								onclick: () => {
									updateLocale({ locale: 'fr' });
								}
							},
							['French']
						)
					]);
				}
			}),
			v('div', [messages.greetings])
		]);
	}
}
```

The above example shows a I18n widget, with the `LocaleSwitcher` used to render two buttons that will switch the locale between a english and french.

# Advanced formatting: CLDR

## Loading CLDR data

Given the very large size of the [Unicode CLDR data](http://cldr.unicode.org), it is not included as a dependency of `@dojo/framework/i18n`. For applications that use `@dojo/framework/i18n` only for selecting unformatted, locale-specific messages, this is not a concern. However, if using the [ICU-formatted messages](http://userguide.icu-project.org/formatparse/messages) or any of the other formatters provided by `@dojo/framework/i18n` (see below), applications must explicitly load any required CLDR data.

### Dojo applications

CLDR data can be loaded from an application's `.dojorc` build configuration file.

#### API
```ts
{
    "build-app": {
        "cldrPaths": string[]
    }
}
```

**TODO:** *fix up references to `locale`/`supportedLocales`*

> `cldrPaths`

An array of paths to [CLDR JSON](https://github.com/dojo/i18n#loading-cldr-data) files. Used in conjunction with the `locale` and `supportedLocales` options (see below). If a path contains the string `{locale}`, that file will be loaded for each locale listed in the `locale` and `supportedLocales` properties. For example, with the following configuration the `numbers.json` file will be loaded for the "en", "es", and "fr" locales:

>.dojorc
```json
{
	"build-app": {
		"locale": "en",
		"supportedLocales": [ "es", "fr" ]
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

For ICU message formatting:

-   `supplemental/likelySubtags`
-   `supplemental/plurals`

For date/time formatting:

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

For number/currency formatting:

-   `main/{locale}/currencies`
-   `main/{locale}/numbers`
-   `supplemental/currencyData`
-   `supplemental/likelySubtags`
-   `supplemental/numberingSystems`
-   `supplemental/ordinals`
-   `supplemental/plurals`

For unit formatting:

-   `main/{locale}/numbers`
-   `main/{locale}/units`
-   `supplemental/likelySubtags`
-   `supplemental/numberingSystems`
-   `supplemental/ordinals`
-   `supplemental/plurals`

## Message Formatting

The `i18n` module exposes two methods that handle message formatting: 1) `formatMessage`, which directly returns a formatted message based on its inputs, and 2) `getMessageFormatter`, which returns a method dedicated to formatting a single message. Both of these methods operate on bundle objects, which must first be registered with the i18n ecosystem by passing them to the `i18n` function (see below).

`@dojo/framework/i18n` supports the ICU message format (see below), but that requires CLDR data and is not something that every application requires. As such, if the `supplemental/likeSubtags` and `supplemental/plurals` data are not loaded, then both `formatMessage` and `getMessageFormatter` will perform simple token replacement. For example, given the `guestInfo` message `{host} invites {guest} to the party.`, an object with `host` and `guest` properties can be provided to a formatter without the need to load CLDR data:

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

**Note**: This feature requires CLDR data (see above).

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

**Note**: This feature requires CLDR data (see above).

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

# Standalone API

## Accessing locale message bundles
Once a default language bundle has been imported, any locale-specific messages are loaded by passing the default bundle to the `i18n` function.

For example:
```ts
import i18n, { Messages } from '@dojo/framework/i18n';
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

The current locale can be accessed via the read-only property `i18n.locale`, which will always be either the locale set via `switchLocale` (see below) or the `systemLocale`. `systemLocale` is always set to the user's default locale.

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
