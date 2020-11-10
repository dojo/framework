# Introduction

Dojo's **`i18n`** package solves a variety of common requirements and challenges around web application internationalization.

While a large subset of its functionality can be used as a standalone module, it is intended for use in Dojo applications to help render localized widgets, including advanced message, date and number formatting.

| Feature                                                  | Description                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Per-widget localization**                              | Each widget instance can have its own locale specified, allowing data from multiple locales to be displayed within a single application. If not specified, widgets fall back to the current root locale.                                                                                                                                                            |
| **Fine-grained message bundling**                        | Bundles can be decomposed and scoped locally to individual widgets, and can be lazily-loaded only if a given locale is in use. This allows message bundles to benefit from the same layer separation & bundled delivery as all other resources within an application.                                                                                               |
| **Locale-specific message, date, and number formatting** | Uses industry-standard [Unicode CLDR formatting](http://cldr.unicode.org/) rules. The required CLDR data are automatically injected into applications at build time.                                                                                                                                                                                                |
| **Reactive locale change response**                      | Similar to other reactive state changes within a Dojo application, messages can be automatically reloaded and affected widgets re-rendered when changing locales.<br>If using `i18n` as a standalone module, locale change events can be acted on via listener callbacks.                                                                                           |
| **Fallback locale detection**                            | Ensures a default locale is available if a root override has not been explicitly set.<br>The system locale (or the process/host locale when running server-side) is matched against the list of locales defined in the `.dojorc`. If the system locale is supported, then it is set as the default. Otherwise, the default locale defined in the `.dojorc` is used. |

## Basic usage

### Internationalizing a widget

-   Starting off with a single default language (English).

> .dojorc

```ts
{
	"build-app": {
		"locale": "en"
	}
}
```

> src/widgets/MyI18nWidget.tsx

**Function-based variant:**

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import i18n from '@dojo/framework/core/middleware/i18n';

import myWidgetMessageBundle from '../nls/en/MyI18nWidget.ts';

const factory = create({ i18n });

export default factory(function MyI18nWidget({ middleware: { i18n } }) {
	const { messages } = i18n.localize(myWidgetMessageBundle);

	return <div title={messages.title}>{messages.content}</div>;
});
```

**Class-based variant:**

```tsx
import { WidgetBase } from '@dojo/framework/core/WidgetBase';
import { tsx } from '@dojo/framework/core/vdom';

import I18nMixin from '@dojo/framework/core/mixins/I18n';
import myWidgetMessageBundle from '../nls/en/MyI18nWidget.ts';

export default class MyI18nWidget extends I18nMixin(WidgetBase) {
	protected render() {
		const { messages } = this.localizeBundle(myWidgetMessageBundle);

		return <div title={messages.title}>{messages.content}</div>;
	}
}
```

> src/nls/en/MyI18nWidget.ts

```ts
export default {
	messages: {
		title: 'Hello',
		content: 'This is an internationalized widget'
	}
};
```

### Adding a widget language localization bundle

-   Supporting two locales - English as the default, together with a French translation that is activated for any users that have `fr` set as their primary language.
-   Unless a locale is specifically set for you application, the appropriate `supportedLocale` will be used according to the browsers locale settings where available.
-   To run the app build with i18n you will need to install `cldr-data` as a dependency into your application or the build will fail.

> .dojorc

```ts
{
	"build-app": {
		"locale": "en",
		"supportedLocales": [ "fr" ]
	}
}
```

> src/nls/en/MyI18nWidget.ts

```ts
export default {
	locales: {
		fr: () => import('../fr/MyI18nWidget')
	},
	messages: {
		title: 'Hello',
		content: 'This is an internationalized widget'
	}
};
```

> src/nls/fr/MyI18nWidget.ts

```ts
export default {
	title: 'Bonjour',
	content: 'Ceci est un widget internationalisé'
};
```

Note that the fs language bundle simply returns the message bundle, not an object containing a message bundle like the default locale file.

### Specifying a root locale within an application

Using function-based widgets and `i18n` middleware exclusively within an application means there is no requirement to add bootstrapping code to the application's `main.ts`/`main.tsx` entry point. The default application locale can instead be set in a top-level `App` widget, using the `i18n` middleware from `@dojo/framework/core/middleware/i18n`. A default locale can be set when a locale has not already been defined.

> src/App.tsx

```ts
import { create, tsx } from '@dojo/framework/core/vdom';

const factory = create({ i18n });

export default factory(function App({ middleware: { i18n } }) {
	if (!i18n.get()) {
		i18n.set({ locale: 'en-us', rtl: false });
	}
	return <div>{/* the application widgets */}</div>;
});
```

However, if the application uses any class-based widgets, such as those from the `@dojo/widgets` suite, the default locale details will need to be defined in the application registry. This can be done using the `registryI18nInjector` utility function, available from `@dojo/framework/core/mixins/I18n`.

> src/main.tsx

```ts
import renderer, { tsx } from '@dojo/framework/core/vdom';
import Registry from '@dojo/framework/core/Registry';
import { registerI18nInjector } from '@dojo/framework/core/mixins/I18n';

import App from './App';

const registry = new Registry();
registerI18nInjector({ locale: 'en-us', rtl: false }, registry);

const r = renderer(() => <App />);
r.mount({ registry });
```

### Changing the locale within an application

-   Using the [i18n middleware](/learn/middleware/available-middleware#i18n) to allow users to to choose between supported locales, and enact a locale change via the middleware's `.set` API.

**Reminder:** When using both class-based and function-based widgets, this middleware should be used together with [`registeri18nInjector`](/learn/i18n/internationalizing-a-dojo-application/#providing-locale-data-to-i18n-aware-widgets) to reactively propagate locale changes to all i18n-aware widgets.

> src/widgets/LocaleChanger.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import i18n from '@dojo/framework/core/middleware/i18n';

const factory = create({ i18n });

export default factory(function LocaleChanger({ middleware: { i18n } }) {
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
		</div>
	);
});
```
