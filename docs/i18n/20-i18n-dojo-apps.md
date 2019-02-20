- [Internationalizing a Dojo application](#internationalizing-a-dojo-application)
  - [Configuring supported application locales](#configuring-supported-application-locales)
  - [Creating i18n-aware Widgets](#creating-i18n-aware-widgets)
    - [`I18nMixin` Widget Properties](#i18nmixin-widget-properties)
    - [`I18nMixin` `localizeBundle()` method](#i18nmixin-localizebundle-method)
  - [Providing locale data to i18n-aware widgets](#providing-locale-data-to-i18n-aware-widgets)
  - [Changing locales](#changing-locales)
    - [LocaleSwitcher Properties](#localeswitcher-properties)
    - [Example Usage](#example-usage)
  - [Overriding locales and bundles per-widget](#overriding-locales-and-bundles-per-widget)

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
Individual widgets can be internationalized by adding the `I18nMixin` mixin from `@dojo/framework/widget-core/mixins/I18n`. This mixin adds some optional i18n-related widget properties, and also provides a `localizeBundle` method which is used to localize an imported message bundle to the widget's current locale.

### `I18nMixin` Widget Properties

- `locale`?: string
    -  The locale for the widget.<br>If not specified, then the [root application locale](#providing-locale-data-to-i18n-aware-widgets) or [its override](#changing-locales) is assumed.<br>If specified, the widget's DOM node will have a `lang` property set to the locale.
- `rtl`?: boolean
    - An optional flag indicating the widget's text direction. If `true`, then the underlying DOM node's `dir` property is set to `"rtl"`. If it is `false`, then the `dir` property is set to `"ltr"`. Otherwise, the property is not set.
- `i18nBundle`?: `Bundle<Messages>` | `Map<Bundle<Messages>, Bundle<Messages>>`
    -  An optional override for the [default language bundle](./10-bundles.md#default-language-module) passed to the `localizeBundle` method. If the override contains a `messages` object, then it will completely replace the underlying default language bundle that the widget may be using. If the override only contains a `locales` object, a new bundle will be created with the additional locale loaders specified in the override.

### `I18nMixin` `localizeBundle()` method

Widgets can pass in their [default language bundle](./10-bundles.md#default-language-module) into the `localizeBundle` method to have the bundle localized appropriately given the widget's `locale` property.

If the bundle supports the widget's current locale, but those locale-specific messages have not yet been loaded, then a bundle of blank message values is returned. Alternatively, the `localizeBundle` method accepts a second boolean argument, which, when `true`, causes the default messages to be returned instead of the blank bundle. The widget will be invalidated once the locale-specific messages have been loaded, triggering a re-render with the localized message content.

The object returned by `localizeBundle` contains the following properties and methods:

-   `messages`: An object containing the localized message key-value pairs. If the messages have not yet loaded, then `messages` will be either a blank bundle or the default messages, depending upon how `localizeBundle` was called.
-   `isPlaceholder`: a boolean property indicating whether the returned messages are the actual locale-specific messages (`false`) or just the placeholders used while waiting for the localized messages to finish loading (`true`). This is useful to prevent the widget from rendering at all if localized messages have not yet loaded.
-   `format(key: string, replacements: { [key: string]: string })`: a method that accepts a message key as its first argument and an object of replacement values as its second. For example, if the bundle contains `greeting: 'Hello, {name}!'`, then calling `format('greeting', { name: 'World' })` would return `'Hello, World!'`.

An example of using all features returned by `localizeBundle`:
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

Note that with this pattern it is possible for a widget to obtain its messages from multiple bundles. When favoring simplicity, however, it is recommend that widgets are limited to a single bundle wherever possible.

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

## Overriding locales and bundles per-widget

Widgets that use `I18nMixin` can have their [i18n widget properties](#i18nmixin-widget-properties) overridden when instantiated by a parent. This can be useful when rendering several widgets with different locales in a single application (that is, using multiple locales within one application), as well as to override the set of messages a third-party widget may be using and align them within the context of your application.

Each i18n-aware widget can have its own locale by passing a `locale` widget property. If no locale is set, then the default locale is assumed.

The widget's default bundle can be replaced by passing an `i18nBundle` widget property. Dojo recommends against using multiple bundles in the same widget, but there may be times when an application needs to consume a third-party widget that does make use of more than one bundle. As such, `i18nBundle` can also be a `Map` of default bundles to override bundles.

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
			})
		];
	}
}
```

---

**Next:** [Advanced formatting: CLDR](./30-formatting.md)

**Previous:** [Working with message bundles](./10-bundles.md)

**Up:** [Dojo i18n Index](./index.md)
