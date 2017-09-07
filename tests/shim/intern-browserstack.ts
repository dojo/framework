export * from './intern';

export const environments = [
	{ browserName: 'internet explorer', version: '11' },
	{ browserName: 'edge' },
	{ browserName: 'firefox', platform: 'WINDOWS' },
	{ browserName: 'chrome', platform: 'WINDOWS' }
	// Issue with iphone 9.1 and Safari compatability, commented out for move to
	// browserstack and issue raised - https://github.com/dojo/core/issues/338
	// { browserName: 'safari', version: '9.1', platform: 'MAC' },
	// { browserName: 'iPhone', version: '9.1' }
];

export const tunnel = 'browserstack';
