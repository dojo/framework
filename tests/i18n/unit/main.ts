import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import i18n, { getCachedMessages, invalidate, switchLocale, systemLocale } from '../../src/main';

registerSuite({
	name: 'main',

	i18n() {
		assert.isFunction(getCachedMessages, 'getCachedMessages is exported.');
		assert.isFunction(invalidate, 'invalidate is exported.');
		assert.isFunction(i18n, 'i18n is exported.');
		assert.isFunction(switchLocale, 'switchLocale is exported.');
		assert.isString(systemLocale, 'systemLocale is exported.');
	}
});
