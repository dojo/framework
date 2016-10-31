import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import { generateLocales, normalizeLocale } from '../../src/util';

registerSuite({
	name: 'util',

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
	}
});
