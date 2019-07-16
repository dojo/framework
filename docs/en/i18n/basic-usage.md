# Basic Usage

## Internationalizing a widget

Starting off with a single default language (English).

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

## Adding a widget language localization bundle

Supporting two locales - English as the default, together with a French translation that is activated for any users that have `fr` set as their primary language.

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
		fr: () => import('./fr/MyI18nWidget.ts')
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

## Specifying a root locale within an application

Using function-based widgets and `i18n` middleware exclusively within an application means that there is no requirement to add bootstrapping code to the applications `main.ts`/`main.tsx`. To set the default locale within an application, use the `i18n` middleware from `@dojo/framework/core/middleware/i18n` and set the default locale when no locale is defined.

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

However if the application use class-based widgets or a combination of both function-based and class-based widgets, the default locale details will need to be defined in the application registry. This can be done using the utility function, `registryI18nInjector` available from `@dojo/framework/core/mixins/I18n`.

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

## Changing the locale within an application

Using the [i18n middleware](#changing-locales) to allow users to to choose between supported locales, and enact a locale change via the middleware's `.set` API.

**Reminder:** When using both class-based and function-based, this should be used together with [registeri18ninjector](#providing-locale-data-to-i18n-aware-widgets) to reactively propagate locale changes to all i18n-aware widgets.

> src/widgets/LocaleChanger.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import i18n from '@dojo/framework/core/middleware/I18n';

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
