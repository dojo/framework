module.exports = function (grunt) {
	require('grunt-dojo2').initConfig(grunt, {
		/* TODO: when this is updated in grunt-dojo2 */
		staticTestFiles: [ 'tests/**/*.{html,css,json,xml,txt}' ]
	});
};
