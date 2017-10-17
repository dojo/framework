const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import { generateLocales, normalizeLocale, validateLocale } from '../../../src/util/main';

registerSuite('util/main', {

	generateLocales() {
		assert.sameMembers(generateLocales('en'), [ 'en' ]);
		assert.sameMembers(generateLocales('en-US'), [ 'en', 'en-US' ]);
		assert.sameMembers(generateLocales('en-US-POSIX'), [ 'en', 'en-US', 'en-US-POSIX' ]);

		assert.sameMembers(generateLocales('en_US.UTF8'), [ 'en', 'en-US' ],
			'Node-style locales are normalize.');
		assert.sameMembers(generateLocales('en_US_POSIX.UTF8'), [ 'en', 'en-US', 'en-US-POSIX' ],
			'Node-style locales are normalize.');

		assert.sameMembers(generateLocales('en-'), [ 'en' ], 'Trailing hyphens are removed.');
		assert.sameMembers(generateLocales('en-.UTF8'), [ 'en' ], 'Trailing hyphens are removed.');
		assert.sameMembers(generateLocales('en_'), [ 'en' ], 'Trailing underscores are removed.');
		assert.sameMembers(generateLocales('en_.UTF8'), [ 'en' ], 'Trailing underscores are removed.');
	},

	normalizeLocale() {
		assert.strictEqual(normalizeLocale('en'), 'en');
		assert.strictEqual(normalizeLocale('en-US'), 'en-US');
		assert.strictEqual(normalizeLocale('en-US-POSIX'), 'en-US-POSIX');
		assert.strictEqual(normalizeLocale('en_US.UTF8'), 'en-US',
			'Node-style locales are normalize.');
		assert.strictEqual(normalizeLocale('en_US_POSIX.UTF8'), 'en-US-POSIX',
			'Node-style locales are normalize.');

		assert.strictEqual(normalizeLocale('en-'), 'en', 'Trailing hyphens are removed.');
		assert.strictEqual(normalizeLocale('en-.UTF8'), 'en', 'Trailing hyphens are removed.');
		assert.strictEqual(normalizeLocale('en_'), 'en', 'Trailing underscores are removed.');
		assert.strictEqual(normalizeLocale('en_.UTF8'), 'en', 'Trailing underscores are removed.');

		const validLocales = [ 'de', 'de-', 'deu', 'deu-', 'de-DE', 'de-DE-', 'deu-DE', 'deu-DE-', 'de-DE-bavarian',
			'de-DE-bavarian-', 'deu-DE-bavarian', 'deu-DE-bavarian-', 'en-001', 'en-x-custom_value' ];
		const invalidLocales = [ 'd', 'deut', 'de2', '@!4' ];

		validLocales.forEach((locale: string) => {
			assert.doesNotThrow(() => {
				normalizeLocale(locale);
			});
		});
		invalidLocales.forEach((locale: string) => {
			assert.throws(() => {
				normalizeLocale(locale);
			}, Error, `${locale} is not a valid locale.`);
		});
	},

	validateLocale() {
		const validLocales = [ 'de', 'deu', 'de-DE', 'deu-DE', 'de-DE-bavarian', 'deu-DE-bavarian',
			'en-001', 'en-x-custom_value' ];
		const invalidLocales = [ 'd', 'deut', 'de2', '@!4' ];

		validLocales.forEach((locale: string) => {
			assert.isTrue(validateLocale(locale));
		});
		invalidLocales.forEach((locale: string) => {
			assert.isFalse(validateLocale(locale));
		});
	}
});
