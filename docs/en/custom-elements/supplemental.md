# Custom Element Events

Function based properties that are prefixed with "on" are automatically converted to events when building a widget as a custom element. This allows you to use the standard browser event listeners to handle those properties.

In addition to being added as events, event properties are also exposed as regular properties on the custom element. This allows you to assign a function callback directly, without using an event handler.

```html
<script>
    emailSignup.__onSignUp = () => {
        // start confetti animation 🎉
    };
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
