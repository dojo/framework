declare const define: any;
(function(_, factory) {
	if (typeof define === 'function' && define.amd) {
		define([
			'exports',
			'cldrjs/dist/cldr/unresolved',
			'globalize/dist/globalize',
			'text!cldr-core/supplemental/weekData.json',
			'text!cldr-core/supplemental/timeData.json',
			'text!cldr-core/supplemental/currencyData.json',
			'text!cldr-core/supplemental/ordinals.json',
			'text!cldr-core/supplemental/numberingSystems.json',
			'text!cldr-data/main/en/ca-gregorian.json',
			'text!cldr-data/main/en/dateFields.json',
			'text!cldr-data/main/en/timeZoneNames.json',
			'text!cldr-data/main/en/currencies.json',
			'text!cldr-data/main/en/numbers.json',
			'text!cldr-data/main/en/units.json',
			'text!cldr-data/main/fr/ca-gregorian.json',
			'text!cldr-data/main/fr/dateFields.json',
			'text!cldr-data/main/fr/timeZoneNames.json',
			'text!cldr-data/main/fr/currencies.json',
			'text!cldr-data/main/fr/numbers.json',
			'text!cldr-data/main/fr/units.json'
		], factory);
	} else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
		factory(
			exports,
			require('cldrjs/dist/cldr/unresolved'),
			require('globalize/dist/globalize'),
			require('cldr-core/supplemental/weekData.json'),
			require('cldr-core/supplemental/timeData.json'),
			require('cldr-core/supplemental/currencyData.json'),
			require('cldr-core/supplemental/ordinals.json'),
			require('cldr-core/supplemental/numberingSystems.json'),
			require('cldr-data/main/en/ca-gregorian.json'),
			require('cldr-data/main/en/dateFields.json'),
			require('cldr-data/main/en/timeZoneNames.json'),
			require('cldr-data/main/en/currencies.json'),
			require('cldr-data/main/en/numbers.json'),
			require('cldr-data/main/en/units.json'),
			require('cldr-data/main/fr/ca-gregorian.json'),
			require('cldr-data/main/fr/dateFields.json'),
			require('cldr-data/main/fr/timeZoneNames.json'),
			require('cldr-data/main/fr/currencies.json'),
			require('cldr-data/main/fr/numbers.json'),
			require('cldr-data/main/fr/units.json')
		);
	}
})(typeof self !== 'undefined' ? self : this, function(
	_: any,
	__: any,
	Globalize: any,
	weekData: any,
	timeData: any,
	currencyData: any,
	ordinals: any,
	numberingSystems: any,
	enCaGregorian: any,
	enDateFields: any,
	enTimeZoneNames: any,
	enCurrencies: any,
	enNumbers: any,
	enUnits: any,
	frCaGregorian: any,
	frDateFields: any,
	frTimeZoneNames: any,
	frCurrencies: any,
	frNumbers: any,
	frUnits: any
) {
	function loadData(data: string | Function) {
		if (typeof data === 'string') {
			data = JSON.parse(data);
		}
		Globalize.load(data);
	}
	loadData(weekData);
	loadData(timeData);
	loadData(currencyData);
	loadData(ordinals);
	loadData(numberingSystems);
	loadData(enCaGregorian);
	loadData(enDateFields);
	loadData(enTimeZoneNames);
	loadData(enCurrencies);
	loadData(enNumbers);
	loadData(enUnits);
	loadData(frCaGregorian);
	loadData(frDateFields);
	loadData(frTimeZoneNames);
	loadData(frCurrencies);
	loadData(frNumbers);
	loadData(frUnits);
});
