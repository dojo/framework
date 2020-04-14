# Setting a Widget's Properties

A widget's properties are exposed from a custom element automatically as either attributes, events, or properties.

The following EmailSignup widget contains several different property types.

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

# Custom Element Slots

Some Dojo widgets utilize child objects rather than child widgets. These child objects are supported as custom elements by using "slots." A `slot` attribute is added to a child of the custom element, and the child gets passed in as the value of the slot.

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
  <dojo-label slot="foo">Label 1</dojo-label>
  <dojo-label slot="foo">Label 2</dojo-label>
</dojo-widget>
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
