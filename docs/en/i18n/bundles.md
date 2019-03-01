# Working with message bundles

Dojo's concept of a message bundle is a map of keyed text messages, with message content for each key represented across one or more languages.

A Dojo application refers to a particular message via its key when needing to display that message to an end user. This avoids hard-coding a single language's text within code, and instead provides an externalized set of messages in one or more languages that can be maintained independently of the application's code.

At render time, Dojo's i18n framework handles the replacement of message keys with their text content for a particular language, depending on the current locale setting within the widget that is referencing the message keys.

Dojo applications can choose to use a single message bundle across the entire application, or they can decompose messages to be more fine-grained and scoped more closely to the widget(s) they are referenced from, ending up with an application containing several message bundles.

## Bundle default language

Each message bundle has its own set of supported language translations. One language within the set is required to act as the default module for the rest of the bundle. The default language module acts as the primary import/reference to the bundle, and serves two main requirements:
* Provides a comprehensive set of message keys and their content (represented in the default language) that are used as a fallback if other languages within the bundle do not provide overrides for a given key
* Lists the bundle's other supported languages, as well as the mechanism to load the set of messages from each supported language's module

## TypeScript structure

Every language within a bundle is a TypeScript module, and is required to export a default object representing a map of message keys to their translated values within the particular language.

For example, a French language module within a bundle:

>nls/fr/main.ts
```ts
export default {
	hello: 'Bonjour',
	goodbye: 'Au revoir'
};
```

### Default language module

The language module designated as the bundle's default is formatted slightly differently to other languages. The default module needs to export an object with the following properties
- `messages`
    - A map of message keys to values in the default language, structured in the same way as the object exported by other languages in the bundle. This represents the canonical set of message keys supported by the bundle.<br>When the application locale is set to the default value, these `messages` are used as a regular lookup when resolving message keys. When a non-default locale is in use, these `messages` are used as fallbacks for any keys not included in the bundle's additional language modules.
- `locales`
    - An optional property that represents a map of locale identifiers to functions that can load the message set for each language/locale supported by the bundle.

For example, a bundle with English as the default that also supports French, Arabic and Japanese:

>nls/main.ts
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

## Importing and using bundles

The default language module for a bundle is `import`ed like any other TypeScript module into each widget that requires use of the set of messages contained within the bundle.

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
import WidgetBase from '@dojo/framework/widget-core/WidgetBase';
import { v } from '@dojo/framework/widget-core/d';
import I18nMixin from '@dojo/framework/widget-core/mixins/I18n';

import myWidgetMessageBundle from '../nls/MyI18nWidget.en.ts';

export default class MyI18nWidget extends I18nMixin(WidgetBase) {
	protected render() {
		const { messages } = this.localizeBundle(myWidgetMessageBundle);

		return v('div', { title: messages.hello }, [ messages.welcome ]);
	}
}
```

As this example widget loads its messages through `I18nMixin`'s [localizeBundle](./i18n-dojo-apps.md#i18nmixin-localizebundle-method) method, it will continue to work as new language translations are added and referenced within the bundle's `nls/MyI18nWidget.en.ts` default language module. Users will see localized messages from `MyI18nWidget` instances if a message set for their currently configured language is available.

Applications that want to override user default languages and allow changing locales within the application itself require additional setup, covered in [Internationalizing a Dojo application](./i18n-dojo-apps.md#internationalizing-a-dojo-application).

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
