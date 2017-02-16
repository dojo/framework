import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import i18n, {
	formatCurrency,
	formatDate,
	formatMessage,
	formatNumber,
	formatRelativeTime,
	formatUnit,
	generateLocales,
	getCachedMessages,
	getCurrencyFormatter,
	getDateFormatter,
	getDateParser,
	getMessageFormatter,
	getNumberFormatter,
	getNumberParser,
	getPluralGenerator,
	getRelativeTimeFormatter,
	getUnitFormatter,
	invalidate,
	loadCldrData,
	normalizeLocale,
	parseDate,
	parseNumber,
	pluralize,
	switchLocale,
	systemLocale
} from '../../src/main';

registerSuite({
	name: 'main',

	i18n() {
		assert.isFunction(formatCurrency, 'formatCurrency is exported.');
		assert.isFunction(formatDate, 'formatDate is exported.');
		assert.isFunction(formatMessage, 'formatMessage is exported.');
		assert.isFunction(formatNumber, 'formatNumber is exported.');
		assert.isFunction(formatRelativeTime, 'formatRelativeTime is exported.');
		assert.isFunction(formatUnit, 'formatUnit is exported.');
		assert.isFunction(generateLocales, 'generateLocales is exported.');
		assert.isFunction(getCachedMessages, 'getCachedMessages is exported.');
		assert.isFunction(getCurrencyFormatter, 'getCurrencyFormatter is exported.');
		assert.isFunction(getDateFormatter, 'getDateFormatter is exported.');
		assert.isFunction(getDateParser, 'getDateParser is exported.');
		assert.isFunction(getMessageFormatter, 'getMessageFormatter is exported.');
		assert.isFunction(getNumberFormatter, 'getNumberFormatter is exported.');
		assert.isFunction(getNumberParser, 'getNumberParser is exported.');
		assert.isFunction(getPluralGenerator, 'getPluralGenerator is exported.');
		assert.isFunction(getRelativeTimeFormatter, 'getRelativeTimeFormatter is exported.');
		assert.isFunction(getUnitFormatter, 'getUnitFormatter is exported.');
		assert.isFunction(i18n, 'i18n is exported.');
		assert.isFunction(invalidate, 'invalidate is exported.');
		assert.isFunction(loadCldrData, 'loadCldrData is exported.');
		assert.isFunction(normalizeLocale, 'normalizeLocale is exported.');
		assert.isFunction(parseDate, 'parseDate is exported.');
		assert.isFunction(parseNumber, 'parseNumber is exported.');
		assert.isFunction(pluralize, 'pluralize is exported.');
		assert.isFunction(switchLocale, 'switchLocale is exported.');
		assert.isString(systemLocale, 'systemLocale is exported.');
	}
});
