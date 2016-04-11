/* jshint node:true */

module.exports = function (grunt) {
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
};
