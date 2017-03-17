module.exports = function (grunt) {
	require('grunt-dojo2').initConfig(grunt, {
		typedoc: {
			options: {
				ignoreCompilerErrors: true // Remove this once compile errors are resolved
			}
		}
	});
};
