# Setting a Widget's Properties

A widget's properties are exposed from a custom element automatically as either attributes, events, or properties.

The following `EmailSignup` widget contains several different property types.

> src/widgets/EmailSignup.tsx

```tsx
import { tsx, create } from '@dojo/framework/core/vdom';
import * as css from './styles/EmailSignup.m.css';
import icache from '@dojo/framework/core/middleware/icache';

export interface EmailSignupProperties {
	title?: string;
	onSignUp?: () => void;
	signUpBonusDate?: Date;
	successMessages?: string[];
}

function randomEntry(arr: string[]) {
	return arr[Math.floor(Math.random() * arr.length)];
}

const factory = create({ icache }).properties<EmailSignupProperties>();

export default factory(function EmailSignup({ middleware: { icache }, properties }) {
	const { title, signUpBonusDate, successMessages } = properties();

	const signedUp = icache.getOrSet('signedUp', false);
	const signUp = () => {
		const { onSignUp } = properties();

		// post email address to a server
		icache.set('signedUp', true);
		icache.set('successMessage', successMessages ? randomEntry(successMessages) : 'Thank you for signing up!');
		onSignUp && onSignUp();
	};

	return (
		<div key="root" classes={css.root}>
			<div key="title" classes={css.title}>
				{title || 'Subscribe Now'}
			</div>
			{signedUp ? (
				<div key="confirmation" classes={css.thanks}>
					{icache.get('successMessage')}
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

### Attributes

`string` and object typed widget properties are automatically added as HTML attributes to your custom element. Continuing with the email subscription example, the `title` property (`{ title?: string }`) can be customized by adding a `title` attribute to the HTML. Since `title` is a string property, the value of the HTML attribute is used as the value of the title property with no transformation.

```html
<ref-email-signup id="emailSignup" title="Subscribe to Our Newsletter"></ref-email-signup>
```

Other serializable properties, like arrays and configuration objects, can be set via HTML attributes by passing in serialized JSON. The `sucessMessages` property (`{ successMessages?: string[] }`) can be set by adding a `successmessages` attribute to the HTML.

```html
<ref-email-signup
  id="emailSignup"
  title="Subscribe to Our Newsletter"
  successmessages='["Thanks!","Thank you for signing up","You are the best!"]'
></ref-email-signup>
```

Here, the value of the `successmessages` attribute will be deserialized and set as the `successMessages` property.

> Note that if the attribute's value is not valid JSON, _the property will not be set_.

### Events

Widget properties that start with `on` and have a function signature are exposed as events. The emitted event is the lower cased part of the property name without the "on." Listening for the onSignUp property (`{ onSignUp?: () => void }`) would look like this.

```html
<script>
    emailSignup.addEventListener('signup', () => {
        // start confetti animation 🎉
    });
</script>
```

### Properties

All non-event widget properties are automatically created as properties on the custom element. These properties can be fully controlled by JavaScript. In the email subscription widget, both the `title` and `signUpBonusDate` properties can be set programmatically as properties.

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

# Custom Element Slots

Dojo widgets can support child objects, these children are supported as custom elements by using "slots." A `slot` attribute is added to a child of the custom element, and the child gets passed in as the value of the slot.

The most common child object scenarios are supported by Dojo custom elements.

## Named Children

> Widget.tsx

```tsx
export interface WidgetChildren {
	foo: RenderResult;
}
```

```tsx
<Widget>
	{{
		foo: <Label>My Label</Label>
	}}
</Widget>
```

> index.html

```html
<dojo-widget>
  <dojo-label slot="foo">My Label</dojo-label>
</dojo-widget>
```

## Named Child Renderers

> Widget.tsx

```tsx
export interface WidgetChildren {
	foo: () => RenderResult;
}
```

```tsx
<Widget>
	{{
		foo: () => <Label>My Label</Label>
	}}
</Widget>
```

> index.html

```html
<dojo-widget>
  <dojo-label slot="foo">My Label</dojo-label>
</dojo-widget>
```

## Named Array of Children

If multiple children have the same slot name, they are bundled together in an array and passed to the custom element.

> Widget.tsx

```tsx
export interface WidgetChildren {
	foo: RenderResult[];
}
```

```tsx
<Widget>
	{{
		foo: [<Label>Label 1</Label>, <Label>Label 2</Label>]
	}}
</Widget>
```

> index.html

```html
<dojo-widget>
  <dojo-label slot="foo">Label 1</dojo-label>
  <dojo-label slot="foo">Label 2</dojo-label>
</dojo-widget>
```

## Named Array of Child Renderers

> Widget.tsx

```tsx
export interface WidgetChildren {
	foo: (() => RenderResult)[];
}
```

```tsx
<Widget>
	{{
		foo: [() => <Label>Label 1</Label>, () => <Label>Label 2</Label>]
	}}
</Widget>
```

> index.html

```html
<dojo-widget>
  <dojo-label slot="foo">Label 1</dojo-label>
  <dojo-label slot="foo">Label 2</dojo-label>
</dojo-widget>
```

## Named Child Renderers with Arguments

If the widget passes arguments to a child render function, the arguments get sent to the child in the slot via a "render" event.

> Widget.tsx

```tsx
export interface WidgetChildren {
	foo: (active: boolean) => RenderResult;
}
```

```tsx
<Widget>
	{{
		foo: (active) => <Label active={active}>My Label</Label>
	}}
</Widget>
```

> index.html

```html
<dojo-widget>
  <dojo-label slot="foo" id="label1">Label 1</dojo-label>
  <dojo-label slot="foo" id="label2">Label 2</dojo-label>
</dojo-widget>

<script>
  function setActive(event) {
    const { detail: [active] } = event;
    event.target.active = active;
  }

  label1.addEventListener('render', setActive);
  label2.addEventListener('render', setActive);
</script>
```

# Using Themes

Themes can be used with custom elements by including the theme's JavaScript and CSS files.

```html
<!DOCTYPE html>
<html lang="en-us" dir="ltr">
<head>
	<meta charset="utf-8">
    <title>Using Custom Elements</title>
    <link rel="stylesheet" href="./output/dist/hero-1.0.0.css">
    <link rel="stylesheet" href"./output/theme/my-theme.css">
</head>
<body>
    <ref-hero image="hero.jpg" title="Make Custom Elements the Easy Way!"></ref-hero>
    <script async src="./output/dist/hero-1.0.0.js"></script>
    <script async src="./output/theme/my-theme.js"></script>
</body>
</html>
```

## Switching Variants

A single theme could have multiple variants. For example the Dojo theme has a "light" and a "dark" variant. The global `dojoce` variable will let you change the theme at runtime.

```
dojoce.variant = 'dark';
```

Custom elements will re-render and immediately reflect the newly selected variant.

## Switching Themes

An application can have multiple themes loaded at the same time, and switch between them at runtime. To load multiple themes, load the stylesheet and script for each theme.

```html
	<link rel="stylesheet" href="./output/theme/dojo/dojo-7.0.0-pre.css" />
	<link rel="stylesheet" href="./output/theme/material/material-7.0.0-pre.css" />
	<script src="./output/theme/dojo/dojo-7.0.0-pre.js"></script>
	<script src="./output/theme/material/material-7.0.0-pre.js"></script>
```

> Note that the last loaded theme will be the "current" theme.

At runtime, you can switch themes by setting the `theme` property on the global `dojoce` variable.

```
dojoce.theme = 'material';
```

Custom elements will re-render and immediately reflect the newly selected theme.
