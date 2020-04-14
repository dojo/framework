# Introduction

Dojo widgets can be compiled into custom elements and therefore be used like any other type of HTML tag. The widget's properties will be automatically converted into HTML attributes, properties, or events.

Each widget is bundled into a JavaScript file and a CSS file, both of which are imported into your HTML.

> index.html

```html
<html>
  <head>
    <link rel="stylesheet" href="ref-email-signup.css">
  </head>
  <body>
    <ref-email-signup></ref-email-signup>
    <script async src="ref-email-signup.js"></script>
  </body>
</html>
```

| Feature           | Description                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Widget Properties | Based on the type and name of the property, Dojo will decide if the property should be an attribute, property, or event on the custom element.                           |
| Child Renderers   | Widgets that use child objects or renderers are supported in custom elements by using slots.                                                                             |
| Lazy Loading      | The custom element script does not need to be loaded before the custom element is referenced on the page. Elements will be hydrated automatically when the script loads. |

## Building Custom Elements

Dojo widgets can be built as custom elements using @dojo/cli-build-widget. For this example, we're going to use a simple email subscription widget.

> src/widgets/EmailSignup.tsx

```tsx
import { tsx, create } from '@dojo/framework/core/vdom';
import * as css from './styles/EmailSignup.m.css';
import icache from '@dojo/framework/core/middleware/icache';

export interface EmailSignupProperties {
	title?: string;
	onSignUp?: () => void;
	signUpBonusDate?: Date;
}

const factory = create({ icache }).properties<EmailSignupProperties>();

export default factory(function EmailSignup({ middleware: { icache }, properties }) {
	const { title, signUpBonusDate } = properties();

	const signedUp = icache.getOrSet('signedUp', false);
	const signUp = () => {
		const { onSignUp } = properties();

		// post email address to a server
		icache.set('signedUp', true);
		onSignUp && onSignUp();
	};

	return (
		<div key="root" classes={css.root}>
			<div key="title" classes={css.title}>
				{title || 'Subscribe Now'}
			</div>
			{signedUp ? (
				<div key="confirmation" classes={css.thanks}>
					Thank you for signing up!
				</div>
			) : (
				<div key="signup" classes={css.signup}>
					{signUpBonusDate && <div>Sign up by {signUpBonusDate.toLocaleDateString()}</div>}
					<input type="text" />
					<button onclick={signUp}>Sign Up</button>
				</div>
			)}
		</div>
	);
});
```

To build a widget as a custom element, add a `build-widget` property to your `.dojorc` file and include the path to any widgets you want to expose as custom elements.

> .dojorc

```json
{
	"build-widget": {
		"prefix": "ref",
		"widgets": ["src/widgets/EmailSignup"]
	}
}
```

With this configuration in place, build the widgets using the Dojo CLI.

```shell
$ dojo build widget
```

The `output/dist/` directory now contains the built custom elements.

| Filename                  | Description                                                                                                                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ref-email-signup.js`     | This file includes all of the code required to hydrate your custom element. Loading this script in your HTML file is what makes your Dojo widget come alive as a custom element.        |
| `ref-email-signup.js.map` | A JavaScript source map file for making debugging easier. These files are used only during debugging and do not need to be uploaded to a production environment.                        |
| `ref-email-signup.css`    | The CSS used by the widget. Note that this includes the styles only for this one widget. If you are using a theme, you will need to separately include the theme CSS in your HTML page. |

Note that that the `prefix` we added to `.dojorc` is used in the custom element tag name.

## Using Custom Elements

Using Custom Elements built with Dojo is as simple as including the generated files in your HTML. To use the email subscription widget, import the files.

```html
<!DOCTYPE html>
<html lang="en-us" dir="ltr">
<head>
	<meta charset="utf-8">
    <title>Using Custom Elements</title>
    <link rel="stylesheet" href="./output/dist/email-signup-1.0.0.css">
</head>
<body>
    <ref-email-signup id="emailSignup"></ref-email-signup>
    <script async src="./output/dist/email-signup-1.0.0.js"></script>
</body>
</html>
```

If you have more than one custom element, include `link` and `script` tags for each element you are using.

> On some browsers, you may have to include a custom elements shim. We recommend INSERT SHIM HERE

### Attributes

`string` typed widget properties are automatically added as HTML attributes to your custom element. Continuing with the email subscription example, the title property (`{ title?: string }`) can be customized by adding a `title` attribute to the HTML.

```html
<ref-email-signup id="emailSignup" title="Subscribe to Our Newsletter"></ref-email-signup>
```

### Events

All widget properties that start with `on` and have a function signature are exposed as events. The emitted event is the lower cased part of the property name without the "on." Listening for the onSignUp property (`{ onSignUp?: () => void }`) would look like this.

```html
<script>
    emailSignup.addEventListener('signup', () => {
        // start confetti animation 🎉
    });
</script>
```

### Properties

All non-event widget properties are automatically created as properties on the custom element. These properties can be fully controlled by JavaScript. In the email subscription widget, both the title and signUpBonusDate properties can be set programmatically as properties.

```html
<script>
        const now = new Date();
        emailSignup.signUpBonusDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1
        );
    </script>
```
