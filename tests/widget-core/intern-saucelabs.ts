export * from './intern';

export const environments = [
	{ browserName: 'internet explorer', version: [ '10.0', '11.0' ], platform: 'Windows 7' },
	{ browserName: 'MicrosoftEdge', platform: 'Windows 10' },
	/* Pin Firefox to a specific version due to issues with current versions of Intern
	 * and Firefox */
	{ browserName: 'firefox', version: '43', platform: 'Windows 10' },
	{ browserName: 'chrome', platform: 'Windows 10' }
	// Disable Safari 9 because of timing issues when running the tests.
	// See <https://github.com/dojo/widgets/issues/5>.
	// { browserName: 'safari', version: '9.0', platform: 'OS X 10.11' },
	// Android platforms currently failing travis as saucelabs is not returning within a reasonable time
	// { browserName: 'android', version: '5.1' }
	// skip IOS browser tests because they hang in Sauce (ongoing issue)
	// { browserName: 'iphone', version: '9.3' }
];

/* SauceLabs supports more max concurrency */
export const maxConcurrency = 4;

export const tunnel = 'SauceLabsTunnel';
