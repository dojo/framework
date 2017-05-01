import has from '@dojo/has/has';
import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import * as sinon from 'sinon';
import loadCldrData, {
	isLoaded,
	mainPackages,
	reset,
	supplementalPackages
} from '../../../src/cldr/load';
import {
	isLoaded as utilIsLoaded,
	mainPackages as utilMainPackages,
	reset as utilReset,
	supplementalPackages as utilSupplementalPackages
} from '../../../src/cldr/load/default';

registerSuite({
	name: 'cldr/load',

	afterEach() {
		reset();
	},

	api() {
		assert.strictEqual(isLoaded, utilIsLoaded, 'isLoaded should be re-exported');
		assert.strictEqual(mainPackages, utilMainPackages, 'mainPackages should be re-exported');
		assert.strictEqual(reset, utilReset, 'reset should be re-exported');
		assert.strictEqual(supplementalPackages, utilSupplementalPackages, 'supplementalPackages should be re-exported');
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
		},

		'with a require function'() {
			assert.isFalse(isLoaded('supplemental', 'likelySubtags'));

			const path = 'cldr-data/supplemental/likelySubtags.json';

			if (has('host-browser')) {
				sinon.spy(require, 'toUrl');
			}

			return loadCldrData(require, [ path ]).then(() => {
				if (has('host-browser')) {
					assert.isTrue((<any> require).toUrl.calledWith(path));
					(<any> require).toUrl.restore();
				}
				assert.isTrue(isLoaded('supplemental', 'likelySubtags'));
			}, () => {
				has('host-browser') && (<any> require).toUrl.restore();
			});
		}
	}
});
