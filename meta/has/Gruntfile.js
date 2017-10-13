module.exports = function (grunt) {
	require('grunt-dojo2').initConfig(grunt, {
		dtsGenerator: {
			options: {
				main: 'dojo-has/main'
			}
		},
		typedoc: {
			options: {
				ignoreCompilerErrors: true // Remove this once compile errors are resolved
			}
		},
		intern: {
			version: 4
		}
	});
};
