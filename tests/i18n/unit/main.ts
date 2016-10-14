import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import i18n, { switchLocale, systemLocale } from '../../src/main';

registerSuite({
	name: 'main',

	i18n() {
		assert.isFunction(i18n, 'i18n is exported.');
		assert.isFunction(switchLocale, 'switchLocale is exported.');
		assert.isString(systemLocale, 'systemLocale is exported.');
	}
});
