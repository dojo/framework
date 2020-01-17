(function(_, factory) {
	if (typeof define === 'function' && define.amd) {
		define([
			'exports',
			'globalize/dist/globalize/message',
			'cldrjs/dist/cldr/unresolved',
			'text!cldr-core/supplemental/likelySubtags.json',
			'text!cldr-core/supplemental/plurals.json',
			'text!cldr-core/supplemental/parentLocales.json'
		], factory);
	} else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
		factory(
			exports,
			require('globalize/dist/globalize/message'),
			'cldrjs/dist/cldr/unresolved',
			require('cldr-core/supplemental/likelySubtags.json'),
			require('cldr-core/supplemental/plurals.json'),
			require('cldr-core/supplemental/parentLocales.json')
		);
	}
})(typeof self !== 'undefined' ? self : this, function(
	_: any,
	Globalize: any,
	__: any,
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
