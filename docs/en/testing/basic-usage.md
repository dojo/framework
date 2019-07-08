# Basic Usage

## Testing Dojo Applications

Dojo uses `@dojo/cli-test-intern` for running unit and functional tests in your `tests` folder.

You can quickly run your tests in node.

> Command Line

```bash
dojo test
```

## Running Tests

Dojo supports two types of testing approaches, unit and functional. Unit tests are tests run via node and the local
[Selenium] tunnel and test isolated blocks of code. Functional tests are run using Selenium in the browser and test
the overall functionality of the software as a user would interact with it. Running unit and functional tests against Selenium requires running the appropriate build using `@dojo/cli-build-app`.

This command will execute only your unit tests.

> Command Line

```bash
dojo test --unit --config local
```

This command will execute your functional tests locally in a headless Chrome instance using [Selenium].

> Command Line

```bash
dojo test --functional --config local
```

## Unit Tests

Dojo comes with a [`harness`](https://github.com/dojo/framework/tree/master/src/testing) API for testing widgets.

> src/tests/unit/widgets/Home.ts

```ts
const { describe, it } = intern.getInterface('bdd');
import harness from '@dojo/framework/testing/harness';
import assertionTemplate from '@dojo/framework/testing/assertionTemplate';
import { w, v } from '@dojo/framework/widget-core/d';

import Home from '../../../src/widgets/Home';
import * as css from '../../../src/widgets/styles/Home.m.css';

const baseTemplate = assertionTemplate(() => v('h1', { classes: [css.root] }, ['Home Page']));

describe('Home', () => {
	it('default renders correctly', () => {
		const h = harness(() => w(Home, {}));
		h.expect(baseTemplate);
	});
});
```

The `harness` API allows you to verify that the output of a rendered widget is what you expect.

-   Does it render as expected?
-   Do event handlers work as expected?

## Functional Tests

Functional tests allow you to load a page and execute your code in a browser to better test the behavior of your widgets.

When you write a functional test, you can script out the interaction of the test with your page to click on buttons and validate the content of the page.

> tests/functional/main.ts

```ts
describe('routing', () => {
	it('profile page correctly loads', ({ remote }) => {
		return (
			remote
				// loads the HTML file in local node server
				.get('../../output/dev/index.html')
				// find the id of the anchor tag
				.findById('profile')
				// click on the link
				.click()
				// end this action
				.end()
				// find the h1 tag
				.findByTagName('h1')
				// get the text in the h1 tag
				.getVisibleText()
				.then((text) => {
					// verify the content of the h1 tag on the profile page
					assert.equal(text, 'Welcome Dojo User!');
				})
		);
	});
});
```

## Assertion Templates

Assertion Templates provide a way to create a base assertion that would allow you to change parts of the expected output for each test.

A widget can render output differently based on property values.

> src/widgets/Profile.ts

```tsx
export interface ProfileProperties {
	username?: string;
}

export default class Profile extends WidgetBase<ProfileProperties> {
	protected render() {
		const { username } = this.properties;
		return v('h1', { classes: [css.root] }, [`Welcome ${username || 'Stranger'}!`]);
	}
}
```

You can create an assertion template using `@dojo/framework/testing/assertionTemplate`.

> tests/unit/widgets/Profile.ts

```ts
// Create an assertion
const profileAssertion = assertionTemplate(() =>
	v('h1', { classes: [css.root], '~key': 'welcome' }, ['Welcome Stranger!'])
);

describe('Profile', () => {
	it('default renders correctly', () => {
		const h = harness(() => w(Profile, {}));
		// Test against my base assertion
		h.expect(profileAssertion);
	});
});
```

You can provide a value to any virtual DOM node that you may want to test against using the `~key` properties defined in the Assertion Template. In `.tsx` this would be the `assertion-key` attribute.

> tests/unit/widgets/Profile.ts

```ts
describe('Profile', () => {
	it('default renders correctly', () => {
		const h = harness(() => w(Profile, {}));
		h.expect(profileAssertion);
	});

	it('renders given username correctly', () => {
		// update the expected result with a given username
		const namedAssertion = profileAssertion.setChildren('~welcome', () => ['Welcome Kel Varnsen!']);
		const h = harness(() => w(Profile, { username: 'Kel Varnsen' }));
		h.expect(namedAssertion);
	});
});
```

Using the `setChildren` method of an Assertion Template with the `~key` value you assigned will return a assertion template with the updated virtual DOM structure that you can test your widget output against.

[browserstack]: https://www.browserstack.com/
[dojo cli]: https://github.com/dojo/cli
[intern]: https://theintern.io/
[saucelabs]: https://saucelabs.com/
[selenium]: http://www.seleniumhq.org/
[testingbot]: https://testingbot.com/
