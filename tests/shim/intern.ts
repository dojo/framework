// Default desired capabilities for all environments. Individual capabilities can be overridden by any of the
// specified browser environments in the `environments` array below as well. See
// https://code.google.com/p/selenium/wiki/DesiredCapabilities for standard Selenium capabilities and
// https://saucelabs.com/docs/additional-config#desired-capabilities for Sauce Labs capabilities.
// Note that the `build` capability will be filled in with the current commit ID from the Travis CI environment
// automatically
export const capabilities = {
	'browserstack.debug': false,
	project: 'Dojo 2',
	name: '@dojo/shim',
	fixSessionCapabilities: false
};

// Maximum number of simultaneous integration tests that should be executed on the remote WebDriver service
export const maxConcurrency = 5;

// Configuration options for the module loader; any AMD configuration options supported by the specified AMD loader
// can be used here
export const loader = {
	script: 'dojo2',
	options: {
		// Packages that should be registered with the loader in each testing environment
		packages: [
			{ name: 'src', location: '_build/src' },
			{ name: 'tests', location: '_build/tests' },
			{ name: 'dojo', location: 'node_modules/intern/node_modules/dojo' },
			{ name: 'grunt-dojo2', location: 'node_modules/grunt-dojo2'},
			{ name: '@dojo', location: 'node_modules/@dojo' }
		]
	}
};

// Non-functional test suite(s) to run in each browser
export const suites = 'tests/unit/all';

// Functional test suite(s) to run in each browser once non-functional tests are completed
export const functionalSuites = 'tests/functional/all';

// A regular expression matching URLs to files that should not be included in code coverage analysis
export const coverage = [
	'_build/src/**/*.js'
];
export const functionalCoverage = true;

export const defaultTimeout = 5000;
