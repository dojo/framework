module.exports = function (grunt) {
	const gruntConfig = {
		typedoc: {
			options: {
				ignoreCompilerErrors: true // Remove this once compile errors are resolved
			}
		},

		watch: {
			dev: {
				files: '**/*.ts',
				tasks: ['dev'],
				options: {
					spawn: false
				}
			}
		}
	};
	grunt.initConfig(gruntConfig);
	require('grunt-dojo2').initConfig(grunt, gruntConfig);

	grunt.loadNpmTasks('grunt-contrib-watch');
};
