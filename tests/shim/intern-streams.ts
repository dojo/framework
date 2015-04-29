// NOTE!!!
// This configuration is for the streams tests.  The streams classes contain circular references
// that the dojo2 loader cannot currently handle.  This should be fixed in Intern 3.
// For now, run "npm install requirejs" from the core directory and test using the grunt task intern:streams.

export * from './intern';

// The desired AMD loader to use when running unit tests (client.html/client.js). Omit to use the default Dojo
// loader
export var useLoader = {
	'host-node': 'requirejs',
	'host-browser': '../requirejs/require.js'
};

// Non-functional test suite(s) to run in each browser
export var suites = [ 'tests/unit/streams/all' ];
