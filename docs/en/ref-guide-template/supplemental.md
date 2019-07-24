# Feature X in detail

The supplemental.md file should fully describe all features that the capability offers.

## Feature X.x

Further subsections describing particular topics for a given feature. Possibly also [linking to other related sections within the reference guide](./basic-usage.md#feature-x).

```tsx
// including fully-working embedded code snippets as further illustration
import WidgetBase from '@dojo/framework/core/WidgetBase';
import { tsx } from '@dojo/framework/core/vdom';

export default class MyWidget extends WidgetBase {
	protected render() {
		return <div>My Widget</div>;
	}
}
```

### `CapabilityX` Methods

-   `featureXmethod(foo: boolean)`
    -   Can also include inline API documentation to round out the description of a feature.

### `DataStructureX` Properties

-   `sampleProperty?: string | string[]`
    -   API documentation is also likely to include descriptions of relevant data models that users need to interact with when working with a feature.

## Feature X.y

...

# Feature Y in detail

...

# (Optional) Further examples of the capability

## Feature X

[Links out to further examples that illustrate a capability or feature](https://codesandbox.io/s/github/dojo/dojo-codesandbox-template/tree/master/) in a more complete, real-world context.
