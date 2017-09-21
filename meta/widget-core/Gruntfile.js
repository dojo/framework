module.exports = function (grunt) {
	require('grunt-dojo2').initConfig(grunt, {
		ts: {
			dist: {
				exclude: [ 'tests/**/*.tsx', 'tests/**/*.ts' ]
			}
		},
		typedoc: {
			options: {
				ignoreCompilerErrors: true // Remove this once compile errors are resolved
			}
		}
	});
};
