(function(_, factory) {
	if (typeof define === 'function' && define.amd) {
		define([
			'exports',
			'cldrjs/dist/cldr/unresolved',
			'globalize/dist/globalize/message',
			'text!cldr-core/supplemental/likelySubtags.json',
			'text!cldr-core/supplemental/plurals.json',
			'text!cldr-core/supplemental/parentLocales.json'
		], factory);
	} else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
		factory(
			exports,
			require('cldrjs/dist/cldr/unresolved'),
			require('globalize/dist/globalize/message'),
			require('cldr-core/supplemental/likelySubtags.json'),
			require('cldr-core/supplemental/plurals.json'),
			require('cldr-core/supplemental/parentLocales.json')
		);
	}
})(typeof self !== 'undefined' ? self : this, function(
	_: any,
	__: any,
	Globalize: any,
	likelySubtags: any,
	plurals: any,
	parentLocales: any
) {
	function loadData(data: string | Function) {
		if (typeof data === 'string') {
			data = JSON.parse(data);
		}
		Globalize.load(data);
	}
	loadData(likelySubtags);
	loadData(plurals);
	loadData(parentLocales);
});
