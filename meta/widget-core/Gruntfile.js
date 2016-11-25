var path = require('path');
var fs = require('fs');

module.exports = function (grunt) {
	var staticExampleFiles = [ 'src/examples/**', '!src/examples/**/*.js' ];

	require('grunt-dojo2').initConfig(grunt, {
		copy: {
			staticExampleFiles: {
				expand: true,
				cwd: '.',
				src: staticExampleFiles,
				dest: '<%= devDirectory %>'
			}
		},
		dtsGenerator: {
			options: {
				main: 'dojo-widgets/main'
			}
		}
	});

	grunt.registerTask('dev', [
		'clean:typings',
		'typings',
		'tslint',
		'clean:dev',
		'ts:dev',
		'copy:staticTestFiles',
		'copy:staticExampleFiles'
	]);

	grunt.registerTask('dist', [
		'clean:typings',
		'typings',
		'tslint',
		'clean:dist',
		'ts:dist'
	]);
};
