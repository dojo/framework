# Introduction

Dojo widgets can be compiled into custom elements and therefore be used like any other type of HTML tag. The widget's properties will be automatically converted into HTML attributes, properties, or events.

Each widget is bundled into a JavaScript file and a CSS file, both of which are imported into your HTML.

> index.html

```html
<html>
  <head>
    <link rel="stylesheet" href="ref-hero.css">
  </head>
  <body>
    <script async src="ref-hero.js"></script>
  </body>
</html>
```

| Feature           | Description                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Widget Properties | Based on the type and name of the property, Dojo will decide if the property should be an attribute, property, or event on the custom element.                           |
| Child Renderers   | Widgets that use child objects or renderers are supported in custom elements by using slots.                                                                             |
| Lazy Loading      | The custom element script does not need to be loaded before the custom element is referenced on the page. Elements will be hydrated automatically when the script loads. |

## Building Custom Elements

Dojo widgets can be built as custom elements using the `@dojo/cli-build-widget` command.

> src/widgets/Hero.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';
import * as css from './styles/Hero.m.css';

export interface HeroProperties {
	title: string;
	image: string;
}

const factory = create().properties<HeroProperties>();
export default factory(function Hero({ properties }) {
	const { title, image } = properties();

	return (
		<div classes={css.hero}>
			<img classes={css.image} src={image} />
			<h1 classes={css.title}>{title}</h1>
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
		"widgets": ["src/widgets/Hero"]
	}
}
```

Custom Elements are required to contain dash characters. During the build process, Dojo will take the widget name, `MyWidget` and add dashes on uppercase letter boundaries, `my-widget`. As this is sometimes not enough, a prefix is added to each widget that guarantees the element contains a dash. By default, the `name` field from `package.json` is used as the prefix, but this can be overriden using the `prefix` option in your `.dojorc`. Because the prefix is `ref`, the `MyWidget` widget will be built into a custom element named `ref-my-widget`.

With this configuration in place, build the widgets using the Dojo CLI.

```shell
$ dojo build widget
```

The `output/dist/` directory now contains the built custom elements.

-   `ref-hero.js` - All of the code required to hydrate your custom element. Loading this script in your HTML file is what makes your Dojo widget come alive as a custom element.
-   `ref-hero.js.map` - A JavaScript source map file for making debugging easier. These files are used only during debugging and do not need to be uploaded to a production environment.
-   `ref-hero.css` - The CSS used by the widget. Note that this includes the styles only for this one widget.

## Using Custom Elements

Using Custom Elements built with Dojo is as simple as including the generated files in your HTML. To use the hero widget, import the files.

```html
<!DOCTYPE html>
<html lang="en-us" dir="ltr">
<head>
	<meta charset="utf-8">
    <title>Using Custom Elements</title>
    <link rel="stylesheet" href="./output/dist/hero-1.0.0.css">
</head>
<body>
    <ref-hero image="hero.jpg" title="Make Custom Elements the Easy Way!"></ref-hero>
    <script async src="./output/dist/hero-1.0.0.js"></script>
</body>
</html>
```

If you have more than one custom element, include `link` and `script` tags for each element you are using.

> On some browsers, you may have to include a custom elements polyfill. We recommend including [@webcomponents/custom-elements](https://github.com/webcomponents/polyfills/tree/master/packages/custom-elements)
