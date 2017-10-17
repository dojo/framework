module.exports = function (grunt) {
	const staticExampleFiles = [ 'src/examples/index.html' ];

	require('grunt-dojo2').initConfig(grunt, {
		copy: {
			staticExampleFiles: {
				expand: true,
				cwd: '.',
				src: staticExampleFiles,
				dest: '<%= devDirectory %>'
			}
		},
		typedoc: {
			options: {
				ignoreCompilerErrors: true // Remove this once compile errors are resolved
			}
		},
		ts: {
			dist: {
				exclude: ['tests/**/*.ts', 'src/examples/**/*.ts']
			}
		},
		intern: {
			version: 4
		}
	});

	grunt.registerTask('dev', grunt.config.get('devTasks').concat([
		'copy:staticExampleFiles'
	]));
};
