var path = require('path');
var fs = require('fs');

module.exports = function (grunt) {
	grunt.loadNpmTasks('grunt-contrib-stylus');
	grunt.loadNpmTasks('grunt-postcss');

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
				options: {
					'include css': true
				},
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
		},
		postcss: {
			options: {
				map: true,
				processors: [
					require('postcss-simple-vars')({
						variables: require('./src/themes/structural/common')
					}),
					require('postcss-modules')({
						getJSON: function(cssFileName, json) {
							var filename = path.basename(cssFileName, '.css');
							fs.writeFileSync(
								`src/themes/structural/modules/${ filename }.ts`,
								`/* tslint:disable:object-literal-key-quotes quotemark whitespace */\nexport default ${ JSON.stringify(json) };\n`
							);
						}
					})
				]
			},
			dev: {
				files: [ {
					expand: true,
					flatten: true,
					src: 'src/themes/structural/*.css',
					ext: '.css',
					dest: 'src/themes/structural/_generated/'
				} ]
			}
		}
	});

	grunt.registerTask('dev', [
		'clean:typings',
		'postcss',
		'typings',
		'tslint',
		'clean:dev',
		'ts:dev',
		'stylus:dev',
		'copy:staticTestFiles',
		'copy:staticExampleFiles'
	]);

	grunt.registerTask('dist', [
		'clean:typings',
		'postcss',
		'typings',
		'tslint',
		'clean:dist',
		'ts:dist',
		'stylus:dist'
	]);
};
