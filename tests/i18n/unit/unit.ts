const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import { getNumberFormatter } from '../../../src/i18n/number';
import { getUnitFormatter, formatUnit } from '../../../src/i18n/unit';
import '../support/cldr';
import { setDefaultLocale, setSupportedLocales, setLocale } from '../../../src/i18n/i18n';

registerSuite('number units', {
	before: async () => {
		setDefaultLocale('en');
		setSupportedLocales(['en', 'fr']);
		await setLocale({ locale: 'en', default: true });
	},

	tests: {
		formatUnit: {
			'assert without a locale'() {
				assert.strictEqual(formatUnit(1, 'foot'), '1 foot');
				assert.strictEqual(formatUnit(5280, 'foot'), '5,280 feet');
				assert.strictEqual(formatUnit(1, 'foot', { form: 'long' }), '1 foot');
				assert.strictEqual(formatUnit(5280, 'foot', { form: 'long' }), '5,280 feet');
				assert.strictEqual(formatUnit(1, 'foot', { form: 'short' }), '1 ft');
				assert.strictEqual(formatUnit(5280, 'foot', { form: 'short' }), '5,280 ft');
				assert.strictEqual(formatUnit(1, 'foot', { form: 'narrow' }), '1′');
				assert.strictEqual(formatUnit(5280, 'foot', { form: 'narrow' }), '5,280′');
				assert.strictEqual(
					formatUnit(5280, 'foot', {
						numberFormatter: getNumberFormatter({ useGrouping: false })
					}),
					'5280 feet'
				);
			},

			'assert with a locale'() {
				assert.strictEqual(formatUnit(1, 'hour', 'fr'), '1 heure');
				assert.strictEqual(formatUnit(1000, 'hour', 'fr'), '1 000 heures');
				assert.strictEqual(formatUnit(1, 'hour', { form: 'long' }, 'fr'), '1 heure');
				assert.strictEqual(formatUnit(1000, 'hour', { form: 'long' }, 'fr'), '1 000 heures');
				assert.strictEqual(formatUnit(1, 'hour', { form: 'short' }, 'fr'), '1 h');
				assert.strictEqual(formatUnit(1000, 'hour', { form: 'short' }, 'fr'), '1 000 h');
				assert.strictEqual(formatUnit(1, 'hour', { form: 'narrow' }, 'fr'), '1h');
				assert.strictEqual(formatUnit(1000, 'hour', { form: 'narrow' }, 'fr'), '1 000h');
				assert.strictEqual(
					formatUnit(
						1000,
						'hour',
						{
							numberFormatter: getNumberFormatter({ useGrouping: false })
						},
						'fr'
					),
					'1000 heures'
				);
			}
		},

		getUnitFormatter: {
			'assert without a locale'() {
				assert.strictEqual(getUnitFormatter('foot')(1), '1 foot');
				assert.strictEqual(getUnitFormatter('foot')(5280), '5,280 feet');
				assert.strictEqual(getUnitFormatter('foot', { form: 'long' })(1), '1 foot');
				assert.strictEqual(getUnitFormatter('foot', { form: 'long' })(5280), '5,280 feet');
				assert.strictEqual(getUnitFormatter('foot', { form: 'short' })(1), '1 ft');
				assert.strictEqual(getUnitFormatter('foot', { form: 'short' })(5280), '5,280 ft');
				assert.strictEqual(getUnitFormatter('foot', { form: 'narrow' })(1), '1′');
				assert.strictEqual(getUnitFormatter('foot', { form: 'narrow' })(5280), '5,280′');
				assert.strictEqual(
					getUnitFormatter('foot', {
						numberFormatter: getNumberFormatter({ useGrouping: false })
					})(5280),
					'5280 feet'
				);
			},

			'assert with a locale'() {
				assert.strictEqual(getUnitFormatter('meter', 'fr')(1), '1 mètre');
				assert.strictEqual(getUnitFormatter('meter', 'fr')(1000), '1 000 mètres');
				assert.strictEqual(getUnitFormatter('meter', { form: 'long' }, 'fr')(1), '1 mètre');
				assert.strictEqual(getUnitFormatter('meter', { form: 'long' }, 'fr')(1000), '1 000 mètres');
				assert.strictEqual(getUnitFormatter('meter', { form: 'short' }, 'fr')(1), '1 m');
				assert.strictEqual(getUnitFormatter('meter', { form: 'short' }, 'fr')(1000), '1 000 m');
				assert.strictEqual(getUnitFormatter('meter', { form: 'narrow' }, 'fr')(1), '1m');
				assert.strictEqual(getUnitFormatter('meter', { form: 'narrow' }, 'fr')(1000), '1 000m');
				assert.strictEqual(
					getUnitFormatter(
						'meter',
						{
							numberFormatter: getNumberFormatter({ useGrouping: false })
						},
						'fr'
					)(1000),
					'1000 mètres'
				);
			}
		}
	}
});
