export * from './intern';

export const environments = [
	{ browserName: 'internet explorer', version: [ '10.0', '11.0' ], platform: 'Windows 7' },
	/* Issues with SauceLabs and Edge ;-( */
	// { browserName: 'microsoftedge', platform: 'Windows 10' },
	{ browserName: 'firefox', version: '50', platform: 'Windows 7' },
	{ browserName: 'chrome', platform: 'Windows 10' }
	/* Issues with SauceLabs and Safari ;-( */
	// { browserName: 'safari', version: '9', platform: 'OS X 10.11' },
	// Issues with android running on saucelabs
	// { browserName: 'android', deviceName: 'Google Nexus 7 HD Emulator' }
	/* Issues with SauceLabs and Safar iOS 8/9 */
	// { browserName: 'iphone', version: '9.3' }
];

/* SauceLabs supports more max concurrency */
export const maxConcurrency = 4;

export const tunnel = 'SauceLabsTunnel';
