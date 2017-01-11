import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import loadCldrData from '../../src/cldr/load';
import { getNumberFormatter } from '../../src/number';
import { getUnitFormatter, formatUnit } from '../../src/unit';
import { switchLocale, systemLocale } from '../../src/i18n';

registerSuite({
	name: 'number',

	setup() {
		// Load the CLDR data for the locales used in the tests ('en' and 'fr');
		return switchLocale('en').then(() => {
			return loadCldrData('fr');
		});
	},

	teardown() {
		return switchLocale(systemLocale);
	},

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
			assert.strictEqual(formatUnit(5280, 'foot', {
				numberFormatter: getNumberFormatter({ useGrouping: false })
			}), '5280 feet');
		},

		'assert with a locale'() {
			assert.strictEqual(formatUnit(1, 'meter', 'fr'), '1 mètre');
			assert.strictEqual(formatUnit(1000, 'meter', 'fr'), '1\u00A0000 mètres');
			assert.strictEqual(formatUnit(1, 'meter', { form: 'long' }, 'fr'), '1 mètre');
			assert.strictEqual(formatUnit(1000, 'meter', { form: 'long' }, 'fr'), '1\u00A0000 mètres');
			assert.strictEqual(formatUnit(1, 'meter', { form: 'short' }, 'fr'), '1 m');
			assert.strictEqual(formatUnit(1000, 'meter', { form: 'short' }, 'fr'), '1\u00A0000 m');
			assert.strictEqual(formatUnit(1, 'meter', { form: 'narrow' }, 'fr'), '1m');
			assert.strictEqual(formatUnit(1000, 'meter', { form: 'narrow' }, 'fr'), '1\u00A0000m');
			assert.strictEqual(formatUnit(1000, 'meter', {
				numberFormatter: getNumberFormatter({ useGrouping: false })
			}, 'fr'), '1000 mètres');
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
			assert.strictEqual(getUnitFormatter('foot', {
				numberFormatter: getNumberFormatter({ useGrouping: false })
			})(5280), '5280 feet');
		},

		'assert with a locale'() {
			assert.strictEqual(getUnitFormatter('meter', 'fr')(1), '1 mètre');
			assert.strictEqual(getUnitFormatter('meter', 'fr')(1000), '1\u00A0000 mètres');
			assert.strictEqual(getUnitFormatter('meter', { form: 'long' }, 'fr')(1), '1 mètre');
			assert.strictEqual(getUnitFormatter('meter', { form: 'long' }, 'fr')(1000), '1\u00A0000 mètres');
			assert.strictEqual(getUnitFormatter('meter', { form: 'short' }, 'fr')(1), '1 m');
			assert.strictEqual(getUnitFormatter('meter', { form: 'short' }, 'fr')(1000), '1\u00A0000 m');
			assert.strictEqual(getUnitFormatter('meter', { form: 'narrow' }, 'fr')(1), '1m');
			assert.strictEqual(getUnitFormatter('meter', { form: 'narrow' }, 'fr')(1000), '1\u00A0000m');
			assert.strictEqual(getUnitFormatter('meter', {
				numberFormatter: getNumberFormatter({ useGrouping: false })
			}, 'fr')(1000), '1000 mètres');
		}
	}
});
