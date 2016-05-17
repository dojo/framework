/* jshint node:true */

module.exports = function (grunt) {
	grunt.registerTask('updateTsconfig', function () {
		var tsconfigContent = grunt.config.get('tsconfigContent');
		var tsconfig = JSON.parse(tsconfigContent);
		tsconfig.files = grunt.file.expand(tsconfig.filesGlob);

		var output = JSON.stringify(tsconfig, null, '\t') + require('os').EOL;
		if (output !== tsconfigContent) {
			grunt.file.write('tsconfig.json', output);
			grunt.config.set('tsconfigContent', output);
		}
	});
};
