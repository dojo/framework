module.exports = function (grunt) {
	const staticExampleFiles = [ 'examples/index.html' ];

	require('grunt-dojo2').initConfig(grunt, {
		copy: {
			staticExampleFiles: {
				expand: true,
				cwd: '.',
				src: staticExampleFiles,
				dest: '<%= devDirectory %>'
			}
		},
		ts: {
			dist: {
				exclude: ['tests/**/*.ts', 'examples/**/*.ts']
			}
		},
		typedoc: {
			options: {
				ignoreCompilerErrors: true // Remove this once compile errors are resolved
			}
		}
	});

	grunt.registerTask('dev', grunt.config.get('devTasks').concat([
		'copy:staticExampleFiles'
	]));
};
