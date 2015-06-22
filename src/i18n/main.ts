import DateObject from 'dojo-core/DateObject';
import has from 'dojo-core/has';
import load, { Require } from 'dojo-core/load';
import Promise from 'dojo-core/Promise';
import coreRequest from 'dojo-core/request';
import Globalize = require('globalize');
import Cldr = require('cldrjs');

declare var require: Require;
declare var define: any;

export const systemLocale: string = (function () {
	let systemLocale: string;
	if (has('host-browser')) {
		systemLocale = navigator.language;
	}
	else if (has('host-node')) {
		systemLocale = process.env.LANG;
	}
	if (!systemLocale) {
		systemLocale = 'en';
	}
	return systemLocale;
})();

const getJson: (...paths: string[]) => Promise<{}[]> = (function () {
	if (has('host-node')) {
		return function (...paths: string[]): Promise<{}[]> {
			return load(require, ...paths);
		};
	}
	else if (typeof define === 'function' && define.amd) {
		return function (...paths: string[]): Promise<{}[]> {
			return load(require, 'dojo-core/request').then(function ([ request ]: [ typeof coreRequest ]): Promise<{}> {
				return Promise.all(paths.map(function (path: string): Promise<{}> {
					return request.get(path + '.json', { responseType: 'json' }).then(function (response) {
						return response.data;
					});
				}));
			});
		};
	}
	else {
		throw new Error('Unknown loader');
	}
})();

function loadCldrData(locale: string, paths: string[]): Promise<any> {
	if (paths.indexOf('cldr-data/supplemental/likelySubtags') === -1) {
		paths.unshift('cldr-data/supplemental/likelySubtags');
	}
	return null;
}

interface AvailableLocales {
	availableLocales: string[];
}

let parentDataPromise: Promise<any>;
function getCldrLocale(locale: string = systemLocale): Promise<string> {
	if (!parentDataPromise) {
		parentDataPromise = getJson(
			'cldr-data/availableLocales',
			'cldr-data/supplemental/likelySubtags',
			'cldr-data/supplemental/parentLocales'
		).then(function ([ available, subtags, parents ]: [ AvailableLocales, {}, {} ]) {
			Cldr.load(subtags, parents);
			available.availableLocales.splice(available.availableLocales.indexOf('root'), 1);
			Cldr._availableBundleMapQueue = available.availableLocales;
			return Cldr;
		});
	}
	return parentDataPromise.then(function (Cldr) {
		return new Cldr(locale).attributes.bundle;
	});
}

export interface Options {
	bundles?: string[];
	locale?: string;
	require?: Require;
}
export interface DateFormatOptions {
	skeleton?: string;
	date?: string;
	time?: string;
	datetime?: string;
	pattern?: string;
}
export interface NumberFormatOptions {
	style?: string;
	minimumIntergerDigits?: number;
	minimumFractionDigits?: number;
	maximumFractionDigits?: number;
	minimumSignificantDigits?: number;
	maximumSignificantDigits?: number;
	round?: number;
	useGrouping?: boolean;
}
export interface PluralFormatOptions {
	type: string;
}
interface RelativeTimeFormatOptions {
	form: string;
}

export default class I18n {
	bundles: string[];
	locale: string;
	require: Require;
	systemLocale: string;

	protected globalize: Globalize;

	constructor(options?: Options) {
	}

	load(): Promise<void> {
		return null;
	}

	formatCurrency(amount: number, currency: string, options?: NumberFormatOptions): string {
		return null;
	}
	formatDate(date: DateObject, options?: DateFormatOptions): string {
		return null;
	}
	formatNumber(number: number, options?: NumberFormatOptions): string {
		return null;
	}
	formatRelativeTime(value: number, unit: string, options?: RelativeTimeFormatOptions): string {
		return null;
	}

	getMessage(messageId: string, ...variables: any[]): string {
		return null;
	}
	loadBundle(bundle: string): Promise<void> {
		return null;
	}

	parseDate(date: string, options?: DateFormatOptions): DateObject {
		return null;
	}
	parseNumber(string: string, options?: NumberFormatOptions): number {
		return null;
	}

	pluralize(value: number, options?: PluralFormatOptions): string {
		return null;
	}
}
I18n.prototype.systemLocale = systemLocale;
