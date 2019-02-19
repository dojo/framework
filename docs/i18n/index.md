- [Introduction](#introduction)
- [Basic Usage](#basic-usage)
  - [Internationalizing a widget](#internationalizing-a-widget)
  - [Adding a widget language localization bundle](#adding-a-widget-language-localization-bundle)
  - [Specifying a root locale within an application](#specifying-a-root-locale-within-an-application)
  - [Changing the locale within an application](#changing-the-locale-within-an-application)
  - [Using Dojo i18n as a standalone module](#using-dojo-i18n-as-a-standalone-module)
- [Working with message bundles](#working-with-message-bundles)
  - [Default bundles](#default-bundles)
  - [TypeScript structure](#typescript-structure)
  - [Importing and using bundles](#importing-and-using-bundles)
  - [Lazy vs. static loading](#lazy-vs-static-loading)
- [Internationalizing a Dojo application](#internationalizing-a-dojo-application)
  - [Configuring supported application locales](#configuring-supported-application-locales)
  - [Creating i18n-aware Widgets](#creating-i18n-aware-widgets)
  - [Providing locale data to i18n-aware widgets](#providing-locale-data-to-i18n-aware-widgets)
  - [Changing locales](#changing-locales)
    - [LocaleSwitcher Properties](#localeswitcher-properties)
    - [Example Usage](#example-usage)
- [Advanced formatting: CLDR](#advanced-formatting-cldr)
  - [Loading CLDR data](#loading-cldr-data)
    - [Dojo build system](#dojo-build-system)
    - [Standalone](#standalone)
  - [Required CLDR data per feature](#required-cldr-data-per-feature)
  - [Message Formatting](#message-formatting)
    - [Basic token replacement](#basic-token-replacement)
    - [ICU Message Formatting](#icu-message-formatting)
  - [Date and number formatting.](#date-and-number-formatting)
- [Standalone API](#standalone-api)
  - [Accessing locale message bundles](#accessing-locale-message-bundles)
  - [Determining the Current Locale](#determining-the-current-locale)
  - [Changing the Root Locale and Observing Locale Changes](#changing-the-root-locale-and-observing-locale-changes)

# Introduction

Dojo's `i18n` package solves a variety of common requirements and challenges around web application internationalization.

It is best used in Dojo applications to help render localized `Widget`s, including advanced message, date and number formatting, but can also be used as a standalone module if required.

Feature | Description
--- | ---
Per-widget localization | Each widget instance can have its own locale specified, allowing data from multiple locales to be displayed within a single application. If not specified, widgets fall back to the current root locale.
Fine-grained message bundling | Bundles can be decomposed and scoped locally to individual widgets, and can be lazily-loaded only if a given locale is in use. This allows message bundles to benefit from the same layer separation & bundled delivery as all other resources within an application.
Locale-specific message, date, and number formatting | Uses industry-standard [Unicode CLDR formatting](http://cldr.unicode.org/) rules. CLDR formatting data is optional and only needs to be loaded if advanced formatting is required. Applications that only require basic locale-based message substitution can simply use Dojo `i18n`.
Reactive locale change response | Similar to other reactive state changes within a Dojo application, messages can be automatically reloaded and affected widgets re-rendered when changing locales.<br>If using `i18n` as a standalone module, locale change events can be acted on via listener callbacks.
Fallback locale detection | Ensures a default locale is available if a root override has not been explicitly set.<br>When running client-side, this defaults to the user or system locale, and when running server-side, this defaults to the process or host locale.

# Basic Usage

## Internationalizing a widget

Starting off with a single default language (English).

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

Supporting two locales - English as the default, together with a French translation that is activated for any users that have `fr` set as their primary language.

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
		fr: () => import('./fr/MyI18nWidget.fr')
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

## Specifying a root locale within an application

Using the [i18n injector function](#providing-locale-data-to-i18n-aware-widgets) to surface locale properties within all i18n-aware widgets.
>src/main.ts
```ts
import renderer from '@dojo/framework/widget-core/vdom';
import { w } from '@dojo/framework/widget-core/d';
import Registry from '@dojo/framework/widget-core/Registry';
import { registerI18nInjector } from '@dojo/framework/widget-core/mixins/I18n';

import App from './App';

const registry = new Registry();
registerI18nInjector({ locale: 'en-us', rtl: false }, registry);

const r = renderer(() => w(App, {}));
r.mount({ registry });
```

## Changing the locale within an application

Using the [LocaleSwitcher](#changing-locales) utility widget to allow users to choose between supported locales, and enact a locale change via `LocaleSwitcher`'s `updateLocale` method. This should be used together with [registeri18ninjector](#providing-locale-data-to-i18n-aware-widgets) to reactively propagate locale changes to all i18n-aware widgets.

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
## Using Dojo i18n as a standalone module

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

## Default bundles

Dojo applications can choose to use a single message set across the entire application, or they can decompose messages to be more fine-grained and scoped more closely to the widget(s) they are referenced from.

For each set of language bundles, whether for a single widget or a complete application, one language within the set is required to act as the default import. The default language bundle serves two main requirements:
* it provides a comprehensive set of message keys and their values that are used as a fallback if other languages do not provide overrides
* it lists other supported languages, as well as the mechanism to load each supported language's message bundle

## TypeScript structure
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

**(TODO: remove?)** Each default bundle is assigned a unique `id` property that is used internally to manage caching and handle interoperability with Globalize.js (see below). While it is possible to include an `id` with your message bundles, doing so is neither necessary nor recommended.

## Importing and using bundles

The default language bundle is `import`ed like any other TypeScript module into each widget that requires use of the set of messages contained within the bundle.

For example, given a default bundle:
>nls/MyI18nWidget.en.ts
```ts
export default {
	messages: {
		hello: 'Hello',
		welcome: 'Welcome to your application'
	}
};
```

This can be imported and referenced within a widget such as:
>widgets/MyI18nWidget.ts
```ts
import { WidgetBase } from '@dojo/framework/widget-core/WidgetBase';
import { v } from '@dojo/framework/widget-core/d';
import I18nMixin from "@dojo/framework/widget-core/mixins/I18n";

import myWidgetMessageBundle from '../nls/MyI18nWidget.en.ts';

export default class MyI18nWidget extends I18nMixin(WidgetBase) {
	protected render() {
		const { messages } = this.localizeBundle(myWidgetMessageBundle);

		return v('div', { title: messages.hello }, [ messages.welcome ]);
	}
}
```

As this sample widget loads its messages through `I18nMixin`'s [localizeBundle](#creating-i18n-aware-widgets) method, it will continue to work as new language translations are added and referenced within the `nls/MyI18nWidget.en.ts` default bundle. Users will see localized messages from `MyI18nWidget` instances if a message bundle for their currently set language is available.

Applications that want to override user default languages and allow changing locales within the application itself require additional setup, covered in [Internationalizing a Dojo application](#internationalizing-a-dojo-application).

## Lazy vs. static loading

It is preferable to use functions in the default language's `locales` map, as this allows locale message bundles to be lazily loaded, only if required. **TODO:** *is there a risk of rendering default fallbacks & re-rendering updated values on load completion when lazy loading?*

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

## Configuring supported application locales

An internationalized application should specify all its supported locales within its `.dojorc` build configuration file. One locale should be designated as the primary/default locale for the application, with the remainder of the supported locales as secondary options that can be activated when required. This is done via the `locale` property and `supportedLocales` list within the `build-app` section.

- `locale`: string
    - The primary locale supported by the application. That is, the default language that will be used if an override locale is not specified.
- `supportedLocales`: string[]
    - A list of additional locales that the application supports. These locales need to be activated to override the default `locale`, either implicitly through an application user's language setting when running client-side, the process' or host's language setting when running server-side, or [explicitly within the application itself](#providing-locale-data-to-i18n-aware-widgets).

For example, with the following configuration, an application specifies that its default locale is English (`en`), and that it supports Spanish (`es`) and French (`fr`) as additional locale choices:

>.dojorc
```json
{
	"build-app": {
		"locale": "en",
		"supportedLocales": [ "es", "fr" ]
	}
}
```
## Creating i18n-aware Widgets
Individual widgets can be internationalized by adding the `I18nMixin` mixin from `@dojo/framework/widget-core/mixins/I18n`. This mixin provides a `localizeBundle` function which is used to localise an imported message bundle.

Note that with this pattern it is possible for a widget to obtain its messages from multiple bundles; however, we strongly recommend limiting widgets to a single bundle whenever possible.

If the bundle supports the widget's current locale, but those locale-specific messages have not yet been loaded, then a bundle of blank message values is returned. Alternatively, the `localizeBundle` method accepts a second boolean argument, which, when `true`, causes the default messages to be returned instead of the blank bundle. The widget will be invalidated once the locale-specific messages have been loaded, triggering a re-render with the localized message content.

The object returned by `localizeBundle` contains the following properties and methods:

-   `messages`: An object containing the localized message key-value pairs. If the messages have not yet loaded, then `messages` will be either a blank bundle or the default messages, depending upon how `localizeBundle` was called.
-   `isPlaceholder`: a boolean property indicating whether the returned messages are the actual locale-specific messages (`false`) or just the placeholders used while waiting for the localized messages to finish loading (`true`). This is useful to prevent the widget from rendering at all if localized messages have not yet loaded.
-   `format(key: string, replacements: { [key: string]: string })`: a method that accepts a message key as its first argument and an object of replacement values as its second. For example, if the bundle contains `greeting: 'Hello, {name}!'`, then calling `format('greeting', { name: 'World' })` would return `'Hello, World!'`.

**TODO:** are `properties.locale`/`i18nBundle` still relevant?

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

## Providing locale data to i18n-aware widgets
The Dojo registry is used to manage i18n locale data throughout an application, where locale data is injected into all i18n-aware widgets that utilize `I18nMixin`. When the application locale is changed, the i18n `Injector` will propagate new locale properties to all `I18nMixin` widgets, after which the affected widgets will be invalidated and re-rendered with the updated locale data.

This mechanism is enabled through `registerI18nInjector`, a convenience method provided by `@dojo/framework/widget-core/mixins/I18n`. Calling this method will register the `i18n` injector within a specific registry instance. Typically this is done at application bootstrap, where the i18n injector is registered against the global registry passed to the `renderer.mount()` method.

>main.ts
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

## Changing locales

In combination with using the [i18n injector](#providing-locale-data-to-i18n-aware-widgets) to pass locale data to `I18nMixin` widgets, applications can use the `LocaleSwitcher` provider widget within `@dojo/framework/widget-core/mixins/I18n` to give users to ability to change locales. Applications can pass a `renderer` function property into a `LocaleSwitcher` instance, which will have an `updateLocale` function injected into it. The implementation of `renderer` should return `DNode | DNode[]`, similar to a regular widget `render` method. The implementation of the `renderer` function can then call `updateLocale` to enact a locale change throughout the application, for example in response to a user event when selecting a new locale from a list.

### LocaleSwitcher Properties

-   `renderer`: (updateLocale(localeData: LocaleData) => void): DNode | DNode[]
    -   A function that is called with an `updateLocale` argument and should return `DNode | DNode[]`. The implementation's return value will be rendered, and can for example provide users a list of available locales that they can select from. In response to a user selecting a locale option, the implementation can then call `updateLocale` to enact a locale change within the whole application.
-   `registryLabel`(optional): string
    -   The registry label used to look up the i18n injector that will be invoked on an `updateLocale` call. This property does not need to be set when using the [registerI18nInjector](#providing-locale-data-to-i18n-aware-widgets) utility.

### Example Usage

The following example shows an i18n-aware widget that uses `LocaleSwitcher` to render two buttons that allow switching the application locale between English and French.

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
									updateLocale({ locale: 'en' });
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
