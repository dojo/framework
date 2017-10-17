const { registerSuite } = intern.getInterface('object');
const { assert } = intern.getPlugin('chai');
import global from '@dojo/shim/global';
import loadCldrData, {
	CldrData,
	isLoaded,
	mainPackages,
	reset,
	supplementalPackages
} from '../../../../src/cldr/load/webpack';
import {
	mainPackages as utilMainPackages,
	reset as utilReset,
	supplementalPackages as utilSupplementalPackages
} from '../../../../src/cldr/load/default';

let cldrData: CldrData | null;

registerSuite('cldr/load/webpack', {

	before() {
		cldrData = {
			main: {
				yue: {
					numbers: {}
				}
			},

			supplemental: {
				likelySubtags: {}
			}
		};
		global.__cldrData__ = cldrData;
	},

	afterEach() {
		reset();
	},

	after() {
		cldrData = null;
	},

	tests: {

		api() {
			assert.strictEqual(mainPackages, utilMainPackages, 'mainPackages should be re-exported');
			assert.strictEqual(reset, utilReset, 'reset should be re-exported');
			assert.strictEqual(supplementalPackages, utilSupplementalPackages, 'supplementalPackages should be re-exported');
		},

		isLoaded() {
			assert.isTrue(isLoaded('main'));
			assert.isTrue(isLoaded('supplemental'));
			assert.isTrue(isLoaded('main', 'yue'));
			assert.isTrue(isLoaded('main', 'yue', 'numbers'));
			assert.isTrue(isLoaded('supplemental', 'likelySubtags'));
		},

		loadCldrData: {
			'with a list of data URLs'() {
				return loadCldrData([ 'cldr-data/supplemental/currencyData' ]).then(() => {
					assert.isFalse(isLoaded('supplemental', 'currencyData'),
						'The webpack load should ignore URLs.');
				});
			},

			'with a CLDR data object'() {
				return loadCldrData({
					main: {
						tzm: {}
					}
				}).then(() => {
					assert.isTrue(isLoaded('main', 'tzm'), 'CLDR data objects should be loaded.');
				});
			},

			'with a require function'() {
				return loadCldrData(() => {
				}, {
					main: {
						af: {}
					}
				}).then(() => {
					assert.isTrue(isLoaded('main', 'af'), 'Require functions should be ignored.');
				});
			}
		}
	}
});
