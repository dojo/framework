# Basic Usage

## Testing Dojo Applications

Dojo uses `@dojo/cli-test-intern` for running unit and functional tests in your `tests` folder.

You can quickly run your tests in node.

> Command Line

```bash
npm test
```

## Running Tests

Dojo supports two types of testing approaches unit and functional. Unit tests are tests run via node and the local
[Selenium] tunnel and test isolated blocks of code. Functional tests are run using Selenium in the browser and test
the overall functionality of the software as a user would interact with it.

This command will execute only your unit tests.

> Command Line

```bash
npm run test:unit
```

This command will execute your functional tests locally in a headless Chrome instance using [Selenium].

> Command Line

```bash
npm run test:functional
```

## Unit Tests

Dojo comes with a [`harness`](https://github.com/dojo/framework/tree/master/src/testing) API for testing widgets.

> src/tests/unit/widgets/Home.ts

```ts
const { describe, it } = intern.getInterface('bdd');
import harness from '@dojo/framework/testing/harness';
import { w, v } from '@dojo/framework/widget-core/d';

import Home from '../../../src/widgets/Home';
import * as css from '../../../src/widgets/styles/Home.m.css';

describe('Home', () => {
	it('default renders correctly', () => {
		const h = harness(() => w(Home, {}));
		h.expect(() => v('h1', { classes: [css.root] }, ['Home Page']));
	});
});

```

The `harness` API allows you to verify that the output of a rendered widget is what you expect.

* Does it render as expected?
* Does a child widget or element render as expected?
* Do event handlers work as expected?

You can read more details in the [`harness` README](https://github.com/dojo/framework/tree/master/src/testing#harness).

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

## Testing services

Intern comes with support for running tests remotely on [BrowserStack], [SauceLabs], and [TestingBot]. You may use one
 of these services by signing up for an account and providing your credentials to cli-test-intern. By default, all of
 the testing services will run tests against IE11, Firefox, and Chrome.
 
### BrowserStack

[BrowserStack] requires an access key and username to use its services. These may be provided on the command line or as 
environment variables as described in [Intern's documentation](https://theintern.io/docs.html#Intern/4/docs/docs%2Frunning.md/cloud-service).

```bash
dojo test -a -c browserstack -k <accesskey> --userName <username>
```

or with environment variables

```bash
BROWSERSTACK_USERNAME=<username> BROWSERSTACK_ACCESS_KEY=<key> dojo test -a -c browserstack
```

### SauceLabs

[SauceLabs] requires an access key and username to use its services. These may be provided on the command line or as 
environment variables as described in [Intern's documentation](https://theintern.io/docs.html#Intern/4/docs/docs%2Frunning.md/cloud-service).

```bash
dojo test -a -c saucelabs -k <accesskey> --userName <username>
```

or with environment variables

```bash
SAUCE_USERNAME=<username> SAUCE_ACCESS_KEY=<key> dojo test -a -c saucelabs
```

### TestingBot

[TestingBot] requires an key and a secret to use its services. These may be provided on the command line or as 
environment variables as described in [Intern's documentation](https://theintern.io/docs.html#Intern/4/docs/docs%2Frunning.md/cloud-service).

```bash
dojo test -a -c testingbot -k <key> -s <secret>
```

or with environment variables

```bash
TESTINGBOT_SECRET=<secret> TESTINGBOT_KEY=<key> dojo test -a -c saucelabs
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
    return v("h1", { classes: [css.root] }, [
      `Welcome ${username || "Stranger"}!`
    ]);
  }
}
```

You can create an assertion template using `@dojo/framework/testing/assertionTemplate`.

> tests/unit/widgets/Profile.ts

```ts
// Create an assertion
const profileAssertion = assertionTemplate(() =>
  v("h1", { classes: [css.root], "~key": "welcome" }, ["Welcome Stranger!"])
);

describe("Profile", () => {
  it("default renders correctly", () => {
    const h = harness(() => w(Profile, {}));
    // Test against my base assertion
    h.expect(profileAssertion);
  });
});
```

You can provide a value to any virtual DOM node that you may want to test against using the `~key` properties defined in the Assertion Template. In `.tsx` this would be the `assertion-key` attribute.

> tests/unit/widgets/Profile.ts

```ts
describe("Profile", () => {
  it("default renders correctly", () => {
    const h = harness(() => w(Profile, {}));
    h.expect(profileAssertion);
  });

  it("renders given username correctly", () => {
    // update the expected result with a given username
    const namedAssertion = profileAssertion.setChildren("~welcome", [
      "Welcome Kel Varnsen!"
    ]);
    const h = harness(() => w(Profile, { username: "Kel Varnsen" }));
    h.expect(namedAssertion);
  });
});
```

Using the `setChildren` method of an Assertion Template with the `~key` value you assigned will return a new virtual DOM structure that you can test your widget output against.

You can read more details in the [testing README](https://github.com/dojo/framework/tree/master/src/testing#assertion-templates).

[BrowserStack]: https://www.browserstack.com/
[Dojo CLI]: https://github.com/dojo/cli
[Intern]: https://theintern.io/
[SauceLabs]: https://saucelabs.com/
[Selenium]: http://www.seleniumhq.org/
[TestingBot]: https://testingbot.com/
