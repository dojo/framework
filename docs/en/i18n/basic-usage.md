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

> src/widgets/MyI18nWidget.ts

```ts
import { WidgetBase } from '@dojo/framework/core/WidgetBase';
import { v } from '@dojo/framework/core/vdom';

import I18nMixin from '@dojo/framework/core/mixins/I18n';
import myWidgetMessageBundle from '../nls/MyI18nWidget.en.ts';

export default class MyI18nWidget extends I18nMixin(WidgetBase) {
	protected render() {
		const { messages } = this.localizeBundle(myWidgetMessageBundle);

		return v('div', { title: messages.title }, [messages.content]);
	}
}
```

> src/nls/MyI18nWidget.en.ts

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

> src/nls/MyI18nWidget.en.ts

```ts
export default {
	locales: {
		fr: () => import('./fr/MyI18nWidget.fr')
	},
	messages: {
		title: 'Hello',
		content: 'This is an internationalized widget'
	}
};
```

> src/nls/fr/MyI18nWidget.fr.ts

```ts
export default {
	title: 'Bonjour',
	content: 'Ceci est un widget internationalisé'
};
```

## Specifying a root locale within an application

Using the [i18n injector function](#providing-locale-data-to-i18n-aware-widgets) to surface locale properties within all i18n-aware widgets.

> src/main.ts

```ts
import renderer from '@dojo/framework/core/vdom';
import { w } from '@dojo/framework/core/vdom';
import Registry from '@dojo/framework/core/Registry';
import { registerI18nInjector } from '@dojo/framework/core/mixins/I18n';

import App from './App';

const registry = new Registry();
registerI18nInjector({ locale: 'en-us', rtl: false }, registry);

const r = renderer(() => w(App, {}));
r.mount({ registry });
```

## Changing the locale within an application

Using the [LocaleSwitcher](#changing-locales) utility widget to allow users to choose between supported locales, and enact a locale change via `LocaleSwitcher`'s `updateLocale` method. This should be used together with [registeri18ninjector](#providing-locale-data-to-i18n-aware-widgets) to reactively propagate locale changes to all i18n-aware widgets.

> src/widgets/LocaleChanger.ts

```ts
import WidgetBase from '@dojo/framework/core/WidgetBase';
import { LocaleSwitcher, UpdateLocale } from '@dojo/framework/core/mixins/I18n';

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
		return v(
			'button',
			{
				onclick: () => {
					updateLocale({ locale: localeKey });
				}
			},
			[localeDescription]
		);
	}
}
```
