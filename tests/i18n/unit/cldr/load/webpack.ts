import * as registerSuite from 'intern!object';
import * as assert from 'intern/chai!assert';
import global from '@dojo/core/global';
import * as sinon from 'sinon';
import { CldrDataResponse } from '../../../../src/cldr/load';
import * as cldrLoad from '../../../../src/cldr/load';
import loadCldrData, {
	loadLocaleData,
	loadSupplementalData,
	localeCldrPaths,
	supplementalCldrPaths
} from '../../../../src/cldr/load/webpack';

let cldrData: CldrDataResponse;

registerSuite({
	name: 'cldr/load/webpack',

	setup() {
		return cldrLoad.default([ 'en', 'fr' ]).then((data: CldrDataResponse) => {
			cldrData = data;
			global.__cldrData__ = data;
		});
	},

	afterEach() {
		const loadLocaleData = <any> cldrLoad.loadLocaleData;
		if (typeof loadLocaleData.restore === 'function') {
			loadLocaleData.restore();
		}
	},

	api() {
		assert.isFunction(loadCldrData);
		assert.isFunction(loadLocaleData);
		assert.isFunction(loadSupplementalData);
		assert.isArray(localeCldrPaths);
		assert.isArray(supplementalCldrPaths);
	},

	'assert unloaded locale'() {
		sinon.spy(cldrLoad, 'loadLocaleData');
		return loadCldrData('ar').then((data: CldrDataResponse) => {
			assert.isTrue((<any> cldrLoad.loadLocaleData).calledWith('ar'),
				'Unloaded locales are loaded from the server.');
			assert.isArray(data['ar'], 'Unloaded locale data included in response.');

			return loadCldrData('es', 'it').then((data: CldrDataResponse) => {
				assert.isTrue((<any> cldrLoad.loadLocaleData).calledWith('es', 'it'),
					'Fallback passed to `loadLocaleData`.');
				assert.isArray(data['es'], 'Unloaded locale data included in response.');
				assert.isArray(data.supplemental, 'Supplemental data included in response.');
			});
		});
	},

	'cached locales': {
		'assert single locale'() {
			sinon.spy(cldrLoad, 'loadLocaleData');
			return loadCldrData('fr').then((data: CldrDataResponse) => {
				assert.isFalse((<any> cldrLoad.loadLocaleData).called, 'Cached locales not reloaded from server.');
				assert.deepEqual(data, {
					supplemental: cldrData.supplemental,
					fr: cldrData['fr']
				}, 'Cached data are returned.');
			});
		},

		'assert multiple locales'() {
			sinon.spy(cldrLoad, 'loadLocaleData');
			return loadCldrData([ 'en', 'fr' ]).then((data: CldrDataResponse) => {
				assert.isFalse((<any> cldrLoad.loadLocaleData).called, 'Cached locales not reloaded from server.');
				assert.deepEqual(data, cldrData, 'Cached data are returned.');
			});
		},

		'assert fallback loaded from cache'() {
			sinon.spy(cldrLoad, 'loadLocaleData');
			return loadCldrData('es', 'fr').then((data: CldrDataResponse) => {
				assert.isFalse((<any> cldrLoad.loadLocaleData).called, 'Cached locales not reloaded from server.');
				// assert.isArray(data['fr'], cldrData, 'Cached data are returned.');
			});
		}
	},

	'assert both cached and uncached localed'() {
		sinon.spy(cldrLoad, 'loadLocaleData');
		return loadCldrData([ 'ar', 'fr' ]).then((data: CldrDataResponse) => {
			assert.isTrue((<any> cldrLoad.loadLocaleData).calledWith('ar'),
				'Unloaded locales are loaded from the server.');
			assert.isArray(data['ar'], 'Unloaded locale data included in response.');
			assert.isArray(data['fr'], 'Cached locale data included in response.');
			assert.isArray(data.supplemental, 'Supplemental data included in response.');
		});
	}
});
