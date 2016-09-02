module.exports = function (grunt) {
	grunt.loadNpmTasks('grunt-contrib-stylus');

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
		},
		stylus: {
			dev: {
				options: {},
				files: [ {
					expand: true,
					src: 'src/themes/**/*.styl',
					ext: '.css',
					dest: '_build/'
				} ]
			},
			dist: {
				options: {},
				files: [ {
					expand: true,
					cwd: 'src/',
					src: 'themes/**/*.styl',
					ext: '.css',
					dest: 'dist/'
				}]
			}
		}
	});

	grunt.registerTask('dev', [
		'typings',
		'tslint',
		'clean:dev',
		'ts:dev',
		'stylus:dev',
		'copy:staticTestFiles',
		'copy:staticExampleFiles'
	]);

	grunt.registerTask('dist', [
		'typings',
		'tslint',
		'clean:dist',
		'ts:dist',
		'stylus:dist'
	]);
};
