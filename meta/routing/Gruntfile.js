/* jshint node:true */

function mixin(destination) {
	for (var i = 1; i < arguments.length; i++) {
		var source = arguments[i];
		for (var key in source) {
			destination[key] = source[key];
		}
	}
	return destination;
}

module.exports = function (grunt) {
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-release');
	grunt.loadNpmTasks('grunt-text-replace');
	grunt.loadNpmTasks('grunt-ts');
	grunt.loadNpmTasks('grunt-tslint');
	grunt.loadNpmTasks('dts-generator');
	grunt.loadNpmTasks('intern');
	grunt.loadNpmTasks('remap-istanbul');

	grunt.loadTasks('tasks');

	var tsconfigContent = grunt.file.read('tsconfig.json');
	var tsconfig = JSON.parse(tsconfigContent);
	var tsOptions = mixin({}, tsconfig.compilerOptions, {
		failOnTypeErrors: true,
		fast: 'never'
	});
	tsconfig.filesGlob = tsconfig.filesGlob.map(function (glob) {
		if (/^\.\//.test(glob)) {
			// Remove the leading './' from the glob because grunt-ts
			// sees it and thinks it needs to create a .baseDir.ts which
			// messes up the "dist" compilation
			return glob.slice(2);
		}
		return glob;
	});
	var packageJson = grunt.file.readJSON('package.json');
	var staticTestFiles = [ 'tests/**', '!tests/**/*.js*' ];

	grunt.initConfig({
		name: packageJson.name,
		version: packageJson.version,
		tsconfig: tsconfig,
		tsconfigContent: tsconfigContent,
		packageJson: packageJson,
		all: [ '<%= tsconfig.filesGlob %>' ],
		skipTests: [ '<%= all %>' , '!tests/**/*.ts' ],
		devDirectory: '<%= tsconfig.compilerOptions.outDir %>',
		istanbulIgnoreNext: '/* istanbul ignore next */',

		clean: {
			dist: {
				src: [ 'dist/' ]
			},
			dev: {
				src: [ '<%= devDirectory %>' ]
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
			report: {
				src: [ 'html-report/', 'coverage-final.json' ]
			},
			coverage: {
				src: [ 'coverage-unmapped.json' ]
			}
		},

		copy: {
			staticFiles: {
				expand: true,
				cwd: '.',
				src: [ 'README.md', 'LICENSE', 'package.json', 'bower.json' ],
				dest: 'dist/'
			},
			staticTestFiles: {
				expand: true,
				cwd: '.',
				src: staticTestFiles,
				dest: '<%= devDirectory %>'
			},
			typings: {
				expand: true,
				cwd: 'typings/',
				src: [ '**/*.d.ts', '!tsd.d.ts' ],
				dest: 'dist/typings/'
			}
		},

		dtsGenerator: {
			options: {
				baseDir: 'src',
				name: '<%= name %>'
			},
			dist: {
				options: {
					out: 'dist/typings/<%= name %>/<%= name %>-<%= version %>.d.ts'
				},
				src: [ '<%= skipTests %>' ]
			}
		},

		intern: {
			options: {
				runType: 'runner',
				config: '<%= devDirectory %>/tests/intern',
				reporters: [ 'Runner' ]
			},
			browserstack: {},
			saucelabs: {
				options: {
					config: '<%= devDirectory %>/tests/intern-saucelabs'
				}
			},
			remote: {},
			local: {
				options: {
					config: '<%= devDirectory %>/tests/intern-local'
				}
			},
			node: {
				options: {
					runType: 'client'
				}
			},
			proxy: {
				options: {
					proxyOnly: true
				}
			}
		},

		release: {
			options: {
				// Update the bower.json version as well
				additionalFiles: [ 'bower.json' ],
				// Run tasks after the version has been updated in package.json and bower.json
				afterBump: [ 'clean', 'dist' ],
				// Publish the "dist/" directory to npm
				folder: 'dist/',
				commitMessage: 'Updating source version to <%= version %>',
				tagMessage: 'Release <%= version %>',
				// Update the `version` property on the `packageJson` object.
				updateVars: [ packageJson ]
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

		replace: {
			addIstanbulIgnore: {
				src: [ '<%= devDirectory %>/**/*.js' ],
				overwrite: true,
				replacements: [
					{
						from: /^(var __(?:extends|decorate) = )/gm,
						to: '$1<%= istanbulIgnoreNext %> '
					},
					{
						from: /^(\()(function \(deps, )/m,
						to: '$1<%= istanbulIgnoreNext %> $2'
					}
				]
			}
		},

		ts: {
			options: tsOptions,
			dev: {
				outDir: '<%= devDirectory %>',
				src: [ '<%= all %>' ]
			},
			dist: {
				options: {
					mapRoot: '../dist/_debug',
					sourceMap: true,
					inlineSourceMap: false,
					inlineSources: true
				},
				outDir: 'dist',
				src: [ '<%= skipTests %>' ]
			}
		},

		tslint: {
			options: {
				configuration: grunt.file.readJSON('tslint.json')
			},
			src: {
				src: [
					'<%= all %>',
					'!typings/**/*.ts',
					'!tests/typings/**/*.ts'
				]
			}
		},

		watch: {
			grunt: {
				options: {
					reload: true
				},
				files: [ 'Gruntfile.js', 'tsconfig.json' ]
			},
			src: {
				options: {
					atBegin: true
				},
				files: [ '<%= all %>' ].concat(staticTestFiles),
				tasks: [
					'dev'
				]
			}
		},

		remapIstanbul: {
			coverage: {
				options: {
					reports: {
						'html': 'html-report',
						'text': null
					}
				},
				src: [ 'coverage-unmapped.json' ]
			},
			ci: {
				options: {
					reports: {
						'lcovonly': 'coverage-final.lcov',
						'text': null
					}
				},
				src: [ 'coverage-unmapped.json' ]
			}
		}
	});

	// Set some Intern-specific options if specified on the command line.
	[ 'suites', 'functionalSuites', 'grep' ].forEach(function (option) {
		var value = grunt.option(option);
		if (value) {
			if (option !== 'grep') {
				value = value.split(',').map(function (string) { return string.trim(); });
			}
			grunt.config('intern.options.' + option, value);
		}
	});

	function setCombined(combined) {
		if (combined) {
			grunt.config('intern.options.reporters', [
				{ id: 'tests/support/Reporter', file: 'coverage-unmapped.json' }
			]);
		}
	}
	setCombined(grunt.option('combined'));

	grunt.registerTask('test', function () {
		var flags = Object.keys(this.flags);

		if (!flags.length) {
			flags.push('node');
		}

		grunt.option('force', true);
		grunt.task.run('clean:coverage');
		grunt.task.run('dev');
		setCombined(true);
		flags.forEach(function (flag) {
			grunt.task.run('intern:' + flag);
		});
		grunt.task.run('remapIstanbul:coverage');
		grunt.task.run('clean:coverage');
	});

	grunt.registerTask('dev', [
		'tslint',
		'ts:dev',
		'copy:staticTestFiles',
		'replace:addIstanbulIgnore',
		'updateTsconfig'
	]);
	grunt.registerTask('dist', [
		'tslint',
		'ts:dist',
		'rename:sourceMaps',
		'rewriteSourceMaps',
		'copy:typings',
		'copy:staticFiles',
		'dtsGenerator:dist',
		'updatePackageJson'
	]);
	grunt.registerTask('test-proxy', [ 'dev', 'intern:proxy' ]);
	grunt.registerTask('default', [ 'clean', 'dev' ]);
};
