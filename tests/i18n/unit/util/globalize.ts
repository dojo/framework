import * as Globalize from 'globalize';
import 'globalize/dist/globalize/date';
import 'globalize/dist/globalize/relative-time';

const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import { fetchCldrData } from '../../support/util';
import { DateFormatter, DateFormatterOptions, RelativeTimeFormatterOptions } from '../../../src/date';
import { switchLocale, systemLocale } from '../../../src/i18n';
import getGlobalize, { globalizeDelegator } from '../../../src/util/globalize';

registerSuite('util/globalize', {

	before() {
		return fetchCldrData([ 'en', 'fr' ]).then(() => {
			switchLocale('en');
			switchLocale('en');
		});
	},

	after() {
		switchLocale(systemLocale);
	},

	tests: {

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

				assert.strictEqual(globalizeDelegator('formatRelativeTime', {
					unit,
					value
				}), Globalize.formatRelativeTime(value, unit));
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
	}
});
