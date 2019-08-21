# Introduction

Dojo provides a robust testing framework using `@dojo/cli-test-intern`. It allows you to efficiently test the output of your widgets and validate your expectations.

| Feature                 | Description                                                                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Minimal API**         | Simple API for testing and asserting Dojo widget's expected virtual DOM and behavior.                                                       |
| **Unit tests**          | Unit tests are tests run via node and browser to test isolated blocks of code.                                                              |
| **Functional tests**    | Functional tests are run using Selenium in the browser and test the overall functionality of the software as a user would interact with it. |
| **Assertion templates** | Assertion Templates allow you to build expected render functions to validate the output of your widgets.                                    |

# Basic usage

## Testing Dojo applications

-   Run a project's test suite

```shell
dojo test
```

Dojo uses `@dojo/cli-test-intern` for running unit and functional tests in your `tests` folder.

## Running specific test suites

Dojo supports two types of testing approaches, unit and functional. Unit tests are tests run via node and the local
[Selenium] tunnel and test isolated blocks of code. Functional tests are run using Selenium in the browser and test
the overall functionality of the software as a user would interact with it. Running unit and functional tests against Selenium requires running the appropriate build using `@dojo/cli-build-app`.

-   Run a project's unit test suite

```shell
dojo test --unit --config local
```

-   Run a project's functional test suite locally in a headless Chrome instance using [Selenium].

```shell
dojo test --functional --config local
```

## Writing unit tests

-   Using Dojo's [`harness` API](/learn/testing/dojo-test-harness#harness-api) for unit testing widgets.

> src/widgets/Home.tsx

```ts
import { create, tsx } from '@dojo/framework/core/vdom';
import * as css from './Home.m.css';

const factory = create();

const Home = factory(function Home() {
	return <h1 classes={[css.root]}>Home Page</h1>;
});

export default Home;
```

> tests/unit/widgets/Home.tsx

```ts
const { describe, it } = intern.getInterface('bdd');
import { tsx } from '@dojo/framework/core/vdom';
import harness from '@dojo/framework/testing/harness';
import assertionTemplate from '@dojo/framework/testing/assertionTemplate';

import Home from '../../../src/widgets/Home';
import * as css from '../../../src/widgets/Home.m.css';

const baseTemplate = assertionTemplate(() => <h1 classes={[css.root]}>Home Page</h1>);

describe('Home', () => {
	it('default renders correctly', () => {
		const h = harness(() => <Home />);
		h.expect(baseTemplate);
	});
});
```

The `harness` API allows you to verify that the output of a rendered widget is what you expect.

-   Does it render as expected?
-   Do event handlers work as expected?

## Writing functional tests

Functional tests allow a UI page to be loaded and its code executed in a real browser to better test widget behavior.

Writing functional tests means specifying the interaction that a user would have with a page in terms of clicking on elements, then validating the resulting page content.

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

## Using assertion templates

Assertion templates provide a way to create a base assertion that allow parts of the expected output to vary between tests.

-   Given a widget that renders output differently based on property values:

> src/widgets/Profile.tsx

```tsx
import { create, tsx } from '@dojo/framework/core/vdom';

import * as css from './Profile.m.css';

export interface ProfileProperties {
	username?: string;
}

const factory = create().properties<ProfileProperties>();

const Profile = factory(function Profile({ properties }) {
	const { username } = properties();
	return <h1 classes={[css.root]}>{`Welcome ${username || 'Stranger'}!`}</h1>;
});

export default Profile;
```

-   Create an assertion template using `@dojo/framework/testing/assertionTemplate`

> tests/unit/widgets/Profile.tsx

```ts
const { describe, it } = intern.getInterface('bdd');
import { tsx } from '@dojo/framework/core/vdom';
import assertionTemplate from '@dojo/framework/testing/assertionTemplate';
import harness from '@dojo/framework/testing/harness';

import Profile from '../../../src/widgets/Profile';
import * as css from '../../../src/widgets/Profile.m.css';

// Create an assertion
const profileAssertion = assertionTemplate(() => (
	<h1 classes={[css.root]} assertion-key="welcome">
		Welcome Stranger!
	</h1>
));

describe('Profile', () => {
	it('default renders correctly', () => {
		const h = harness(() => <Profile />);
		// Test against my base assertion
		h.expect(profileAssertion);
	});
});
```

A value can be provided to any virtual DOM node under test using `assertion-key` properties defined in the assertion template. Note: when `v()` and `w()` from `@dojo/framework/core/vdom` are used, the `~key` property serves the same purpose.

> tests/unit/widgets/Profile.tsx

```ts
describe('Profile', () => {
	it('default renders correctly', () => {
		const h = harness(() => <Profile />);
		// Test against my base assertion
		h.expect(profileAssertion);
	});

	it('renders given username correctly', () => {
		// update the expected result with a given username
		const namedAssertion = profileAssertion.setChildren('~welcome', () => ['Welcome Kel Varnsen!']);
		const h = harness(() => <Profile username="Kel Varnsen" />);
		h.expect(namedAssertion);
	});
});
```

Using the `setChildren` method of an assertion template with the assigned `assertion-key` value, ~welcome in this case, will return an assertion template with the updated virtual DOM structure. This resulting assertion template can then be used to test widget output.

[dojo cli]: https://github.com/dojo/cli
[intern]: https://theintern.io/
[selenium]: http://www.seleniumhq.org/
