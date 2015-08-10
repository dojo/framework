import intern = require('intern');
import echo = require('intern/dojo/has!host-node?./services/echo');

let server: any;
if (echo && intern.mode === 'runner') {
	echo.start().then(function (_server: any) {
		server = _server;
	});
}

// This hook is called when Intern closes
export function teardown() {
	server && server.close();
}

export const proxyPort = 9000;

// A fully qualified URL to the Intern proxy
export const proxyUrl = 'http://localhost:9001/';

// Default desired capabilities for all environments. Individual capabilities can be overridden by any of the
// specified browser environments in the `environments` array below as well. See
// https://code.google.com/p/selenium/wiki/DesiredCapabilities for standard Selenium capabilities and
// https://saucelabs.com/docs/additional-config#desired-capabilities for Sauce Labs capabilities.
// Note that the `build` capability will be filled in with the current commit ID from the Travis CI environment
// automatically
export const capabilities = {
	'browserstack.selenium_version': '2.45.0',
	project: 'Dojo 2',
	name: 'dojo-core'
};

// Browsers to run integration testing against. Note that version numbers must be strings if used with Sauce
// OnDemand. Options that will be permutated are browserName, version, platform, and platformVersion; any other
// capabilities options specified for an environment will be copied as-is
export const environments = [
	{ browser: 'IE', browser_version: '11', os: 'WINDOWS', os_version: '8.1' },
	{ browser: 'IE', browser_version: '10', os: 'WINDOWS', os_version: '8' },
	{ browser: 'IE', browser_version: '9', os: 'WINDOWS', os_version: '7' },
	{ browser: 'Firefox', os: 'WINDOWS', os_version: '8.1' },
	{ browser: 'Firefox', os: 'WINDOWS', os_version: 'XP' },
	{ browser: 'Firefox', os: 'OS X' },
	{ browser: 'Chrome', os: 'WINDOWS', os_version: '8.1' },
	{ browser: 'Chrome', os: 'WINDOWS', os_version: 'XP' },
	{ browser: 'Chrome', os: 'OS X' },
	{ browser: 'Safari', browser_version: '8', os: 'OS X' }
];

// Maximum number of simultaneous integration tests that should be executed on the remote WebDriver service
export const maxConcurrency = 2;

// Name of the tunnel class to use for WebDriver tests
export const tunnel = 'BrowserStackTunnel';

// Support running unit tests from a web server that isn't the intern proxy
export const initialBaseUrl: string = (function () {
	if (typeof location !== 'undefined' && location.pathname.indexOf('__intern/') > -1) {
		return '/';
	}
	return null;
})();

// The desired AMD loader to use when running unit tests (client.html/client.js). Omit to use the default Dojo
// loader
export const loaders = {
	'host-browser': `node_modules/dojo-loader/loader.js`,
	'host-node': 'dojo-loader'
};

// Configuration options for the module loader; any AMD configuration options supported by the specified AMD loader
// can be used here
export const loaderOptions = {
	// Packages that should be registered with the loader in each testing environment
	packages: [
		{ name: 'src', location: '_build/src' },
		{ name: 'tests', location: '_build/tests' },
		{ name: 'dojo', location: 'node_modules/intern/node_modules/dojo' },
		{ name: 'sinon', location: 'node_modules/sinon/pkg', main: 'sinon' }
	]
};

// Non-functional test suite(s) to run in each browser
export const suites = [ 'tests/unit/all' ];

// Functional test suite(s) to run in each browser once non-functional tests are completed
export const functionalSuites = [ 'tests/functional/all' ];

// A regular expression matching URLs to files that should not be included in code coverage analysis
export const excludeInstrumentation = /(?:node_modules|bower_components|tests)[\/]/;
