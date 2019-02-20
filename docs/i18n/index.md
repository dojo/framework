- [Introduction](#introduction)
- [Basic Usage](#basic-usage)
  - [Internationalizing a widget](#internationalizing-a-widget)
  - [Adding a widget language localization bundle](#adding-a-widget-language-localization-bundle)
  - [Specifying a root locale within an application](#specifying-a-root-locale-within-an-application)
  - [Changing the locale within an application](#changing-the-locale-within-an-application)
  - [Using Dojo i18n as a standalone module](#using-dojo-i18n-as-a-standalone-module)
- [Working with message bundles](./10-bundles.md#working-with-message-bundles)
  - [Bundle default language](./10-bundles.md#bundle-default-language)
  - [TypeScript structure](./10-bundles.md#typescript-structure)
    - [Default language module](./10-bundles.md#default-language-module)
  - [Importing and using bundles](./10-bundles.md#importing-and-using-bundles)
  - [Lazy vs. static loading](./10-bundles.md#lazy-vs-static-loading)
- [Internationalizing a Dojo application](./20-i18n-dojo-apps.md#internationalizing-a-dojo-application)
  - [Configuring supported application locales](./20-i18n-dojo-apps.md#configuring-supported-application-locales)
  - [Creating i18n-aware Widgets](./20-i18n-dojo-apps.md#creating-i18n-aware-widgets)
    - [`I18nMixin` Widget Properties](./20-i18n-dojo-apps.md#i18nmixin-widget-properties)
    - [`I18nMixin` `localizeBundle()` method](./20-i18n-dojo-apps.md#i18nmixin-localizebundle-method)
  - [Providing locale data to i18n-aware widgets](./20-i18n-dojo-apps.md#providing-locale-data-to-i18n-aware-widgets)
  - [Changing locales](./20-i18n-dojo-apps.md#changing-locales)
    - [LocaleSwitcher Properties](./20-i18n-dojo-apps.md#localeswitcher-properties)
    - [Example Usage](./20-i18n-dojo-apps.md#example-usage)
  - [Overriding locales and bundles per-widget](./20-i18n-dojo-apps.md#overriding-locales-and-bundles-per-widget)
- [Advanced formatting: CLDR](./30-formatting.md#advanced-formatting-cldr)
	- [Loading CLDR data](./30-formatting.md#loading-cldr-data)
		- [Dojo build system](./30-formatting.md#dojo-build-system)
		- [Standalone](./30-formatting.md#standalone)
	- [Required CLDR data per feature](./30-formatting.md#required-cldr-data-per-feature)
	- [Message Formatting](./30-formatting.md#message-formatting)
		- [Basic token replacement](./30-formatting.md#basic-token-replacement)
		- [ICU Message Formatting](./30-formatting.md#icu-message-formatting)
	- [Date and number formatting.](./30-formatting.md#date-and-number-formatting)
- [Standalone API](./40-standalone.md#standalone-api)
  - [Accessing locale message bundles](./40-standalone.md#accessing-locale-message-bundles)
  - [Determining the Current Locale](./40-standalone.md#determining-the-current-locale)
  - [Changing the Root Locale and Observing Locale Changes](./40-standalone.md#changing-the-root-locale-and-observing-locale-changes)

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

---

**Next:** [Working with message bundles](./10-bundles.md)
