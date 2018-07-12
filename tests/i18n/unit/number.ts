const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import { fetchCldrData } from '../support/util';
import {
	formatCurrency,
	formatNumber,
	getCurrencyFormatter,
	getNumberFormatter,
	getNumberParser,
	getPluralGenerator,
	parseNumber,
	pluralize
} from '../../src/number';
import { switchLocale, systemLocale } from '../../src/i18n';

registerSuite('number', {
	before() {
		// Load the CLDR data for the locales used in the tests ('en' and 'fr');
		return fetchCldrData(['en', 'fr']).then(() => {
			switchLocale('en');
		});
	},

	after() {
		return switchLocale(systemLocale);
	},

	tests: {
		formatCurrency: {
			'assert without a locale'() {
				assert.strictEqual(formatCurrency(12.37, 'USD'), '$12.37');
				assert.strictEqual(formatCurrency(12.37, 'USD', { style: 'accounting' }), '$12.37');
				assert.strictEqual(formatCurrency(12.37, 'USD', { style: 'code' }), '12.37 USD');
				assert.strictEqual(formatCurrency(12.37, 'USD', { style: 'name' }), '12.37 US dollars');
			},

			'assert with a locale'() {
				assert.strictEqual(formatCurrency(12.37, 'EUR', 'fr'), '12,37\u00A0€');
				assert.strictEqual(formatCurrency(12.37, 'EUR', { style: 'accounting' }, 'fr'), '12,37\u00A0€');
				assert.strictEqual(formatCurrency(12.37, 'EUR', { style: 'code' }, 'fr'), '12,37 EUR');
				assert.strictEqual(formatCurrency(12.37, 'EUR', { style: 'name' }, 'fr'), '12,37 euros');
			}
		},

		formatNumber: {
			'assert without a locale'() {
				assert.strictEqual(formatNumber(12.37), '12.37');
				assert.strictEqual(formatNumber(12.37, { style: 'percent' }), '1,237%');
				assert.strictEqual(formatNumber(12.37, { minimumIntegerDigits: 3 }), '012.37');
				assert.strictEqual(formatNumber(12.37, { minimumFractionDigits: 3 }), '12.370');
				assert.strictEqual(formatNumber(12.37, { maximumFractionDigits: 1 }), '12.4');
				assert.strictEqual(formatNumber(12.33, { maximumFractionDigits: 1 }), '12.3');
				assert.strictEqual(
					formatNumber(12.37, {
						minimumSignificantDigits: 3,
						maximumSignificantDigits: 5
					}),
					'12.37'
				);

				assert.strictEqual(
					formatNumber(12.33, {
						maximumFractionDigits: 1,
						round: 'ceil'
					}),
					'12.4'
				);
				assert.strictEqual(
					formatNumber(12.33, {
						maximumFractionDigits: 1,
						round: 'floor'
					}),
					'12.3'
				);
				assert.strictEqual(
					formatNumber(12.33, {
						maximumFractionDigits: 1,
						round: 'truncate'
					}),
					'12.3'
				);

				assert.strictEqual(formatNumber(1234567890), '1,234,567,890');
				assert.strictEqual(formatNumber(1234567890, { useGrouping: false }), '1234567890');
			},

			'assert with a locale'() {
				assert.strictEqual(formatNumber(12.37, 'fr'), '12,37');
				assert.strictEqual(formatNumber(12.37, { style: 'percent' }, 'fr'), '1\u00A0237\u00A0%');
				assert.strictEqual(formatNumber(12.37, { minimumIntegerDigits: 3 }, 'fr'), '012,37');
				assert.strictEqual(formatNumber(12.37, { minimumFractionDigits: 3 }, 'fr'), '12,370');
				assert.strictEqual(formatNumber(12.37, { maximumFractionDigits: 1 }, 'fr'), '12,4');
				assert.strictEqual(formatNumber(12.33, { maximumFractionDigits: 1 }, 'fr'), '12,3');
				assert.strictEqual(
					formatNumber(
						12.37,
						{
							minimumSignificantDigits: 3,
							maximumSignificantDigits: 5
						},
						'fr'
					),
					'12,37'
				);

				assert.strictEqual(
					formatNumber(
						12.33,
						{
							maximumFractionDigits: 1,
							round: 'ceil'
						},
						'fr'
					),
					'12,4'
				);
				assert.strictEqual(
					formatNumber(
						12.33,
						{
							maximumFractionDigits: 1,
							round: 'floor'
						},
						'fr'
					),
					'12,3'
				);
				assert.strictEqual(
					formatNumber(
						12.33,
						{
							maximumFractionDigits: 1,
							round: 'truncate'
						},
						'fr'
					),
					'12,3'
				);

				assert.strictEqual(formatNumber(1234567890, 'fr'), '1\u00A0234\u00A0567\u00A0890');
				assert.strictEqual(formatNumber(1234567890, { useGrouping: false }, 'fr'), '1234567890');
			}
		},

		getCurrencyFormatter: {
			'assert without a locale'() {
				assert.strictEqual(getCurrencyFormatter('USD')(12.37), '$12.37');
				assert.strictEqual(getCurrencyFormatter('USD', { style: 'accounting' })(12.37), '$12.37');
				assert.strictEqual(getCurrencyFormatter('USD', { style: 'code' })(12.37), '12.37 USD');
				assert.strictEqual(getCurrencyFormatter('USD', { style: 'name' })(12.37), '12.37 US dollars');
			},

			'assert with a locale'() {
				assert.strictEqual(getCurrencyFormatter('EUR', 'fr')(12.37), '12,37\u00A0€');
				assert.strictEqual(getCurrencyFormatter('EUR', { style: 'accounting' }, 'fr')(12.37), '12,37\u00A0€');
				assert.strictEqual(getCurrencyFormatter('EUR', { style: 'code' }, 'fr')(12.37), '12,37 EUR');
				assert.strictEqual(getCurrencyFormatter('EUR', { style: 'name' }, 'fr')(12.37), '12,37 euros');
			}
		},

		getNumberFormatter: {
			'assert without a locale'() {
				assert.strictEqual(getNumberFormatter()(12.37), '12.37');
				assert.strictEqual(getNumberFormatter({ style: 'percent' })(12.37), '1,237%');
				assert.strictEqual(getNumberFormatter({ minimumIntegerDigits: 3 })(12.37), '012.37');
				assert.strictEqual(getNumberFormatter({ minimumFractionDigits: 3 })(12.37), '12.370');
				assert.strictEqual(getNumberFormatter({ maximumFractionDigits: 1 })(12.37), '12.4');
				assert.strictEqual(getNumberFormatter({ maximumFractionDigits: 1 })(12.33), '12.3');
				assert.strictEqual(
					getNumberFormatter({
						minimumSignificantDigits: 3,
						maximumSignificantDigits: 5
					})(12.37),
					'12.37'
				);

				assert.strictEqual(
					getNumberFormatter({
						maximumFractionDigits: 1,
						round: 'ceil'
					})(12.33),
					'12.4'
				);
				assert.strictEqual(
					getNumberFormatter({
						maximumFractionDigits: 1,
						round: 'floor'
					})(12.33),
					'12.3'
				);
				assert.strictEqual(
					getNumberFormatter({
						maximumFractionDigits: 1,
						round: 'truncate'
					})(12.33),
					'12.3'
				);

				assert.strictEqual(getNumberFormatter()(1234567890), '1,234,567,890');
				assert.strictEqual(getNumberFormatter({ useGrouping: false })(1234567890), '1234567890');
			},

			'assert with a locale'() {
				assert.strictEqual(getNumberFormatter('fr')(12.37), '12,37');
				assert.strictEqual(getNumberFormatter({ style: 'percent' }, 'fr')(12.37), '1\u00A0237\u00A0%');
				assert.strictEqual(getNumberFormatter({ minimumIntegerDigits: 3 }, 'fr')(12.37), '012,37');
				assert.strictEqual(getNumberFormatter({ minimumFractionDigits: 3 }, 'fr')(12.37), '12,370');
				assert.strictEqual(getNumberFormatter({ maximumFractionDigits: 1 }, 'fr')(12.37), '12,4');
				assert.strictEqual(getNumberFormatter({ maximumFractionDigits: 1 }, 'fr')(12.33), '12,3');
				assert.strictEqual(
					getNumberFormatter(
						{
							minimumSignificantDigits: 3,
							maximumSignificantDigits: 5
						},
						'fr'
					)(12.37),
					'12,37'
				);

				assert.strictEqual(
					getNumberFormatter(
						{
							maximumFractionDigits: 1,
							round: 'ceil'
						},
						'fr'
					)(12.33),
					'12,4'
				);
				assert.strictEqual(
					getNumberFormatter(
						{
							maximumFractionDigits: 1,
							round: 'floor'
						},
						'fr'
					)(12.33),
					'12,3'
				);
				assert.strictEqual(
					getNumberFormatter(
						{
							maximumFractionDigits: 1,
							round: 'truncate'
						},
						'fr'
					)(12.33),
					'12,3'
				);

				assert.strictEqual(getNumberFormatter('fr')(1234567890), '1\u00A0234\u00A0567\u00A0890');
				assert.strictEqual(getNumberFormatter({ useGrouping: false }, 'fr')(1234567890), '1234567890');
			}
		},

		getNumberParser: {
			'assert without a locale'() {
				assert.strictEqual(getNumberParser()('12.37'), 12.37);
				assert.strictEqual(getNumberParser({ style: 'decimal' })('12.37'), 12.37);
				assert.strictEqual(getNumberParser({ style: 'percent' })('1,237%'), 12.37);
			},

			'assert with a locale'() {
				assert.strictEqual(getNumberParser('fr')('12,37'), 12.37);
				assert.strictEqual(getNumberParser({ style: 'decimal' }, 'fr')('12,37'), 12.37);
				assert.strictEqual(getNumberParser({ style: 'percent' }, 'fr')('1\u00A0237\u00A0%'), 12.37);
			}
		},

		getPluralGenerator: {
			'assert without a locale'() {
				assert.strictEqual(getPluralGenerator()(0), 'other');
				assert.strictEqual(getPluralGenerator()(1), 'one');
				assert.strictEqual(getPluralGenerator()(2), 'other');

				assert.strictEqual(getPluralGenerator({ type: 'cardinal' })(0), 'other');
				assert.strictEqual(getPluralGenerator({ type: 'cardinal' })(1), 'one');
				assert.strictEqual(getPluralGenerator({ type: 'cardinal' })(2), 'other');

				assert.strictEqual(getPluralGenerator({ type: 'ordinal' })(0), 'other');
				assert.strictEqual(getPluralGenerator({ type: 'ordinal' })(1), 'one');
				assert.strictEqual(getPluralGenerator({ type: 'ordinal' })(2), 'two');
			},

			'assert with a locale'() {
				assert.strictEqual(getPluralGenerator('fr')(0), 'one');
				assert.strictEqual(getPluralGenerator('fr')(1), 'one');
				assert.strictEqual(getPluralGenerator('fr')(2), 'other');

				assert.strictEqual(getPluralGenerator({ type: 'cardinal' }, 'fr')(0), 'one');
				assert.strictEqual(getPluralGenerator({ type: 'cardinal' }, 'fr')(1), 'one');
				assert.strictEqual(getPluralGenerator({ type: 'cardinal' }, 'fr')(2), 'other');

				assert.strictEqual(getPluralGenerator({ type: 'ordinal' }, 'fr')(0), 'other');
				assert.strictEqual(getPluralGenerator({ type: 'ordinal' }, 'fr')(1), 'one');
				assert.strictEqual(getPluralGenerator({ type: 'ordinal' }, 'fr')(2), 'other');
			}
		},

		parseNumber: {
			'assert without a locale'() {
				assert.strictEqual(parseNumber('12.37'), 12.37);
				assert.strictEqual(parseNumber('12.37', { style: 'decimal' }), 12.37);
				assert.strictEqual(parseNumber('1,237%', { style: 'percent' }), 12.37);
			},

			'assert with a locale'() {
				assert.strictEqual(parseNumber('12,37', 'fr'), 12.37);
				assert.strictEqual(parseNumber('12,37', { style: 'decimal' }, 'fr'), 12.37);
				assert.strictEqual(parseNumber('1\u00A0237\u00A0%', { style: 'percent' }, 'fr'), 12.37);
			}
		},

		pluralize: {
			'assert without a locale'() {
				assert.strictEqual(pluralize(0), 'other');
				assert.strictEqual(pluralize(1), 'one');
				assert.strictEqual(pluralize(2), 'other');

				assert.strictEqual(pluralize(0, { type: 'cardinal' }), 'other');
				assert.strictEqual(pluralize(1, { type: 'cardinal' }), 'one');
				assert.strictEqual(pluralize(2, { type: 'cardinal' }), 'other');

				assert.strictEqual(pluralize(0, { type: 'ordinal' }), 'other');
				assert.strictEqual(pluralize(1, { type: 'ordinal' }), 'one');
				assert.strictEqual(pluralize(2, { type: 'ordinal' }), 'two');
			},

			'assert with a locale'() {
				assert.strictEqual(pluralize(0, 'fr'), 'one');
				assert.strictEqual(pluralize(1, 'fr'), 'one');
				assert.strictEqual(pluralize(2, 'fr'), 'other');

				assert.strictEqual(pluralize(0, { type: 'cardinal' }, 'fr'), 'one');
				assert.strictEqual(pluralize(1, { type: 'cardinal' }, 'fr'), 'one');
				assert.strictEqual(pluralize(2, { type: 'cardinal' }, 'fr'), 'other');

				assert.strictEqual(pluralize(0, { type: 'ordinal' }, 'fr'), 'other');
				assert.strictEqual(pluralize(1, { type: 'ordinal' }, 'fr'), 'one');
				assert.strictEqual(pluralize(2, { type: 'ordinal' }, 'fr'), 'other');
			}
		}
	}
});
