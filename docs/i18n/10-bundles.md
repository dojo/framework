- [Working with message bundles](#working-with-message-bundles)
  - [Default bundles](#default-bundles)
  - [TypeScript structure](#typescript-structure)
  - [Importing and using bundles](#importing-and-using-bundles)
  - [Lazy vs. static loading](#lazy-vs-static-loading)

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

---

**Next:** [Internationalizing a Dojo application](./20-i18n-dojo-apps.md)

**Up:** [Dojo i18n Index](./index.md)
