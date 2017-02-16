import * as Globalize from 'globalize';
import 'globalize/dist/globalize/date';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { fetchCldrData } from '../../support/util';
import { DateFormatter, DateFormatterOptions, RelativeTimeFormatterOptions } from '../../../src/date';
import { switchLocale, systemLocale } from '../../../src/i18n';
import getGlobalize, { globalizeDelegator } from '../../../src/util/globalize';

registerSuite({
	name: 'util/globalize',

	setup() {
		// Load the CLDR data for the locales used in the tests ('en' and 'fr');
		return fetchCldrData([ 'en', 'fr' ]).then(() => {
			switchLocale('en');
		});
	},

	teardown() {
		switchLocale(systemLocale);
	},

	getGlobalize() {
		assert.strictEqual(getGlobalize(), Globalize, 'The main globalize object is returned.');
		assert.instanceOf(getGlobalize('fr'), Globalize, 'A Globalize instance is returned.');
		assert.notEqual(getGlobalize('fr'), Globalize, 'The main globalize object is not returned.');
	},

	globalizeDelegator: {
		'assert method that takes a value'() {
			const locale = 'fr';
			const value = new Date();
			const options: DateFormatterOptions = { datetime: 'full' };

			assert.strictEqual(globalizeDelegator('formatDate', { value }), Globalize.formatDate(value));
			assert.strictEqual(globalizeDelegator('formatDate', {
				optionsOrLocale: options,
				value
			}), Globalize.formatDate(value, options));
			assert.strictEqual(globalizeDelegator('formatDate', {
				locale,
				optionsOrLocale: options,
				value
			}), new Globalize('fr').formatDate(value, options));
		},

		'assert method that takes a value and a unit'() {
			const locale = 'fr';
			const unit = 'week';
			const value = 5;
			const options: RelativeTimeFormatterOptions = { form: 'short' };

			assert.strictEqual(globalizeDelegator('formatRelativeTime', { unit, value }), Globalize.formatRelativeTime(value, unit));
			assert.strictEqual(globalizeDelegator('formatRelativeTime', {
				optionsOrLocale: options,
				unit,
				value
			}), Globalize.formatRelativeTime(value, unit, options));
			assert.strictEqual(globalizeDelegator('formatRelativeTime', {
				locale,
				optionsOrLocale: options,
				unit,
				value
			}), new Globalize('fr').formatRelativeTime(value, unit, options));
		},

		'assert method returns a method'() {
			const locale = 'fr';
			const value = new Date();
			const options: DateFormatterOptions = { datetime: 'full' };

			let formatter = globalizeDelegator<DateFormatterOptions, DateFormatter>('dateFormatter', {});
			assert.strictEqual(formatter(value), Globalize.dateFormatter()(value));

			formatter = globalizeDelegator<DateFormatterOptions, DateFormatter>('dateFormatter', {
				optionsOrLocale: options
			});
			assert.strictEqual(formatter(value), Globalize.dateFormatter(options)(value));

			formatter = globalizeDelegator<DateFormatterOptions, DateFormatter>('dateFormatter', {
				locale,
				optionsOrLocale: options
			});
			assert.strictEqual(formatter(value), new Globalize('fr').dateFormatter(options)(value));
		}
	}
});
