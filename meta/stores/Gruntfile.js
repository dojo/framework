module.exports = function (grunt) {
	const gruntConfig = {
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
