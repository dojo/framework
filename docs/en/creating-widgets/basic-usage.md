# Basic Usage

## Defining a widget

-   Using the [`create()` primitive](./supplemental.md#basic-widget-structure) to define a widget's render function factory
-   Returning virtual DOM nodes, declared in [TSX syntax](./supplemental.md#tsx-support), from the widget's render function implementation

> src/widgets/MyTsxWidget.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';

const renderFactory = create();

export const MyTsxWidget = renderFactory(() => <div>Hello from a TSX widget!</div>);

export default MyTsxWidget;
```

## Composing widgets

-   Defining a widget hierarchy, facilitated through modular and reusable components, in order to implement more complex application requirements

> src/widgets/MyComposingWidget.ts

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';

const renderFactory = create();

import MyWidget from './MyWidget';

export const MyComposingWidget = renderFactory(() => [<div>Composing another widget:</div>, <MyWidget />]);

export default MyComposingWidget;
```
