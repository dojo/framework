import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import baseLoad, {
	isLoaded,
	mainPackages,
	reset,
	supplementalPackages
} from '../../../../src/cldr/load/default';

registerSuite({
	name: 'cldr/load/default',

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
			baseLoad({
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
			baseLoad({
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

	baseLoad() {
		assert.isFalse(isLoaded('supplemental', 'likelySubtags'));

		baseLoad({
			supplemental: {
				likelySubtags: {}
			}
		});

		assert.isTrue(isLoaded('supplemental', 'likelySubtags'));
	},

	reset: {
		beforeEach() {
			baseLoad({
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
