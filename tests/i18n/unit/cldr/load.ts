import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import loadCldrData, {
	isLoaded,
	mainPackages,
	reset,
	supplementalPackages
} from '../../../src/cldr/load';

registerSuite({
	name: 'cldr/load',

	afterEach() {
		reset();
	},

	mainPackages() {
		assert.isTrue(Object.isFrozen(mainPackages), 'Should be frozen.');
		assert.sameMembers(mainPackages as any[], [
			'dates/calendars/gregorian',
			'dates/fields',
			'dates/timeZoneNames',
			'numbers',
			'numbers/currencies',
			'units'
		]);
	},

	supplementalPackages() {
		assert.isTrue(Object.isFrozen(supplementalPackages), 'Should be frozen.');
		assert.sameMembers(supplementalPackages as any[], [
			'currencyData',
			'likelySubtags',
			'numberingSystems',
			'plurals-type-cardinal',
			'plurals-type-ordinal',
			'timeData',
			'weekData'
		]);
	},

	isLoaded: {
		'with an unloaded package'() {
			assert.isFalse(isLoaded('supplemental', 'likelySubtags'));
			assert.isFalse(isLoaded('main', 'en'));
		},

		'with loaded pacakges'() {
			loadCldrData({
				main: {
					zh: {
						numbers: {}
					}
				},

				supplemental: {
					likelySubtags: {}
				}
			});

			assert.isTrue(isLoaded('main'));
			assert.isTrue(isLoaded('supplemental'));
			assert.isTrue(isLoaded('main', 'zh'));
			assert.isTrue(isLoaded('main', 'zh-MO'));
			assert.isTrue(isLoaded('main', 'zh', 'numbers'));
			assert.isTrue(isLoaded('supplemental', 'likelySubtags'));
		},

		'with unknown packages'() {
			loadCldrData({
				main: {
					arbitrary: {}
				},
				supplemental: {
					arbitrary: {}
				}
			});

			assert.isFalse(isLoaded('main', 'arbitrary'), 'Unknown locale packages are ignored.');
			assert.isFalse(isLoaded('supplemental', 'arbitrary'), 'Unknown supplemental packages are ignored.');
		}
	},

	loadCldrData: {
		'with a list of data URLs'() {
			assert.isFalse(isLoaded('supplemental', 'likelySubtags'));

			return loadCldrData([ 'cldr-data/supplemental/likelySubtags.json' ]).then(() => {
				assert.isTrue(isLoaded('supplemental', 'likelySubtags'));
			});
		},

		'with a CLDR data object'() {
			assert.isFalse(isLoaded('supplemental', 'likelySubtags'));

			return loadCldrData({
				supplemental: {
					likelySubtags: {}
				}
			}).then(() => {
				assert.isTrue(isLoaded('supplemental', 'likelySubtags'));
			});
		}
	},

	reset: {
		beforeEach() {
			loadCldrData({
				main: {
					zh: {
						numbers: {}
					}
				},

				supplemental: {
					likelySubtags: {}
				}
			});
		},

		'main only'() {
			reset('main');

			assert.isFalse(isLoaded('main', 'zh'), '"main" data should be cleared.');
			assert.isFalse(isLoaded('main', 'zh-MO'), '"main" data should be cleared.');
			assert.isFalse(isLoaded('main', 'zh', 'numbers'), '"main" data should be cleared.');

			assert.isTrue(isLoaded('supplemental', 'likelySubtags'), '"supplemental" data should not be cleared.');
		},

		'supplemental only'() {
			reset('supplemental');

			assert.isTrue(isLoaded('main', 'zh'));
			assert.isTrue(isLoaded('main', 'zh-MO'));
			assert.isTrue(isLoaded('main', 'zh', 'numbers'));

			assert.isFalse(isLoaded('supplemental', 'likelySubtags'), '"supplemental" data should be cleared.');
		},

		'both main and supplmental'() {
			reset();

			assert.isFalse(isLoaded('main', 'zh'));
			assert.isFalse(isLoaded('main', 'zh-MO'));
			assert.isFalse(isLoaded('main', 'zh', 'numbers'));
			assert.isFalse(isLoaded('supplemental', 'likelySubtags'));
		}
	}
});
