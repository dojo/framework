import * as Globalize from 'globalize';
import 'globalize/dist/globalize/date';
import 'globalize/dist/globalize/relative-time';
import '../../support/cldr';

const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import { DateFormatter, DateFormatterOptions, RelativeTimeFormatterOptions } from '../../../../src/i18n/date';
import { globalizeDelegator } from '../../../../src/i18n/util/globalize';
import { setDefaultLocale, setSupportedLocales, setLocale } from '../../../../src/i18n/i18n';

registerSuite('util/globalize', {
	before: async () => {
		setDefaultLocale('en');
		setSupportedLocales(['en', 'fr']);
		await setLocale({ locale: 'en', default: true });
	},

	tests: {
		globalizeDelegator: {
			'assert method that takes a value'() {
				const locale = 'fr';
				const value = new Date();
				const options: DateFormatterOptions = { datetime: 'full' };

				assert.strictEqual(globalizeDelegator('formatDate', { value }), Globalize.formatDate(value));
				assert.strictEqual(
					globalizeDelegator('formatDate', {
						optionsOrLocale: options,
						value
					}),
					Globalize.formatDate(value, options)
				);
				assert.strictEqual(
					globalizeDelegator('formatDate', {
						locale,
						optionsOrLocale: options,
						value
					}),
					new Globalize('fr').formatDate(value, options)
				);
			},

			'assert method that takes a value and a unit'() {
				const locale = 'fr';
				const unit = 'week';
				const value = 5;
				const options: RelativeTimeFormatterOptions = { form: 'short' };

				assert.strictEqual(
					globalizeDelegator('formatRelativeTime', {
						unit,
						value
					}),
					Globalize.formatRelativeTime(value, unit)
				);
				assert.strictEqual(
					globalizeDelegator('formatRelativeTime', {
						optionsOrLocale: options,
						unit,
						value
					}),
					Globalize.formatRelativeTime(value, unit, options)
				);
				assert.strictEqual(
					globalizeDelegator('formatRelativeTime', {
						locale,
						optionsOrLocale: options,
						unit,
						value
					}),
					new Globalize('fr').formatRelativeTime(value, unit, options)
				);
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
