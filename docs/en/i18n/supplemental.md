# Working with message bundles

Dojo's concept of a message bundle is a map of keyed text messages, with message content for each key represented across one or more languages.

A Dojo application refers to a particular message via its key when needing to display that message to an end user. This avoids hard-coding a single language's text within code, and instead provides an externalized set of messages in one or more languages that can be maintained independently of the application's code.

At render time, Dojo's i18n framework handles the replacement of message keys with their text content for a particular language, depending on the current locale setting within the widget that is referencing the message keys.

Dojo applications can choose to use a single message bundle across the entire application, or they can decompose messages to be more fine-grained and scoped more closely to the widget(s) they are referenced from, ending up with an application containing several message bundles.

## Bundle default language

Each message bundle has its own set of supported language translations. One language within the set is required to act as the default module for the rest of the bundle. The default language module acts as the primary import/reference to the bundle, and serves two main requirements:

-   Provides a comprehensive set of message keys and their content (represented in the default language) that are used as a fallback if other languages within the bundle do not provide overrides for a given key
-   Lists the bundle's other supported languages, as well as the mechanism to load the set of messages from each supported language's module

## TypeScript structure

Every language within a bundle is a TypeScript module, and is required to export a default object representing a map of message keys to their translated values within the particular language.

For example, a French language module within a bundle:

> nls/fr/main.ts

```ts
export default {
	hello: 'Bonjour',
	goodbye: 'Au revoir'
};
```

### Default language module

The language module designated as the bundle's default is formatted slightly differently to other languages. The default module needs to export an object with the following properties

-   `messages`
    -   A map of message keys to values in the default language, structured in the same way as the object exported by other languages in the bundle. This represents the canonical set of message keys supported by the bundle.<br>When the application locale is set to the default value, these `messages` are used as a regular lookup when resolving message keys. When a non-default locale is in use, these `messages` are used as fallbacks for any keys not included in the bundle's additional language modules.
-   `locales`
    -   An optional property that represents a map of locale identifiers to functions that can load the message set for each language/locale supported by the bundle.

For example, a bundle with English as the default that also supports French, Arabic and Japanese:

> nls/main.ts

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

> .dojorc

```ts
{
	"build-app": {
		"locale": "en",
		"supportedLocales": [ "fr", "ar", "ja" ]
	}
}
```

## Importing and using bundles

The default language module for a bundle is `import`ed like any other TypeScript module into each widget that requires use of the set of messages contained within the bundle.

For example, given a default bundle:

> nls/en/MyI18nWidget.ts

```ts
export default {
	messages: {
		hello: 'Hello',
		welcome: 'Welcome to your application'
	}
};
```

This can be imported and referenced within a widget such as:

> widgets/MyI18nWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import i18n from '@dojo/framework/core/middleware/i18n';

import myWidgetMessageBundle from '../nls/en/MyI18nWidget';

const factory = create({ i18n });

export default factory(function MyI18nWidget({ middleware: { i18n } }) {
	const { messages } = i18n.localize(myWidgetMessageBundle);

	return <div title={messages.hello}>{messages.welcome}</div>;
});
```

As this example widget loads its messages through the `i18n` middleware's [`.localize`](/learn/i18n/internationalizing-a-dojo-application#i18n-localize-method) method, it will continue to work as new language translations are added and referenced within the bundle's `nls/en/MyI18nWidget.ts` default language module. Users will see localized messages from `MyI18nWidget` instances if a message set for their currently configured language is available.

Applications that want to override user default languages and allow changing locales within the application itself require additional setup, covered in [Internationalizing a Dojo application](/learn/i18n/internationalizing-a-dojo-application).

## Lazy vs. static loading

It is preferable to use functions in the default language's `locales` map to load other language translation modules, as this allows locale message bundles to be lazily loaded, only if required.

Some applications may however prefer certain languages to be statically loaded along with the bundle's default language module, and can do so by returning a compatible object structure directly.

An example of both types of loading within a bundle:

```ts
import fr from './fr/main';

