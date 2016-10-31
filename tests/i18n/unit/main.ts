import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import i18n, {
	formatMessage,
	getCachedMessages,
	getMessageFormatter,
	invalidate,
	switchLocale,
	systemLocale
} from '../../src/main';
import {
	generateLocales,
	normalizeLocale
} from '../../src/util';
import loadCldrData from '../../src/cldr/load';

registerSuite({
	name: 'main',

	i18n() {
		assert.isFunction(formatMessage, 'formatMessage is exported.');
		assert.isFunction(getCachedMessages, 'getCachedMessages is exported.');
		assert.isFunction(getMessageFormatter, 'getMessageFormatter is exported.');
		assert.isFunction(generateLocales, 'generateLocales is exported.');
		assert.isFunction(invalidate, 'invalidate is exported.');
		assert.isFunction(i18n, 'i18n is exported.');
		assert.isFunction(loadCldrData, 'loadCldrData is exported.');
		assert.isFunction(normalizeLocale, 'normalizeLocale is exported.');
		assert.isFunction(switchLocale, 'switchLocale is exported.');
		assert.isString(systemLocale, 'systemLocale is exported.');
	}
});
