/* jshint node:true */

module.exports = function (grunt) {
	grunt.registerTask('updatePackageJson', function () {
		var packageJson = grunt.config.get('packageJson');
		var name = grunt.config.get('name');
		var version = grunt.config.get('version');
		packageJson.typings = 'typings/' + name + '/' + name + '-' + version + '.d.ts';

		var output = JSON.stringify(packageJson, null, '\t') + require('os').EOL;
		grunt.file.write('dist/package.json', output);
		grunt.config.set('packageJson', packageJson);
	});
};