export default {
	locales: {
		// Locale providers can load translations lazily...
		ar: () => import('./ar/main'),
		'ar-JO': () => import('./ar-JO/main'),

		// ... or return references directly.
		fr
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

**Note**: Since the various formatters and parsers rely on locale-specific [CLDR](http://cldr.unicode.org) data, most of the functionality provided by `@dojo/framework/i18n` requires at least a `locale` to be set in the `.dojorc` in order to function properly. For example, if no default `locale` is specified, then only the default bundle messages will be returned and [ICU message formatting](#icu-message-formatting) will be disabled.

-   `locale`: string
    -   The primary locale supported by the application. That is, the default language that will be used if an override locale is not specified.
-   `supportedLocales`: string[]
    -   A list of additional locales that the application supports. These locales need to be activated to override the default `locale`, either implicitly through an application user's language setting when running client-side, the process' or host's language setting when running server-side, or [explicitly within the application itself](/learn/i18n/internationalizing-a-dojo-application#providing-locale-data-to-i18n-aware-widgets).

For example, with the following configuration, an application specifies that its default locale is English (`en`), and that it supports Spanish (`es`) and French (`fr`) as additional locale choices:

> .dojorc

```json
{
	"build-app": {
		"locale": "en",
		"supportedLocales": ["es", "fr"]
	}
}
```

## Creating i18n-aware widgets

Individual widgets can be internationalized by using the `i18n` middleware from `@dojo/framework/core/middleware/i18n`. Using the middleware adds some optional i18n-related properties to the widget property interface. The API for the `i18n` middleware includes a method, `localize(bundle)` to get the localized nls values given a message bundle and two methods that can be used to get and set the application's locale details.

### `i18n` widget properties

-   `locale`?: string
    -   The locale for the widget.<br>If not specified, then the [root application locale](/learn/i18n/internationalizing-a-dojo-application#providing-locale-data-to-i18n-aware-widgets) or [its override](/learn/i18n/internationalizing-a-dojo-application#changing-locales) is assumed.<br>If specified, the widget's DOM node will have a `lang` property set to the locale.
-   `rtl`?: boolean
    -   An optional flag indicating the widget's text direction. If `true`, then the underlying DOM node's `dir` property is set to `"rtl"`. If it is `false`, then the `dir` property is set to `"ltr"`. Otherwise, the property is not set.
-   `i18nBundle`?: `Bundle<Messages>` | `Map<Bundle<Messages>, Bundle<Messages>>`
    -   An optional override for the [default language bundle](/learn/i18n/working-with-message-bundles#default-language-module) passed to the `localizeBundle` method. If the override contains a `messages` object, then it will completely replace the underlying default language bundle that the widget may be using. If the override only contains a `locales` object, a new bundle will be created with the additional locale loaders specified in the override.

### `i18n` `localize()` method

Widgets can pass in their [default language bundle](/learn/i18n/working-with-message-bundles#default-language-module) into the `localize` method to have the bundle localized appropriately given the widget's `locale` property.

If the bundle supports the widget's current locale, but those locale-specific messages have not yet been loaded, then a bundle of blank message values is returned. Alternatively, the `localize` method accepts a second boolean argument, which, when `true`, causes the default messages to be returned instead of the blank bundle. The widget will be invalidated once the locale-specific messages have been loaded, triggering a re-render with the localized message content.

The object returned by `localize` contains the following properties and methods:

-   `messages`
    -   An object containing the localized message key-value pairs. If the messages have not yet loaded, then `messages` will be either a blank bundle or the default messages, depending upon how `localize` was called.
-   `isPlaceholder`
    -   A boolean property indicating whether the returned messages are the actual locale-specific messages (`false`) or just the placeholders used while waiting for the localized messages to finish loading (`true`). This is useful to prevent the widget from rendering at all if localized messages have not yet loaded.
-   `format(key: string, replacements: { [key: string]: string })`
    -   A method that accepts a message key as its first argument and an object of replacement values as its second. For example, if the bundle contains `greeting: 'Hello, {name}!'`, then calling `format('greeting', { name: 'World' })` would return `'Hello, World!'`.

An example of using all features returned by `localize`:

> nls/en/MyI18nWidget.ts

```ts
export default {
	messages: {
		hello: 'Welcome to the shop',
		purchaseItems: 'Please confirm your purchase',
		itemCount: 'Purchase {count} items'
	}
};
```

> widgets/MyI18nWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import i18n from '@dojo/framework/core/middleware/i18n';
import Label from '@dojo/widgets/label';
import Button from '@dojo/widgets/button';

import greetingsBundle from '../nls/en/MyI18nWidget';

const factory = create({ i18n });

export default factory(function MyI18nWidget({ middleware: { i18n } }) {
	// Load the "greetings" messages for the current locale. If the locale-specific
	// messages have not been loaded yet, then the default messages are returned,
	// and the widget will be invalidated once the locale-specific messages have
	// loaded.
	const { format, isPlaceholder, messages } = i18n.localize(greetingsBundle);

	// In many cases it makes sense to postpone rendering until the locale-specific messages have loaded,
	// which can be accomplished by returning early if `isPlaceholder` is `true`.
	if (isPlaceholder) {
		return;
	}

	return v('div', { title: messages.hello }, [
		w(Label, {}, [
			// Passing a message string to a child widget.
			messages.purchaseItems
		]),
		w(Button, {}, [
			// Passing a formatted message string to a child widget.
			format('itemCount', { count: 2 })
		])
	]);
});
```

Note that with this pattern it is possible for a widget to obtain its messages from multiple bundles. When favoring simplicity, however, it is recommend that widgets are limited to a single bundle wherever possible.

### `I18nMixin` for class-based widgets

Individual class-based widgets can be internationalized by adding the `I18nMixin` mixin from `@dojo/framework/core/mixins/I18n`. This mixin adds the same optional i18n-related widget properties as the `i18n` middleware, and provides a `localizeBundle` method which is used to localize an imported message bundle to the widget's current locale.

#### `localizeBundle()` method

Widgets can pass in their [default language bundle](/learn/i18n/working-with-message-bundles#default-language-module) into the `localizeBundle` method to have the bundle localized appropriately given the widget's `locale` property.

If the bundle supports the widget's current locale, but those locale-specific messages have not yet been loaded, then a bundle of blank message values is returned. Alternatively, the `localizeBundle` method accepts a second boolean argument, which, when `true`, causes the default messages to be returned instead of the blank bundle. The widget will be invalidated once the locale-specific messages have been loaded, triggering a re-render with the localized message content.

The object returned by `localizeBundle` contains the following properties and methods:

-   `messages`
    -   An object containing the localized message key-value pairs. If the messages have not yet loaded, then `messages` will be either a blank bundle or the default messages, depending upon how `localizeBundle` was called.
-   `isPlaceholder`
    -   A boolean property indicating whether the returned messages are the actual locale-specific messages (`false`) or just the placeholders used while waiting for the localized messages to finish loading (`true`). This is useful to prevent the widget from rendering at all if localized messages have not yet loaded.
-   `format(key: string, replacements: { [key: string]: string })`
    -   A method that accepts a message key as its first argument and an object of replacement values as its second. For example, if the bundle contains `greeting: 'Hello, {name}!'`, then calling `format('greeting', { name: 'World' })` would return `'Hello, World!'`.

An example of using all features returned by `localizeBundle`:

> nls/en/MyI18nWidget.ts

```ts
export default {
	messages: {
		hello: 'Welcome to the shop',
		purchaseItems: 'Please confirm your purchase',
		itemCount: 'Purchase {count} items'
	}
};
```

> widgets/MyI18nWidget.ts

```ts
import WidgetBase from '@dojo/framework/core/WidgetBase';
import { v, w } from '@dojo/framework/core/vdom';
import I18nMixin from '@dojo/framework/core/mixins/I18n';
import Label from '@dojo/widgets/label';
import Button from '@dojo/widgets/button';

import greetingsBundle from '../nls/en/MyI18nWidget';

export default class MyI18nWidget extends I18nMixin(WidgetBase) {
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
			w(Label, {}, [
				// Passing a message string to a child widget.
				messages.purchaseItems
			]),
			w(Button, {}, [
				// Passing a formatted message string to a child widget.
				format('itemCount', { count: 2 })
			])
		]);
	}
}
```

## Providing locale data to i18n-aware widgets

Locale details also need to be managed via a Dojo registry when applications use i18n-aware class-based widgets (specifically, those that use `I18nMixin`). This applies to any such widgets contained within the application itself or as part of an external dependency - including any widgets used from Dojo's `@dojo/widgets` suite. Locale data is injected into all such widgets through the Dojo registry system; these widgets will be invalidated and re-rendered with updated locale data when the application locale is changed.

This mechanism is enabled through `registerI18nInjector`, a convenience method provided by `@dojo/framework/core/mixins/I18n`. Calling this method will register the `i18n` injector within a specific registry instance. Typically this is done at application bootstrap, where the i18n injector is registered against the global registry passed to the `renderer.mount()` method.

> main.ts

```ts
import renderer from '@dojo/framework/core/vdom';
import { w } from '@dojo/framework/core/vdom';
import Registry from '@dojo/framework/core/Registry';
import { registerI18nInjector } from '@dojo/framework/core/mixins/I18n';

import App from './App';

const registry = new Registry();
registerI18nInjector({ locale: 'us', rtl: false }, registry);

const r = renderer(() => w(App, {}));
r.mount({ registry });
```

## Changing locales

The `i18n` middleware can be used to change the application's locale. Calling `i18n.set({ locale: string, rtl: boolean });` will propagate the new locale to all widgets that are using the `i18n` middleware, as well as any using `I18nMixin` (assuming [registerI18nInjector](#providing-locale-data-to-i18n-aware-widgets) has previously been setup in the application).

### Example usage

The following example shows an i18n-aware widget that renders two buttons that allow switching the application locale between English and French.

```ts
import { create, tsx } from '@dojo/framework/core/vdom';
import i18n from '@dojo/framework/core/middleware/i18n';

import nlsBundle from '../nls/main';

const factory = create({ i18n });

export default factory(function LocaleChanger({ middleware: { i18n } }) {
	const { messages } = localize(nlsBundle);
	return (
		<div>
			<button
				onclick={() => {
					i18n.set({ locale: 'en' });
				}}
			>
				English
			</button>
			<button
				onclick={() => {
					i18n.set({ locale: 'fr' });
				}}
			>
				French
			</button>
			<div>{messages.greetings}</div>
		</div>
	);
});
```

## Overriding locales and bundles per-widget

Widgets that use either the `i18n` middleware or `I18nMixin` can have their [i18n widget properties](#i18nmixin-widget-properties) overridden when instantiated by a parent. This can be useful when rendering several widgets with different locales in a single application (that is, using multiple locales within one application), as well as to override the set of messages a third-party widget may be using and align them within the context of your application.

Each i18n-aware widget can have its own independent locale by providing a `locale` widget property. If no `locale` property is set, then the [default locale](#default-locale) is assumed.

The widget's default bundle can also be replaced by passing an `i18nBundle` widget property. Dojo recommends against using multiple bundles in the same widget, but there may be times when an application needs to consume a third-party widget that does make use of more than one bundle. As such, `i18nBundle` can also be a `Map` of default bundles to override bundles.

An example of overriding bundles within child widgets:

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
			}),
			// This example partially overrides the overrideKey value in the widgetB1 bundle
			w(WidgetC, {
				i18nBundle: { ...widgetB1, { overrideKey: 'abc' }}
			})
		];
	}
}
```

## Default locale

The locale that an [i18n-aware widget](#creating-i18n-aware-widgets) will use is determined in the following order until a value is found, depending on which i18n features an application makes use of:

| Order | I18n capability                                     | Locale setting                                                                                                                                                                               |
| ----: | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|     1 | **`I18nMixin`/`i18n` middleware**                   | An explicit override provided via [the widget's `locale` property](#overriding-locales-and-bundles-per-widget).                                                                              |
|     2 | **`I18nMixin`/`i18n` middleware and i18n injector** | A locale that has been [selected or changed within the application](#changing-locales)                                                                                                       |
|     3 | **`I18nMixin`/`i18n` middleware and i18n injector** | The default locale set when initially registering [the i18n injector](#providing-locale-data-to-i18n-aware-widgets).                                                                         |
|     4 | **`.dojorc`**                                       | A user's current locale, such as their browser language setting, if the locale [is in the application's list of `build-app`.`supportedLocales`](#configuring-supported-application-locales). |
|     5 | **`.dojorc`**                                       | The application's [default locale specified in `build-app`.`locale`](#configuring-supported-application-locales).                                                                            |
|     6 | **`@dojo/framework/i18n`**                          | An explicit locale set via [Dojo i18n's `switchLocale` method](#changing-the-root-locale-and-observing-locale-changes).                                                                      |
|     7 | **`@dojo/framework/i18n`**                          | The [`systemLocale` for the current execution environment](#determining-the-current-locale).                                                                                                 |

# Advanced formatting

## Message formatting

### Basic token replacement

Dojo's `i18n` framework supports [ICU message formatting](#icu-message-formatting), which also supports basic token replacement.

The message formatting examples in the next two subsections will use a [message bundle](#working-with-message-bundles) with a `guestInfo` message as follows:

> nls/main.ts

```ts
export default {
	messages: {
		guestInfo: '{host} invites {guest} to the party.'
	}
};
```

#### Replacing tokens in widgets

[I18n-aware widgets](#creating-i18n-aware-widgets) can use the `format` function returned from [the `i18n` middleware's `localize` method](#i18nmiddleware-localize-method) to perform simple token replacement in their messages.

The `guestInfo` message can be rendered directly via `format`:

> widgets/MyI18nWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import i18n from '@dojo/framework/core/middleware/i18n';

import nlsBundle from '../nls/main';

const factory = create({ i18n });

export default factory(function MyI18nWidget({ middleware: { i18n } }) {
	const { format } = i18n.localize(nlsBundle);

	return (
		<div>
			{format('guestInfo', {
				host: 'Margaret Mead',
				guest: 'Laura Nader'
			})}
		</div>
		// Will render as 'Margaret Mead invites Laura Nader to the party.'
	);
});
```

#### Direct token replacement formatting

The object returned by [the `localizeBundle` function](#accessing-locale-message-bundles) from the `i18n` module includes a `format` method that handles message formatting:

```ts
import { localizeBundle } from '@dojo/framework/i18n/i18n';
import bundle from 'nls/main';

localizeBundle(bundle, { locale: 'en' }).then(({ format }) => {
	const message = format('guestInfo', {
		host: 'Margaret Mead',
		guest: 'Laura Nader'
	});
	console.log(message); // "Margaret Mead invites Laura Nader to the party."
});
```

### ICU message formatting

`@dojo/framework/i18n` relies on [Globalize.js](https://github.com/jquery/globalize/blob/master/doc/api/message/message-formatter.md) for [ICU message formatting](http://userguide.icu-project.org/formatparse/messages), and as such all of the features offered by Globalize.js are available through `@dojo/framework/i18n`.

The message formatting examples in the next two subsections will use a [message bundle](#working-with-message-bundles) with an updated `guestInfo` message as follows:

> nls/main.ts

```ts
export default {
	messages: {
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
	}
};
```

#### ICU message formatting in widgets

[I18n-aware widgets](#creating-i18n-aware-widgets) can use the `format` function returned from [their `localizeBundle` method](#i18nmixin-localizebundle-method) to perform ICU message formatting in the same way as for [simple token replacement](#replacing-tokens-in-widgets) described above.

The ICU-formatted `guestInfo` message can then be rendered as:

> widgets/MyI18nWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import i18n from '@dojo/framework/core/middleware/i18n';

import nlsBundle from '../nls/main';

const factory = create({ i18n });

export default factory(function MyI18nWidget({ middleware: { i18n } }) {
	const { format } = i18n.localize(nlsBundle);

	return (
		<div>
			{
			format('guestInfo', {
				host: 'Margaret Mead',
				gender: 'female',
				guest: 'Laura Nader',
				guestCount: 20
			})
			}
		</div>
		]); // Will render as 'Margaret Mead invites Laura Nader and 19 other people to her party.'
	);
});
```

#### Direct ICU message formatting

The ICU-formatted `guestInfo` message can be converted directly with the `format` method included on the object returned by [`localizeBundle`](#accessing-locale-message-bundles).

```ts
import { localizeBundle } from '@dojo/framework/i18n/i18n';
import bundle from 'nls/main';

// 1. Load the messages for the locale.
localizeBundle(bundle, { locale: 'en' }).then(({ format }) => {
	const message = format('guestInfo', {
		host: 'Margaret Mead',
		gender: 'female',
		guest: 'Laura Nader',
		guestCount: 20
	});
	console.log(message); // "Margaret Mead invites Laura Nader and 19 other people to her party."

	console.log(
		format('guestInfo', {
			host: 'Marshall Sahlins',
			gender: 'male',
			guest: 'Bronisław Malinowski'
		})
	); // "Marshall Sahlins invites Bronisław Malinowski to his party."
});
```

## Date and number formatting.

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

Once a [default language bundle](/learn/i18n/working-with-message-bundles#default-language-module) has been imported, any locale-specific messages are accessed by passing the message bundle to the `i18n` function.

For example:

```ts
import { localizeBundle } from '@dojo/framework/i18n/i18n';
import bundle from 'nls/main';

localizeBundle(bundle, { locale: 'fr' }).then(({ messages }) => {
	console.log(messages.hello); // "Bonjour"
	console.log(messages.goodbye); // "Au revoir"
});
```

If an unsupported locale is passed to `i18n`, then the default messages are returned. Further, any messages not provided by the locale-specific bundle will also fall back to their defaults. As such, the default bundle should contain _all_ message keys used by any of the locale-specific bundles.

## Determining the current locale

`@dojo/framework/i18n/i18n` exposes two related methods for determining the current locale:

-   `getCurrentLocale`, which represents the application's current, top-level locale.
-   `getComputedLocale`, which will be either the user's system locale if it is listed among the supported locales specified in the `.dojorc`, or the default locale specified in the `.dojorc` if the user's system locale is not supported.
