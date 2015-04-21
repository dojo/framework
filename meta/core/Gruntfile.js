/* jshint node:true */

var dtsGenerator = require('dts-generator');

module.exports = function (grunt) {
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-ts');
	grunt.loadNpmTasks('grunt-tslint');
	grunt.loadNpmTasks('intern');

	grunt.initConfig({
		name: 'dojo-core',
		all: [ 'src/**/*.ts', 'typings/tsd.d.ts' ],
		tests: [ 'tests/**/*.ts', 'typings/tsd.d.ts' ],

		clean: {
			dist: {
				src: [ 'dist/' ]
			},
			src: {
				src: [ '{src,tests}/**/*.js' ],
				filter: function (path) {
					// Only clean the .js file if a .js.map file also exists
					var mapPath = path + '.map';
					if (grunt.file.exists(mapPath)) {
						grunt.file.delete(mapPath);
						return true;
					}
					return false;
				}
			},
			typings: {
				src: [ 'tests/typings/dist/' ]
			},
			coverage: {
				src: [ 'html-report/' ]
			}
		},

		copy: {
			sourceForDebugging: {
				expand: true,
				cwd: 'src/',
				src: [ '**/*.ts' ],
				dest: 'dist/_debug/'
			},
			staticFiles: {
				expand: true,
				cwd: '.',
				src: [ 'README.md', 'LICENSE', 'package.json', 'bower.json' ],
				dest: 'dist/'
			},
			typings: {
				expand: true,
				cwd: 'typings/',
				src: [ '**/*.d.ts', '!tsd.d.ts' ],
				dest: 'dist/typings/'
			}
		},

		dts: {
			options: {
				baseDir: 'src',
				name: '<%= name %>'
			},
			dist: {
				options: {
					out: 'dist/typings/<%= name %>/<%= name %>-2.0.d.ts'
				},
				src: [ '<%= all %>' ]
			},
			tests: {
				options: {
					name: 'dist',
					out: 'tests/typings/dist/dist.d.ts'
				},
				src: [ '<%= all %>' ]
			}
		},

		intern: {
			options: {
				grep: grunt.option('grep') || '.*',
				runType: 'runner',
				config: 'tests/intern'
			},
			runner: {
				options: {
					reporters: [ 'runner', 'lcovhtml' ]
				}
			},
			local: {
				options: {
					config: 'tests/intern-local',
					reporters: [ 'runner', 'lcovhtml' ]
				}
			},
			client: {
				options: {
					runType: 'client',
					reporters: [ 'console', 'lcovhtml' ]
				}
			},
			proxy: {
				options: {
					proxyOnly: true
				}
			}
		},

		rename: {
			sourceMaps: {
				expand: true,
				cwd: 'dist/',
				src: [ '**/*.js.map', '!_debug/**/*.js.map' ],
				dest: 'dist/_debug/'
			}
		},

		rewriteSourceMaps: {
			dist: {
				src: [ 'dist/_debug/**/*.js.map' ]
			}
		},

		ts: {
			options: {
				failOnTypeErrors: true,
				fast: 'never',
				noImplicitAny: true,
				sourceMap: true,
				target: 'es5',
				module: 'camd'
			},
			dist: {
				options: {
					mapRoot: '../dist/_debug'
				},
				outDir: 'dist',
				src: [ '<%= all %>' ]
			},
			tests: {
				src: [ '<%= tests %>' ]
			}
		},

		tslint: {
			options: {
				configuration: grunt.file.readJSON('tslint.json')
			},
			src: {
				src: [ '<%= all %>', '<%= tests %>', '!typings/**/*.ts', '!tests/typings/**/*.ts' ]
			}
		},

		watch: {
			src: {
				options: {
					atBegin: true
				},
				files: [ '<%= all %>', '<%= tests %>' ],
				tasks: [
					'build-tests',
					'tslint'
				]
			}
		}
	});

	grunt.registerMultiTask('dts', function () {
		var done = this.async();
		var onProgress = grunt.verbose.writeln.bind(grunt.verbose);

		var kwArgs = this.options();
		var path = require('path');
		kwArgs.files = this.filesSrc.map(function (filename) {
			return path.relative(kwArgs.baseDir, filename);
		});

		dtsGenerator.generate(kwArgs, onProgress).then(function () {
			grunt.log.writeln('Generated d.ts bundle at \x1b[36m' + kwArgs.out + '\x1b[39;49m');
			done();
		}, done);
	});

	grunt.registerMultiTask('rewriteSourceMaps', function () {
		this.filesSrc.forEach(function (file) {
			var map = JSON.parse(grunt.file.read(file));
			var sourcesContent = map.sourcesContent = [];
			var path = require('path');
			map.sources = map.sources.map(function (source, index) {
				sourcesContent[index] = grunt.file.read(path.resolve(path.dirname(file), source));
				return source.replace(/^.*\/src\//, '');
			});
			grunt.file.write(file, JSON.stringify(map));
		});
		grunt.log.writeln('Rewrote ' + this.filesSrc.length + ' source maps');
	});

	grunt.registerMultiTask('rename', function () {
		this.files.forEach(function (file) {
			if (grunt.file.isFile(file.src[0])) {
				grunt.file.mkdir(require('path').dirname(file.dest));
			}
			require('fs').renameSync(file.src[0], file.dest);
			grunt.verbose.writeln('Renamed ' + file.src[0] + ' to ' + file.dest);
		});
		grunt.log.writeln('Moved ' + this.files.length + ' files');
	});

	grunt.registerTask('build', [
		'ts:dist',
		'rename:sourceMaps',
		'rewriteSourceMaps',
		'dts:tests'
	]);
	grunt.registerTask('build-tests', [
		'build',
		'ts:tests'
	]);
	grunt.registerTask('dist', [
		'build',
		'copy:typings',
		'copy:staticFiles',
		'dts:dist'
	]);
	grunt.registerTask('test', [ 'build-tests', 'intern:client' ]);
	grunt.registerTask('test-local', [ 'build-tests', 'intern:local' ]);
	grunt.registerTask('test-proxy', [ 'build-tests', 'intern:proxy' ]);
	grunt.registerTask('ci', [ 'tslint', 'test' ]);
	grunt.registerTask('default', [ 'clean', 'build' ]);
};
